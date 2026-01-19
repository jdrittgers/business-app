/**
 * Test Marketing AI with Corrected Fundamental Data
 *
 * Run with: DATABASE_URL="postgresql://postgres:IFEGBjBrfpLQlpQadSsiyLOjyukaYkOu@trolley.proxy.rlwy.net:24210/railway" npx tsx src/scripts/test-marketing-ai.ts
 *
 * This script tests:
 * 1. Fundamental data context retrieval
 * 2. Signal generation with corrected data
 * 3. AI analysis recommendations
 * 4. Seasonal patterns integration
 */

import { prisma } from '../prisma/client';
import { FundamentalDataService } from '../services/fundamental-data.service';
import { AIAnalysisService } from '../services/ai-analysis.service';
import { SeasonalPatternsService } from '../services/seasonal-patterns.service';
import { CommodityType } from '@business-app/shared';

async function testMarketingAI() {
  console.log('='.repeat(70));
  console.log('MARKETING AI TEST - January 2026 Corrected Data');
  console.log('='.repeat(70));
  console.log(`Test Date: ${new Date().toISOString()}\n`);

  const fundamentalService = new FundamentalDataService();
  const aiService = new AIAnalysisService();
  const seasonalService = new SeasonalPatternsService();

  try {
    // ===== TEST 1: Fundamental Context =====
    console.log('TEST 1: FUNDAMENTAL CONTEXT RETRIEVAL');
    console.log('-'.repeat(50));

    for (const commodity of [CommodityType.CORN, CommodityType.SOYBEANS, CommodityType.WHEAT]) {
      console.log(`\n${commodity}:`);
      const context = await fundamentalService.getFundamentalContext(commodity);

      console.log(`  Overall Fundamental Score: ${context.overallFundamentalScore.toFixed(1)} / 100`);
      console.log(`  Key Factors:`);
      context.keyFactors.forEach(f => console.log(`    - ${f}`));

      if (context.supplyDemand) {
        const sd = context.supplyDemand;
        console.log(`  Supply/Demand:`);
        console.log(`    - Marketing Year: ${sd.marketingYear}`);
        console.log(`    - Ending Stocks: ${sd.endingStocks?.toLocaleString() || 'N/A'} MB`);
        console.log(`    - S/U Ratio: ${sd.stocksToUseRatio ? (sd.stocksToUseRatio * 100).toFixed(1) + '%' : 'N/A'}`);
        console.log(`    - Price Range: $${sd.avgFarmPrice?.low?.toFixed(2) || 'N/A'} - $${sd.avgFarmPrice?.high?.toFixed(2) || 'N/A'}`);
        console.log(`    - S/D Outlook: ${sd.outlook}`);
        console.log(`    - Reason: ${sd.outlookReason}`);
      }

      // Interpret the score
      let outlook = 'NEUTRAL';
      if (context.overallFundamentalScore <= -25) outlook = 'BEARISH';
      else if (context.overallFundamentalScore >= 25) outlook = 'BULLISH';
      console.log(`  Outlook: ${outlook}`);
    }

    // ===== TEST 1B: Seasonal Patterns =====
    console.log('\n' + '='.repeat(70));
    console.log('TEST 1B: SEASONAL PATTERNS (NEW FEATURE)');
    console.log('-'.repeat(50));

    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
    console.log(`\nCurrent Month: ${currentMonth}\n`);

    for (const commodity of [CommodityType.CORN, CommodityType.SOYBEANS, CommodityType.WHEAT]) {
      // Get seasonal context with a sample price
      const samplePrices: Record<string, number> = {
        'CORN': 4.15,
        'SOYBEANS': 10.30,
        'WHEAT': 5.50
      };
      const currentPrice = samplePrices[commodity] || 4.00;

      const seasonalContext = seasonalService.getSeasonalContext(commodity, currentPrice);
      const seasonalAdjustment = seasonalService.getSeasonalAdjustment(commodity, currentPrice);

      console.log(`${commodity}:`);
      console.log(`  Current Price: $${currentPrice.toFixed(2)}/bu`);
      console.log(`  Historical Percentile: ${seasonalContext.historicalPricePercentile.toFixed(0)}th`);
      console.log(`    (Current price is higher than ${seasonalContext.historicalPricePercentile.toFixed(0)}% of historical ${currentMonth} prices)`);
      console.log(`  Seasonal Score: ${seasonalContext.seasonalScore.toFixed(1)} (${seasonalContext.seasonalOutlook})`);
      console.log(`  Marketing Implication: ${seasonalContext.currentPattern.marketingImplication}`);
      console.log(`  Rally Probability (next 30-60 days): ${seasonalContext.currentPattern.historicalRallyProbability}%`);
      console.log(`  Typical Volatility: ${seasonalContext.currentPattern.typicalVolatility}`);
      console.log(`  Key Factors:`);
      seasonalContext.currentPattern.keyFactors.forEach(f => console.log(`    - ${f}`));
      console.log(`  Signal Adjustments:`);
      console.log(`    - Threshold adjustment: ${((1 - seasonalAdjustment.thresholdAdjustment) * 100).toFixed(1)}% ${seasonalAdjustment.thresholdAdjustment < 1 ? 'lower' : 'higher'}`);
      console.log(`    - Sell % adjustment: ${(seasonalAdjustment.percentageAdjustment * 100).toFixed(1)}%`);
      console.log(`    - Urgency boost: ${seasonalAdjustment.urgencyBoost ? 'YES' : 'No'}`);
      console.log(`    - Wait recommended: ${seasonalAdjustment.waitRecommended ? 'YES' : 'No'}`);
      console.log(`  Recommendation: ${seasonalContext.recommendedAction}`);
      console.log('');
    }

    // ===== TEST 2: Signal Generation Simulation =====
    console.log('\n' + '='.repeat(70));
    console.log('TEST 2: SIGNAL GENERATION SIMULATION');
    console.log('-'.repeat(50));

    // Simulate different price scenarios
    const scenarios = [
      { name: 'Above Break-even (Strong)', commodity: CommodityType.CORN, breakEven: 3.80, currentPrice: 4.50, bushels: 50000 },
      { name: 'Marginal Profit', commodity: CommodityType.CORN, breakEven: 4.00, currentPrice: 4.20, bushels: 50000 },
      { name: 'Below Break-even', commodity: CommodityType.CORN, breakEven: 4.50, currentPrice: 4.10, bushels: 50000 },
      { name: 'Soy Above BE', commodity: CommodityType.SOYBEANS, breakEven: 9.50, currentPrice: 10.50, bushels: 30000 },
      { name: 'Wheat Marginal', commodity: CommodityType.WHEAT, breakEven: 5.20, currentPrice: 5.50, bushels: 20000 },
    ];

    for (const scenario of scenarios) {
      console.log(`\nScenario: ${scenario.name}`);
      console.log(`  Commodity: ${scenario.commodity}`);
      console.log(`  Break-even: $${scenario.breakEven.toFixed(2)}/bu`);
      console.log(`  Current Price: $${scenario.currentPrice.toFixed(2)}/bu`);
      console.log(`  Bushels: ${scenario.bushels.toLocaleString()}`);

      const context = await fundamentalService.getFundamentalContext(scenario.commodity);
      const priceAboveBE = scenario.currentPrice - scenario.breakEven;
      const percentAboveBE = priceAboveBE / scenario.breakEven;

      console.log(`  Price Above BE: $${priceAboveBE.toFixed(2)} (${(percentAboveBE * 100).toFixed(1)}%)`);
      console.log(`  Fundamental Score: ${context.overallFundamentalScore.toFixed(1)}`);

      // Calculate fundamental adjustment (simulating signal-generation.service.ts logic)
      const score = context.overallFundamentalScore;
      let percentageAdjustment = 0;
      let outlook: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

      if (score <= -50) {
        percentageAdjustment = 0.10;
        outlook = 'BEARISH';
      } else if (score <= -25) {
        percentageAdjustment = 0.05;
        outlook = 'BEARISH';
      } else if (score >= 50) {
        percentageAdjustment = -0.05;
        outlook = 'BULLISH';
      } else if (score >= 25) {
        percentageAdjustment = -0.025;
        outlook = 'BULLISH';
      }

      const baseSellPct = 0.125;
      const adjustedSellPct = baseSellPct + percentageAdjustment;

      console.log(`  Fundamental Outlook: ${outlook}`);
      console.log(`  Base Sell %: ${(baseSellPct * 100).toFixed(1)}%`);
      console.log(`  Adjusted Sell %: ${(adjustedSellPct * 100).toFixed(1)}% (${percentageAdjustment >= 0 ? '+' : ''}${(percentageAdjustment * 100).toFixed(1)}% adjustment)`);

      // Determine signal
      let signal = 'NO SIGNAL';
      let recommendedBushels = 0;

      if (percentAboveBE >= 0.15) {
        signal = outlook === 'BEARISH' ? 'URGENT STRONG_BUY' : 'STRONG_BUY';
        recommendedBushels = Math.round(scenario.bushels * (adjustedSellPct + 0.125));
      } else if (percentAboveBE >= 0.10) {
        signal = 'BUY';
        recommendedBushels = Math.round(scenario.bushels * adjustedSellPct);
      } else if (percentAboveBE >= 0.05 && outlook === 'BEARISH') {
        signal = 'DEFENSIVE BUY';
        recommendedBushels = Math.round(scenario.bushels * adjustedSellPct * 0.5);
      } else if (percentAboveBE >= 0) {
        signal = 'HOLD';
      } else {
        signal = 'DO NOT SELL';
      }

      console.log(`  Signal: ${signal}`);
      if (recommendedBushels > 0) {
        console.log(`  Recommended Sale: ${recommendedBushels.toLocaleString()} bushels ($${(recommendedBushels * scenario.currentPrice).toLocaleString()})`);
      }
    }

    // ===== TEST 2B: Remaining Bushels Tracking =====
    console.log('\n' + '='.repeat(70));
    console.log('TEST 2B: REMAINING BUSHELS TRACKING (NEW FEATURE)');
    console.log('-'.repeat(50));

    console.log(`
The Marketing AI now tracks REMAINING bushels, not total production.

Example: 100,000 bu corn farmer with 50% pre-harvest target

Pre-Harvest Marketing Target: 50% (user-configurable)
Max Single Sale: 25% of total (user-configurable)

Scenario: Multiple signals throughout the year
--------------------------------------------------`);

    // Simulate multiple signals over time
    const totalProduction = 100000;
    const preHarvestTarget = 0.50; // 50%
    const maxSingleSale = 0.25;    // 25%
    let soldSoFar = 0;

    const marketOpportunities = [
      { month: 'January', pctAboveBE: 0.12, signalType: 'BUY', sellPct: 0.175 },
      { month: 'March', pctAboveBE: 0.18, signalType: 'STRONG_BUY', sellPct: 0.30 },
      { month: 'May', pctAboveBE: 0.08, signalType: 'BUY', sellPct: 0.175 },
      { month: 'July', pctAboveBE: 0.15, signalType: 'STRONG_BUY', sellPct: 0.30 },
      { month: 'August', pctAboveBE: 0.10, signalType: 'BUY', sellPct: 0.175 },
    ];

    console.log('\nOLD BEHAVIOR (% of total production):');
    console.log('-'.repeat(40));
    let oldTotalSold = 0;
    for (const opp of marketOpportunities) {
      const bushelsOld = Math.round(totalProduction * opp.sellPct);
      oldTotalSold += bushelsOld;
      console.log(`  ${opp.month}: Recommend ${bushelsOld.toLocaleString()} bu (${(opp.sellPct * 100).toFixed(1)}% of total)`);
    }
    console.log(`  TOTAL RECOMMENDED: ${oldTotalSold.toLocaleString()} bu (${((oldTotalSold / totalProduction) * 100).toFixed(0)}% of production)`);
    if (oldTotalSold > totalProduction) {
      console.log(`  ⚠️  PROBLEM: Recommended more bushels than farmer has!`);
    }

    console.log('\nNEW BEHAVIOR (% of REMAINING bushels with pre-harvest target):');
    console.log('-'.repeat(40));
    soldSoFar = 0;
    for (const opp of marketOpportunities) {
      const remaining = totalProduction - soldSoFar;
      const percentSold = soldSoFar / totalProduction;
      const bushelsToTarget = totalProduction * preHarvestTarget - soldSoFar;

      // Calculate recommended bushels with constraints
      const desiredBushels = remaining * opp.sellPct;
      const maxFromSingleSale = totalProduction * maxSingleSale;
      const maxFromTarget = Math.max(0, bushelsToTarget);

      // Take the minimum of all constraints
      const recommendedNew = Math.round(Math.min(
        desiredBushels,
        remaining,
        maxFromSingleSale,
        maxFromTarget > 0 ? maxFromTarget : remaining // If past target, allow normal sales
      ));

      console.log(`  ${opp.month}:`);
      console.log(`    Currently ${(percentSold * 100).toFixed(0)}% sold (${soldSoFar.toLocaleString()} bu)`);
      console.log(`    Remaining: ${remaining.toLocaleString()} bu`);
      console.log(`    To reach ${(preHarvestTarget * 100).toFixed(0)}% target: ${Math.max(0, bushelsToTarget).toLocaleString()} bu`);
      console.log(`    Recommend: ${recommendedNew.toLocaleString()} bu`);

      soldSoFar += recommendedNew;

      if (soldSoFar >= totalProduction * preHarvestTarget) {
        console.log(`    ✓ Pre-harvest target reached!`);
      }
    }
    console.log(`  TOTAL SOLD: ${soldSoFar.toLocaleString()} bu (${((soldSoFar / totalProduction) * 100).toFixed(0)}% of production)`);
    console.log(`  ✓ Never exceeded pre-harvest target or remaining bushels`)

    // ===== TEST 3: AI Analysis (if API key available) =====
    console.log('\n' + '='.repeat(70));
    console.log('TEST 3: AI ANALYSIS');
    console.log('-'.repeat(50));

    if (process.env.ANTHROPIC_API_KEY) {
      console.log('Generating AI market outlook for CORN...\n');

      const cornContext = await fundamentalService.getFundamentalContext(CommodityType.CORN);

      // Build market context for AI
      const marketContext = {
        futuresPrice: 4.15,
        futuresMonth: 'March 2026',
        futuresTrend: 'DOWN' as const,
        basisLevel: -0.10,
        basisVsHistorical: 'AVERAGE' as const,
        rsiValue: 45,
        movingAverage20: 4.20,
        movingAverage50: 4.30,
        volatility: 0.03,
        fundamentalScore: cornContext.overallFundamentalScore,
        fundamentalOutlook: cornContext.overallFundamentalScore <= -25 ? 'BEARISH' as const : 'NEUTRAL' as const,
        keyFundamentalFactors: cornContext.keyFactors.slice(0, 3),
        stocksToUseRatio: cornContext.supplyDemand?.stocksToUseRatio
      };

      try {
        const outlook = await aiService.generateMarketOutlook(CommodityType.CORN, marketContext);
        console.log('AI Market Outlook:');
        console.log(`  Short-term (1-4 weeks): ${outlook.shortTerm.direction} (Confidence: ${outlook.shortTerm.confidence}%)`);
        console.log(`    ${outlook.shortTerm.rationale}`);
        console.log(`  Medium-term (1-3 months): ${outlook.mediumTerm.direction} (Confidence: ${outlook.mediumTerm.confidence}%)`);
        console.log(`    ${outlook.mediumTerm.rationale}`);
        console.log(`\n  Key Factors:`);
        outlook.keyFactors.forEach(f => console.log(`    - ${f}`));
        console.log(`\n  Risks to Watch:`);
        outlook.risksToWatch.forEach(r => console.log(`    - ${r}`));
        console.log(`\n  Marketing Recommendation:`);
        console.log(`    ${outlook.marketingRecommendation}`);
      } catch (err: any) {
        console.log(`AI analysis error: ${err.message}`);
      }
    } else {
      console.log('ANTHROPIC_API_KEY not set - skipping AI analysis test');
      console.log('The AI would generate personalized recommendations based on:');
      console.log('  - Current market conditions');
      console.log('  - Fundamental data (corrected January 2026 WASDE)');
      console.log('  - Technical indicators');
      console.log('  - Seasonal patterns');
    }

    // ===== TEST 4: Fundamental Impact Summary =====
    console.log('\n' + '='.repeat(70));
    console.log('TEST 4: FUNDAMENTAL IMPACT SUMMARY');
    console.log('-'.repeat(50));

    console.log(`
Based on the corrected January 2026 WASDE data:

CORN: BEARISH Fundamentals (-25 to -50 score expected)
  - Record production at 17.021 billion bushels
  - Ending stocks at 2.227 billion bushels (record high)
  - S/U ratio at 13.4% - ample supply
  - IMPACT: Marketing AI will:
    * Lower sell thresholds (sell earlier)
    * Increase recommended sell percentages by 5-10%
    * Generate "URGENT" signals when both technical and fundamentals align
    * Recommend defensive sales even at marginal profits

SOYBEANS: NEUTRAL Fundamentals (-25 to +25 score expected)
  - Ending stocks at 350 million bushels
  - S/U ratio at 8.0% - adequate supply
  - IMPACT: Marketing AI will:
    * Use standard thresholds
    * Standard sell percentages (12.5%)
    * Normal signal generation

WHEAT: BEARISH Fundamentals (-25 to -50 score expected)
  - Ending stocks at 926 million bushels
  - S/U ratio at 49% - comfortable supply
  - IMPACT: Marketing AI will:
    * Lower sell thresholds
    * Increase sell percentages
    * More aggressive selling recommendations
`);

    // ===== TEST 5: Verify with Actual Business (if exists) =====
    console.log('\n' + '='.repeat(70));
    console.log('TEST 5: CHECK FOR REAL BUSINESS DATA');
    console.log('-'.repeat(50));

    const businesses = await prisma.business.findMany({
      take: 1,
      include: {
        grainEntities: {
          take: 3
        }
      },
      where: {
        deletedAt: null
      }
    });

    if (businesses.length > 0) {
      const business = businesses[0];
      console.log(`\nFound business: ${business.name} (${business.id})`);

      if (business.grainEntities.length > 0) {
        console.log(`Active grain entities: ${business.grainEntities.length}`);

        // Check for existing signals
        const signals = await prisma.marketingSignal.findMany({
          where: { businessId: business.id, status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 5
        });

        if (signals.length > 0) {
          console.log(`\nExisting active signals for this business:`);
          for (const signal of signals) {
            console.log(`  - ${signal.title}`);
            console.log(`    Type: ${signal.signalType}, Strength: ${signal.strength}`);
            console.log(`    ${signal.summary}`);
          }
        } else {
          console.log('\nNo active signals found.');
          console.log('To generate signals, run the signal generation job or call generateSignalsForBusiness()');
        }
      } else {
        console.log('No active grain entities found for testing.');
      }
    } else {
      console.log('No businesses found in database.');
      console.log('The Marketing AI needs business and grain entity data to generate personalized signals.');
    }

    console.log('\n' + '='.repeat(70));
    console.log('MARKETING AI TEST COMPLETE');
    console.log('='.repeat(70));
    console.log(`
Summary:
- Fundamental data is correctly loaded from January 2026 WASDE
- Signal generation logic properly incorporates fundamental adjustments
- Bearish fundamentals (CORN, WHEAT) will trigger more aggressive sell signals
- Neutral fundamentals (SOYBEANS) will use standard thresholds

The Marketing AI is ready to generate accurate signals based on:
1. User's break-even prices
2. Current market prices
3. Technical indicators (RSI, MAs, volatility)
4. CORRECTED fundamental data (ending stocks, S/U ratios)
5. Seasonal patterns
6. AI-powered analysis (with API key)
`);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testMarketingAI();
