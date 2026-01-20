import { prisma } from '../prisma/client';
import { MarketDataService } from './market-data.service';
import { BreakEvenAnalyticsService } from './breakeven-analytics.service';
import { MarketingLearningService } from './marketing-learning.service';
import { FundamentalDataService } from './fundamental-data.service';
import { NewsSentimentService } from './news-sentiment.service';
import { GrainAnalyticsService } from './grain-analytics.service';
import { SeasonalPatternsService } from './seasonal-patterns.service';
import { oldCropInventoryService } from './old-crop-inventory.service';
import {
  CommodityType,
  MarketingSignalType,
  SignalStrength,
  SignalStatus,
  MarketingSignal,
  MarketingPreferences,
  RiskTolerance,
  MarketContext,
  AccumulatorAnalysis,
  MarketingPosition
} from '@business-app/shared';

interface GeneratedSignal {
  businessId: string;
  grainEntityId?: string;
  signalType: MarketingSignalType;
  commodityType: CommodityType;
  strength: SignalStrength;
  cropYear?: number;
  isNewCrop?: boolean;
  currentPrice: number;
  breakEvenPrice: number;
  targetPrice?: number;
  priceAboveBreakeven: number;
  percentAboveBreakeven: number;
  title: string;
  summary: string;
  rationale: string;
  marketContext: MarketContext;
  recommendedBushels?: number;
  recommendedAction?: string;
  expiresAt?: Date;
}

// Helper to determine crop year from futures contract month
function determineCropYear(
  commodityType: CommodityType,
  contractMonth: string,
  contractYear?: number
): { cropYear: number; isNewCrop: boolean } {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Parse contract year from string if not provided
  const futuresYear = contractYear || parseInt(contractMonth.match(/\d{4}/)?.[0] || String(currentYear));

  // Determine harvest month for each commodity
  // Corn/Soybeans: September-November harvest
  // Wheat: June-August harvest (winter wheat)
  const harvestMonth: Record<CommodityType, number> = {
    CORN: 9,       // October (0-indexed: 9)
    SOYBEANS: 9,   // October
    WHEAT: 6       // July
  };

  // New crop futures months (for forward pricing next year's crop)
  const newCropMonths: Record<CommodityType, string[]> = {
    CORN: ['December', 'Dec', 'Z'],      // Dec corn = new crop
    SOYBEANS: ['November', 'Nov', 'X'],  // Nov beans = new crop
    WHEAT: ['July', 'Jul', 'N']          // July wheat = new crop
  };

  // Old crop months (current year's harvested crop)
  const oldCropMonths: Record<CommodityType, string[]> = {
    CORN: ['March', 'Mar', 'H', 'May', 'K', 'July', 'Jul', 'N', 'September', 'Sep', 'U'],
    SOYBEANS: ['January', 'Jan', 'F', 'March', 'Mar', 'H', 'May', 'K', 'July', 'Jul', 'N', 'August', 'Aug', 'Q'],
    WHEAT: ['March', 'Mar', 'H', 'May', 'K', 'September', 'Sep', 'U', 'December', 'Dec', 'Z']
  };

  const monthUpper = contractMonth.toUpperCase();
  const isNewCropContract = newCropMonths[commodityType]?.some(m =>
    monthUpper.includes(m.toUpperCase())
  ) || false;

  // Determine crop year
  // If it's a new crop contract (e.g., Dec 2026 corn in Jan 2026), crop year is 2026
  // If it's an old crop contract (e.g., Mar 2026 corn in Jan 2026), crop year is 2025
  let cropYear: number;

  if (isNewCropContract) {
    cropYear = futuresYear;
  } else {
    // Old crop - the crop year is the harvest year before the contract
    // Mar 2026 corn was harvested in fall 2025
    cropYear = futuresYear - 1;
  }

  // Double check: if we're past harvest for this commodity, adjust
  if (currentMonth > harvestMonth[commodityType] && !isNewCropContract) {
    // We're past harvest, so "old crop" contracts are actually current crop
    cropYear = currentYear;
  }

  return { cropYear, isNewCrop: isNewCropContract };
}

interface FundamentalAdjustment {
  strengthModifier: number; // -2 to +2 adjustment to signal strength
  percentageAdjustment: number; // Adjust recommended sell % based on fundamentals
  fundamentalFactors: string[];
  overallOutlook: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

// Risk tolerance multipliers for signal thresholds
const RISK_MULTIPLIERS: Record<RiskTolerance, number> = {
  CONSERVATIVE: 1.5,  // Higher thresholds needed
  MODERATE: 1.0,      // Default thresholds
  AGGRESSIVE: 0.7     // Lower thresholds trigger signals
};

export class SignalGenerationService {
  private marketDataService: MarketDataService;
  private breakEvenService: BreakEvenAnalyticsService;
  private learningService: MarketingLearningService;
  private fundamentalService: FundamentalDataService;
  private newsSentimentService: NewsSentimentService;
  private grainAnalyticsService: GrainAnalyticsService;
  private seasonalService: SeasonalPatternsService;

  constructor() {
    this.marketDataService = new MarketDataService();
    this.breakEvenService = new BreakEvenAnalyticsService();
    this.learningService = new MarketingLearningService();
    this.fundamentalService = new FundamentalDataService();
    this.newsSentimentService = new NewsSentimentService();
    this.grainAnalyticsService = new GrainAnalyticsService();
    this.seasonalService = new SeasonalPatternsService();
  }

  // ===== Main Signal Generation =====

  async generateSignalsForBusiness(businessId: string, userId?: string): Promise<MarketingSignal[]> {
    // Get marketing preferences
    const preferences = await this.getOrCreatePreferences(businessId);

    // Get personalized thresholds if userId provided
    let personalizedThresholds: Map<string, { strongBuy: number; buy: number; confidence: number }> = new Map();

    // Get break-even data
    const currentYear = new Date().getFullYear();
    const breakEvens = await this.breakEvenService.getOperationBreakEven(businessId, { year: currentYear });

    // Get marketing positions (remaining bushels, pre-harvest targets)
    const marketingPositions = await this.getMarketingPositions(businessId, currentYear, preferences);

    // Get enabled commodities
    const enabledCommodities = this.getEnabledCommodities(preferences);

    const allSignals: GeneratedSignal[] = [];

    for (const commodityData of breakEvens.byCommodity) {
      const commodity = commodityData.commodityType as CommodityType;

      if (!enabledCommodities.includes(commodity)) {
        continue;
      }

      // Fetch current market data
      const futuresQuote = await this.marketDataService.getNearestFuturesQuote(commodity);
      const avgBasis = await this.marketDataService.getAverageBasis(commodity);
      const trendAnalysis = await this.marketDataService.analyzePriceTrend(commodity);

      if (!futuresQuote) {
        console.log(`No futures data available for ${commodity}`);
        continue;
      }

      // Determine crop year from futures contract
      const { cropYear, isNewCrop } = determineCropYear(
        commodity,
        futuresQuote.contractMonth,
        futuresQuote.contractYear
      );

      const currentCashPrice = this.marketDataService.calculateCashPrice(
        futuresQuote.closePrice,
        avgBasis
      );

      const breakEvenPrice = commodityData.breakEvenPrice;
      const priceAboveBreakeven = currentCashPrice - breakEvenPrice;
      const percentAboveBreakeven = breakEvenPrice > 0 ? priceAboveBreakeven / breakEvenPrice : 0;

      // Fetch fundamental context for this commodity
      const fundamentalContext = await this.fundamentalService.getFundamentalContext(commodity);
      const fundamentalAdjustment = this.calculateFundamentalAdjustment(fundamentalContext);

      // Fetch seasonal context for this commodity
      const seasonalContext = this.seasonalService.getSeasonalContext(commodity, currentCashPrice);
      const seasonalAdjustment = this.seasonalService.getSeasonalAdjustment(commodity, currentCashPrice);

      const marketContext: MarketContext = {
        futuresPrice: futuresQuote.closePrice,
        futuresMonth: futuresQuote.contractMonth,
        futuresTrend: trendAnalysis.trend,
        basisLevel: avgBasis,
        basisVsHistorical: avgBasis > -0.10 ? 'STRONG' : avgBasis > -0.20 ? 'AVERAGE' : 'WEAK',
        rsiValue: trendAnalysis.rsi,
        movingAverage20: trendAnalysis.movingAverage20,
        movingAverage50: trendAnalysis.movingAverage50,
        volatility: trendAnalysis.volatility,
        // Add seasonal context
        seasonalContext: {
          seasonalOutlook: seasonalContext.seasonalOutlook,
          seasonalScore: seasonalContext.seasonalScore,
          historicalPricePercentile: seasonalContext.historicalPricePercentile,
          historicalRallyProbability: seasonalContext.currentPattern.historicalRallyProbability,
          marketingImplication: seasonalContext.currentPattern.marketingImplication,
          keySeasonalFactors: seasonalContext.keySeasonalFactors,
          recommendedAction: seasonalContext.recommendedAction
        },
        // Add fundamental context
        fundamentalScore: fundamentalContext.overallFundamentalScore,
        fundamentalOutlook: fundamentalAdjustment.overallOutlook,
        keyFundamentalFactors: fundamentalContext.keyFactors.slice(0, 3),
        stocksToUseRatio: fundamentalContext.supplyDemand?.stocksToUseRatio,
        exportPace: fundamentalContext.exportPace?.paceVsUSDA,
        cropConditions: fundamentalContext.cropConditions?.goodExcellentPct,
        newsSentiment: fundamentalContext.recentNews.overallSentiment
      };

      // Get personalized thresholds for this commodity if user provided
      let personalizedThreshold = null;
      if (userId) {
        const learned = await this.learningService.getPersonalizedThresholds(
          userId,
          commodity,
          MarketingSignalType.CASH_SALE
        );
        if (learned.confidence > 30) {
          personalizedThreshold = learned;
          personalizedThresholds.set(`${commodity}_CASH_SALE`, {
            strongBuy: learned.strongBuyThreshold,
            buy: learned.buyThreshold,
            confidence: learned.confidence
          });
        }
      }

      // Get marketing position for this commodity (remaining bushels, progress toward target)
      let position = marketingPositions.get(commodity);

      // For old crop signals, use old crop inventory data instead of production data
      // Also set break-even to 0 since it's not applicable for old crop
      let effectiveBreakEvenPrice = breakEvenPrice;
      let effectivePriceAboveBreakeven = priceAboveBreakeven;
      let effectivePercentAboveBreakeven = percentAboveBreakeven;

      if (!isNewCrop) {
        const oldCropInventory = await oldCropInventoryService.getInventoryByCommodity(
          businessId,
          commodity,
          cropYear
        );

        if (oldCropInventory && oldCropInventory.unpricedBushels > 0) {
          // Create a position based on old crop inventory
          position = {
            commodityType: commodity,
            year: cropYear,
            totalProjectedBushels: oldCropInventory.unpricedBushels,
            totalContractedBushels: 0,
            remainingBushels: oldCropInventory.unpricedBushels,
            percentSold: 0,
            preHarvestTarget: 1.0, // No pre-harvest target for old crop
            percentToTarget: 0,
            bushelsToTarget: 0,
            isHarvestComplete: true, // Old crop is already harvested
            averageSalePrice: 0
          };

          // Old crop doesn't have a break-even (cost is from previous year)
          effectiveBreakEvenPrice = 0;
          effectivePriceAboveBreakeven = 0;
          effectivePercentAboveBreakeven = 0;
        } else {
          // No old crop inventory - skip generating old crop signals for this commodity
          console.log(`No old crop inventory for ${commodity} year ${cropYear}, skipping old crop signals`);
          continue;
        }
      }

      // Generate signals for each enabled marketing tool
      // All signals in this loop get the same crop year from the futures quote
      const cropYearLabel = isNewCrop ? `${cropYear} New Crop` : `${cropYear} Old Crop`;

      if (preferences.cashSaleSignals) {
        const cashSignal = this.evaluateCashSaleSignal(
          businessId,
          commodity,
          currentCashPrice,
          effectiveBreakEvenPrice,
          commodityData.expectedBushels,
          preferences,
          marketContext,
          trendAnalysis,
          personalizedThreshold,
          fundamentalAdjustment,
          position,
          seasonalAdjustment
        );
        if (cashSignal) {
          cashSignal.cropYear = cropYear;
          cashSignal.isNewCrop = isNewCrop;
          cashSignal.title = `[${cropYearLabel}] ${cashSignal.title}`;
          // Override break-even values for old crop
          if (!isNewCrop) {
            cashSignal.breakEvenPrice = 0;
            cashSignal.priceAboveBreakeven = 0;
            cashSignal.percentAboveBreakeven = 0;
          }
          allSignals.push(cashSignal);
        }
      }

      if (preferences.basisContractSignals) {
        const basisSignal = await this.evaluateBasisSignal(
          businessId,
          commodity,
          futuresQuote.closePrice,
          avgBasis,
          effectiveBreakEvenPrice,
          commodityData.expectedBushels,
          preferences,
          marketContext,
          position
        );
        if (basisSignal) {
          basisSignal.cropYear = cropYear;
          basisSignal.isNewCrop = isNewCrop;
          basisSignal.title = `[${cropYearLabel}] ${basisSignal.title}`;
          // Override break-even values for old crop
          if (!isNewCrop) {
            basisSignal.breakEvenPrice = 0;
            basisSignal.priceAboveBreakeven = 0;
            basisSignal.percentAboveBreakeven = 0;
          }
          allSignals.push(basisSignal);
        }
      }

      if (preferences.htaSignals) {
        const htaSignal = this.evaluateHTASignal(
          businessId,
          commodity,
          futuresQuote.closePrice,
          avgBasis,
          effectiveBreakEvenPrice,
          commodityData.expectedBushels,
          preferences,
          marketContext,
          position
        );
        if (htaSignal) {
          htaSignal.cropYear = cropYear;
          htaSignal.isNewCrop = isNewCrop;
          htaSignal.title = `[${cropYearLabel}] ${htaSignal.title}`;
          // Override break-even values for old crop
          if (!isNewCrop) {
            htaSignal.breakEvenPrice = 0;
            htaSignal.priceAboveBreakeven = 0;
            htaSignal.percentAboveBreakeven = 0;
          }
          allSignals.push(htaSignal);
        }
      }
    }

    // Generate accumulator signals (for existing contracts)
    if (preferences.accumulatorSignals) {
      const accumulatorSignals = await this.generateAccumulatorSignals(businessId);
      allSignals.push(...accumulatorSignals);
    }

    // Generate accumulator inquiry signals (when to check pricing for NEW accumulators)
    if ((preferences as any).accumulatorInquirySignals !== false) {
      for (const commodityData of breakEvens.byCommodity) {
        const commodity = commodityData.commodityType as CommodityType;
        if (!enabledCommodities.includes(commodity)) continue;

        const futuresQuote = await this.marketDataService.getNearestFuturesQuote(commodity);
        const avgBasis = await this.marketDataService.getAverageBasis(commodity);
        const trendAnalysis = await this.marketDataService.analyzePriceTrend(commodity);

        if (!futuresQuote) continue;

        // Determine crop year for accumulator inquiry
        const { cropYear: inquiryCropYear, isNewCrop: inquiryIsNewCrop } = determineCropYear(
          commodity,
          futuresQuote.contractMonth,
          futuresQuote.contractYear
        );

        // IMPORTANT: Accumulators are ONLY for new crop - skip old crop
        // Old crop grain is already harvested, so accumulating over time doesn't make sense
        if (!inquiryIsNewCrop) {
          continue;
        }

        const inquiryCropLabel = `${inquiryCropYear} New Crop`;

        const inquirySignal = await this.evaluateAccumulatorInquirySignal(
          businessId,
          commodity,
          futuresQuote.closePrice,
          avgBasis,
          commodityData.breakEvenPrice,
          commodityData.expectedBushels,
          preferences,
          trendAnalysis
        );
        if (inquirySignal) {
          inquirySignal.cropYear = inquiryCropYear;
          inquirySignal.isNewCrop = inquiryIsNewCrop;
          inquirySignal.title = `[${inquiryCropLabel}] ${inquirySignal.title}`;
          allSignals.push(inquirySignal);
        }
      }
    }

    // Generate call option signals (when to buy calls)
    if (preferences.optionsSignals) {
      for (const commodityData of breakEvens.byCommodity) {
        const commodity = commodityData.commodityType as CommodityType;
        if (!enabledCommodities.includes(commodity)) continue;

        const futuresQuote = await this.marketDataService.getNearestFuturesQuote(commodity);
        const avgBasis = await this.marketDataService.getAverageBasis(commodity);
        const trendAnalysis = await this.marketDataService.analyzePriceTrend(commodity);

        if (!futuresQuote) continue;

        // Get contexts needed for call option evaluation
        const fundamentalContext = await this.fundamentalService.getFundamentalContext(commodity);
        const fundamentalAdjustment = this.calculateFundamentalAdjustment(fundamentalContext);
        const seasonalContext = this.seasonalService.getSeasonalContext(commodity, futuresQuote.closePrice + avgBasis);

        const { cropYear: callCropYear, isNewCrop: callIsNewCrop } = determineCropYear(
          commodity,
          futuresQuote.contractMonth,
          futuresQuote.contractYear
        );
        const callCropLabel = callIsNewCrop ? `${callCropYear} New Crop` : `${callCropYear} Old Crop`;

        const marketContext: any = {
          futuresPrice: futuresQuote.closePrice,
          futuresMonth: futuresQuote.contractMonth,
          basisLevel: avgBasis
        };

        const callSignal = await this.evaluateCallOptionSignal(
          businessId,
          commodity,
          futuresQuote.closePrice,
          avgBasis,
          commodityData.breakEvenPrice,
          commodityData.expectedBushels,
          preferences,
          marketContext,
          trendAnalysis,
          seasonalContext,
          fundamentalAdjustment.overallOutlook
        );

        if (callSignal) {
          callSignal.cropYear = callCropYear;
          callSignal.isNewCrop = callIsNewCrop;
          callSignal.title = `[${callCropLabel}] ${callSignal.title}`;
          allSignals.push(callSignal);
        }
      }

      // Monitor existing call option positions
      const callPositionSignals = await this.generateCallOptionPositionSignals(businessId);
      allSignals.push(...callPositionSignals);
    }

    // Generate trade policy and breaking news signals
    const tradePolicySignals = await this.generateTradePolicySignals(businessId, enabledCommodities);
    allSignals.push(...tradePolicySignals);

    // Store signals in database
    const storedSignals: MarketingSignal[] = [];

    for (const signal of allSignals) {
      // Check if similar signal already exists and is active
      const existingSignal = await prisma.marketingSignal.findFirst({
        where: {
          businessId: signal.businessId,
          signalType: signal.signalType,
          commodityType: signal.commodityType,
          status: 'ACTIVE',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
          }
        }
      });

      if (existingSignal) {
        // Update existing signal if strength changed significantly
        if (existingSignal.strength !== signal.strength) {
          const updated = await prisma.marketingSignal.update({
            where: { id: existingSignal.id },
            data: {
              strength: signal.strength,
              currentPrice: signal.currentPrice,
              priceAboveBreakeven: signal.priceAboveBreakeven,
              percentAboveBreakeven: signal.percentAboveBreakeven,
              summary: signal.summary,
              rationale: signal.rationale,
              marketContext: signal.marketContext as any
            }
          });
          storedSignals.push(this.mapToMarketingSignal(updated));
        } else {
          storedSignals.push(this.mapToMarketingSignal(existingSignal));
        }
      } else {
        // Create new signal
        const created = await prisma.marketingSignal.create({
          data: {
            businessId: signal.businessId,
            grainEntityId: signal.grainEntityId,
            signalType: signal.signalType,
            commodityType: signal.commodityType,
            strength: signal.strength,
            status: 'ACTIVE',
            cropYear: signal.cropYear,
            isNewCrop: signal.isNewCrop || false,
            currentPrice: signal.currentPrice,
            breakEvenPrice: signal.breakEvenPrice,
            targetPrice: signal.targetPrice,
            priceAboveBreakeven: signal.priceAboveBreakeven,
            percentAboveBreakeven: signal.percentAboveBreakeven,
            title: signal.title,
            summary: signal.summary,
            rationale: signal.rationale,
            marketContext: signal.marketContext as any,
            recommendedBushels: signal.recommendedBushels,
            recommendedAction: signal.recommendedAction,
            expiresAt: signal.expiresAt
          }
        });
        storedSignals.push(this.mapToMarketingSignal(created));
      }
    }

    return storedSignals;
  }

  // ===== Cash Sale Signal Evaluation =====

  private evaluateCashSaleSignal(
    businessId: string,
    commodityType: CommodityType,
    currentPrice: number,
    breakEvenPrice: number,
    totalBushels: number,
    preferences: MarketingPreferences,
    marketContext: MarketContext,
    trendAnalysis: any,
    personalizedThreshold?: { strongBuyThreshold: number; buyThreshold: number; confidence: number } | null,
    fundamentalAdjustment?: FundamentalAdjustment,
    position?: MarketingPosition,
    seasonalAdjustment?: {
      percentageAdjustment: number;
      thresholdAdjustment: number;
      urgencyBoost: boolean;
      waitRecommended: boolean;
      rationale: string;
    }
  ): GeneratedSignal | null {
    const riskMultiplier = RISK_MULTIPLIERS[preferences.riskTolerance];
    const targetMargin = Number(preferences.targetProfitMargin);
    const minAboveBE = Number(preferences.minAboveBreakeven);

    // Use personalized thresholds if available and confident
    let strongBuyThreshold = 0.15 / riskMultiplier;
    let buyThreshold = 0.10 / riskMultiplier;

    if (personalizedThreshold && personalizedThreshold.confidence > 30) {
      // Blend personalized with default based on confidence
      const weight = personalizedThreshold.confidence / 100;
      strongBuyThreshold = (personalizedThreshold.strongBuyThreshold * weight) + (strongBuyThreshold * (1 - weight));
      buyThreshold = (personalizedThreshold.buyThreshold * weight) + (buyThreshold * (1 - weight));
    }

    // Adjust thresholds based on fundamentals
    // Bearish fundamentals = lower thresholds (sell sooner)
    // Bullish fundamentals = higher thresholds (wait for better prices)
    if (fundamentalAdjustment) {
      const fundamentalMod = fundamentalAdjustment.strengthModifier * 0.02; // Each point = 2% threshold adjustment
      if (fundamentalAdjustment.overallOutlook === 'BEARISH') {
        // Lower thresholds when fundamentals are bearish - be more aggressive selling
        strongBuyThreshold *= (1 - Math.abs(fundamentalMod));
        buyThreshold *= (1 - Math.abs(fundamentalMod));
      } else if (fundamentalAdjustment.overallOutlook === 'BULLISH') {
        // Raise thresholds when fundamentals are bullish - be patient for better prices
        strongBuyThreshold *= (1 + Math.abs(fundamentalMod));
        buyThreshold *= (1 + Math.abs(fundamentalMod));
      }
    }

    // Apply seasonal threshold adjustments
    // Favorable seasonal windows = lower thresholds (sell more readily)
    // Unfavorable windows = higher thresholds (wait for better timing)
    if (seasonalAdjustment) {
      strongBuyThreshold *= seasonalAdjustment.thresholdAdjustment;
      buyThreshold *= seasonalAdjustment.thresholdAdjustment;
    }

    const priceAboveBreakeven = currentPrice - breakEvenPrice;
    const percentAboveBreakeven = breakEvenPrice > 0 ? priceAboveBreakeven / breakEvenPrice : 0;

    // Check if this is old crop (break-even = 0 means old crop)
    const isOldCrop = breakEvenPrice === 0;

    let strength: SignalStrength;
    let title: string;
    let summary: string;
    let rationale: string;
    let recommendedAction: string;
    let recommendedBushels: number | undefined;

    // Base sell percentage (will be adjusted by fundamentals and seasonals)
    let sellPercentage = 0.125; // Default 12.5%
    let strongSellPercentage = 0.25; // Default 25%

    if (fundamentalAdjustment) {
      // Adjust sell percentage based on fundamental outlook
      sellPercentage += fundamentalAdjustment.percentageAdjustment;
      strongSellPercentage += fundamentalAdjustment.percentageAdjustment * 1.5;
    }

    // Apply seasonal percentage adjustments
    if (seasonalAdjustment) {
      sellPercentage += seasonalAdjustment.percentageAdjustment;
      strongSellPercentage += seasonalAdjustment.percentageAdjustment * 1.5;
    }

    // Clamp to reasonable range
    sellPercentage = Math.max(0.05, Math.min(0.30, sellPercentage));
    strongSellPercentage = Math.max(0.10, Math.min(0.40, strongSellPercentage));

    // Build fundamental context for rationale
    const fundamentalRationale = fundamentalAdjustment && fundamentalAdjustment.fundamentalFactors.length > 0
      ? ` Fundamentals: ${fundamentalAdjustment.fundamentalFactors.slice(0, 2).join('. ')}.`
      : '';

    // Build seasonal context for rationale
    const seasonalRationale = seasonalAdjustment
      ? ` Seasonal: ${seasonalAdjustment.rationale}`
      : '';

    // Use remaining bushels from position tracking (fall back to total if no position data)
    const remainingBushels = position?.remainingBushels ?? totalBushels;
    const percentSold = position?.percentSold ?? 0;
    const preHarvestTarget = position?.preHarvestTarget ?? 0.50;
    const bushelsToTarget = position?.bushelsToTarget ?? totalBushels * 0.50;

    // Build position context for rationale
    const positionRationale = position
      ? ` You are currently ${(percentSold * 100).toFixed(0)}% sold (${position.totalContractedBushels.toLocaleString()} bu), ` +
        `with ${remainingBushels.toLocaleString()} bu remaining.`
      : '';

    // OLD CROP SIGNAL LOGIC - no break-even comparison, focus on market conditions
    if (isOldCrop && position && position.remainingBushels > 0) {
      // For old crop, generate signals based on market conditions and inventory
      const remainingBu = position.remainingBushels;

      // Determine strength based on market conditions
      if (trendAnalysis.trend === 'DOWN' && trendAnalysis.rsi > 70) {
        // Market showing weakness - good time to sell old crop
        strength = SignalStrength.STRONG_BUY;
        title = `${commodityType} Old Crop Sale Opportunity`;
        summary = `Market showing weakness (RSI: ${trendAnalysis.rsi.toFixed(0)}). Good time to move old crop inventory.`;
      } else if (trendAnalysis.rsi > 60 || fundamentalAdjustment?.overallOutlook === 'BEARISH') {
        strength = SignalStrength.BUY;
        title = `${commodityType} Old Crop Sale Signal`;
        summary = `Consider selling old crop inventory at current price of $${currentPrice.toFixed(2)}/bu.`;
      } else {
        strength = SignalStrength.HOLD;
        title = `${commodityType} Old Crop Monitor`;
        summary = `Monitor old crop inventory. Current price: $${currentPrice.toFixed(2)}/bu.`;
      }

      // Calculate recommended bushels (suggest selling 20-30% of old crop)
      const oldCropSellPct = strength === SignalStrength.STRONG_BUY ? 0.30 : 0.20;
      recommendedBushels = Math.round(remainingBu * oldCropSellPct);

      rationale = `You have ${remainingBu.toLocaleString()} bushels of old crop to sell.${fundamentalRationale}${seasonalRationale}`;
      recommendedAction = strength === SignalStrength.HOLD
        ? `Monitor ${remainingBu.toLocaleString()} bu of old crop inventory`
        : `Sell ${recommendedBushels.toLocaleString()} bushels of old crop at $${currentPrice.toFixed(2)}/bu`;

      return {
        businessId,
        signalType: MarketingSignalType.CASH_SALE,
        commodityType,
        strength,
        currentPrice,
        breakEvenPrice: 0, // No break-even for old crop
        priceAboveBreakeven: 0,
        percentAboveBreakeven: 0,
        title,
        summary,
        rationale,
        marketContext,
        recommendedBushels,
        recommendedAction,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };
    }

    // NEW CROP SIGNAL LOGIC - uses break-even comparison
    // Determine signal strength based on conditions (using personalized thresholds)
    if (percentAboveBreakeven >= strongBuyThreshold &&
        trendAnalysis.trend === 'DOWN' &&
        trendAnalysis.rsi > 70) {
      // STRONG_BUY: High profit margin + downward momentum + overbought
      strength = SignalStrength.STRONG_BUY;

      // Upgrade to stronger recommendation if fundamentals are also bearish OR seasonal urgency
      if (fundamentalAdjustment?.overallOutlook === 'BEARISH' || seasonalAdjustment?.urgencyBoost) {
        strongSellPercentage = Math.min(0.40, strongSellPercentage + 0.05);
        if (fundamentalAdjustment?.overallOutlook === 'BEARISH' && seasonalAdjustment?.urgencyBoost) {
          title = `URGENT: ${commodityType} Cash Sale - Fundamentals & Seasonals Align`;
          summary = `${commodityType} is ${(percentAboveBreakeven * 100).toFixed(1)}% above break-even. Technical, fundamental, AND seasonal indicators all suggest selling now.`;
        } else if (fundamentalAdjustment?.overallOutlook === 'BEARISH') {
          title = `URGENT: ${commodityType} Cash Sale - Fundamentals Align`;
          summary = `${commodityType} is ${(percentAboveBreakeven * 100).toFixed(1)}% above break-even. Technical AND fundamental indicators suggest selling now.`;
        } else {
          title = `URGENT: ${commodityType} Cash Sale - Favorable Seasonal Window`;
          summary = `${commodityType} is ${(percentAboveBreakeven * 100).toFixed(1)}% above break-even during historically favorable selling period.`;
        }
      } else {
        title = `Strong ${commodityType} Cash Sale Opportunity`;
        summary = `${commodityType} is ${(percentAboveBreakeven * 100).toFixed(1)}% above break-even with downward price momentum.`;
      }

      rationale = `Price shows overbought conditions (RSI: ${trendAnalysis.rsi.toFixed(0)}) with downward trend.${fundamentalRationale}${seasonalRationale}${positionRationale}`;
      if (personalizedThreshold?.confidence && personalizedThreshold.confidence > 50) {
        rationale += ` (Threshold personalized based on your selling history)`;
      }

      // Calculate bushels using remaining inventory, respecting pre-harvest target
      if (position) {
        recommendedBushels = this.calculateMaxRecommendedBushels(position, preferences, strongSellPercentage);
      } else {
        recommendedBushels = Math.round(totalBushels * strongSellPercentage);
      }
      recommendedAction = `Sell ${recommendedBushels.toLocaleString()} bushels at cash market (${(strongSellPercentage * 100).toFixed(0)}% of remaining)`;
    } else if (percentAboveBreakeven >= buyThreshold &&
               priceAboveBreakeven >= targetMargin) {
      // BUY: Above target profit margin
      strength = SignalStrength.BUY;

      // Add seasonal context to title if favorable
      if (seasonalAdjustment?.urgencyBoost) {
        title = `${commodityType} Cash Sale Signal - Favorable Seasonal Window`;
        summary = `${commodityType} is $${priceAboveBreakeven.toFixed(2)}/bu above break-even during historically good selling period.`;
      } else {
        title = `${commodityType} Cash Sale Signal`;
        summary = `${commodityType} is $${priceAboveBreakeven.toFixed(2)}/bu above break-even, exceeding your target margin.`;
      }
      rationale = `Current profit margin of $${priceAboveBreakeven.toFixed(2)}/bu exceeds your target of $${targetMargin.toFixed(2)}/bu.${fundamentalRationale}${seasonalRationale}${positionRationale}`;

      // Calculate bushels using remaining inventory
      if (position) {
        recommendedBushels = this.calculateMaxRecommendedBushels(position, preferences, sellPercentage);
      } else {
        recommendedBushels = Math.round(totalBushels * sellPercentage);
      }
      recommendedAction = `Consider selling ${recommendedBushels.toLocaleString()} bushels (${(sellPercentage * 100).toFixed(0)}% of remaining)`;
    } else if (percentAboveBreakeven >= minAboveBE && percentAboveBreakeven < 0.10) {
      // HOLD: Profitable but below target
      // But if fundamentals are very bearish OR seasonal window is favorable, consider selling
      const shouldSellDefensively = (fundamentalAdjustment?.overallOutlook === 'BEARISH' && fundamentalAdjustment.strengthModifier <= -1.5)
        || (seasonalAdjustment?.urgencyBoost && fundamentalAdjustment?.overallOutlook !== 'BULLISH');

      if (shouldSellDefensively) {
        strength = SignalStrength.BUY;
        if (seasonalAdjustment?.urgencyBoost) {
          title = `${commodityType} Defensive Sale - Favorable Seasonal Window`;
          summary = `While below target, favorable seasonal window suggests taking some profit now.`;
        } else {
          title = `${commodityType} Defensive Sale Signal`;
          summary = `While below target, bearish fundamentals suggest taking some profit now.`;
        }
        rationale = `Price is ${(percentAboveBreakeven * 100).toFixed(1)}% above break-even.${fundamentalRationale}${seasonalRationale}${positionRationale}`;

        // Calculate bushels using remaining inventory (smaller defensive position)
        if (position) {
          recommendedBushels = this.calculateMaxRecommendedBushels(position, preferences, sellPercentage * 0.5);
        } else {
          recommendedBushels = Math.round(totalBushels * sellPercentage * 0.5);
        }
        recommendedAction = `Consider selling ${recommendedBushels.toLocaleString()} bushels as defensive measure`;
      } else if (seasonalAdjustment?.waitRecommended) {
        // Seasonal suggests waiting
        strength = SignalStrength.HOLD;
        title = `${commodityType} Market Watch - Seasonal Patience Recommended`;
        summary = `${commodityType} is profitable but seasonal patterns suggest better opportunities ahead.`;
        rationale = `Current price $${currentPrice.toFixed(2)} is ${(percentAboveBreakeven * 100).toFixed(1)}% above break-even.${seasonalRationale}${positionRationale}`;
        recommendedAction = 'Hold current position. Seasonal patterns suggest waiting for post-harvest recovery.';
        recommendedBushels = undefined;
      } else {
        strength = SignalStrength.HOLD;
        title = `${commodityType} Market Watch`;
        summary = `${commodityType} is profitable but below target margin. Monitor for better opportunities.`;
        rationale = `Current price $${currentPrice.toFixed(2)} is ${(percentAboveBreakeven * 100).toFixed(1)}% above break-even of $${breakEvenPrice.toFixed(2)}.${fundamentalRationale}${seasonalRationale}${positionRationale}`;
        recommendedAction = 'Hold current position, set price alerts';
        recommendedBushels = undefined;
      }
    } else if (percentAboveBreakeven < minAboveBE && percentAboveBreakeven >= 0) {
      // SELL: Near or at break-even - caution
      strength = SignalStrength.SELL;
      title = `${commodityType} Break-Even Alert`;
      summary = `${commodityType} is near break-even. Selling now would yield minimal profit.`;
      rationale = `Price margin of $${priceAboveBreakeven.toFixed(2)}/bu is below minimum threshold.${fundamentalRationale}${seasonalRationale}${positionRationale}`;
      recommendedAction = 'Consider hedging strategies to protect downside';
      recommendedBushels = undefined;
    } else {
      // STRONG_SELL: Below break-even
      strength = SignalStrength.STRONG_SELL;
      title = `${commodityType} Below Break-Even Warning`;
      summary = `${commodityType} is currently below your break-even price by $${Math.abs(priceAboveBreakeven).toFixed(2)}/bu.`;
      rationale = `Current market price of $${currentPrice.toFixed(2)} is below break-even of $${breakEvenPrice.toFixed(2)}. Avoid cash sales at current levels.${fundamentalRationale}${seasonalRationale}${positionRationale}`;
      recommendedAction = 'Do not sell. Consider put options for protection.';
      recommendedBushels = undefined;
    }

    // Only generate actionable signals (BUY or STRONG_BUY for cash sales)
    if (strength !== SignalStrength.BUY && strength !== SignalStrength.STRONG_BUY) {
      return null;
    }

    return {
      businessId,
      signalType: MarketingSignalType.CASH_SALE,
      commodityType,
      strength,
      currentPrice,
      breakEvenPrice,
      targetPrice: breakEvenPrice + targetMargin,
      priceAboveBreakeven,
      percentAboveBreakeven,
      title,
      summary,
      rationale,
      marketContext,
      recommendedBushels,
      recommendedAction,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
  }

  // ===== Calculate Fundamental Adjustment =====

  private calculateFundamentalAdjustment(fundamentalContext: any): FundamentalAdjustment {
    const score = fundamentalContext.overallFundamentalScore;
    const factors = fundamentalContext.keyFactors || [];

    // Convert fundamental score (-100 to +100) to strength modifier (-2 to +2)
    // Negative score (bearish) = negative modifier (sell more aggressively)
    // Positive score (bullish) = positive modifier (be patient)
    const strengthModifier = (score / 100) * 2;

    // Calculate percentage adjustment for sell recommendations
    // Bearish fundamentals = increase sell %, Bullish = decrease sell %
    let percentageAdjustment = 0;
    if (score <= -50) {
      percentageAdjustment = 0.10; // Sell 10% more when very bearish
    } else if (score <= -25) {
      percentageAdjustment = 0.05; // Sell 5% more when moderately bearish
    } else if (score >= 50) {
      percentageAdjustment = -0.05; // Sell 5% less when very bullish (wait for higher prices)
    } else if (score >= 25) {
      percentageAdjustment = -0.025; // Sell 2.5% less when moderately bullish
    }

    // Determine overall outlook
    let overallOutlook: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (score >= 25) overallOutlook = 'BULLISH';
    else if (score <= -25) overallOutlook = 'BEARISH';

    return {
      strengthModifier,
      percentageAdjustment,
      fundamentalFactors: factors,
      overallOutlook
    };
  }

  // ===== Basis Signal Evaluation =====

  private async evaluateBasisSignal(
    businessId: string,
    commodityType: CommodityType,
    futuresPrice: number,
    currentBasis: number,
    breakEvenPrice: number,
    totalBushels: number,
    preferences: MarketingPreferences,
    marketContext: MarketContext,
    position?: MarketingPosition
  ): Promise<GeneratedSignal | null> {
    const riskMultiplier = RISK_MULTIPLIERS[preferences.riskTolerance];

    // Get historical basis percentile
    const basisPercentile = await this.marketDataService.getBasisPercentile(commodityType, currentBasis);
    const currentCashPrice = futuresPrice + currentBasis;
    const priceAboveBreakeven = currentCashPrice - breakEvenPrice;
    const percentAboveBreakeven = breakEvenPrice > 0 ? priceAboveBreakeven / breakEvenPrice : 0;

    // Use remaining bushels from position tracking
    const remainingBushels = position?.remainingBushels ?? totalBushels;

    let strength: SignalStrength;
    let title: string;
    let summary: string;
    let rationale: string;
    let recommendedAction: string;
    let recommendedBushels: number | undefined;

    // Evaluate basis strength
    if (basisPercentile >= 75 / riskMultiplier) {
      // Strong basis - consider locking
      strength = SignalStrength.STRONG_BUY;
      title = `Excellent ${commodityType} Basis Opportunity`;
      summary = `${commodityType} basis at ${currentBasis.toFixed(2)} is in the ${basisPercentile.toFixed(0)}th percentile historically.`;
      rationale = `Current basis is stronger than ${basisPercentile.toFixed(0)}% of historical values. Lock in this favorable basis before it weakens.`;

      // Use remaining bushels, respecting constraints
      if (position) {
        recommendedBushels = this.calculateMaxRecommendedBushels(position, preferences, 0.20);
      } else {
        recommendedBushels = Math.round(totalBushels * 0.20);
      }
      recommendedAction = `Lock basis on ${recommendedBushels.toLocaleString()} unpriced bushels`;
    } else if (basisPercentile >= 50 / riskMultiplier) {
      // Above average basis
      strength = SignalStrength.BUY;
      title = `${commodityType} Basis Signal`;
      summary = `${commodityType} basis at ${currentBasis.toFixed(2)} is above historical average.`;
      rationale = `Basis is in the ${basisPercentile.toFixed(0)}th percentile. Consider partial basis contract.`;

      // Use remaining bushels
      if (position) {
        recommendedBushels = this.calculateMaxRecommendedBushels(position, preferences, 0.10);
      } else {
        recommendedBushels = Math.round(totalBushels * 0.10);
      }
      recommendedAction = `Consider locking basis on ${recommendedBushels.toLocaleString()} bushels`;
    } else {
      // Weak basis - don't signal
      return null;
    }

    // Update market context with basis percentile
    marketContext.basisPercentile = basisPercentile;

    return {
      businessId,
      signalType: MarketingSignalType.BASIS_CONTRACT,
      commodityType,
      strength,
      currentPrice: currentCashPrice,
      breakEvenPrice,
      priceAboveBreakeven,
      percentAboveBreakeven,
      title,
      summary,
      rationale,
      marketContext,
      recommendedBushels,
      recommendedAction,
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
    };
  }

  // ===== HTA Signal Evaluation =====

  private evaluateHTASignal(
    businessId: string,
    commodityType: CommodityType,
    futuresPrice: number,
    currentBasis: number,
    breakEvenPrice: number,
    totalBushels: number,
    preferences: MarketingPreferences,
    marketContext: MarketContext,
    position?: MarketingPosition
  ): GeneratedSignal | null {
    const riskMultiplier = RISK_MULTIPLIERS[preferences.riskTolerance];
    const targetMargin = Number(preferences.targetProfitMargin);

    // For HTA, we care about futures level relative to break-even
    // HTA locks futures, leaves basis open for improvement
    const estimatedCashPrice = futuresPrice + currentBasis;
    const priceAboveBreakeven = estimatedCashPrice - breakEvenPrice;
    const percentAboveBreakeven = breakEvenPrice > 0 ? priceAboveBreakeven / breakEvenPrice : 0;

    // HTA is good when futures are high but basis might improve
    const futuresAboveBE = (futuresPrice + currentBasis - breakEvenPrice) / breakEvenPrice;
    const basisWeak = currentBasis < -0.15;

    // Use remaining bushels from position tracking
    const remainingBushels = position?.remainingBushels ?? totalBushels;

    let strength: SignalStrength;
    let title: string;
    let summary: string;
    let rationale: string;
    let recommendedAction: string;
    let recommendedBushels: number | undefined;

    if (futuresAboveBE >= 0.15 / riskMultiplier && basisWeak) {
      // Strong HTA opportunity - high futures, weak basis
      strength = SignalStrength.STRONG_BUY;
      title = `Strong ${commodityType} HTA Opportunity`;
      summary = `${commodityType} futures are strong but basis is weak. Lock futures while waiting for basis improvement.`;
      rationale = `Futures at $${futuresPrice.toFixed(2)} provide ${(futuresAboveBE * 100).toFixed(1)}% margin above break-even. Current basis of ${currentBasis.toFixed(2)} has room to improve.`;

      // Use remaining bushels, respecting constraints
      if (position) {
        recommendedBushels = this.calculateMaxRecommendedBushels(position, preferences, 0.175);
      } else {
        recommendedBushels = Math.round(totalBushels * 0.175);
      }
      recommendedAction = `Consider HTA on ${recommendedBushels.toLocaleString()} bushels`;
    } else if (futuresAboveBE >= 0.10 / riskMultiplier && basisWeak) {
      // Good HTA opportunity
      strength = SignalStrength.BUY;
      title = `${commodityType} HTA Signal`;
      summary = `${commodityType} futures offer protection with potential basis upside.`;
      rationale = `Lock in futures protection at $${futuresPrice.toFixed(2)} while keeping basis open.`;

      // Use remaining bushels
      if (position) {
        recommendedBushels = this.calculateMaxRecommendedBushels(position, preferences, 0.10);
      } else {
        recommendedBushels = Math.round(totalBushels * 0.10);
      }
      recommendedAction = `Consider HTA on ${recommendedBushels.toLocaleString()} unpriced bushels`;
    } else {
      return null;
    }

    return {
      businessId,
      signalType: MarketingSignalType.HTA_RECOMMENDATION,
      commodityType,
      strength,
      currentPrice: estimatedCashPrice,
      breakEvenPrice,
      targetPrice: breakEvenPrice + targetMargin,
      priceAboveBreakeven,
      percentAboveBreakeven,
      title,
      summary,
      rationale,
      marketContext,
      recommendedBushels,
      recommendedAction,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
  }

  // ===== Accumulator Signal Generation =====

  async generateAccumulatorSignals(businessId: string): Promise<GeneratedSignal[]> {
    const signals: GeneratedSignal[] = [];

    // Get all active accumulator contracts for this business
    const accumulators = await prisma.grainContract.findMany({
      where: {
        grainEntity: { businessId },
        contractType: 'ACCUMULATOR',
        isActive: true
      },
      include: {
        accumulatorDetails: true,
        grainEntity: true
      }
    });

    for (const contract of accumulators) {
      if (!contract.accumulatorDetails) continue;

      const details = contract.accumulatorDetails;
      const commodityType = contract.commodityType as CommodityType;

      // Get current futures price
      const futuresQuote = await this.marketDataService.getNearestFuturesQuote(commodityType);
      if (!futuresQuote) continue;

      const currentPrice = futuresQuote.closePrice;
      const knockoutPrice = Number(details.knockoutPrice);
      const doubleUpPrice = Number(details.doubleUpPrice);

      const basePrice = Number(details.basePrice) || Number(contract.cashPrice) || 0;

      // Calculate knockout risk - knockout occurs when price FALLS to knockout level
      // (knockout protects the elevator from accumulating at unfavorable prices)
      const priceToKnockout = (currentPrice - knockoutPrice) / knockoutPrice;
      const isNearKnockout = priceToKnockout <= 0.05 && priceToKnockout >= 0;

      // Check for knockout warning (price approaching knockout from above)
      if (isNearKnockout && !details.knockoutReached) {
        signals.push({
          businessId,
          grainEntityId: contract.grainEntityId,
          signalType: MarketingSignalType.ACCUMULATOR_STRATEGY,
          commodityType,
          strength: SignalStrength.STRONG_SELL,
          currentPrice,
          breakEvenPrice: basePrice,
          priceAboveBreakeven: currentPrice - basePrice,
          percentAboveBreakeven: basePrice > 0 ? (currentPrice - basePrice) / basePrice : 0,
          title: `${commodityType} Accumulator Knockout Warning`,
          summary: `Price is within 5% of knockout level ($${knockoutPrice.toFixed(2)}). Contract may terminate.`,
          rationale: `Current futures $${currentPrice.toFixed(2)} is approaching knockout at $${knockoutPrice.toFixed(2)}. ` +
            `If price falls below knockout, accumulator terminates and remaining bushels go unmarketed.`,
          marketContext: {
            futuresPrice: currentPrice,
            futuresMonth: futuresQuote.contractMonth,
            accumulatorContext: {
              basePrice,
              knockoutPrice,
              doubleUpPrice,
              dailyBushels: Number(details.dailyBushels),
              totalAccumulated: Number(details.totalBushelsMarketed)
            }
          },
          recommendedAction: 'Consider locking in remaining bushels with cash sales before potential knockout',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day
        });
      }

      // Check for double-up status - double-up occurs when price DROPS BELOW the double-up level
      // This is an AWARENESS signal - farmer needs to know they're accumulating at 2x rate
      const accumulatorType = (details as any).accumulatorType || 'DAILY';
      const totalDoubledBushels = Number((details as any).totalDoubledBushels) || 0;
      const dailyBu = Number(details.dailyBushels);

      // Calculate estimated accumulated bushels based on days elapsed since start
      const startDate = new Date(details.startDate);
      const today = new Date();
      const daysElapsed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const estimatedAccumulated = Math.round(daysElapsed * dailyBu);

      if (currentPrice <= doubleUpPrice && currentPrice > knockoutPrice) {
        // Status notification - double-up is active
        let rateInfo = '';
        switch (accumulatorType) {
          case 'EURO':
            rateInfo = `${dailyBu.toFixed(0)} bu/day | Doubles at expiration`;
            break;
          case 'WEEKLY':
            rateInfo = `${(dailyBu * 10).toFixed(0)} bu/week (2x rate)`;
            break;
          case 'DAILY':
          default:
            rateInfo = `${(dailyBu * 2).toFixed(0)} bu/day (2x rate)`;
        }

        signals.push({
          businessId,
          grainEntityId: contract.grainEntityId,
          signalType: MarketingSignalType.ACCUMULATOR_STRATEGY,
          commodityType,
          strength: SignalStrength.HOLD,
          currentPrice,
          breakEvenPrice: basePrice,
          priceAboveBreakeven: currentPrice - basePrice,
          percentAboveBreakeven: basePrice > 0 ? (currentPrice - basePrice) / basePrice : 0,
          title: `${commodityType} Accumulator Status`,
          summary: `Double-up active | Base: $${basePrice.toFixed(2)} | Market: $${currentPrice.toFixed(2)}`,
          rationale: `${rateInfo} | ~${estimatedAccumulated.toLocaleString()} bu est. accumulated (${daysElapsed} days)`,
          marketContext: {
            futuresPrice: currentPrice,
            futuresMonth: futuresQuote.contractMonth,
            accumulatorContext: {
              basePrice,
              knockoutPrice,
              doubleUpPrice,
              dailyBushels: dailyBu,
              totalAccumulated: estimatedAccumulated,
              totalDoubledBushels,
              accumulatorType,
              isCurrentlyDoubled: true
            }
          },
          recommendedAction: `Knockout: $${knockoutPrice.toFixed(2)} | Double-up trigger: $${doubleUpPrice.toFixed(2)}`,
          expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
        });
      }

      // Normal accumulation status (price above double-up trigger)
      if (currentPrice > doubleUpPrice) {
        const weeklyBu = accumulatorType === 'WEEKLY' ? dailyBu * 5 : dailyBu * 7;

        let rateInfo = '';
        switch (accumulatorType) {
          case 'EURO':
            rateInfo = `${dailyBu.toFixed(0)} bu/day`;
            break;
          case 'WEEKLY':
            rateInfo = `${weeklyBu.toFixed(0)} bu/week`;
            break;
          case 'DAILY':
          default:
            rateInfo = `${dailyBu.toFixed(0)} bu/day`;
        }

        signals.push({
          businessId,
          grainEntityId: contract.grainEntityId,
          signalType: MarketingSignalType.ACCUMULATOR_STRATEGY,
          commodityType,
          strength: SignalStrength.HOLD,
          currentPrice,
          breakEvenPrice: basePrice,
          priceAboveBreakeven: currentPrice - basePrice,
          percentAboveBreakeven: basePrice > 0 ? (currentPrice - basePrice) / basePrice : 0,
          title: `${commodityType} Accumulator Status`,
          summary: `Standard rate | Base: $${basePrice.toFixed(2)} | Market: $${currentPrice.toFixed(2)}`,
          rationale: `${rateInfo} | ~${estimatedAccumulated.toLocaleString()} bu est. accumulated (${daysElapsed} days)`,
          marketContext: {
            futuresPrice: currentPrice,
            futuresMonth: futuresQuote.contractMonth,
            accumulatorContext: {
              basePrice,
              knockoutPrice,
              doubleUpPrice,
              dailyBushels: dailyBu,
              totalAccumulated: estimatedAccumulated,
              totalDoubledBushels,
              accumulatorType,
              isCurrentlyDoubled: false
            }
          },
          recommendedAction: `Knockout: $${knockoutPrice.toFixed(2)} | Double-up trigger: $${doubleUpPrice.toFixed(2)}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
      }
    }

    return signals;
  }

  // ===== Accumulator Inquiry Signal (When to Check for NEW Accumulators) =====

  private async evaluateAccumulatorInquirySignal(
    businessId: string,
    commodityType: CommodityType,
    futuresPrice: number,
    currentBasis: number,
    breakEvenPrice: number,
    totalBushels: number,
    preferences: MarketingPreferences,
    trendAnalysis: any
  ): Promise<GeneratedSignal | null> {
    const riskMultiplier = RISK_MULTIPLIERS[preferences.riskTolerance];

    // Get user's accumulator thresholds (with defaults)
    const minPrice = (preferences as any).accumulatorMinPrice
      ? Number((preferences as any).accumulatorMinPrice)
      : this.getDefaultMinPrice(commodityType);
    const percentThreshold = (preferences as any).accumulatorPercentAboveBreakeven
      ? Number((preferences as any).accumulatorPercentAboveBreakeven)
      : 0.10; // Default 10%
    const marketingPercent = (preferences as any).accumulatorMarketingPercent
      ? Number((preferences as any).accumulatorMarketingPercent)
      : 0.20; // Default 20%

    const currentCashPrice = futuresPrice + currentBasis;
    const priceAboveBreakeven = currentCashPrice - breakEvenPrice;
    const percentAboveBreakeven = breakEvenPrice > 0 ? priceAboveBreakeven / breakEvenPrice : 0;

    // Determine volatility level (affects accumulator terms)
    const volatilityLevel = trendAnalysis.volatility > 0.05 ? 'HIGH'
      : trendAnalysis.volatility > 0.02 ? 'MODERATE' : 'LOW';

    // Seasonal timing (affects accumulator pricing)
    const month = new Date().getMonth();
    const marketTiming: 'EARLY' | 'MID' | 'LATE' =
      month >= 0 && month <= 3 ? 'EARLY' :    // Jan-Apr: Early marketing
      month >= 4 && month <= 7 ? 'MID' :      // May-Aug: Mid season
      'LATE';                                  // Sep-Dec: Late/harvest

    // Calculate days until typical harvest (rough estimate)
    const harvestMonth = commodityType === CommodityType.WHEAT ? 6 : 9; // June for wheat, Sept for corn/beans
    const currentMonth = new Date().getMonth();
    const daysUntilHarvest = harvestMonth > currentMonth
      ? (harvestMonth - currentMonth) * 30
      : (12 - currentMonth + harvestMonth) * 30;

    // Accumulator inquiry conditions:
    // 1. Price is above break-even by user's threshold OR above minimum absolute price
    // 2. Volatility is not extremely high (better accumulator terms)
    // 3. Not too close to harvest (need time for accumulator to work)

    const priceConditionMet = (percentAboveBreakeven >= percentThreshold / riskMultiplier)
      || (currentCashPrice >= minPrice);
    const volatilityAcceptable = volatilityLevel !== 'HIGH';
    const timingAcceptable = daysUntilHarvest > 60; // At least 2 months to harvest

    // Generate signal only if conditions are favorable
    if (!priceConditionMet) {
      return null;
    }

    let strength: SignalStrength;
    let title: string;
    let summary: string;
    let rationale: string;
    let recommendedAction: string;

    // Determine signal strength based on how many conditions align
    const conditionScore = [priceConditionMet, volatilityAcceptable, timingAcceptable].filter(Boolean).length;

    if (conditionScore === 3 && percentAboveBreakeven >= 0.15 / riskMultiplier) {
      // Excellent conditions - strong inquiry signal
      strength = SignalStrength.STRONG_BUY;
      title = `Check ${commodityType} Accumulator Pricing`;
      summary = `Market conditions may be favorable for accumulator contracts. Contact your elevator/merchandiser for current terms.`;
      rationale = `${commodityType} is ${(percentAboveBreakeven * 100).toFixed(1)}% above break-even at $${currentCashPrice.toFixed(2)}/bu. ` +
        `Volatility is ${volatilityLevel.toLowerCase()}. ${daysUntilHarvest} days until harvest provides accumulation window. ` +
        `Accumulator terms (base price, knockout, double-up levels) vary by merchandiser.`;
      recommendedAction = `Contact your elevator for accumulator pricing. Look for a base price above your break-even ($${breakEvenPrice.toFixed(2)}/bu) ` +
        `and ideally above current market. Terms vary by merchandiser - compare offerings.`;
    } else if (conditionScore >= 2) {
      // Good conditions - standard inquiry signal
      strength = SignalStrength.BUY;
      title = `Consider ${commodityType} Accumulator Inquiry`;
      summary = `Current prices warrant checking accumulator offerings. Terms vary by elevator.`;
      rationale = `${commodityType} at $${currentCashPrice.toFixed(2)}/bu is ${(percentAboveBreakeven * 100).toFixed(1)}% above your break-even of $${breakEvenPrice.toFixed(2)}/bu. ` +
        (volatilityAcceptable ? 'Market volatility is manageable. ' : 'Note: Higher volatility may affect terms. ') +
        (timingAcceptable ? `${daysUntilHarvest} days until harvest.` : 'Harvest approaching - shorter accumulation window.');
      recommendedAction = `Ask your merchandiser about accumulator terms. Key things to evaluate: base price vs. break-even, ` +
        `knockout level risk, and double-up trigger. Each elevator offers different terms.`;
    } else {
      // Marginal conditions - hold signal (informational)
      strength = SignalStrength.HOLD;
      title = `${commodityType} Accumulator Watch`;
      summary = `Monitor prices - accumulators may become attractive if market improves.`;
      rationale = `${commodityType} currently ${(percentAboveBreakeven * 100).toFixed(1)}% above break-even. ` +
        `Accumulators work best when base price offered is above both break-even and current market.`;
      recommendedAction = `Watch for price improvement. When checking accumulator terms, ensure base price exceeds your break-even of $${breakEvenPrice.toFixed(2)}/bu.`;
    }

    // Build market context with accumulator-specific info
    const marketContext: MarketContext = {
      futuresPrice,
      futuresMonth: '', // Will be populated by caller if needed
      futuresTrend: trendAnalysis.trend,
      basisLevel: currentBasis,
      rsiValue: trendAnalysis.rsi,
      movingAverage20: trendAnalysis.movingAverage20,
      movingAverage50: trendAnalysis.movingAverage50,
      volatility: trendAnalysis.volatility,
      accumulatorContext: {
        estimatedCashPrice: currentCashPrice,
        suggestedMinBasePrice: breakEvenPrice + Number(preferences.targetProfitMargin),
        suggestedMarketingPercent: marketingPercent,
        volatilityLevel,
        timeUntilHarvest: daysUntilHarvest,
        marketTiming
      }
    };

    return {
      businessId,
      signalType: MarketingSignalType.ACCUMULATOR_INQUIRY,
      commodityType,
      strength,
      currentPrice: currentCashPrice,
      breakEvenPrice,
      targetPrice: breakEvenPrice + Number(preferences.targetProfitMargin),
      priceAboveBreakeven,
      percentAboveBreakeven,
      title,
      summary,
      rationale,
      marketContext,
      recommendedBushels: Math.round(totalBushels * marketingPercent),
      recommendedAction,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days - check pricing frequently
    };
  }

  private getDefaultMinPrice(commodityType: CommodityType): number {
    // Default minimum prices to consider accumulators (in $/bushel)
    const defaults: Record<CommodityType, number> = {
      CORN: 4.50,
      SOYBEANS: 11.00,
      WHEAT: 5.50
    };
    return defaults[commodityType] || 4.00;
  }

  // ===== Call Option Signal Generation =====

  /**
   * Generate signals for when to BUY call options
   * Triggered by:
   * 1. After cash sale - suggest re-ownership via calls
   * 2. When prices are at historical lows (good entry point)
   * 3. When technicals/fundamentals suggest a rally
   */
  private async evaluateCallOptionSignal(
    businessId: string,
    commodityType: CommodityType,
    futuresPrice: number,
    currentBasis: number,
    breakEvenPrice: number,
    totalBushels: number,
    preferences: MarketingPreferences,
    marketContext: any,
    trendAnalysis: any,
    seasonalContext: any,
    fundamentalOutlook: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  ): Promise<GeneratedSignal | null> {
    // Only generate if options signals are enabled
    if (!preferences.optionsSignals) {
      return null;
    }

    const currentCashPrice = futuresPrice + currentBasis;
    const priceAboveBreakeven = currentCashPrice - breakEvenPrice;
    const percentAboveBreakeven = breakEvenPrice > 0 ? priceAboveBreakeven / breakEvenPrice : 0;

    // Get seasonal context for timing
    const seasonalScore = seasonalContext?.seasonalScore || 50;
    const historicalPercentile = seasonalContext?.historicalPricePercentile || 50;
    const rallyProbability = seasonalContext?.currentPattern?.historicalRallyProbability || 0.5;

    // Technical indicators
    const rsi = trendAnalysis?.rsi || 50;
    const trend = trendAnalysis?.trend || 'NEUTRAL';

    // Conditions that favor buying calls:
    // 1. Price is at historical low (below 30th percentile)
    // 2. RSI is oversold (< 30)
    // 3. Fundamentals are bullish
    // 4. Seasonal pattern suggests rally coming
    // 5. After making cash sales (re-own grain)

    let callScore = 0;
    const reasons: string[] = [];

    // Historical percentile scoring
    if (historicalPercentile < 20) {
      callScore += 30;
      reasons.push(`Price at ${historicalPercentile}th percentile historically (very low)`);
    } else if (historicalPercentile < 35) {
      callScore += 20;
      reasons.push(`Price at ${historicalPercentile}th percentile historically (low)`);
    }

    // RSI oversold
    if (rsi < 25) {
      callScore += 25;
      reasons.push(`RSI at ${rsi.toFixed(0)} (oversold)`);
    } else if (rsi < 35) {
      callScore += 15;
      reasons.push(`RSI at ${rsi.toFixed(0)} (approaching oversold)`);
    }

    // Fundamental outlook
    if (fundamentalOutlook === 'BULLISH') {
      callScore += 20;
      reasons.push('Fundamentals are bullish');
    } else if (fundamentalOutlook === 'BEARISH') {
      callScore -= 15;
    }

    // Seasonal rally probability
    if (rallyProbability > 0.65) {
      callScore += 15;
      reasons.push(`${(rallyProbability * 100).toFixed(0)}% historical rally probability`);
    } else if (rallyProbability > 0.55) {
      callScore += 10;
      reasons.push(`${(rallyProbability * 100).toFixed(0)}% rally probability`);
    }

    // Downtrend (good for buying calls at bottom)
    if (trend === 'DOWN') {
      callScore += 10;
      reasons.push('Market in downtrend (potential reversal opportunity)');
    }

    // Determine signal strength
    let strength: SignalStrength;
    if (callScore >= 60) {
      strength = SignalStrength.STRONG_BUY;
    } else if (callScore >= 40) {
      strength = SignalStrength.BUY;
    } else {
      return null; // Not enough reasons to suggest calls
    }

    // Calculate suggested strike and premium budget
    const suggestedStrike = Math.round(futuresPrice * 20) / 20; // Round to nearest $0.05
    const estimatedPremium = this.estimateCallPremium(commodityType, futuresPrice, suggestedStrike);
    const bushelsToProtect = Math.round(totalBushels * 0.25); // Suggest protecting 25%
    const contractsNeeded = Math.ceil(bushelsToProtect / 5000);
    const totalPremiumCost = contractsNeeded * 5000 * estimatedPremium;

    const title = strength === SignalStrength.STRONG_BUY
      ? `Strong ${commodityType} Call Option Opportunity`
      : `${commodityType} Call Option Worth Considering`;

    const summary = `Market conditions favor buying calls for price upside. ` +
      `Consider ${contractsNeeded} contracts (${bushelsToProtect.toLocaleString()} bu) at ~$${suggestedStrike.toFixed(2)} strike.`;

    const rationale = reasons.join('. ') + '. ' +
      `Estimated premium: ~$${estimatedPremium.toFixed(4)}/bu ($${totalPremiumCost.toLocaleString()} total). ` +
      `Break-even at $${(suggestedStrike + estimatedPremium).toFixed(2)}.`;

    return {
      businessId,
      signalType: MarketingSignalType.CALL_OPTION,
      commodityType,
      strength,
      currentPrice: currentCashPrice,
      breakEvenPrice,
      targetPrice: suggestedStrike + estimatedPremium, // Break-even for call
      priceAboveBreakeven,
      percentAboveBreakeven,
      title,
      summary,
      rationale,
      marketContext: {
        ...marketContext,
        callOptionContext: {
          suggestedStrike,
          estimatedPremium,
          contractsNeeded,
          bushelsProtected: bushelsToProtect,
          totalPremiumCost,
          breakEvenPrice: suggestedStrike + estimatedPremium,
          callScore
        }
      },
      recommendedBushels: bushelsToProtect,
      recommendedAction: `Contact your broker for current call option quotes. ` +
        `At-the-money ${commodityType} calls around $${suggestedStrike.toFixed(2)} strike.`,
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
    };
  }

  /**
   * Estimate call option premium based on commodity and strike
   * This is a rough estimate - actual premiums depend on volatility, time to expiration, etc.
   */
  private estimateCallPremium(
    commodityType: CommodityType,
    currentPrice: number,
    strikePrice: number
  ): number {
    // Base premium as percentage of current price
    const basePremiumPct: Record<CommodityType, number> = {
      CORN: 0.04,      // ~4% of price (~$0.16-0.20 for corn)
      SOYBEANS: 0.035, // ~3.5% of price (~$0.35-0.40 for beans)
      WHEAT: 0.045     // ~4.5% of price (~$0.25-0.30 for wheat)
    };

    const basePremium = currentPrice * (basePremiumPct[commodityType] || 0.04);

    // Adjust for moneyness (ATM vs OTM)
    const moneyness = (strikePrice - currentPrice) / currentPrice;
    let premiumAdjustment = 1.0;

    if (moneyness > 0.05) {
      // OTM - cheaper
      premiumAdjustment = 0.6;
    } else if (moneyness > 0.02) {
      premiumAdjustment = 0.8;
    } else if (moneyness < -0.02) {
      // ITM - more expensive
      premiumAdjustment = 1.3;
    }

    return basePremium * premiumAdjustment;
  }

  // ===== Call Option Position Monitoring =====

  /**
   * Monitor existing call option positions and generate alerts
   */
  async generateCallOptionPositionSignals(businessId: string): Promise<GeneratedSignal[]> {
    const signals: GeneratedSignal[] = [];

    // Get all open call positions for this business
    const callPositions = await prisma.optionsPosition.findMany({
      where: {
        businessId,
        optionType: 'CALL',
        isOpen: true
      }
    });

    for (const position of callPositions) {
      const commodityType = position.commodityType as CommodityType;
      const strikePrice = Number(position.strikePrice);
      const premium = Number(position.premium);
      const expirationDate = position.expirationDate;
      const contracts = position.contracts;
      const totalBushels = contracts * position.bushelsPerContract;

      // Get current futures price
      const futuresQuote = await this.marketDataService.getNearestFuturesQuote(commodityType);
      if (!futuresQuote) continue;

      const currentPrice = futuresQuote.closePrice;
      const intrinsicValue = Math.max(0, currentPrice - strikePrice);
      const breakEvenPrice = strikePrice + premium;
      const profitLoss = intrinsicValue - premium;
      const profitLossPct = premium > 0 ? profitLoss / premium : 0;

      // Calculate days to expiration
      const daysToExpiration = Math.ceil(
        (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      // Determine crop year from futures month
      const { cropYear, isNewCrop } = determineCropYear(
        commodityType,
        position.futuresMonth
      );
      const cropYearLabel = isNewCrop ? `${cropYear} New Crop` : `${cropYear} Old Crop`;

      // Generate signals based on position status

      // 1. Expiration warning (7 days or less)
      if (daysToExpiration <= 7 && daysToExpiration > 0) {
        signals.push({
          businessId,
          grainEntityId: position.grainEntityId || undefined,
          signalType: MarketingSignalType.CALL_OPTION,
          commodityType,
          strength: daysToExpiration <= 3 ? SignalStrength.STRONG_SELL : SignalStrength.SELL,
          cropYear,
          isNewCrop,
          currentPrice,
          breakEvenPrice,
          priceAboveBreakeven: currentPrice - breakEvenPrice,
          percentAboveBreakeven: breakEvenPrice > 0 ? (currentPrice - breakEvenPrice) / breakEvenPrice : 0,
          title: `[${cropYearLabel}] ${commodityType} Call Expiring in ${daysToExpiration} Days`,
          summary: `Your $${strikePrice.toFixed(2)} call expires ${expirationDate.toLocaleDateString()}. ` +
            `Current value: ${intrinsicValue > 0 ? `$${intrinsicValue.toFixed(4)}/bu in-the-money` : 'out-of-the-money'}.`,
          rationale: `Position: ${contracts} contracts (${totalBushels.toLocaleString()} bu). ` +
            `Premium paid: $${premium.toFixed(4)}/bu. ` +
            `${profitLoss >= 0 ? 'Profit' : 'Loss'}: $${Math.abs(profitLoss).toFixed(4)}/bu (${(profitLossPct * 100).toFixed(0)}%).`,
          marketContext: {
            futuresPrice: currentPrice,
            futuresMonth: position.futuresMonth,
            callOptionContext: {
              strikePrice,
              premium,
              intrinsicValue,
              daysToExpiration,
              profitLoss,
              profitLossPct,
              contracts,
              totalBushels
            }
          },
          recommendedAction: intrinsicValue > 0
            ? 'Consider selling to close or exercising the option before expiration.'
            : 'Option is out-of-the-money. Consider letting it expire or selling for remaining time value.',
          expiresAt: expirationDate
        });
      }

      // 2. Profitable position alert (> 50% gain)
      if (profitLossPct >= 0.5 && daysToExpiration > 7) {
        signals.push({
          businessId,
          grainEntityId: position.grainEntityId || undefined,
          signalType: MarketingSignalType.CALL_OPTION,
          commodityType,
          strength: profitLossPct >= 1.0 ? SignalStrength.STRONG_SELL : SignalStrength.SELL,
          cropYear,
          isNewCrop,
          currentPrice,
          breakEvenPrice,
          priceAboveBreakeven: currentPrice - breakEvenPrice,
          percentAboveBreakeven: breakEvenPrice > 0 ? (currentPrice - breakEvenPrice) / breakEvenPrice : 0,
          title: `[${cropYearLabel}] ${commodityType} Call Profitable - Take Profits?`,
          summary: `Your $${strikePrice.toFixed(2)} call is up ${(profitLossPct * 100).toFixed(0)}%. ` +
            `Consider taking profits on some or all contracts.`,
          rationale: `Current futures: $${currentPrice.toFixed(2)}. Strike: $${strikePrice.toFixed(2)}. ` +
            `Intrinsic value: $${intrinsicValue.toFixed(4)}/bu. ` +
            `Total position value: ~$${(intrinsicValue * totalBushels).toLocaleString()}.`,
          marketContext: {
            futuresPrice: currentPrice,
            futuresMonth: position.futuresMonth,
            callOptionContext: {
              strikePrice,
              premium,
              intrinsicValue,
              daysToExpiration,
              profitLoss,
              profitLossPct,
              contracts,
              totalBushels
            }
          },
          recommendedAction: `Consider selling ${Math.ceil(contracts / 2)} contracts to lock in gains while maintaining some upside exposure.`,
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        });
      }

      // 3. Deep in-the-money alert (consider exercising or rolling)
      if (intrinsicValue > premium * 2 && daysToExpiration > 14) {
        signals.push({
          businessId,
          grainEntityId: position.grainEntityId || undefined,
          signalType: MarketingSignalType.CALL_OPTION,
          commodityType,
          strength: SignalStrength.BUY,
          cropYear,
          isNewCrop,
          currentPrice,
          breakEvenPrice,
          priceAboveBreakeven: currentPrice - breakEvenPrice,
          percentAboveBreakeven: breakEvenPrice > 0 ? (currentPrice - breakEvenPrice) / breakEvenPrice : 0,
          title: `[${cropYearLabel}] ${commodityType} Call Deep ITM - Consider Rolling`,
          summary: `Your $${strikePrice.toFixed(2)} call is deep in-the-money. ` +
            `Consider rolling to a higher strike to capture more time value.`,
          rationale: `Current futures: $${currentPrice.toFixed(2)} is $${(currentPrice - strikePrice).toFixed(2)} above strike. ` +
            `Rolling up could free up capital and maintain upside exposure with less risk.`,
          marketContext: {
            futuresPrice: currentPrice,
            futuresMonth: position.futuresMonth,
            callOptionContext: {
              strikePrice,
              premium,
              intrinsicValue,
              daysToExpiration,
              profitLoss,
              profitLossPct,
              contracts,
              totalBushels
            }
          },
          recommendedAction: `Consider selling current calls and buying higher strike calls to lock in gains.`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
      }
    }

    return signals;
  }

  // ===== Trade Policy Signal Generation =====

  /**
   * Generate signals based on trade policy news (China tariffs, trade deals, export restrictions, etc.)
   * These are higher-level macro signals that affect marketing decisions across commodities.
   */
  private async generateTradePolicySignals(
    businessId: string,
    enabledCommodities: CommodityType[]
  ): Promise<GeneratedSignal[]> {
    const signals: GeneratedSignal[] = [];

    try {
      // Get recent trade policy news from the past 48 hours
      const recentNews = await prisma.marketNews.findMany({
        where: {
          newsType: { in: ['TRADE', 'POLICY'] },
          publishedAt: {
            gte: new Date(Date.now() - 48 * 60 * 60 * 1000) // Last 48 hours
          },
          importance: { in: ['HIGH', 'MEDIUM'] },
          // Only news relevant to enabled commodities
          relevantCommodities: {
            hasSome: enabledCommodities
          }
        },
        orderBy: { publishedAt: 'desc' },
        take: 10
      });

      // Also check for breaking news specifically
      const breakingNews = await prisma.marketNews.findMany({
        where: {
          isBreakingNews: true,
          publishedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          },
          relevantCommodities: {
            hasSome: enabledCommodities
          }
        },
        orderBy: { publishedAt: 'desc' },
        take: 5
      });

      // Combine and deduplicate
      const allNews = [...breakingNews, ...recentNews];
      const seenIds = new Set<string>();
      const uniqueNews = allNews.filter(n => {
        if (seenIds.has(n.id)) return false;
        seenIds.add(n.id);
        return true;
      });

      // Process each significant news item
      for (const news of uniqueNews) {
        // Skip if we already have a recent signal for this news
        const existingSignal = await prisma.marketingSignal.findFirst({
          where: {
            businessId,
            signalType: { in: ['TRADE_POLICY', 'BREAKING_NEWS'] },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            title: { contains: news.title.substring(0, 50) }
          }
        });

        if (existingSignal) continue;

        // Analyze the trade policy news
        const analysis = await this.newsSentimentService.analyzeTradePolicyNews(
          news.title,
          news.summary || news.content || undefined
        );

        // Determine event type from news
        const eventType = this.classifyTradeEvent(news.title, news.summary || '');

        // Only generate signal if impact is significant
        const hasSignificantImpact = Math.abs(analysis.priceImpactEstimate.corn) >= 3 ||
          Math.abs(analysis.priceImpactEstimate.soybeans) >= 3 ||
          Math.abs(analysis.priceImpactEstimate.wheat) >= 3;

        if (!hasSignificantImpact && analysis.urgency === 'MONITOR') {
          continue; // Skip minor news
        }

        // Generate signals for each affected commodity that's enabled
        for (const commodity of analysis.affectedCommodities) {
          if (!enabledCommodities.includes(commodity)) continue;

          // Get current price for context
          const futuresQuote = await this.marketDataService.getNearestFuturesQuote(commodity);
          if (!futuresQuote) continue;

          const currentPrice = futuresQuote.closePrice;
          const avgBasis = await this.marketDataService.getAverageBasis(commodity);
          const cashPrice = currentPrice + avgBasis;

          // Get estimated impact for this commodity
          const impactPct = commodity === CommodityType.CORN
            ? analysis.priceImpactEstimate.corn
            : commodity === CommodityType.SOYBEANS
              ? analysis.priceImpactEstimate.soybeans
              : analysis.priceImpactEstimate.wheat;

          // Determine signal strength based on analysis
          let strength: SignalStrength;
          let signalType: MarketingSignalType = news.isBreakingNews
            ? MarketingSignalType.BREAKING_NEWS
            : MarketingSignalType.TRADE_POLICY;

          // Bearish news = recommend selling, Bullish news = recommend holding/waiting
          if (analysis.sentiment === 'BEARISH' && analysis.urgency === 'IMMEDIATE') {
            strength = SignalStrength.STRONG_BUY; // Strong sell signal (sell now before prices drop)
          } else if (analysis.sentiment === 'BEARISH' && analysis.urgency === 'SOON') {
            strength = SignalStrength.BUY; // Moderate sell signal
          } else if (analysis.sentiment === 'BULLISH' && analysis.urgency === 'IMMEDIATE') {
            strength = SignalStrength.HOLD; // Hold - prices may rise
          } else if (analysis.sentiment === 'BULLISH' && analysis.urgency === 'SOON') {
            strength = SignalStrength.HOLD; // Monitor for rally
          } else {
            strength = SignalStrength.HOLD;
          }

          // Build title based on event type and urgency
          const urgencyPrefix = analysis.urgency === 'IMMEDIATE' ? '🚨 URGENT: '
            : analysis.urgency === 'SOON' ? '⚠️ '
              : '';

          const title = `${urgencyPrefix}${commodity} Trade Policy Alert - ${eventType.replace('_', ' ')}`;

          // Estimate target price based on impact
          const estimatedTargetPrice = cashPrice * (1 + impactPct / 100);

          // Build summary
          const sentimentEmoji = analysis.sentiment === 'BEARISH' ? '📉' : analysis.sentiment === 'BULLISH' ? '📈' : '➡️';
          const summary = `${sentimentEmoji} ${news.title}. Estimated ${commodity} impact: ${impactPct > 0 ? '+' : ''}${impactPct}%.`;

          // Build rationale
          const rationale = `${analysis.marketingRecommendation} ` +
            `Source: ${news.source}. ` +
            `Published: ${news.publishedAt.toLocaleString()}. ` +
            `Historical trade policy impacts: China tariffs (2018) dropped soybeans ~20%, corn ~10%. ` +
            `Trade deal announcements typically rally prices 5-10%.`;

          // Build recommended action
          let recommendedAction: string;
          if (analysis.sentiment === 'BEARISH') {
            recommendedAction = impactPct <= -10
              ? `Consider accelerating sales. Lock in current prices before potential ${Math.abs(impactPct)}% decline.`
              : `Monitor closely. Consider partial sales if you have unpriced bushels. Potential ${Math.abs(impactPct)}% price risk.`;
          } else if (analysis.sentiment === 'BULLISH') {
            recommendedAction = `Hold unpriced bushels. Potential rally of ${impactPct}% possible. Wait for price improvement before selling.`;
          } else {
            recommendedAction = `Monitor developments. Keep flexible marketing plan. Set price alerts at key levels.`;
          }

          // Determine crop year from futures
          const { cropYear, isNewCrop } = determineCropYear(
            commodity,
            futuresQuote.contractMonth,
            futuresQuote.contractYear
          );
          const cropYearLabel = isNewCrop ? `${cropYear} New Crop` : `${cropYear} Old Crop`;

          signals.push({
            businessId,
            signalType,
            commodityType: commodity,
            strength,
            cropYear,
            isNewCrop,
            currentPrice: cashPrice,
            breakEvenPrice: cashPrice, // Use current as baseline for trade policy
            targetPrice: estimatedTargetPrice,
            priceAboveBreakeven: 0,
            percentAboveBreakeven: 0,
            title: `[${cropYearLabel}] ${title}`,
            summary,
            rationale,
            marketContext: {
              futuresPrice: currentPrice,
              futuresMonth: futuresQuote.contractMonth,
              basisLevel: avgBasis,
              tradePolicyContext: {
                eventType,
                countries: this.extractCountries(news.title + ' ' + (news.summary || '')),
                priceImpactEstimate: impactPct,
                urgency: analysis.urgency,
                headline: news.title,
                analysis: analysis.marketingRecommendation
              },
              newsSentiment: analysis.sentiment
            },
            recommendedAction,
            expiresAt: new Date(Date.now() + (analysis.urgency === 'IMMEDIATE' ? 24 : 72) * 60 * 60 * 1000)
          });
        }
      }
    } catch (error) {
      console.error('Error generating trade policy signals:', error);
    }

    return signals;
  }

  /**
   * Classify the type of trade event from headline/summary
   */
  private classifyTradeEvent(headline: string, summary: string): 'TARIFF' | 'TRADE_DEAL' | 'EXPORT_BAN' | 'POLICY_CHANGE' {
    const text = (headline + ' ' + summary).toLowerCase();

    if (text.includes('tariff') || text.includes('duties') || text.includes('levy')) {
      return 'TARIFF';
    }
    if (text.includes('trade deal') || text.includes('agreement') || text.includes('phase one') ||
        text.includes('negotiation') || text.includes('trade war') && text.includes('end')) {
      return 'TRADE_DEAL';
    }
    if (text.includes('ban') || text.includes('restrict') || text.includes('embargo') ||
        text.includes('halt') || text.includes('suspend export')) {
      return 'EXPORT_BAN';
    }
    return 'POLICY_CHANGE';
  }

  /**
   * Extract countries mentioned in trade news
   */
  private extractCountries(text: string): string[] {
    const countries: string[] = [];
    const textLower = text.toLowerCase();

    const countryPatterns = [
      { pattern: /china|chinese|beijing/i, name: 'China' },
      { pattern: /brazil|brazilian/i, name: 'Brazil' },
      { pattern: /argentina|argentine/i, name: 'Argentina' },
      { pattern: /russia|russian|moscow/i, name: 'Russia' },
      { pattern: /ukraine|ukrainian|kyiv/i, name: 'Ukraine' },
      { pattern: /mexico|mexican/i, name: 'Mexico' },
      { pattern: /canada|canadian/i, name: 'Canada' },
      { pattern: /eu|europe|european union/i, name: 'EU' },
      { pattern: /india|indian/i, name: 'India' },
      { pattern: /japan|japanese/i, name: 'Japan' },
    ];

    for (const { pattern, name } of countryPatterns) {
      if (pattern.test(text)) {
        countries.push(name);
      }
    }

    return countries.length > 0 ? countries : ['Global'];
  }

  // ===== Helper Methods =====

  private async getOrCreatePreferences(businessId: string): Promise<MarketingPreferences> {
    let prefs = await prisma.marketingPreferences.findUnique({
      where: { businessId }
    });

    if (!prefs) {
      prefs = await prisma.marketingPreferences.create({
        data: { businessId }
      });
    }

    return {
      id: prefs.id,
      businessId: prefs.businessId,
      enablePushNotifications: prefs.enablePushNotifications,
      enableEmailNotifications: prefs.enableEmailNotifications,
      enableInAppNotifications: prefs.enableInAppNotifications,
      quietHoursStart: prefs.quietHoursStart || undefined,
      quietHoursEnd: prefs.quietHoursEnd || undefined,
      cornEnabled: prefs.cornEnabled,
      soybeansEnabled: prefs.soybeansEnabled,
      wheatEnabled: prefs.wheatEnabled,
      cashSaleSignals: prefs.cashSaleSignals,
      basisContractSignals: prefs.basisContractSignals,
      htaSignals: prefs.htaSignals,
      accumulatorSignals: prefs.accumulatorSignals,
      accumulatorInquirySignals: (prefs as any).accumulatorInquirySignals ?? true,
      optionsSignals: prefs.optionsSignals,
      riskTolerance: prefs.riskTolerance as RiskTolerance,
      targetProfitMargin: Number(prefs.targetProfitMargin),
      minAboveBreakeven: Number(prefs.minAboveBreakeven),
      accumulatorMinPrice: (prefs as any).accumulatorMinPrice ? Number((prefs as any).accumulatorMinPrice) : undefined,
      accumulatorPercentAboveBreakeven: (prefs as any).accumulatorPercentAboveBreakeven ? Number((prefs as any).accumulatorPercentAboveBreakeven) : undefined,
      accumulatorMarketingPercent: (prefs as any).accumulatorMarketingPercent ? Number((prefs as any).accumulatorMarketingPercent) : undefined,
      // Pre-harvest marketing targets
      preHarvestTargetCorn: prefs.preHarvestTargetCorn ? Number(prefs.preHarvestTargetCorn) : 0.50,
      preHarvestTargetSoybeans: prefs.preHarvestTargetSoybeans ? Number(prefs.preHarvestTargetSoybeans) : 0.50,
      preHarvestTargetWheat: prefs.preHarvestTargetWheat ? Number(prefs.preHarvestTargetWheat) : 0.50,
      maxSingleSalePercent: prefs.maxSingleSalePercent ? Number(prefs.maxSingleSalePercent) : 0.25,
      createdAt: prefs.createdAt,
      updatedAt: prefs.updatedAt
    };
  }

  private getEnabledCommodities(preferences: MarketingPreferences): CommodityType[] {
    const enabled: CommodityType[] = [];
    if (preferences.cornEnabled) enabled.push(CommodityType.CORN);
    if (preferences.soybeansEnabled) enabled.push(CommodityType.SOYBEANS);
    if (preferences.wheatEnabled) enabled.push(CommodityType.WHEAT);
    return enabled;
  }

  // ===== Marketing Position Tracking =====

  /**
   * Get marketing positions for each commodity to track remaining bushels
   * and progress toward pre-harvest marketing targets.
   */
  async getMarketingPositions(
    businessId: string,
    year: number,
    preferences: MarketingPreferences
  ): Promise<Map<CommodityType, MarketingPosition>> {
    const positions = new Map<CommodityType, MarketingPosition>();

    // Get production analytics from grain analytics service
    const analytics = await this.grainAnalyticsService.getDashboardSummary(businessId, { year });

    // Determine if harvest has started (rough estimate based on month)
    const currentMonth = new Date().getMonth();
    const harvestMonths: Record<CommodityType, number[]> = {
      CORN: [8, 9, 10, 11],     // Sept-Dec
      SOYBEANS: [8, 9, 10, 11], // Sept-Dec
      WHEAT: [5, 6, 7]          // June-Aug
    };

    for (const commodityData of analytics.byCommodity) {
      const commodity = commodityData.commodityType as CommodityType;

      // Get pre-harvest target for this commodity
      let preHarvestTarget = 0.50; // Default 50%
      if (commodity === CommodityType.CORN) {
        preHarvestTarget = preferences.preHarvestTargetCorn || 0.50;
      } else if (commodity === CommodityType.SOYBEANS) {
        preHarvestTarget = preferences.preHarvestTargetSoybeans || 0.50;
      } else if (commodity === CommodityType.WHEAT) {
        preHarvestTarget = preferences.preHarvestTargetWheat || 0.50;
      }

      const totalProjected = commodityData.projected;
      const totalSold = commodityData.sold;
      const remaining = totalProjected - totalSold;
      const percentSold = totalProjected > 0 ? totalSold / totalProjected : 0;

      // Calculate how much more to sell to reach target
      const targetBushels = totalProjected * preHarvestTarget;
      const bushelsToTarget = Math.max(0, targetBushels - totalSold);
      const percentToTarget = preHarvestTarget - percentSold;

      // Check if harvest has started for this commodity
      const isHarvestComplete = harvestMonths[commodity]?.includes(currentMonth) ||
        currentMonth > Math.max(...(harvestMonths[commodity] || [9]));

      // Calculate weighted average sale price from contracts
      const contracts = analytics.byEntity
        .filter((e: { commodityType: string }) => e.commodityType === commodity)
        .flatMap((e: { contracts: any[] }) => e.contracts);

      let totalValue = 0;
      let totalContractedBushels = 0;
      for (const contract of contracts) {
        if (contract.bushels && contract.cashPrice) {
          totalValue += contract.bushels * contract.cashPrice;
          totalContractedBushels += contract.bushels;
        }
      }
      const averageSalePrice = totalContractedBushels > 0 ? totalValue / totalContractedBushels : 0;

      positions.set(commodity, {
        commodityType: commodity,
        year,
        totalProjectedBushels: totalProjected,
        totalContractedBushels: totalSold,
        remainingBushels: remaining,
        percentSold,
        preHarvestTarget,
        percentToTarget: Math.max(0, percentToTarget),
        bushelsToTarget,
        isHarvestComplete,
        averageSalePrice
      });
    }

    return positions;
  }

  /**
   * Calculate the maximum bushels that can be recommended for a single signal
   * based on remaining bushels, pre-harvest target, and max single sale percent.
   */
  private calculateMaxRecommendedBushels(
    position: MarketingPosition,
    preferences: MarketingPreferences,
    sellPercentage: number
  ): number {
    const maxSingleSale = preferences.maxSingleSalePercent || 0.25;

    // Can't sell more than remaining bushels
    const maxFromRemaining = position.remainingBushels;

    // Can't sell more than max single sale percentage of total
    const maxFromSingleSale = position.totalProjectedBushels * maxSingleSale;

    // If pre-harvest and not yet at target, cap at bushels to target
    // But if already past harvest or past target, use remaining bushels
    let maxFromTarget = position.remainingBushels;
    if (!position.isHarvestComplete && position.bushelsToTarget > 0) {
      // Don't recommend more than what's needed to reach pre-harvest target
      maxFromTarget = Math.min(position.bushelsToTarget, position.remainingBushels);
    }

    // Calculate desired amount based on sell percentage
    const desiredBushels = position.remainingBushels * sellPercentage;

    // Take the minimum of all constraints
    return Math.round(Math.min(
      desiredBushels,
      maxFromRemaining,
      maxFromSingleSale,
      maxFromTarget
    ));
  }

  private mapToMarketingSignal(dbSignal: any): MarketingSignal {
    return {
      id: dbSignal.id,
      businessId: dbSignal.businessId,
      grainEntityId: dbSignal.grainEntityId || undefined,
      signalType: dbSignal.signalType as MarketingSignalType,
      commodityType: dbSignal.commodityType as CommodityType,
      strength: dbSignal.strength as SignalStrength,
      status: dbSignal.status as SignalStatus,
      cropYear: dbSignal.cropYear || undefined,
      isNewCrop: dbSignal.isNewCrop || false,
      currentPrice: Number(dbSignal.currentPrice),
      breakEvenPrice: Number(dbSignal.breakEvenPrice),
      targetPrice: dbSignal.targetPrice ? Number(dbSignal.targetPrice) : undefined,
      priceAboveBreakeven: Number(dbSignal.priceAboveBreakeven),
      percentAboveBreakeven: Number(dbSignal.percentAboveBreakeven),
      title: dbSignal.title,
      summary: dbSignal.summary,
      rationale: dbSignal.rationale || undefined,
      aiAnalysis: dbSignal.aiAnalysis || undefined,
      aiAnalyzedAt: dbSignal.aiAnalyzedAt || undefined,
      marketContext: dbSignal.marketContext || undefined,
      recommendedBushels: dbSignal.recommendedBushels ? Number(dbSignal.recommendedBushels) : undefined,
      recommendedAction: dbSignal.recommendedAction || undefined,
      expiresAt: dbSignal.expiresAt || undefined,
      viewedAt: dbSignal.viewedAt || undefined,
      actionTaken: dbSignal.actionTaken || undefined,
      actionTakenAt: dbSignal.actionTakenAt || undefined,
      dismissedAt: dbSignal.dismissedAt || undefined,
      dismissReason: dbSignal.dismissReason || undefined,
      createdAt: dbSignal.createdAt,
      updatedAt: dbSignal.updatedAt
    };
  }

  // ===== Signal Retrieval =====

  async getSignalsForBusiness(
    businessId: string,
    options?: {
      status?: SignalStatus;
      signalType?: MarketingSignalType;
      commodityType?: CommodityType;
      limit?: number;
      offset?: number;
    }
  ): Promise<MarketingSignal[]> {
    const where: any = { businessId };

    if (options?.status) where.status = options.status;
    if (options?.signalType) where.signalType = options.signalType;
    if (options?.commodityType) where.commodityType = options.commodityType;

    const signals = await prisma.marketingSignal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0
    });

    return signals.map(s => this.mapToMarketingSignal(s));
  }

  async getSignalById(signalId: string): Promise<MarketingSignal | null> {
    const signal = await prisma.marketingSignal.findUnique({
      where: { id: signalId }
    });

    return signal ? this.mapToMarketingSignal(signal) : null;
  }

  async dismissSignal(signalId: string, reason?: string): Promise<MarketingSignal> {
    const updated = await prisma.marketingSignal.update({
      where: { id: signalId },
      data: {
        status: 'DISMISSED',
        dismissedAt: new Date(),
        dismissReason: reason
      }
    });

    return this.mapToMarketingSignal(updated);
  }

  async recordSignalAction(signalId: string, action: string): Promise<MarketingSignal> {
    const updated = await prisma.marketingSignal.update({
      where: { id: signalId },
      data: {
        status: 'TRIGGERED',
        actionTaken: action,
        actionTakenAt: new Date()
      }
    });

    return this.mapToMarketingSignal(updated);
  }

  async markSignalViewed(signalId: string): Promise<void> {
    await prisma.marketingSignal.update({
      where: { id: signalId },
      data: { viewedAt: new Date() }
    });
  }

  // ===== Expire Old Signals =====

  async expireOldSignals(): Promise<number> {
    const result = await prisma.marketingSignal.updateMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lt: new Date() }
      },
      data: { status: 'EXPIRED' }
    });

    return result.count;
  }
}
