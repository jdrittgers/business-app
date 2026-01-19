import { prisma } from '../prisma/client';
import { MarketDataService } from './market-data.service';
import { BreakEvenAnalyticsService } from './breakeven-analytics.service';
import {
  CommodityType,
  MarketingSignalType,
  SignalStrength,
  SignalStatus,
  MarketingSignal,
  MarketingPreferences,
  RiskTolerance,
  MarketContext,
  AccumulatorAnalysis
} from '@business-app/shared';

interface GeneratedSignal {
  businessId: string;
  grainEntityId?: string;
  signalType: MarketingSignalType;
  commodityType: CommodityType;
  strength: SignalStrength;
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

// Risk tolerance multipliers for signal thresholds
const RISK_MULTIPLIERS: Record<RiskTolerance, number> = {
  CONSERVATIVE: 1.5,  // Higher thresholds needed
  MODERATE: 1.0,      // Default thresholds
  AGGRESSIVE: 0.7     // Lower thresholds trigger signals
};

export class SignalGenerationService {
  private marketDataService: MarketDataService;
  private breakEvenService: BreakEvenAnalyticsService;

  constructor() {
    this.marketDataService = new MarketDataService();
    this.breakEvenService = new BreakEvenAnalyticsService();
  }

  // ===== Main Signal Generation =====

  async generateSignalsForBusiness(businessId: string): Promise<MarketingSignal[]> {
    // Get marketing preferences
    const preferences = await this.getOrCreatePreferences(businessId);

    // Get break-even data
    const currentYear = new Date().getFullYear();
    const breakEvens = await this.breakEvenService.getOperationBreakEven(businessId, { year: currentYear });

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

      const currentCashPrice = this.marketDataService.calculateCashPrice(
        futuresQuote.closePrice,
        avgBasis
      );

      const breakEvenPrice = commodityData.breakEvenPrice;
      const priceAboveBreakeven = currentCashPrice - breakEvenPrice;
      const percentAboveBreakeven = breakEvenPrice > 0 ? priceAboveBreakeven / breakEvenPrice : 0;

      const marketContext: MarketContext = {
        futuresPrice: futuresQuote.closePrice,
        futuresMonth: futuresQuote.contractMonth,
        futuresTrend: trendAnalysis.trend,
        basisLevel: avgBasis,
        basisVsHistorical: avgBasis > -0.10 ? 'STRONG' : avgBasis > -0.20 ? 'AVERAGE' : 'WEAK',
        rsiValue: trendAnalysis.rsi,
        movingAverage20: trendAnalysis.movingAverage20,
        movingAverage50: trendAnalysis.movingAverage50,
        volatility: trendAnalysis.volatility
      };

      // Generate signals for each enabled marketing tool
      if (preferences.cashSaleSignals) {
        const cashSignal = this.evaluateCashSaleSignal(
          businessId,
          commodity,
          currentCashPrice,
          breakEvenPrice,
          commodityData.expectedBushels,
          preferences,
          marketContext,
          trendAnalysis
        );
        if (cashSignal) allSignals.push(cashSignal);
      }

      if (preferences.basisContractSignals) {
        const basisSignal = await this.evaluateBasisSignal(
          businessId,
          commodity,
          futuresQuote.closePrice,
          avgBasis,
          breakEvenPrice,
          commodityData.expectedBushels,
          preferences,
          marketContext
        );
        if (basisSignal) allSignals.push(basisSignal);
      }

      if (preferences.htaSignals) {
        const htaSignal = this.evaluateHTASignal(
          businessId,
          commodity,
          futuresQuote.closePrice,
          avgBasis,
          breakEvenPrice,
          commodityData.expectedBushels,
          preferences,
          marketContext
        );
        if (htaSignal) allSignals.push(htaSignal);
      }
    }

    // Generate accumulator signals
    if (preferences.accumulatorSignals) {
      const accumulatorSignals = await this.generateAccumulatorSignals(businessId);
      allSignals.push(...accumulatorSignals);
    }

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
    trendAnalysis: any
  ): GeneratedSignal | null {
    const riskMultiplier = RISK_MULTIPLIERS[preferences.riskTolerance];
    const targetMargin = Number(preferences.targetProfitMargin);
    const minAboveBE = Number(preferences.minAboveBreakeven);

    const priceAboveBreakeven = currentPrice - breakEvenPrice;
    const percentAboveBreakeven = breakEvenPrice > 0 ? priceAboveBreakeven / breakEvenPrice : 0;

    let strength: SignalStrength;
    let title: string;
    let summary: string;
    let rationale: string;
    let recommendedAction: string;
    let recommendedBushels: number | undefined;

    // Determine signal strength based on conditions
    if (percentAboveBreakeven >= 0.15 / riskMultiplier &&
        trendAnalysis.trend === 'DOWN' &&
        trendAnalysis.rsi > 70) {
      // STRONG_BUY: High profit margin + downward momentum + overbought
      strength = SignalStrength.STRONG_BUY;
      title = `Strong ${commodityType} Cash Sale Opportunity`;
      summary = `${commodityType} is ${(percentAboveBreakeven * 100).toFixed(1)}% above break-even with downward price momentum.`;
      rationale = `Price shows overbought conditions (RSI: ${trendAnalysis.rsi.toFixed(0)}) with downward trend. Consider locking in profits before potential decline.`;
      recommendedAction = 'Sell 20-30% of remaining bushels at cash market';
      recommendedBushels = Math.round(totalBushels * 0.25);
    } else if (percentAboveBreakeven >= 0.10 / riskMultiplier &&
               priceAboveBreakeven >= targetMargin) {
      // BUY: Above target profit margin
      strength = SignalStrength.BUY;
      title = `${commodityType} Cash Sale Signal`;
      summary = `${commodityType} is $${priceAboveBreakeven.toFixed(2)}/bu above break-even, exceeding your target margin.`;
      rationale = `Current profit margin of $${priceAboveBreakeven.toFixed(2)}/bu exceeds your target of $${targetMargin.toFixed(2)}/bu.`;
      recommendedAction = 'Consider selling 10-15% of remaining bushels';
      recommendedBushels = Math.round(totalBushels * 0.125);
    } else if (percentAboveBreakeven >= minAboveBE && percentAboveBreakeven < 0.10) {
      // HOLD: Profitable but below target
      strength = SignalStrength.HOLD;
      title = `${commodityType} Market Watch`;
      summary = `${commodityType} is profitable but below target margin. Monitor for better opportunities.`;
      rationale = `Current price $${currentPrice.toFixed(2)} is ${(percentAboveBreakeven * 100).toFixed(1)}% above break-even of $${breakEvenPrice.toFixed(2)}.`;
      recommendedAction = 'Hold current position, set price alerts';
      recommendedBushels = undefined;
    } else if (percentAboveBreakeven < minAboveBE && percentAboveBreakeven >= 0) {
      // SELL: Near or at break-even - caution
      strength = SignalStrength.SELL;
      title = `${commodityType} Break-Even Alert`;
      summary = `${commodityType} is near break-even. Selling now would yield minimal profit.`;
      rationale = `Price margin of $${priceAboveBreakeven.toFixed(2)}/bu is below minimum threshold.`;
      recommendedAction = 'Consider hedging strategies to protect downside';
      recommendedBushels = undefined;
    } else {
      // STRONG_SELL: Below break-even
      strength = SignalStrength.STRONG_SELL;
      title = `${commodityType} Below Break-Even Warning`;
      summary = `${commodityType} is currently below your break-even price by $${Math.abs(priceAboveBreakeven).toFixed(2)}/bu.`;
      rationale = `Current market price of $${currentPrice.toFixed(2)} is below break-even of $${breakEvenPrice.toFixed(2)}. Avoid cash sales at current levels.`;
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

  // ===== Basis Signal Evaluation =====

  private async evaluateBasisSignal(
    businessId: string,
    commodityType: CommodityType,
    futuresPrice: number,
    currentBasis: number,
    breakEvenPrice: number,
    totalBushels: number,
    preferences: MarketingPreferences,
    marketContext: MarketContext
  ): Promise<GeneratedSignal | null> {
    const riskMultiplier = RISK_MULTIPLIERS[preferences.riskTolerance];

    // Get historical basis percentile
    const basisPercentile = await this.marketDataService.getBasisPercentile(commodityType, currentBasis);
    const currentCashPrice = futuresPrice + currentBasis;
    const priceAboveBreakeven = currentCashPrice - breakEvenPrice;
    const percentAboveBreakeven = breakEvenPrice > 0 ? priceAboveBreakeven / breakEvenPrice : 0;

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
      recommendedAction = 'Lock basis on 15-25% of unpriced bushels';
      recommendedBushels = Math.round(totalBushels * 0.20);
    } else if (basisPercentile >= 50 / riskMultiplier) {
      // Above average basis
      strength = SignalStrength.BUY;
      title = `${commodityType} Basis Signal`;
      summary = `${commodityType} basis at ${currentBasis.toFixed(2)} is above historical average.`;
      rationale = `Basis is in the ${basisPercentile.toFixed(0)}th percentile. Consider partial basis contract.`;
      recommendedAction = 'Consider locking basis on 10% of bushels';
      recommendedBushels = Math.round(totalBushels * 0.10);
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
    marketContext: MarketContext
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
      recommendedAction = 'Consider HTA on 15-20% of production';
      recommendedBushels = Math.round(totalBushels * 0.175);
    } else if (futuresAboveBE >= 0.10 / riskMultiplier && basisWeak) {
      // Good HTA opportunity
      strength = SignalStrength.BUY;
      title = `${commodityType} HTA Signal`;
      summary = `${commodityType} futures offer protection with potential basis upside.`;
      rationale = `Lock in futures protection at $${futuresPrice.toFixed(2)} while keeping basis open.`;
      recommendedAction = 'Consider HTA on 10% of unpriced bushels';
      recommendedBushels = Math.round(totalBushels * 0.10);
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

      // Calculate knockout risk
      const priceToKnockout = (knockoutPrice - currentPrice) / knockoutPrice;

      // Check for knockout warning
      if (priceToKnockout <= 0.05 && !details.knockoutReached) {
        signals.push({
          businessId,
          grainEntityId: contract.grainEntityId,
          signalType: MarketingSignalType.ACCUMULATOR_STRATEGY,
          commodityType,
          strength: SignalStrength.STRONG_SELL,
          currentPrice,
          breakEvenPrice: Number(contract.cashPrice || doubleUpPrice),
          priceAboveBreakeven: 0,
          percentAboveBreakeven: 0,
          title: `${commodityType} Accumulator Knockout Warning`,
          summary: `Price is within 5% of knockout level ($${knockoutPrice.toFixed(2)}). Consider exit strategy.`,
          rationale: `Current price $${currentPrice.toFixed(2)} is approaching knockout at $${knockoutPrice.toFixed(2)}. Only ${(priceToKnockout * 100).toFixed(1)}% away.`,
          marketContext: {
            futuresPrice: currentPrice,
            futuresMonth: futuresQuote.contractMonth
          },
          recommendedAction: 'Review accumulator position and consider protective puts',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day
        });
      }

      // Check for double-up opportunity
      if (currentPrice < doubleUpPrice && !details.isCurrentlyDoubled) {
        signals.push({
          businessId,
          grainEntityId: contract.grainEntityId,
          signalType: MarketingSignalType.ACCUMULATOR_STRATEGY,
          commodityType,
          strength: SignalStrength.BUY,
          currentPrice,
          breakEvenPrice: Number(contract.cashPrice || doubleUpPrice),
          priceAboveBreakeven: 0,
          percentAboveBreakeven: 0,
          title: `${commodityType} Accumulator Double-Up Active`,
          summary: `Price below double-up level means 2x daily accumulation.`,
          rationale: `Current price $${currentPrice.toFixed(2)} is below double-up trigger at $${doubleUpPrice.toFixed(2)}. You're accumulating ${Number(details.dailyBushels) * 2} bushels/day.`,
          marketContext: {
            futuresPrice: currentPrice,
            futuresMonth: futuresQuote.contractMonth
          },
          recommendedAction: 'Monitor position - double accumulation is active',
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
        });
      }
    }

    return signals;
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
      optionsSignals: prefs.optionsSignals,
      riskTolerance: prefs.riskTolerance as RiskTolerance,
      targetProfitMargin: Number(prefs.targetProfitMargin),
      minAboveBreakeven: Number(prefs.minAboveBreakeven),
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

  private mapToMarketingSignal(dbSignal: any): MarketingSignal {
    return {
      id: dbSignal.id,
      businessId: dbSignal.businessId,
      grainEntityId: dbSignal.grainEntityId || undefined,
      signalType: dbSignal.signalType as MarketingSignalType,
      commodityType: dbSignal.commodityType as CommodityType,
      strength: dbSignal.strength as SignalStrength,
      status: dbSignal.status as SignalStatus,
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
