import { prisma } from '../prisma/client';
import { MarketDataService } from './market-data.service';
import {
  CommodityType,
  MarketingSignalType,
  SignalStrength,
  UserMarketingProfile,
  MarketingDecision,
  SignalInteraction,
  LearnedThreshold,
  LearningInsights,
  RecordDecisionRequest,
  RecordInteractionRequest,
  SignalInteractionType,
  RiskTolerance
} from '@business-app/shared';

// Default thresholds (before personalization)
const DEFAULT_THRESHOLDS = {
  STRONG_BUY: 0.15, // 15% above break-even
  BUY: 0.10 // 10% above break-even
};

// Minimum data points needed for confident learning
const MIN_DATA_POINTS_FOR_LEARNING = 5;
const MIN_DATA_POINTS_FOR_HIGH_CONFIDENCE = 20;

export class MarketingLearningService {
  private marketDataService: MarketDataService;

  constructor() {
    this.marketDataService = new MarketDataService();
  }

  // ===== Profile Management =====

  async getOrCreateProfile(userId: string): Promise<UserMarketingProfile> {
    let profile = await prisma.userMarketingProfile.findUnique({
      where: { userId }
    });

    if (!profile) {
      profile = await prisma.userMarketingProfile.create({
        data: { userId }
      });
    }

    return this.mapToUserMarketingProfile(profile);
  }

  async getProfile(userId: string): Promise<UserMarketingProfile | null> {
    const profile = await prisma.userMarketingProfile.findUnique({
      where: { userId }
    });

    return profile ? this.mapToUserMarketingProfile(profile) : null;
  }

  // ===== Interaction Tracking =====

  async recordSignalInteraction(
    userId: string,
    request: RecordInteractionRequest
  ): Promise<SignalInteraction> {
    const profile = await this.getOrCreateProfile(userId);

    // Get the signal details
    const signal = await prisma.marketingSignal.findUnique({
      where: { id: request.signalId }
    });

    if (!signal) {
      throw new Error('Signal not found');
    }

    // Calculate response time
    const responseTimeMinutes = Math.round(
      (Date.now() - signal.createdAt.getTime()) / (1000 * 60)
    );

    // Create or update interaction
    const interaction = await prisma.signalInteraction.upsert({
      where: {
        profileId_signalId: {
          profileId: profile.id,
          signalId: request.signalId
        }
      },
      update: {
        interactionType: request.interactionType,
        interactionAt: new Date(),
        responseTimeMinutes,
        dismissReason: request.dismissReason,
        actionTaken: request.actionTaken,
        bushelsMarketed: request.bushelsMarketed
      },
      create: {
        profileId: profile.id,
        signalId: request.signalId,
        interactionType: request.interactionType,
        signalCreatedAt: signal.createdAt,
        responseTimeMinutes,
        signalType: signal.signalType as MarketingSignalType,
        signalStrength: signal.strength as SignalStrength,
        commodityType: signal.commodityType as CommodityType,
        priceAtSignal: signal.currentPrice,
        percentAboveBE: signal.percentAboveBreakeven,
        dismissReason: request.dismissReason,
        actionTaken: request.actionTaken,
        bushelsMarketed: request.bushelsMarketed
      }
    });

    // Update profile statistics
    await this.updateProfileStats(profile.id);

    // Trigger learning update if we have enough data
    await this.updateLearnedPreferences(profile.id);

    return this.mapToSignalInteraction(interaction);
  }

  async recordMarketingDecision(
    userId: string,
    businessId: string,
    request: RecordDecisionRequest
  ): Promise<MarketingDecision> {
    const profile = await this.getOrCreateProfile(userId);

    // Get current market context
    const futuresQuote = await this.marketDataService.getNearestFuturesQuote(request.commodityType);
    const avgBasis = await this.marketDataService.getAverageBasis(request.commodityType);
    const trendAnalysis = await this.marketDataService.analyzePriceTrend(request.commodityType);

    // Get break-even for context (would need to look this up from farm data)
    // For now, calculate from price if signal provided
    let breakEvenPrice = request.pricePerBushel * 0.85; // Default assumption: 15% margin
    let percentAboveBE = 0.15;

    if (request.signalId) {
      const signal = await prisma.marketingSignal.findUnique({
        where: { id: request.signalId }
      });
      if (signal) {
        breakEvenPrice = Number(signal.breakEvenPrice);
        percentAboveBE = Number(signal.percentAboveBreakeven);
      }
    }

    const decision = await prisma.marketingDecision.create({
      data: {
        profileId: profile.id,
        businessId,
        commodityType: request.commodityType,
        contractType: request.contractType,
        bushels: request.bushels,
        pricePerBushel: request.pricePerBushel,
        totalValue: request.bushels * request.pricePerBushel,
        breakEvenPrice,
        percentAboveBE,
        futuresPrice: futuresQuote?.closePrice || request.pricePerBushel,
        basisAtSale: avgBasis,
        triggeredBySignalId: request.signalId,
        rsiAtSale: trendAnalysis.rsi,
        trendAtSale: trendAnalysis.trend,
        volatilityAtSale: trendAnalysis.volatility
      }
    });

    // If this was triggered by a signal, record the interaction
    if (request.signalId) {
      await this.recordSignalInteraction(userId, {
        signalId: request.signalId,
        interactionType: 'ACTED',
        actionTaken: `Sold ${request.bushels} bu at $${request.pricePerBushel.toFixed(2)}`,
        bushelsMarketed: request.bushels
      });
    }

    // Update profile with this sale
    await prisma.userMarketingProfile.update({
      where: { id: profile.id },
      data: {
        totalBushelsSold: { increment: request.bushels },
        totalRevenue: { increment: request.bushels * request.pricePerBushel }
      }
    });

    // Trigger learning update
    await this.updateLearnedPreferences(profile.id);

    return this.mapToMarketingDecision(decision);
  }

  // ===== Learning & Analysis =====

  private async updateProfileStats(profileId: string): Promise<void> {
    // Get all interactions for this profile
    const interactions = await prisma.signalInteraction.findMany({
      where: { profileId }
    });

    const totalReceived = interactions.length;
    const actedOn = interactions.filter(i => i.interactionType === 'ACTED').length;
    const dismissed = interactions.filter(i => i.interactionType === 'DISMISSED').length;

    const strongSignals = interactions.filter(i => i.signalStrength === 'STRONG_BUY');
    const strongActedOn = strongSignals.filter(i => i.interactionType === 'ACTED').length;
    const actOnStrongRate = strongSignals.length > 0 ? strongActedOn / strongSignals.length : 0;

    const regularSignals = interactions.filter(i => i.signalStrength === 'BUY');
    const regularActedOn = regularSignals.filter(i => i.interactionType === 'ACTED').length;
    const actOnRegularRate = regularSignals.length > 0 ? regularActedOn / regularSignals.length : 0;

    // Calculate average response time for acted signals
    const actedInteractions = interactions.filter(
      i => i.interactionType === 'ACTED' && i.responseTimeMinutes
    );
    const avgResponseMinutes = actedInteractions.length > 0
      ? actedInteractions.reduce((sum, i) => sum + (i.responseTimeMinutes || 0), 0) / actedInteractions.length
      : null;

    await prisma.userMarketingProfile.update({
      where: { id: profileId },
      data: {
        totalSignalsReceived: totalReceived,
        totalSignalsActedOn: actedOn,
        totalSignalsDismissed: dismissed,
        actOnStrongSignalsRate: actOnStrongRate,
        actOnRegularSignalsRate: actOnRegularRate,
        avgResponseTimeHours: avgResponseMinutes ? avgResponseMinutes / 60 : null,
        lastUpdated: new Date()
      }
    });
  }

  private async updateLearnedPreferences(profileId: string): Promise<void> {
    // Get all decisions for this profile
    const decisions = await prisma.marketingDecision.findMany({
      where: { profileId },
      orderBy: { decisionDate: 'desc' }
    });

    if (decisions.length < MIN_DATA_POINTS_FOR_LEARNING) {
      return; // Not enough data to learn from
    }

    // Calculate learned risk score based on selling behavior
    const avgPercentAboveBE = decisions.reduce((sum, d) => sum + Number(d.percentAboveBE), 0) / decisions.length;

    // Higher % above BE = more conservative (waits for bigger margins)
    // Lower % above BE = more aggressive (sells at smaller margins)
    // Scale: 0-100, where 50 is moderate
    let learnedRiskScore = 50;
    if (avgPercentAboveBE > 0.20) {
      learnedRiskScore = 30; // Conservative - waits for 20%+ margins
    } else if (avgPercentAboveBE > 0.15) {
      learnedRiskScore = 40;
    } else if (avgPercentAboveBE > 0.10) {
      learnedRiskScore = 50; // Moderate
    } else if (avgPercentAboveBE > 0.05) {
      learnedRiskScore = 60;
    } else {
      learnedRiskScore = 70; // Aggressive - sells at small margins
    }

    // Determine preferred sell window based on decision dates
    const monthCounts = { EARLY: 0, MID: 0, LATE: 0 };
    for (const decision of decisions) {
      const month = decision.decisionDate.getMonth();
      if (month >= 0 && month <= 3) monthCounts.EARLY++;
      else if (month >= 4 && month <= 7) monthCounts.MID++;
      else monthCounts.LATE++;
    }
    const preferredWindow = Object.entries(monthCounts)
      .sort(([, a], [, b]) => b - a)[0][0] as 'EARLY' | 'MID' | 'LATE';

    // Calculate commodity preferences
    const commodityCounts: Record<string, number> = {};
    for (const decision of decisions) {
      commodityCounts[decision.commodityType] = (commodityCounts[decision.commodityType] || 0) + 1;
    }
    const totalDecisions = decisions.length;
    const cornPref = ((commodityCounts['CORN'] || 0) / totalDecisions) * 100;
    const soybeansPref = ((commodityCounts['SOYBEANS'] || 0) / totalDecisions) * 100;
    const wheatPref = ((commodityCounts['WHEAT'] || 0) / totalDecisions) * 100;

    // Calculate tool preferences
    const toolCounts: Record<string, number> = {};
    for (const decision of decisions) {
      toolCounts[decision.contractType] = (toolCounts[decision.contractType] || 0) + 1;
    }
    const cashPref = ((toolCounts['CASH'] || 0) / totalDecisions) * 100;
    const basisPref = ((toolCounts['BASIS'] || 0) / totalDecisions) * 100;
    const htaPref = ((toolCounts['HTA'] || 0) / totalDecisions) * 100;
    const accPref = ((toolCounts['ACCUMULATOR'] || 0) / totalDecisions) * 100;

    // Calculate confidence score (higher with more data points)
    const confidenceScore = Math.min(100, (decisions.length / MIN_DATA_POINTS_FOR_HIGH_CONFIDENCE) * 100);

    await prisma.userMarketingProfile.update({
      where: { id: profileId },
      data: {
        learnedRiskScore,
        avgSellPriceAboveBE: avgPercentAboveBE,
        preferredSellWindow: preferredWindow,
        cornPreferenceScore: cornPref,
        soybeansPreferenceScore: soybeansPref,
        wheatPreferenceScore: wheatPref,
        cashSalePreference: cashPref,
        basisContractPreference: basisPref,
        htaPreference: htaPref,
        accumulatorPreference: accPref,
        confidenceScore,
        modelVersion: { increment: 1 },
        lastUpdated: new Date()
      }
    });

    // Update learned thresholds per commodity/signal type
    await this.updateLearnedThresholds(profileId, decisions);
  }

  private async updateLearnedThresholds(
    profileId: string,
    decisions: any[]
  ): Promise<void> {
    // Group decisions by commodity
    const byCommodity = new Map<CommodityType, any[]>();
    for (const decision of decisions) {
      const commodity = decision.commodityType as CommodityType;
      if (!byCommodity.has(commodity)) {
        byCommodity.set(commodity, []);
      }
      byCommodity.get(commodity)!.push(decision);
    }

    // For each commodity, calculate personalized thresholds
    for (const [commodity, commodityDecisions] of byCommodity) {
      if (commodityDecisions.length < 3) continue; // Need at least 3 data points

      // Calculate the average % above BE at which they sell
      const avgPercentAboveBE = commodityDecisions.reduce(
        (sum: number, d: any) => sum + Number(d.percentAboveBE), 0
      ) / commodityDecisions.length;

      // Set thresholds based on their behavior
      // If they consistently sell at 12% above BE, set BUY threshold there
      const buyThreshold = Math.max(0.05, avgPercentAboveBE - 0.02);
      const strongBuyThreshold = avgPercentAboveBE + 0.05;

      // Calculate adjustment from defaults
      const thresholdAdjustment = buyThreshold - DEFAULT_THRESHOLDS.BUY;

      const confidence = Math.min(100, (commodityDecisions.length / 10) * 100);

      // Update for CASH_SALE signal type (most common)
      await prisma.learnedThreshold.upsert({
        where: {
          profileId_commodityType_signalType: {
            profileId,
            commodityType: commodity,
            signalType: 'CASH_SALE'
          }
        },
        update: {
          strongBuyThreshold,
          buyThreshold,
          thresholdAdjustment,
          dataPoints: commodityDecisions.length,
          confidenceScore: confidence,
          lastUpdated: new Date()
        },
        create: {
          profileId,
          commodityType: commodity,
          signalType: 'CASH_SALE',
          strongBuyThreshold,
          buyThreshold,
          thresholdAdjustment,
          dataPoints: commodityDecisions.length,
          confidenceScore: confidence
        }
      });
    }
  }

  // ===== Get Learning Insights =====

  async getLearningInsights(userId: string): Promise<LearningInsights> {
    const profile = await this.getOrCreateProfile(userId);

    // Determine risk label
    let riskLabel: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
    if (profile.learnedRiskScore < 40) {
      riskLabel = 'CONSERVATIVE';
    } else if (profile.learnedRiskScore < 60) {
      riskLabel = 'MODERATE';
    } else {
      riskLabel = 'AGGRESSIVE';
    }

    // Format response time
    let avgResponseTime = 'Unknown';
    if (profile.avgResponseTimeHours) {
      if (profile.avgResponseTimeHours < 1) {
        avgResponseTime = `${Math.round(profile.avgResponseTimeHours * 60)} minutes`;
      } else if (profile.avgResponseTimeHours < 24) {
        avgResponseTime = `${Math.round(profile.avgResponseTimeHours)} hours`;
      } else {
        avgResponseTime = `${Math.round(profile.avgResponseTimeHours / 24)} days`;
      }
    }

    // Get learned thresholds
    const thresholds = await prisma.learnedThreshold.findMany({
      where: { profileId: profile.id }
    });

    const adjustedThresholds = thresholds.map(t => ({
      commodity: t.commodityType as CommodityType,
      signalType: t.signalType as MarketingSignalType,
      suggestedThreshold: Number(t.buyThreshold),
      reason: Number(t.thresholdAdjustment) > 0
        ? `Based on your history, you typically sell at higher margins for ${t.commodityType}`
        : `Based on your history, you're comfortable selling at smaller margins for ${t.commodityType}`
    }));

    // Generate personalized tips
    const tips: string[] = [];

    if (profile.actOnStrongSignalsRate < 0.3) {
      tips.push('You\'ve been missing strong opportunities. Consider acting faster on STRONG_BUY signals.');
    }

    if (profile.avgResponseTimeHours && profile.avgResponseTimeHours > 48) {
      tips.push('Your response time to signals averages over 2 days. Markets can move quickly - consider checking signals more frequently.');
    }

    if (profile.avgSellPriceAboveBE && profile.avgSellPriceAboveBE > 0.18) {
      tips.push('You tend to wait for very high margins (18%+). While this is conservative, you might miss good opportunities.');
    }

    if (profile.cashSalePreference > 70) {
      tips.push('You heavily favor cash sales. Consider diversifying with basis contracts or HTAs to manage risk.');
    }

    const signalActRate = profile.totalSignalsReceived > 0
      ? (profile.totalSignalsActedOn / profile.totalSignalsReceived) * 100
      : 0;

    return {
      userId,
      riskProfile: {
        score: profile.learnedRiskScore,
        label: riskLabel,
        confidence: profile.confidenceScore
      },
      behaviorPatterns: {
        preferredSellWindow: (profile.preferredSellWindow as any) || 'UNKNOWN',
        avgResponseTime,
        signalActRate
      },
      recommendations: {
        adjustedThresholds,
        personalizedTips: tips
      }
    };
  }

  // ===== Get Personalized Thresholds for Signal Generation =====

  async getPersonalizedThresholds(
    userId: string,
    commodityType: CommodityType,
    signalType: MarketingSignalType
  ): Promise<{ strongBuyThreshold: number; buyThreshold: number; confidence: number }> {
    const profile = await this.getProfile(userId);

    if (!profile) {
      return {
        strongBuyThreshold: DEFAULT_THRESHOLDS.STRONG_BUY,
        buyThreshold: DEFAULT_THRESHOLDS.BUY,
        confidence: 0
      };
    }

    const threshold = await prisma.learnedThreshold.findUnique({
      where: {
        profileId_commodityType_signalType: {
          profileId: profile.id,
          commodityType,
          signalType
        }
      }
    });

    if (!threshold || threshold.dataPoints < MIN_DATA_POINTS_FOR_LEARNING) {
      return {
        strongBuyThreshold: DEFAULT_THRESHOLDS.STRONG_BUY,
        buyThreshold: DEFAULT_THRESHOLDS.BUY,
        confidence: 0
      };
    }

    return {
      strongBuyThreshold: Number(threshold.strongBuyThreshold),
      buyThreshold: Number(threshold.buyThreshold),
      confidence: Number(threshold.confidenceScore)
    };
  }

  // ===== Convert Learned Risk Score to RiskTolerance =====

  async getEffectiveRiskTolerance(userId: string): Promise<RiskTolerance> {
    const profile = await this.getProfile(userId);

    if (!profile || profile.confidenceScore < 30) {
      return RiskTolerance.MODERATE; // Default if not enough data
    }

    if (profile.learnedRiskScore < 40) {
      return RiskTolerance.CONSERVATIVE;
    } else if (profile.learnedRiskScore < 60) {
      return RiskTolerance.MODERATE;
    } else {
      return RiskTolerance.AGGRESSIVE;
    }
  }

  // ===== Outcome Tracking (for future price comparison) =====

  async updateDecisionOutcomes(): Promise<number> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get decisions that need outcome updates
    const decisionsToUpdate = await prisma.marketingDecision.findMany({
      where: {
        OR: [
          { decisionDate: { lte: oneWeekAgo }, priceOneWeekLater: null },
          { decisionDate: { lte: twoWeeksAgo }, priceTwoWeeksLater: null },
          { decisionDate: { lte: oneMonthAgo }, priceOneMonthLater: null }
        ]
      }
    });

    let updated = 0;

    for (const decision of decisionsToUpdate) {
      const currentPrice = await this.marketDataService.getLatestFuturesPrice(
        decision.commodityType as CommodityType
      );

      if (!currentPrice) continue;

      const decisionAge = Date.now() - decision.decisionDate.getTime();
      const updates: any = {};

      if (decisionAge >= 7 * 24 * 60 * 60 * 1000 && !decision.priceOneWeekLater) {
        updates.priceOneWeekLater = currentPrice;
      }
      if (decisionAge >= 14 * 24 * 60 * 60 * 1000 && !decision.priceTwoWeeksLater) {
        updates.priceTwoWeeksLater = currentPrice;
      }
      if (decisionAge >= 30 * 24 * 60 * 60 * 1000 && !decision.priceOneMonthLater) {
        updates.priceOneMonthLater = currentPrice;

        // Calculate decision quality based on price movement
        const priceDiff = currentPrice - Number(decision.pricePerBushel);
        const percentChange = priceDiff / Number(decision.pricePerBushel);

        if (percentChange < -0.10) {
          updates.decisionQuality = 'EXCELLENT'; // Sold before 10%+ drop
        } else if (percentChange < -0.05) {
          updates.decisionQuality = 'GOOD'; // Sold before 5%+ drop
        } else if (percentChange < 0.05) {
          updates.decisionQuality = 'NEUTRAL'; // Price stayed flat
        } else {
          updates.decisionQuality = 'POOR'; // Price went up 5%+ after selling
        }
      }

      if (Object.keys(updates).length > 0) {
        await prisma.marketingDecision.update({
          where: { id: decision.id },
          data: updates
        });
        updated++;
      }
    }

    return updated;
  }

  // ===== Mapping Functions =====

  private mapToUserMarketingProfile(p: any): UserMarketingProfile {
    return {
      id: p.id,
      userId: p.userId,
      learnedRiskScore: Number(p.learnedRiskScore),
      avgSellPriceAboveBE: p.avgSellPriceAboveBE ? Number(p.avgSellPriceAboveBE) : undefined,
      preferredSellWindow: p.preferredSellWindow || undefined,
      actOnStrongSignalsRate: Number(p.actOnStrongSignalsRate),
      actOnRegularSignalsRate: Number(p.actOnRegularSignalsRate),
      avgResponseTimeHours: p.avgResponseTimeHours ? Number(p.avgResponseTimeHours) : undefined,
      cornPreferenceScore: Number(p.cornPreferenceScore),
      soybeansPreferenceScore: Number(p.soybeansPreferenceScore),
      wheatPreferenceScore: Number(p.wheatPreferenceScore),
      cashSalePreference: Number(p.cashSalePreference),
      basisContractPreference: Number(p.basisContractPreference),
      htaPreference: Number(p.htaPreference),
      accumulatorPreference: Number(p.accumulatorPreference),
      optionsPreference: Number(p.optionsPreference),
      totalSignalsReceived: p.totalSignalsReceived,
      totalSignalsActedOn: p.totalSignalsActedOn,
      totalSignalsDismissed: p.totalSignalsDismissed,
      totalBushelsSold: Number(p.totalBushelsSold),
      totalRevenue: Number(p.totalRevenue),
      lastUpdated: p.lastUpdated,
      modelVersion: p.modelVersion,
      confidenceScore: Number(p.confidenceScore),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    };
  }

  private mapToMarketingDecision(d: any): MarketingDecision {
    return {
      id: d.id,
      profileId: d.profileId,
      businessId: d.businessId,
      commodityType: d.commodityType as CommodityType,
      contractType: d.contractType,
      bushels: Number(d.bushels),
      pricePerBushel: Number(d.pricePerBushel),
      totalValue: Number(d.totalValue),
      breakEvenPrice: Number(d.breakEvenPrice),
      percentAboveBE: Number(d.percentAboveBE),
      futuresPrice: Number(d.futuresPrice),
      basisAtSale: Number(d.basisAtSale),
      triggeredBySignalId: d.triggeredBySignalId || undefined,
      rsiAtSale: d.rsiAtSale ? Number(d.rsiAtSale) : undefined,
      trendAtSale: d.trendAtSale || undefined,
      volatilityAtSale: d.volatilityAtSale ? Number(d.volatilityAtSale) : undefined,
      priceOneWeekLater: d.priceOneWeekLater ? Number(d.priceOneWeekLater) : undefined,
      priceTwoWeeksLater: d.priceTwoWeeksLater ? Number(d.priceTwoWeeksLater) : undefined,
      priceOneMonthLater: d.priceOneMonthLater ? Number(d.priceOneMonthLater) : undefined,
      decisionQuality: d.decisionQuality || undefined,
      decisionDate: d.decisionDate,
      createdAt: d.createdAt
    };
  }

  private mapToSignalInteraction(i: any): SignalInteraction {
    return {
      id: i.id,
      profileId: i.profileId,
      signalId: i.signalId,
      interactionType: i.interactionType as SignalInteractionType,
      signalCreatedAt: i.signalCreatedAt,
      interactionAt: i.interactionAt,
      responseTimeMinutes: i.responseTimeMinutes || undefined,
      signalType: i.signalType as MarketingSignalType,
      signalStrength: i.signalStrength as SignalStrength,
      commodityType: i.commodityType as CommodityType,
      priceAtSignal: Number(i.priceAtSignal),
      percentAboveBE: Number(i.percentAboveBE),
      dismissReason: i.dismissReason || undefined,
      actionTaken: i.actionTaken || undefined,
      bushelsMarketed: i.bushelsMarketed ? Number(i.bushelsMarketed) : undefined,
      createdAt: i.createdAt
    };
  }
}
