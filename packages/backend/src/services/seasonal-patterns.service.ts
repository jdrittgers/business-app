/**
 * Seasonal Patterns Service
 *
 * Provides historical seasonal price patterns for grain commodities.
 * Data is based on multi-year historical analysis of CBOT futures.
 *
 * Key seasonal factors:
 * - CORN: Harvest pressure (Sept-Nov), weather premium (May-July), planting rally (March-May)
 * - SOYBEANS: Harvest pressure (Sept-Nov), South American crop (Jan-Mar), summer weather (June-Aug)
 * - WHEAT: Winter wheat harvest (June-July), spring planting (March-May), global supply factors
 */

import { CommodityType } from '@business-app/shared';

export interface SeasonalPattern {
  month: number; // 0-11 (Jan=0, Dec=11)
  monthName: string;
  averagePercentFromYearlyMean: number; // e.g., -5 means typically 5% below yearly average
  historicalRallyProbability: number; // 0-100, probability of price increase next 30-60 days
  historicalDeclineProbability: number; // 0-100, probability of price decrease
  keyFactors: string[];
  marketingImplication: 'FAVORABLE_SELL' | 'HOLD' | 'UNFAVORABLE_SELL' | 'NEUTRAL';
  typicalVolatility: 'HIGH' | 'MODERATE' | 'LOW';
}

export interface SeasonalContext {
  commodity: CommodityType;
  currentMonth: number;
  currentPattern: SeasonalPattern;
  nextMonthPattern: SeasonalPattern;
  seasonalOutlook: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  seasonalScore: number; // -100 to +100 (negative = bearish seasonal, positive = bullish)
  recommendedAction: string;
  historicalPricePercentile: number; // Where current price sits vs historical for this month (0-100)
  keySeasonalFactors: string[];
}

// Historical seasonal patterns based on 20+ years of CBOT data
const CORN_SEASONAL_PATTERNS: SeasonalPattern[] = [
  {
    month: 0, // January
    monthName: 'January',
    averagePercentFromYearlyMean: -2,
    historicalRallyProbability: 55,
    historicalDeclineProbability: 45,
    keyFactors: ['South American crop development', 'Export demand assessment', 'USDA annual reports'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 1, // February
    monthName: 'February',
    averagePercentFromYearlyMean: -1,
    historicalRallyProbability: 52,
    historicalDeclineProbability: 48,
    keyFactors: ['USDA Outlook Forum', 'Planting intentions speculation', 'South American harvest begins'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 2, // March
    monthName: 'March',
    averagePercentFromYearlyMean: 1,
    historicalRallyProbability: 58,
    historicalDeclineProbability: 42,
    keyFactors: ['Prospective Plantings report', 'Early planting weather concerns', 'Fund positioning'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 3, // April
    monthName: 'April',
    averagePercentFromYearlyMean: 3,
    historicalRallyProbability: 60,
    historicalDeclineProbability: 40,
    keyFactors: ['Planting progress concerns', 'Weather market begins', 'Acreage shifts'],
    marketingImplication: 'FAVORABLE_SELL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 4, // May
    monthName: 'May',
    averagePercentFromYearlyMean: 5,
    historicalRallyProbability: 62,
    historicalDeclineProbability: 38,
    keyFactors: ['Planting delays/progress', 'Weather premium building', 'Prevent plant concerns'],
    marketingImplication: 'FAVORABLE_SELL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 5, // June
    monthName: 'June',
    averagePercentFromYearlyMean: 6,
    historicalRallyProbability: 55,
    historicalDeclineProbability: 45,
    keyFactors: ['Acreage report', 'Crop condition ratings begin', 'Pre-pollination weather'],
    marketingImplication: 'FAVORABLE_SELL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 6, // July
    monthName: 'July',
    averagePercentFromYearlyMean: 4,
    historicalRallyProbability: 48,
    historicalDeclineProbability: 52,
    keyFactors: ['Pollination - critical period', 'Weather market peak', 'Yield estimates begin'],
    marketingImplication: 'FAVORABLE_SELL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 7, // August
    monthName: 'August',
    averagePercentFromYearlyMean: 0,
    historicalRallyProbability: 42,
    historicalDeclineProbability: 58,
    keyFactors: ['Pro Farmer crop tour', 'Yield estimates solidify', 'Harvest prep begins'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 8, // September
    monthName: 'September',
    averagePercentFromYearlyMean: -4,
    historicalRallyProbability: 38,
    historicalDeclineProbability: 62,
    keyFactors: ['Harvest pressure begins', 'Supply becoming known', 'Basis weakens'],
    marketingImplication: 'UNFAVORABLE_SELL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 9, // October
    monthName: 'October',
    averagePercentFromYearlyMean: -6,
    historicalRallyProbability: 35,
    historicalDeclineProbability: 65,
    keyFactors: ['Peak harvest pressure', 'Basis at seasonal lows', 'Storage decisions'],
    marketingImplication: 'UNFAVORABLE_SELL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 10, // November
    monthName: 'November',
    averagePercentFromYearlyMean: -5,
    historicalRallyProbability: 45,
    historicalDeclineProbability: 55,
    keyFactors: ['Harvest wrapping up', 'Final yield reports', 'South American planting'],
    marketingImplication: 'UNFAVORABLE_SELL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 11, // December
    monthName: 'December',
    averagePercentFromYearlyMean: -3,
    historicalRallyProbability: 50,
    historicalDeclineProbability: 50,
    keyFactors: ['Tax selling considerations', 'Year-end positioning', 'South American weather'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'LOW'
  }
];

const SOYBEAN_SEASONAL_PATTERNS: SeasonalPattern[] = [
  {
    month: 0, // January
    monthName: 'January',
    averagePercentFromYearlyMean: -1,
    historicalRallyProbability: 52,
    historicalDeclineProbability: 48,
    keyFactors: ['South American crop critical stage', 'Chinese demand signals', 'USDA annual reports'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 1, // February
    monthName: 'February',
    averagePercentFromYearlyMean: 0,
    historicalRallyProbability: 55,
    historicalDeclineProbability: 45,
    keyFactors: ['Brazil harvest begins', 'Argentine weather', 'USDA Outlook Forum'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 2, // March
    monthName: 'March',
    averagePercentFromYearlyMean: 1,
    historicalRallyProbability: 50,
    historicalDeclineProbability: 50,
    keyFactors: ['Brazil harvest pressure', 'Prospective Plantings', 'Acreage battle with corn'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 3, // April
    monthName: 'April',
    averagePercentFromYearlyMean: 2,
    historicalRallyProbability: 55,
    historicalDeclineProbability: 45,
    keyFactors: ['U.S. planting begins', 'Brazil logistics issues', 'Chinese buying patterns'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 4, // May
    monthName: 'May',
    averagePercentFromYearlyMean: 4,
    historicalRallyProbability: 58,
    historicalDeclineProbability: 42,
    keyFactors: ['Planting progress', 'Weather market developing', 'Acreage shifts'],
    marketingImplication: 'FAVORABLE_SELL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 5, // June
    monthName: 'June',
    averagePercentFromYearlyMean: 5,
    historicalRallyProbability: 55,
    historicalDeclineProbability: 45,
    keyFactors: ['Acreage report', 'Crop emergence', 'Weather premium building'],
    marketingImplication: 'FAVORABLE_SELL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 6, // July
    monthName: 'July',
    averagePercentFromYearlyMean: 6,
    historicalRallyProbability: 52,
    historicalDeclineProbability: 48,
    keyFactors: ['Pod-setting begins', 'Peak weather sensitivity', 'August weather outlook'],
    marketingImplication: 'FAVORABLE_SELL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 7, // August
    monthName: 'August',
    averagePercentFromYearlyMean: 3,
    historicalRallyProbability: 45,
    historicalDeclineProbability: 55,
    keyFactors: ['Pod fill critical', 'Pro Farmer tour', 'Yield becoming visible'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 8, // September
    monthName: 'September',
    averagePercentFromYearlyMean: -2,
    historicalRallyProbability: 40,
    historicalDeclineProbability: 60,
    keyFactors: ['Early harvest begins', 'Yield estimates firm', 'Harvest pressure building'],
    marketingImplication: 'UNFAVORABLE_SELL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 9, // October
    monthName: 'October',
    averagePercentFromYearlyMean: -5,
    historicalRallyProbability: 38,
    historicalDeclineProbability: 62,
    keyFactors: ['Peak harvest pressure', 'South American planting', 'Basis weakest'],
    marketingImplication: 'UNFAVORABLE_SELL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 10, // November
    monthName: 'November',
    averagePercentFromYearlyMean: -4,
    historicalRallyProbability: 48,
    historicalDeclineProbability: 52,
    keyFactors: ['Harvest ending', 'South American weather focus', 'China trade developments'],
    marketingImplication: 'UNFAVORABLE_SELL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 11, // December
    monthName: 'December',
    averagePercentFromYearlyMean: -2,
    historicalRallyProbability: 50,
    historicalDeclineProbability: 50,
    keyFactors: ['South American crop development', 'Year-end positioning', 'Export pace'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'LOW'
  }
];

const WHEAT_SEASONAL_PATTERNS: SeasonalPattern[] = [
  {
    month: 0, // January
    monthName: 'January',
    averagePercentFromYearlyMean: 0,
    historicalRallyProbability: 50,
    historicalDeclineProbability: 50,
    keyFactors: ['Winter wheat dormancy', 'Global supply assessment', 'USDA annual reports'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'LOW'
  },
  {
    month: 1, // February
    monthName: 'February',
    averagePercentFromYearlyMean: 1,
    historicalRallyProbability: 52,
    historicalDeclineProbability: 48,
    keyFactors: ['Winter kill concerns', 'USDA Outlook Forum', 'Global export competition'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 2, // March
    monthName: 'March',
    averagePercentFromYearlyMean: 3,
    historicalRallyProbability: 58,
    historicalDeclineProbability: 42,
    keyFactors: ['Winter wheat emerges from dormancy', 'Condition ratings begin', 'Spring wheat planting outlook'],
    marketingImplication: 'FAVORABLE_SELL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 3, // April
    monthName: 'April',
    averagePercentFromYearlyMean: 4,
    historicalRallyProbability: 55,
    historicalDeclineProbability: 45,
    keyFactors: ['Spring wheat planting', 'Winter wheat jointing', 'Global weather concerns'],
    marketingImplication: 'FAVORABLE_SELL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 4, // May
    monthName: 'May',
    averagePercentFromYearlyMean: 5,
    historicalRallyProbability: 52,
    historicalDeclineProbability: 48,
    keyFactors: ['Winter wheat heading', 'Spring wheat emergence', 'Disease pressure'],
    marketingImplication: 'FAVORABLE_SELL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 5, // June
    monthName: 'June',
    averagePercentFromYearlyMean: 2,
    historicalRallyProbability: 45,
    historicalDeclineProbability: 55,
    keyFactors: ['Winter wheat harvest begins', 'Spring wheat development', 'Harvest pressure starting'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'HIGH'
  },
  {
    month: 6, // July
    monthName: 'July',
    averagePercentFromYearlyMean: -3,
    historicalRallyProbability: 40,
    historicalDeclineProbability: 60,
    keyFactors: ['Winter wheat harvest peak', 'Global harvest pressure', 'Spring wheat filling'],
    marketingImplication: 'UNFAVORABLE_SELL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 7, // August
    monthName: 'August',
    averagePercentFromYearlyMean: -4,
    historicalRallyProbability: 42,
    historicalDeclineProbability: 58,
    keyFactors: ['Spring wheat harvest', 'Global supply known', 'Basis pressure'],
    marketingImplication: 'UNFAVORABLE_SELL',
    typicalVolatility: 'MODERATE'
  },
  {
    month: 8, // September
    monthName: 'September',
    averagePercentFromYearlyMean: -3,
    historicalRallyProbability: 48,
    historicalDeclineProbability: 52,
    keyFactors: ['Harvest complete', 'Winter wheat planting begins', 'Export competition'],
    marketingImplication: 'UNFAVORABLE_SELL',
    typicalVolatility: 'LOW'
  },
  {
    month: 9, // October
    monthName: 'October',
    averagePercentFromYearlyMean: -2,
    historicalRallyProbability: 50,
    historicalDeclineProbability: 50,
    keyFactors: ['Winter wheat emergence', 'Global demand assessment', 'Southern hemisphere planting'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'LOW'
  },
  {
    month: 10, // November
    monthName: 'November',
    averagePercentFromYearlyMean: -1,
    historicalRallyProbability: 52,
    historicalDeclineProbability: 48,
    keyFactors: ['Winter wheat establishment', 'Argentine/Australian crop progress', 'Export pace'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'LOW'
  },
  {
    month: 11, // December
    monthName: 'December',
    averagePercentFromYearlyMean: 0,
    historicalRallyProbability: 50,
    historicalDeclineProbability: 50,
    keyFactors: ['Winter wheat dormancy begins', 'Southern hemisphere harvest', 'Year-end positioning'],
    marketingImplication: 'NEUTRAL',
    typicalVolatility: 'LOW'
  }
];

// Historical price ranges by month (percentile data based on 10-year history)
// Format: [10th percentile, 25th, 50th (median), 75th, 90th percentile]
const HISTORICAL_PRICE_PERCENTILES: Record<CommodityType, Record<number, number[]>> = {
  CORN: {
    0: [3.40, 3.70, 4.10, 4.60, 5.20],  // January
    1: [3.45, 3.75, 4.15, 4.65, 5.25],  // February
    2: [3.50, 3.80, 4.25, 4.80, 5.40],  // March
    3: [3.55, 3.90, 4.35, 4.90, 5.55],  // April
    4: [3.60, 4.00, 4.45, 5.00, 5.70],  // May
    5: [3.65, 4.05, 4.50, 5.10, 5.80],  // June
    6: [3.55, 3.95, 4.40, 5.00, 5.70],  // July
    7: [3.40, 3.75, 4.20, 4.75, 5.40],  // August
    8: [3.25, 3.55, 3.95, 4.50, 5.10],  // September
    9: [3.15, 3.45, 3.85, 4.40, 5.00],  // October
    10: [3.20, 3.50, 3.90, 4.45, 5.05], // November
    11: [3.30, 3.60, 4.00, 4.50, 5.10]  // December
  },
  SOYBEANS: {
    0: [9.00, 9.80, 10.80, 12.00, 13.50],  // January
    1: [9.10, 9.90, 10.90, 12.10, 13.60],  // February
    2: [9.20, 10.00, 11.00, 12.20, 13.70], // March
    3: [9.30, 10.10, 11.10, 12.30, 13.80], // April
    4: [9.50, 10.30, 11.30, 12.50, 14.00], // May
    5: [9.60, 10.40, 11.50, 12.70, 14.20], // June
    6: [9.70, 10.50, 11.60, 12.80, 14.30], // July
    7: [9.40, 10.20, 11.30, 12.50, 14.00], // August
    8: [9.00, 9.80, 10.80, 12.00, 13.50],  // September
    9: [8.80, 9.60, 10.60, 11.80, 13.30],  // October
    10: [8.90, 9.70, 10.70, 11.90, 13.40], // November
    11: [9.00, 9.80, 10.80, 12.00, 13.50]  // December
  },
  WHEAT: {
    0: [4.50, 5.00, 5.60, 6.40, 7.50],  // January
    1: [4.55, 5.05, 5.70, 6.50, 7.60],  // February
    2: [4.65, 5.20, 5.85, 6.70, 7.80],  // March
    3: [4.70, 5.25, 5.95, 6.80, 7.90],  // April
    4: [4.75, 5.30, 6.00, 6.90, 8.00],  // May
    5: [4.60, 5.15, 5.80, 6.65, 7.75],  // June
    6: [4.40, 4.90, 5.50, 6.30, 7.40],  // July
    7: [4.35, 4.85, 5.45, 6.25, 7.35],  // August
    8: [4.40, 4.90, 5.50, 6.30, 7.40],  // September
    9: [4.45, 4.95, 5.55, 6.35, 7.45],  // October
    10: [4.50, 5.00, 5.60, 6.40, 7.50], // November
    11: [4.50, 5.00, 5.60, 6.40, 7.50]  // December
  }
};

export class SeasonalPatternsService {

  /**
   * Get seasonal context for a commodity
   */
  getSeasonalContext(
    commodity: CommodityType,
    currentPrice?: number
  ): SeasonalContext {
    const currentMonth = new Date().getMonth();
    const nextMonth = (currentMonth + 1) % 12;

    const patterns = this.getPatternsByCommodity(commodity);
    const currentPattern = patterns[currentMonth];
    const nextMonthPattern = patterns[nextMonth];

    // Calculate seasonal score (-100 to +100)
    // Positive = bullish seasonal (prices typically rise)
    // Negative = bearish seasonal (prices typically fall)
    const seasonalScore = this.calculateSeasonalScore(currentPattern, nextMonthPattern);

    // Determine seasonal outlook
    let seasonalOutlook: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    if (seasonalScore >= 20) seasonalOutlook = 'BULLISH';
    else if (seasonalScore <= -20) seasonalOutlook = 'BEARISH';

    // Calculate historical price percentile if current price provided
    let historicalPricePercentile = 50;
    if (currentPrice) {
      historicalPricePercentile = this.calculatePricePercentile(commodity, currentMonth, currentPrice);
    }

    // Build recommended action
    const recommendedAction = this.buildRecommendedAction(
      currentPattern,
      nextMonthPattern,
      seasonalOutlook,
      historicalPricePercentile
    );

    // Combine key factors
    const keySeasonalFactors = [
      ...currentPattern.keyFactors.slice(0, 2),
      `${currentPattern.historicalRallyProbability}% historical probability of rally in next 30-60 days`,
      `Prices typically ${currentPattern.averagePercentFromYearlyMean >= 0 ? '+' : ''}${currentPattern.averagePercentFromYearlyMean}% vs yearly average in ${currentPattern.monthName}`
    ];

    return {
      commodity,
      currentMonth,
      currentPattern,
      nextMonthPattern,
      seasonalOutlook,
      seasonalScore,
      recommendedAction,
      historicalPricePercentile,
      keySeasonalFactors
    };
  }

  /**
   * Get patterns for a specific commodity
   */
  private getPatternsByCommodity(commodity: CommodityType): SeasonalPattern[] {
    switch (commodity) {
      case CommodityType.CORN:
        return CORN_SEASONAL_PATTERNS;
      case CommodityType.SOYBEANS:
        return SOYBEAN_SEASONAL_PATTERNS;
      case CommodityType.WHEAT:
        return WHEAT_SEASONAL_PATTERNS;
      default:
        return CORN_SEASONAL_PATTERNS;
    }
  }

  /**
   * Calculate seasonal score based on current and upcoming patterns
   */
  private calculateSeasonalScore(
    current: SeasonalPattern,
    next: SeasonalPattern
  ): number {
    let score = 0;

    // Factor 1: Rally probability difference from 50%
    score += (current.historicalRallyProbability - 50) * 1.5;

    // Factor 2: Next month's expected price movement
    const expectedMove = next.averagePercentFromYearlyMean - current.averagePercentFromYearlyMean;
    score += expectedMove * 10;

    // Factor 3: Marketing implication
    if (current.marketingImplication === 'FAVORABLE_SELL') score -= 15;
    else if (current.marketingImplication === 'UNFAVORABLE_SELL') score += 15;

    // Clamp to -100 to +100
    return Math.max(-100, Math.min(100, score));
  }

  /**
   * Calculate where current price sits in historical distribution for this month
   */
  calculatePricePercentile(
    commodity: CommodityType,
    month: number,
    currentPrice: number
  ): number {
    const percentiles = HISTORICAL_PRICE_PERCENTILES[commodity]?.[month];
    if (!percentiles) return 50;

    const [p10, p25, p50, p75, p90] = percentiles;

    if (currentPrice <= p10) return 10;
    if (currentPrice <= p25) return 10 + ((currentPrice - p10) / (p25 - p10)) * 15;
    if (currentPrice <= p50) return 25 + ((currentPrice - p25) / (p50 - p25)) * 25;
    if (currentPrice <= p75) return 50 + ((currentPrice - p50) / (p75 - p50)) * 25;
    if (currentPrice <= p90) return 75 + ((currentPrice - p75) / (p90 - p75)) * 15;
    return 90 + Math.min(10, ((currentPrice - p90) / p90) * 50);
  }

  /**
   * Get the historical median price for a commodity/month
   */
  getHistoricalMedianPrice(commodity: CommodityType, month: number): number {
    const percentiles = HISTORICAL_PRICE_PERCENTILES[commodity]?.[month];
    return percentiles ? percentiles[2] : 0; // Index 2 is the 50th percentile (median)
  }

  /**
   * Build recommended action string
   */
  private buildRecommendedAction(
    current: SeasonalPattern,
    next: SeasonalPattern,
    outlook: 'BULLISH' | 'BEARISH' | 'NEUTRAL',
    pricePercentile: number
  ): string {
    const highPrice = pricePercentile >= 70;
    const lowPrice = pricePercentile <= 30;

    if (current.marketingImplication === 'FAVORABLE_SELL') {
      if (highPrice) {
        return `Seasonally favorable selling window AND prices in ${pricePercentile.toFixed(0)}th percentile. Strong consideration for sales.`;
      }
      return `Seasonal patterns favor selling in ${current.monthName}. ${current.historicalRallyProbability}% probability of higher prices, but historical patterns suggest this is often a good selling window.`;
    }

    if (current.marketingImplication === 'UNFAVORABLE_SELL') {
      if (highPrice) {
        return `Despite harvest pressure, prices are elevated (${pricePercentile.toFixed(0)}th percentile). Consider partial sales if profitable.`;
      }
      return `Seasonal patterns suggest waiting if possible. ${current.monthName} typically sees harvest pressure. Better opportunities may arise in ${next.monthName}.`;
    }

    if (outlook === 'BULLISH') {
      return `Seasonal patterns are bullish with ${current.historicalRallyProbability}% probability of rally. Consider holding for potential upside, but protect with floor prices if needed.`;
    }

    if (outlook === 'BEARISH') {
      return `Seasonal patterns are bearish with ${current.historicalDeclineProbability}% probability of lower prices. Consider incremental sales to reduce risk.`;
    }

    return `Neutral seasonal period. Focus on break-even levels and fundamentals rather than seasonal timing.`;
  }

  /**
   * Get seasonal adjustment for signal generation
   * Returns a modifier to apply to sell recommendations
   */
  getSeasonalAdjustment(commodity: CommodityType, currentPrice?: number): {
    percentageAdjustment: number;  // Add to sell % (negative = sell less)
    thresholdAdjustment: number;   // Multiply against thresholds (< 1 = lower thresholds)
    urgencyBoost: boolean;         // Should we emphasize urgency?
    waitRecommended: boolean;      // Should we suggest waiting?
    rationale: string;
  } {
    const context = this.getSeasonalContext(commodity, currentPrice);
    const { currentPattern, seasonalScore, historicalPricePercentile } = context;

    let percentageAdjustment = 0;
    let thresholdAdjustment = 1.0;
    let urgencyBoost = false;
    let waitRecommended = false;
    let rationale = '';

    // Favorable sell window with high prices
    if (currentPattern.marketingImplication === 'FAVORABLE_SELL' && historicalPricePercentile >= 60) {
      percentageAdjustment = 0.05; // Sell 5% more
      thresholdAdjustment = 0.9;   // Lower thresholds by 10%
      urgencyBoost = true;
      rationale = `Seasonally favorable selling window (${currentPattern.monthName}) with prices in ${historicalPricePercentile.toFixed(0)}th percentile.`;
    }
    // Favorable sell window with average prices
    else if (currentPattern.marketingImplication === 'FAVORABLE_SELL') {
      percentageAdjustment = 0.025;
      thresholdAdjustment = 0.95;
      rationale = `${currentPattern.monthName} is historically a favorable selling window.`;
    }
    // Unfavorable sell window (harvest pressure)
    else if (currentPattern.marketingImplication === 'UNFAVORABLE_SELL') {
      if (historicalPricePercentile >= 75) {
        // High prices during harvest - still worth selling
        percentageAdjustment = 0;
        rationale = `Despite harvest pressure, prices are elevated (${historicalPricePercentile.toFixed(0)}th percentile).`;
      } else {
        percentageAdjustment = -0.025; // Sell 2.5% less
        thresholdAdjustment = 1.1;     // Raise thresholds by 10%
        waitRecommended = true;
        rationale = `Harvest pressure typical in ${currentPattern.monthName}. Consider waiting for post-harvest recovery.`;
      }
    }
    // Bullish seasonal outlook
    else if (seasonalScore >= 25) {
      percentageAdjustment = -0.025;
      thresholdAdjustment = 1.05;
      rationale = `Bullish seasonal pattern with ${currentPattern.historicalRallyProbability}% probability of rally.`;
    }
    // Bearish seasonal outlook
    else if (seasonalScore <= -25) {
      percentageAdjustment = 0.025;
      thresholdAdjustment = 0.95;
      rationale = `Bearish seasonal pattern with ${currentPattern.historicalDeclineProbability}% probability of decline.`;
    }
    // Neutral
    else {
      rationale = `Neutral seasonal period in ${currentPattern.monthName}.`;
    }

    return {
      percentageAdjustment,
      thresholdAdjustment,
      urgencyBoost,
      waitRecommended,
      rationale
    };
  }
}
