import { prisma } from '../prisma/client';
import { CommodityType } from '@business-app/shared';

interface SupplyDemandSummary {
  commodityType: CommodityType;
  marketingYear: string;
  endingStocks: number;
  stocksToUseRatio: number;
  stocksToUsePercentile: number; // Where current S/U falls historically (0-100)
  stocksChange: number; // Change from previous report
  productionEstimate: number;
  totalDemand: number;
  exportsEstimate: number;
  avgFarmPrice: { low: number; mid: number; high: number };
  outlook: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  outlookReason: string;
}

interface CropConditionSummary {
  commodityType: CommodityType;
  year: number;
  weekEnding: Date;
  goodExcellentPct: number;
  goodExcellentVsPrevYear: number;
  goodExcellentVsAvg: number;
  plantedPct: number;
  plantedVsAvg: number;
  harvestedPct: number;
  harvestedVsAvg: number;
  conditionTrend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  yieldImplication: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

interface ExportPaceSummary {
  commodityType: CommodityType;
  marketingYear: string;
  cumulativeExports: number;
  paceVsUSDA: number; // % of USDA projection
  paceVsPrevYear: number;
  weeklySales: number;
  topBuyers: { country: string; volume: number }[];
  demandOutlook: 'STRONG' | 'WEAK' | 'AVERAGE';
}

interface FundamentalContext {
  supplyDemand: SupplyDemandSummary | null;
  cropConditions: CropConditionSummary | null;
  exportPace: ExportPaceSummary | null;
  seasonalPattern: {
    month: number;
    avgPriceIndex: number;
    isTypicalHigh: boolean;
    isTypicalLow: boolean;
    recommendation: string;
  } | null;
  fundPositioning: {
    netPosition: number;
    netPositionPercentile: number;
    weeklyChange: number;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  } | null;
  recentNews: {
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    topStory: string | null;
    overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  overallFundamentalScore: number; // -100 (very bearish) to +100 (very bullish)
  keyFactors: string[];
}

// Historical stocks-to-use ratios for fundamental outlook determination
// Based on 20-year historical analysis of price correlations
const HISTORICAL_STOCKS_TO_USE: Record<CommodityType, { bearish: number; neutral: number; bullish: number }> = {
  // Corn: 10-year average S/U ~12%, so:
  // >12% = bearish (above average stocks), <9% = bullish (tight stocks)
  CORN: { bearish: 0.12, neutral: 0.10, bullish: 0.09 },
  // Soybeans: Historical average S/U ~8%, so:
  // >10% = bearish, <6% = bullish (tight stocks create rallies)
  SOYBEANS: { bearish: 0.10, neutral: 0.07, bullish: 0.06 },
  // Wheat: Higher S/U typical due to global stocks, but:
  // >45% = bearish, <30% = bullish
  WHEAT: { bearish: 0.45, neutral: 0.35, bullish: 0.30 }
};

export class FundamentalDataService {
  // ===== Main Entry Point for Signal Generation =====

  async getFundamentalContext(commodityType: CommodityType): Promise<FundamentalContext> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const marketingYear = this.getCurrentMarketingYear(commodityType);

    // Fetch all fundamental data in parallel
    const [
      supplyDemand,
      cropConditions,
      exportPace,
      seasonalPattern,
      fundPositioning,
      recentNews
    ] = await Promise.all([
      this.getLatestSupplyDemand(commodityType, marketingYear),
      this.getLatestCropConditions(commodityType, currentYear),
      this.getLatestExportPace(commodityType, marketingYear),
      this.getSeasonalPattern(commodityType, currentMonth),
      this.getLatestFundPositioning(commodityType),
      this.getRecentNewsSentiment(commodityType)
    ]);

    // Calculate overall fundamental score
    const { score, factors } = this.calculateFundamentalScore(
      supplyDemand,
      cropConditions,
      exportPace,
      seasonalPattern,
      fundPositioning,
      recentNews
    );

    return {
      supplyDemand,
      cropConditions,
      exportPace,
      seasonalPattern,
      fundPositioning,
      recentNews,
      overallFundamentalScore: score,
      keyFactors: factors
    };
  }

  // ===== Supply & Demand (WASDE) =====

  async getLatestSupplyDemand(commodityType: CommodityType, marketingYear: string): Promise<SupplyDemandSummary | null> {
    // First try to get data for the specified marketing year
    let latest = await prisma.supplyDemandData.findFirst({
      where: { commodityType, marketingYear },
      orderBy: { reportDate: 'desc' }
    });

    // If not found, get the most recent data regardless of marketing year
    // This handles the transition period where current MY data may not exist yet
    if (!latest) {
      latest = await prisma.supplyDemandData.findFirst({
        where: { commodityType },
        orderBy: { reportDate: 'desc' }
      });
    }

    if (!latest) return null;

    const stocksToUse = Number(latest.stocksToUseRatio) || 0;
    const thresholds = HISTORICAL_STOCKS_TO_USE[commodityType];

    // Calculate percentile (simplified - in production, compare to historical data)
    let percentile = 50;
    if (stocksToUse >= thresholds.bearish) percentile = 75;
    else if (stocksToUse >= thresholds.neutral) percentile = 50;
    else if (stocksToUse >= thresholds.bullish) percentile = 25;
    else percentile = 10;

    // Determine outlook
    let outlook: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let outlookReason = '';

    if (stocksToUse < thresholds.bullish) {
      outlook = 'BULLISH';
      outlookReason = `Tight stocks-to-use ratio of ${(stocksToUse * 100).toFixed(1)}% suggests supply concerns`;
    } else if (stocksToUse > thresholds.bearish) {
      outlook = 'BEARISH';
      outlookReason = `Ample stocks-to-use ratio of ${(stocksToUse * 100).toFixed(1)}% indicates comfortable supply`;
    } else {
      outlook = 'NEUTRAL';
      outlookReason = `Stocks-to-use ratio of ${(stocksToUse * 100).toFixed(1)}% is within normal range`;
    }

    return {
      commodityType,
      marketingYear: latest.marketingYear, // Use actual data's marketing year
      endingStocks: Number(latest.endingStocks) || 0,
      stocksToUseRatio: stocksToUse,
      stocksToUsePercentile: percentile,
      stocksChange: Number(latest.endingStocksChange) || 0,
      productionEstimate: Number(latest.production) || 0,
      totalDemand: Number(latest.totalDemand) || 0,
      exportsEstimate: Number(latest.exports) || 0,
      avgFarmPrice: {
        low: Number(latest.avgFarmPriceLow) || 0,
        mid: Number(latest.avgFarmPrice) || 0,
        high: Number(latest.avgFarmPriceHigh) || 0
      },
      outlook,
      outlookReason
    };
  }

  // ===== Crop Conditions =====

  async getLatestCropConditions(commodityType: CommodityType, year: number): Promise<CropConditionSummary | null> {
    // Get latest national data
    const latest = await prisma.cropProgressData.findFirst({
      where: { commodityType, year, state: 'NATIONAL' },
      orderBy: { weekEnding: 'desc' }
    });

    if (!latest) return null;

    // Get previous week for trend
    const previousWeek = await prisma.cropProgressData.findFirst({
      where: {
        commodityType,
        year,
        state: 'NATIONAL',
        weekEnding: { lt: latest.weekEnding }
      },
      orderBy: { weekEnding: 'desc' }
    });

    const goodExcellent = Number(latest.goodExcellentPct) || 0;
    const prevGoodExcellent = previousWeek ? Number(previousWeek.goodExcellentPct) || 0 : goodExcellent;

    // Determine trend
    let conditionTrend: 'IMPROVING' | 'DECLINING' | 'STABLE' = 'STABLE';
    if (goodExcellent - prevGoodExcellent > 2) conditionTrend = 'IMPROVING';
    else if (prevGoodExcellent - goodExcellent > 2) conditionTrend = 'DECLINING';

    // Yield implication based on good/excellent rating
    // Generally: >65% good/excellent = above trend yield, <55% = below trend
    let yieldImplication: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
    if (goodExcellent > 65) yieldImplication = 'POSITIVE';
    else if (goodExcellent < 55) yieldImplication = 'NEGATIVE';

    return {
      commodityType,
      year,
      weekEnding: latest.weekEnding,
      goodExcellentPct: goodExcellent,
      goodExcellentVsPrevYear: goodExcellent - (Number(latest.conditionGood) + Number(latest.conditionExcellent) || 0),
      goodExcellentVsAvg: 0, // Would need 5-year average data
      plantedPct: Number(latest.plantedPct) || 0,
      plantedVsAvg: (Number(latest.plantedPct) || 0) - (Number(latest.plantedPctAvg5Yr) || 0),
      harvestedPct: Number(latest.harvestedPct) || 0,
      harvestedVsAvg: (Number(latest.harvestedPct) || 0) - (Number(latest.harvestedPctAvg5Yr) || 0),
      conditionTrend,
      yieldImplication
    };
  }

  // ===== Export Sales Pace =====

  async getLatestExportPace(commodityType: CommodityType, marketingYear: string): Promise<ExportPaceSummary | null> {
    const latest = await prisma.exportSalesData.findFirst({
      where: { commodityType, marketingYear },
      orderBy: { weekEnding: 'desc' }
    });

    if (!latest) return null;

    const paceVsUSDA = Number(latest.paceVsUSDA) || 0;

    let demandOutlook: 'STRONG' | 'WEAK' | 'AVERAGE' = 'AVERAGE';
    if (paceVsUSDA > 0.05) demandOutlook = 'STRONG';
    else if (paceVsUSDA < -0.05) demandOutlook = 'WEAK';

    const topBuyers: { country: string; volume: number }[] = [];
    if (latest.topBuyer1) {
      topBuyers.push({ country: latest.topBuyer1, volume: Number(latest.topBuyer1Volume) || 0 });
    }
    if (latest.topBuyer2) {
      topBuyers.push({ country: latest.topBuyer2, volume: Number(latest.topBuyer2Volume) || 0 });
    }

    return {
      commodityType,
      marketingYear,
      cumulativeExports: Number(latest.cumulativeExports) || 0,
      paceVsUSDA,
      paceVsPrevYear: Number(latest.salesVsPrevYear) || 0,
      weeklySales: Number(latest.weeklySales) || 0,
      topBuyers,
      demandOutlook
    };
  }

  // ===== Seasonal Patterns =====

  async getSeasonalPattern(commodityType: CommodityType, month: number): Promise<{
    month: number;
    avgPriceIndex: number;
    isTypicalHigh: boolean;
    isTypicalLow: boolean;
    recommendation: string;
  } | null> {
    const pattern = await prisma.seasonalPattern.findUnique({
      where: { commodityType_month: { commodityType, month } }
    });

    if (!pattern) {
      // Return default seasonal patterns if not in database
      return this.getDefaultSeasonalPattern(commodityType, month);
    }

    return {
      month,
      avgPriceIndex: Number(pattern.avgPriceIndex),
      isTypicalHigh: Number(pattern.highProbability) > 0.15,
      isTypicalLow: Number(pattern.lowProbability) > 0.15,
      recommendation: pattern.recommendedAction || ''
    };
  }

  private getDefaultSeasonalPattern(commodityType: CommodityType, month: number) {
    // Default seasonal patterns based on historical tendencies
    const patterns: Record<CommodityType, { highs: number[]; lows: number[] }> = {
      CORN: { highs: [6, 7], lows: [10, 11] }, // Summer highs (weather), harvest lows
      SOYBEANS: { highs: [6, 7, 8], lows: [10, 11] }, // Summer highs, harvest lows
      WHEAT: { highs: [5, 6], lows: [8, 9] } // Early summer highs, late summer lows
    };

    const p = patterns[commodityType];
    return {
      month,
      avgPriceIndex: 1.0,
      isTypicalHigh: p.highs.includes(month),
      isTypicalLow: p.lows.includes(month),
      recommendation: p.highs.includes(month)
        ? 'Historically favorable period for selling - consider marketing opportunities'
        : p.lows.includes(month)
          ? 'Historically weak period - hold if possible unless signals are strong'
          : 'Normal seasonal period - follow signal recommendations'
    };
  }

  // ===== Fund Positioning (COT) =====

  async getLatestFundPositioning(commodityType: CommodityType): Promise<{
    netPosition: number;
    netPositionPercentile: number;
    weeklyChange: number;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  } | null> {
    const latest = await prisma.commitmentOfTraders.findFirst({
      where: { commodityType },
      orderBy: { reportDate: 'desc' }
    });

    if (!latest) return null;

    const netPosition = latest.mmNet || 0;
    const percentile = Number(latest.mmNetPercentile) || 50;
    const weeklyChange = latest.mmNetChange || 0;

    // Extreme positioning can signal reversals
    let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (percentile > 80) {
      sentiment = 'BEARISH'; // Extremely long = contrarian bearish
    } else if (percentile < 20) {
      sentiment = 'BULLISH'; // Extremely short = contrarian bullish
    } else if (netPosition > 0 && weeklyChange > 5000) {
      sentiment = 'BULLISH'; // Funds buying
    } else if (netPosition < 0 && weeklyChange < -5000) {
      sentiment = 'BEARISH'; // Funds selling
    }

    return {
      netPosition,
      netPositionPercentile: percentile,
      weeklyChange,
      sentiment
    };
  }

  // ===== News Sentiment =====

  async getRecentNewsSentiment(commodityType: CommodityType): Promise<{
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    topStory: string | null;
    overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  }> {
    // Get news from last 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const news = await prisma.marketNews.findMany({
      where: {
        publishedAt: { gte: oneWeekAgo },
        relevantCommodities: { has: commodityType }
      },
      orderBy: [
        { importance: 'desc' },
        { publishedAt: 'desc' }
      ],
      take: 50
    });

    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;

    for (const article of news) {
      if (article.sentimentLabel === 'BULLISH') bullishCount++;
      else if (article.sentimentLabel === 'BEARISH') bearishCount++;
      else neutralCount++;
    }

    const topStory = news.length > 0 ? news[0].title : null;

    // Calculate overall sentiment
    let overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    const total = bullishCount + bearishCount + neutralCount;
    if (total > 0) {
      if (bullishCount / total > 0.5) overallSentiment = 'BULLISH';
      else if (bearishCount / total > 0.5) overallSentiment = 'BEARISH';
    }

    return {
      bullishCount,
      bearishCount,
      neutralCount,
      topStory,
      overallSentiment
    };
  }

  // ===== Calculate Overall Fundamental Score =====

  private calculateFundamentalScore(
    supplyDemand: SupplyDemandSummary | null,
    cropConditions: CropConditionSummary | null,
    exportPace: ExportPaceSummary | null,
    seasonalPattern: { month: number; avgPriceIndex: number; isTypicalHigh: boolean; isTypicalLow: boolean; recommendation: string } | null,
    fundPositioning: { netPosition: number; netPositionPercentile: number; weeklyChange: number; sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' } | null,
    recentNews: { bullishCount: number; bearishCount: number; neutralCount: number; topStory: string | null; overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' }
  ): { score: number; factors: string[] } {
    let score = 0;
    const factors: string[] = [];

    // Supply/Demand (weight: 35%)
    if (supplyDemand) {
      if (supplyDemand.outlook === 'BULLISH') {
        score += 35;
        factors.push(`Tight S/U ratio (${(supplyDemand.stocksToUseRatio * 100).toFixed(1)}%) supports prices`);
      } else if (supplyDemand.outlook === 'BEARISH') {
        score -= 35;
        factors.push(`Ample S/U ratio (${(supplyDemand.stocksToUseRatio * 100).toFixed(1)}%) weighs on prices`);
      }

      // Stocks change impact
      if (supplyDemand.stocksChange < -50) {
        score += 10;
        factors.push(`Ending stocks cut ${Math.abs(supplyDemand.stocksChange).toFixed(0)} million bushels`);
      } else if (supplyDemand.stocksChange > 50) {
        score -= 10;
        factors.push(`Ending stocks raised ${supplyDemand.stocksChange.toFixed(0)} million bushels`);
      }
    }

    // Crop Conditions (weight: 20%)
    if (cropConditions) {
      if (cropConditions.yieldImplication === 'NEGATIVE') {
        score += 20;
        factors.push(`Poor crop conditions (${cropConditions.goodExcellentPct.toFixed(0)}% G/E) threaten yield`);
      } else if (cropConditions.yieldImplication === 'POSITIVE') {
        score -= 15;
        factors.push(`Excellent crop conditions (${cropConditions.goodExcellentPct.toFixed(0)}% G/E) support yield`);
      }

      // Trend adjustment
      if (cropConditions.conditionTrend === 'DECLINING') {
        score += 5;
        factors.push('Crop conditions declining week-over-week');
      } else if (cropConditions.conditionTrend === 'IMPROVING') {
        score -= 5;
      }
    }

    // Export Pace (weight: 15%)
    if (exportPace) {
      if (exportPace.demandOutlook === 'STRONG') {
        score += 15;
        factors.push(`Export pace ${((exportPace.paceVsUSDA + 1) * 100 - 100).toFixed(0)}% ahead of USDA projection`);
      } else if (exportPace.demandOutlook === 'WEAK') {
        score -= 15;
        factors.push(`Export pace ${((1 - exportPace.paceVsUSDA) * 100).toFixed(0)}% behind USDA projection`);
      }
    }

    // Seasonal Pattern (weight: 10%)
    if (seasonalPattern) {
      if (seasonalPattern.isTypicalHigh) {
        score += 10;
        factors.push('Historically favorable seasonal period');
      } else if (seasonalPattern.isTypicalLow) {
        score -= 10;
        factors.push('Historically weak seasonal period');
      }
    }

    // Fund Positioning (weight: 10%)
    if (fundPositioning) {
      if (fundPositioning.sentiment === 'BULLISH') {
        score += 10;
        factors.push('Fund positioning suggests upside potential');
      } else if (fundPositioning.sentiment === 'BEARISH') {
        score -= 10;
        factors.push('Fund positioning suggests downside risk');
      }
    }

    // News Sentiment (weight: 10%)
    if (recentNews.overallSentiment === 'BULLISH') {
      score += 10;
      factors.push('Recent news sentiment is bullish');
    } else if (recentNews.overallSentiment === 'BEARISH') {
      score -= 10;
      factors.push('Recent news sentiment is bearish');
    }

    // Clamp score to -100 to 100
    score = Math.max(-100, Math.min(100, score));

    return { score, factors };
  }

  // ===== Yield Estimate Impact =====

  async getYieldImpact(commodityType: CommodityType, year: number): Promise<{
    currentEstimate: number;
    trendYield: number;
    percentVsTrend: number;
    impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  } | null> {
    const latest = await prisma.yieldForecast.findFirst({
      where: { commodityType, year },
      orderBy: { forecastDate: 'desc' }
    });

    if (!latest || !latest.trendYield) return null;

    const currentEstimate = Number(latest.projectedYield);
    const trendYield = Number(latest.trendYield);
    const percentVsTrend = (currentEstimate - trendYield) / trendYield;

    let impact: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (percentVsTrend < -0.03) impact = 'BULLISH'; // Below trend = less supply = bullish
    else if (percentVsTrend > 0.03) impact = 'BEARISH'; // Above trend = more supply = bearish

    return {
      currentEstimate,
      trendYield,
      percentVsTrend,
      impact
    };
  }

  // ===== Get Upcoming USDA Reports =====

  async getUpcomingReports(days: number = 14): Promise<{
    reportType: string;
    reportName: string;
    releaseDate: Date;
    releaseTime: string;
    commodities: CommodityType[];
    importance: string;
  }[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const reports = await prisma.uSDAReportSchedule.findMany({
      where: {
        releaseDate: {
          gte: now,
          lte: futureDate
        }
      },
      orderBy: { releaseDate: 'asc' }
    });

    return reports.map(r => ({
      reportType: r.reportType,
      reportName: r.reportName,
      releaseDate: r.releaseDate,
      releaseTime: r.releaseTime,
      commodities: r.commodities as CommodityType[],
      importance: r.importance
    }));
  }

  // ===== Helper: Get Current Marketing Year =====

  private getCurrentMarketingYear(commodityType: CommodityType): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Marketing year starts:
    // Corn/Soybeans: September 1
    // Wheat: June 1
    if (commodityType === CommodityType.WHEAT) {
      if (month >= 6) return `${year}/${(year + 1).toString().slice(-2)}`;
      return `${year - 1}/${year.toString().slice(-2)}`;
    } else {
      if (month >= 9) return `${year}/${(year + 1).toString().slice(-2)}`;
      return `${year - 1}/${year.toString().slice(-2)}`;
    }
  }

  // ===== Get Fundamental Summary for Signal Display =====

  async getFundamentalSummary(commodityType: CommodityType): Promise<string> {
    const context = await this.getFundamentalContext(commodityType);

    const scoreTerm = context.overallFundamentalScore > 30 ? 'bullish'
      : context.overallFundamentalScore < -30 ? 'bearish'
      : 'neutral';

    let summary = `Fundamental outlook is ${scoreTerm} (score: ${context.overallFundamentalScore > 0 ? '+' : ''}${context.overallFundamentalScore}). `;

    // Add top 3 factors
    if (context.keyFactors.length > 0) {
      summary += 'Key factors: ' + context.keyFactors.slice(0, 3).join('; ') + '.';
    }

    return summary;
  }
}
