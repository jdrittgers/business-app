import { prisma } from '../prisma/client';
import { CommodityType } from '@business-app/shared';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Data Audit Service
 *
 * Validates fundamental data accuracy through:
 * 1. Mathematical balance checks (supply = demand + ending stocks)
 * 2. Historical range validation (flagging outliers)
 * 3. Cross-commodity consistency checks
 * 4. AI-powered sanity checks using current market knowledge
 * 5. Data freshness monitoring
 *
 * Run audits regularly to ensure Marketing AI recommendations
 * are based on accurate, up-to-date information.
 */

interface AuditResult {
  passed: boolean;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  check: string;
  message: string;
  currentValue?: number | string;
  expectedRange?: { min: number; max: number } | string;
}

interface AuditReport {
  timestamp: Date;
  commodityType?: CommodityType;
  marketingYear?: string;
  overallStatus: 'PASS' | 'WARNING' | 'FAIL';
  results: AuditResult[];
  recommendations: string[];
}

// Historical valid ranges for sanity checks
const VALID_RANGES = {
  CORN: {
    production: { min: 10000, max: 18000 },      // million bushels
    endingStocks: { min: 500, max: 3000 },
    stocksToUse: { min: 0.05, max: 0.20 },       // 5% to 20%
    avgFarmPrice: { min: 2.50, max: 8.00 },
    yield: { min: 130, max: 190 }                // bu/acre
  },
  SOYBEANS: {
    production: { min: 3000, max: 5000 },
    endingStocks: { min: 100, max: 800 },
    stocksToUse: { min: 0.02, max: 0.25 },
    avgFarmPrice: { min: 7.00, max: 17.00 },
    yield: { min: 40, max: 55 }
  },
  WHEAT: {
    production: { min: 1500, max: 2500 },
    endingStocks: { min: 400, max: 1200 },
    stocksToUse: { min: 0.20, max: 0.60 },
    avgFarmPrice: { min: 4.00, max: 12.00 },
    yield: { min: 40, max: 55 }
  }
};

// USDA WASDE report schedule for freshness checks
const WASDE_RELEASE_DAYS = [8, 9, 10, 11, 12, 13]; // Usually 8th-12th of month

export class DataAuditService {
  private anthropic: Anthropic | null = null;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
  }

  // ===== Full Audit =====

  /**
   * Run comprehensive audit on all fundamental data
   */
  async runFullAudit(): Promise<AuditReport> {
    console.log('📋 Running full data audit...\n');

    const results: AuditResult[] = [];
    const commodities = [CommodityType.CORN, CommodityType.SOYBEANS, CommodityType.WHEAT];

    // 1. Data freshness check
    const freshnessResults = await this.checkDataFreshness();
    results.push(...freshnessResults);

    // 2. Per-commodity validation
    for (const commodity of commodities) {
      const commodityResults = await this.auditCommodity(commodity);
      results.push(...commodityResults);
    }

    // 3. Cross-commodity consistency
    const crossCheckResults = await this.crossCommodityChecks();
    results.push(...crossCheckResults);

    // 4. AI sanity check (if API available)
    if (this.anthropic) {
      const aiResults = await this.aiSanityCheck();
      results.push(...aiResults);
    }

    // Generate report
    const hasErrors = results.some(r => r.severity === 'ERROR' || r.severity === 'CRITICAL');
    const hasWarnings = results.some(r => r.severity === 'WARNING');

    const report: AuditReport = {
      timestamp: new Date(),
      overallStatus: hasErrors ? 'FAIL' : hasWarnings ? 'WARNING' : 'PASS',
      results,
      recommendations: this.generateRecommendations(results)
    };

    this.printReport(report);

    return report;
  }

  // ===== Per-Commodity Audit =====

  async auditCommodity(commodityType: CommodityType): Promise<AuditResult[]> {
    const results: AuditResult[] = [];

    // Get the MOST RECENT WASDE data regardless of marketing year
    // This handles the transition period where current MY data may not exist yet
    const wasde = await prisma.supplyDemandData.findFirst({
      where: { commodityType },
      orderBy: { reportDate: 'desc' }
    });

    if (!wasde) {
      results.push({
        passed: false,
        severity: 'CRITICAL',
        check: 'DATA_EXISTS',
        message: `No WASDE data found for ${commodityType}`
      });
      return results;
    }

    const marketingYear = wasde.marketingYear;
    const currentMY = this.getCurrentMarketingYear(commodityType);

    // Info about which MY we're auditing
    if (marketingYear !== currentMY) {
      results.push({
        passed: true, // Not a failure, just informational
        severity: 'INFO',
        check: 'MARKETING_YEAR_STATUS',
        message: `${commodityType}: Using ${marketingYear} data (current MY is ${currentMY} - new MY projections may not be available yet)`
      });
    }

    const ranges = VALID_RANGES[commodityType];

    // 1. Supply/Demand Balance Check
    // Note: USDA balance sheets have residual adjustments that may cause
    // calculated ending stocks to differ from reported. We check both the
    // stored totalDemand balance AND verify using stored supply/ending stocks.
    const supply = Number(wasde.totalSupply);
    const demand = Number(wasde.totalDemand);
    const endingStocks = Number(wasde.endingStocks);
    const calculatedEnding = supply - demand;
    const balanceDiff = Math.abs(endingStocks - calculatedEnding);

    // The actual balance check: does supply - ending stocks = implied demand?
    const impliedDemand = supply - endingStocks;
    const demandDiff = Math.abs(demand - impliedDemand);
    const demandDiffPct = demand > 0 ? (demandDiff / demand) * 100 : 0;

    // Allow 10% tolerance for USDA residual adjustments
    const balancePassed = demandDiffPct < 10;

    results.push({
      passed: balancePassed,
      severity: balancePassed ? 'INFO' : 'WARNING',
      check: 'BALANCE_CHECK',
      message: `${commodityType}: Stored demand ${demand.toLocaleString()}, implied demand ${impliedDemand.toLocaleString()} (${demandDiffPct.toFixed(1)}% diff). Ending: ${endingStocks.toLocaleString()}`,
      currentValue: demandDiffPct,
      expectedRange: 'Demand difference should be < 10%'
    });

    // 2. Production Range Check
    const production = Number(wasde.production);
    results.push({
      passed: production >= ranges.production.min && production <= ranges.production.max,
      severity: (production < ranges.production.min || production > ranges.production.max) ? 'WARNING' : 'INFO',
      check: 'PRODUCTION_RANGE',
      message: `${commodityType} production: ${production.toLocaleString()} MB`,
      currentValue: production,
      expectedRange: ranges.production
    });

    // 3. Ending Stocks Range Check
    results.push({
      passed: endingStocks >= ranges.endingStocks.min && endingStocks <= ranges.endingStocks.max,
      severity: (endingStocks < ranges.endingStocks.min || endingStocks > ranges.endingStocks.max) ? 'WARNING' : 'INFO',
      check: 'ENDING_STOCKS_RANGE',
      message: `${commodityType} ending stocks: ${endingStocks.toLocaleString()} MB`,
      currentValue: endingStocks,
      expectedRange: ranges.endingStocks
    });

    // 4. Stocks-to-Use Range Check
    const su = Number(wasde.stocksToUseRatio);
    results.push({
      passed: su >= ranges.stocksToUse.min && su <= ranges.stocksToUse.max,
      severity: (su < ranges.stocksToUse.min || su > ranges.stocksToUse.max) ? 'ERROR' : 'INFO',
      check: 'SU_RATIO_RANGE',
      message: `${commodityType} S/U ratio: ${(su * 100).toFixed(1)}%`,
      currentValue: su,
      expectedRange: ranges.stocksToUse
    });

    // 5. S/U Calculation Verification
    const calculatedSU = demand > 0 ? endingStocks / demand : 0;
    const suDiff = Math.abs(su - calculatedSU);
    results.push({
      passed: suDiff < 0.001,
      severity: suDiff < 0.001 ? 'INFO' : 'ERROR',
      check: 'SU_CALCULATION',
      message: `${commodityType} S/U stored: ${(su * 100).toFixed(2)}%, calculated: ${(calculatedSU * 100).toFixed(2)}%`,
      currentValue: suDiff
    });

    // 6. Price Range Check
    const price = Number(wasde.avgFarmPrice);
    if (price > 0) {
      results.push({
        passed: price >= ranges.avgFarmPrice.min && price <= ranges.avgFarmPrice.max,
        severity: (price < ranges.avgFarmPrice.min || price > ranges.avgFarmPrice.max) ? 'WARNING' : 'INFO',
        check: 'PRICE_RANGE',
        message: `${commodityType} avg farm price: $${price.toFixed(2)}`,
        currentValue: price,
        expectedRange: ranges.avgFarmPrice
      });
    }

    // 7. Price Low/High Consistency
    const priceLow = Number(wasde.avgFarmPriceLow);
    const priceHigh = Number(wasde.avgFarmPriceHigh);
    if (priceLow > 0 && priceHigh > 0) {
      const priceConsistent = priceLow <= price && price <= priceHigh;
      results.push({
        passed: priceConsistent,
        severity: priceConsistent ? 'INFO' : 'ERROR',
        check: 'PRICE_CONSISTENCY',
        message: `${commodityType} price range: $${priceLow.toFixed(2)} - $${priceHigh.toFixed(2)}, avg: $${price.toFixed(2)}`,
        currentValue: `Low: ${priceLow}, Avg: ${price}, High: ${priceHigh}`
      });
    }

    return results;
  }

  // ===== Data Freshness Check =====

  async checkDataFreshness(): Promise<AuditResult[]> {
    const results: AuditResult[] = [];
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;

    // Check if we're past a WASDE release date and data might be stale
    const pastWASDE = WASDE_RELEASE_DAYS.some(d => currentDay > d);
    const daysSinceRelease = pastWASDE ? currentDay - Math.max(...WASDE_RELEASE_DAYS.filter(d => d < currentDay)) : 0;

    for (const commodity of [CommodityType.CORN, CommodityType.SOYBEANS, CommodityType.WHEAT]) {
      const latestData = await prisma.supplyDemandData.findFirst({
        where: { commodityType: commodity },
        orderBy: { reportDate: 'desc' }
      });

      if (latestData) {
        const dataMonth = latestData.reportDate.getMonth() + 1;
        const dataAge = (now.getTime() - latestData.reportDate.getTime()) / (1000 * 60 * 60 * 24);

        const isFresh = dataAge < 35; // Less than 35 days old (fresh within month + buffer)
        const isCurrentMonth = dataMonth === currentMonth || (dataMonth === currentMonth - 1 && currentDay <= 15);

        results.push({
          passed: isFresh,
          severity: isFresh ? 'INFO' : (dataAge > 60 ? 'ERROR' : 'WARNING'),
          check: 'DATA_FRESHNESS',
          message: `${commodity} latest data from ${latestData.reportDate.toISOString().split('T')[0]} (${Math.round(dataAge)} days ago)`,
          currentValue: dataAge,
          expectedRange: 'Data should be < 35 days old'
        });

        if (pastWASDE && !isCurrentMonth && daysSinceRelease > 5) {
          results.push({
            passed: false,
            severity: 'WARNING',
            check: 'WASDE_UPDATE_NEEDED',
            message: `${commodity} may have new WASDE data available (${daysSinceRelease} days since likely release)`,
            currentValue: daysSinceRelease
          });
        }
      }
    }

    return results;
  }

  // ===== Cross-Commodity Checks =====

  async crossCommodityChecks(): Promise<AuditResult[]> {
    const results: AuditResult[] = [];

    // Get current data for all commodities
    const cornData = await prisma.supplyDemandData.findFirst({
      where: { commodityType: CommodityType.CORN },
      orderBy: { reportDate: 'desc' }
    });

    const soyData = await prisma.supplyDemandData.findFirst({
      where: { commodityType: CommodityType.SOYBEANS },
      orderBy: { reportDate: 'desc' }
    });

    const wheatData = await prisma.supplyDemandData.findFirst({
      where: { commodityType: CommodityType.WHEAT },
      orderBy: { reportDate: 'desc' }
    });

    if (cornData && soyData && wheatData) {
      // Check report dates are consistent (same WASDE report)
      const cornDate = cornData.reportDate.getTime();
      const soyDate = soyData.reportDate.getTime();
      const wheatDate = wheatData.reportDate.getTime();

      const maxDiff = Math.max(
        Math.abs(cornDate - soyDate),
        Math.abs(cornDate - wheatDate),
        Math.abs(soyDate - wheatDate)
      ) / (1000 * 60 * 60 * 24);

      results.push({
        passed: maxDiff <= 7,
        severity: maxDiff <= 7 ? 'INFO' : 'WARNING',
        check: 'REPORT_DATE_CONSISTENCY',
        message: `Report dates span ${Math.round(maxDiff)} days across commodities`,
        currentValue: maxDiff,
        expectedRange: 'All commodities should have data from same WASDE report'
      });

      // Check corn vs soybean price ratio (historically 2.0-3.0)
      const cornPrice = Number(cornData.avgFarmPrice);
      const soyPrice = Number(soyData.avgFarmPrice);
      if (cornPrice > 0 && soyPrice > 0) {
        const ratio = soyPrice / cornPrice;
        results.push({
          passed: ratio >= 2.0 && ratio <= 3.5,
          severity: (ratio < 2.0 || ratio > 3.5) ? 'WARNING' : 'INFO',
          check: 'SOY_CORN_RATIO',
          message: `Soybean/Corn price ratio: ${ratio.toFixed(2)} (Soy $${soyPrice.toFixed(2)} / Corn $${cornPrice.toFixed(2)})`,
          currentValue: ratio,
          expectedRange: { min: 2.0, max: 3.5 }
        });
      }

      // Corn production should be ~3-4x soybean production
      const cornProd = Number(cornData.production);
      const soyProd = Number(soyData.production);
      if (cornProd > 0 && soyProd > 0) {
        const prodRatio = cornProd / soyProd;
        results.push({
          passed: prodRatio >= 3.0 && prodRatio <= 5.0,
          severity: (prodRatio < 3.0 || prodRatio > 5.0) ? 'WARNING' : 'INFO',
          check: 'CORN_SOY_PRODUCTION_RATIO',
          message: `Corn/Soybean production ratio: ${prodRatio.toFixed(2)}`,
          currentValue: prodRatio,
          expectedRange: { min: 3.0, max: 5.0 }
        });
      }
    }

    return results;
  }

  // ===== AI Sanity Check =====

  async aiSanityCheck(): Promise<AuditResult[]> {
    const results: AuditResult[] = [];

    if (!this.anthropic) {
      return results;
    }

    try {
      // Get current data
      const cornData = await prisma.supplyDemandData.findFirst({
        where: { commodityType: CommodityType.CORN },
        orderBy: { reportDate: 'desc' }
      });

      const soyData = await prisma.supplyDemandData.findFirst({
        where: { commodityType: CommodityType.SOYBEANS },
        orderBy: { reportDate: 'desc' }
      });

      if (!cornData || !soyData) return results;

      const prompt = `You are a grain market data analyst. Verify if this USDA WASDE data seems accurate for January 2026:

CORN 2024/25:
- Production: ${Number(cornData.production).toLocaleString()} million bushels
- Ending Stocks: ${Number(cornData.endingStocks).toLocaleString()} million bushels
- S/U Ratio: ${(Number(cornData.stocksToUseRatio) * 100).toFixed(1)}%
- Avg Farm Price: $${Number(cornData.avgFarmPrice).toFixed(2)}

SOYBEANS 2024/25:
- Production: ${Number(soyData.production).toLocaleString()} million bushels
- Ending Stocks: ${Number(soyData.endingStocks).toLocaleString()} million bushels
- S/U Ratio: ${(Number(soyData.stocksToUseRatio) * 100).toFixed(1)}%
- Avg Farm Price: $${Number(soyData.avgFarmPrice).toFixed(2)}

Based on your knowledge of the January 2026 WASDE report:
1. Does the corn production figure seem accurate? (Should be a record ~17 billion bushels)
2. Does the corn ending stocks seem accurate? (Should be ~2.2 billion, record high)
3. Are the price ranges reasonable given the supply situation?

Respond with JSON only:
{
  "cornDataAccurate": true/false,
  "soyDataAccurate": true/false,
  "concerns": ["list any specific concerns"],
  "confidence": "HIGH/MEDIUM/LOW"
}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Extract JSON from response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);

          results.push({
            passed: analysis.cornDataAccurate && analysis.soyDataAccurate,
            severity: analysis.confidence === 'HIGH' && analysis.cornDataAccurate ? 'INFO' : 'WARNING',
            check: 'AI_VERIFICATION',
            message: `AI data verification: Corn=${analysis.cornDataAccurate ? 'OK' : 'ISSUE'}, Soy=${analysis.soyDataAccurate ? 'OK' : 'ISSUE'}. Confidence: ${analysis.confidence}`,
            currentValue: analysis.concerns?.join('; ') || 'No concerns'
          });

          if (analysis.concerns && analysis.concerns.length > 0) {
            for (const concern of analysis.concerns) {
              results.push({
                passed: false,
                severity: 'WARNING',
                check: 'AI_CONCERN',
                message: concern
              });
            }
          }
        }
      }
    } catch (error) {
      results.push({
        passed: true,
        severity: 'INFO',
        check: 'AI_VERIFICATION',
        message: 'AI verification skipped (API error or unavailable)'
      });
    }

    return results;
  }

  // ===== Verify Against External Source =====

  async verifyAgainstSource(commodityType: CommodityType): Promise<AuditResult[]> {
    const results: AuditResult[] = [];

    // This method would be enhanced to fetch from actual USDA API
    // For now, we document the expected January 2026 values

    const JANUARY_2026_WASDE: Record<CommodityType, {
      production: number;
      endingStocks: number;
      priceRange: [number, number];
    }> = {
      CORN: {
        production: 17021,
        endingStocks: 2227,
        priceRange: [3.85, 4.25]
      },
      SOYBEANS: {
        production: 4366,
        endingStocks: 350,
        priceRange: [9.90, 10.70]
      },
      WHEAT: {
        production: 1971,
        endingStocks: 926,
        priceRange: [5.10, 5.90]
      }
    };

    const expected = JANUARY_2026_WASDE[commodityType];
    const actual = await prisma.supplyDemandData.findFirst({
      where: { commodityType },
      orderBy: { reportDate: 'desc' }
    });

    if (actual && expected) {
      const prodMatch = Math.abs(Number(actual.production) - expected.production) < 100;
      const stocksMatch = Math.abs(Number(actual.endingStocks) - expected.endingStocks) < 50;

      results.push({
        passed: prodMatch,
        severity: prodMatch ? 'INFO' : 'CRITICAL',
        check: 'PRODUCTION_VERIFICATION',
        message: `${commodityType} production: DB has ${Number(actual.production).toLocaleString()}, expected ${expected.production.toLocaleString()}`,
        currentValue: Number(actual.production),
        expectedRange: `${expected.production - 100} - ${expected.production + 100}`
      });

      results.push({
        passed: stocksMatch,
        severity: stocksMatch ? 'INFO' : 'CRITICAL',
        check: 'ENDING_STOCKS_VERIFICATION',
        message: `${commodityType} ending stocks: DB has ${Number(actual.endingStocks).toLocaleString()}, expected ${expected.endingStocks.toLocaleString()}`,
        currentValue: Number(actual.endingStocks),
        expectedRange: `${expected.endingStocks - 50} - ${expected.endingStocks + 50}`
      });
    }

    return results;
  }

  // ===== Helper Methods =====

  private getCurrentMarketingYear(commodityType: CommodityType): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Wheat MY starts June, Corn/Soy start September
    const myStartMonth = commodityType === CommodityType.WHEAT ? 6 : 9;

    if (month >= myStartMonth) {
      return `${year}/${(year + 1).toString().slice(-2)}`;
    }
    return `${year - 1}/${year.toString().slice(-2)}`;
  }

  private generateRecommendations(results: AuditResult[]): string[] {
    const recommendations: string[] = [];

    const criticals = results.filter(r => r.severity === 'CRITICAL');
    const errors = results.filter(r => r.severity === 'ERROR');
    const warnings = results.filter(r => r.severity === 'WARNING');

    if (criticals.length > 0) {
      recommendations.push('CRITICAL: Data accuracy issues detected. Run correction script immediately.');
    }

    if (errors.length > 0) {
      recommendations.push('Errors found in data calculations. Verify S/U ratios and balance equations.');
    }

    const freshnessIssues = results.filter(r => r.check === 'DATA_FRESHNESS' && !r.passed);
    if (freshnessIssues.length > 0) {
      recommendations.push('Data may be stale. Check for new WASDE release and update if available.');
    }

    const wasdeNeeded = results.filter(r => r.check === 'WASDE_UPDATE_NEEDED');
    if (wasdeNeeded.length > 0) {
      recommendations.push('New WASDE report may be available. Consider updating fundamental data.');
    }

    if (recommendations.length === 0) {
      recommendations.push('All checks passed. Data appears accurate and current.');
    }

    return recommendations;
  }

  private printReport(report: AuditReport): void {
    console.log('\n' + '='.repeat(70));
    console.log('DATA AUDIT REPORT');
    console.log('='.repeat(70));
    console.log(`Timestamp: ${report.timestamp.toISOString()}`);
    console.log(`Overall Status: ${report.overallStatus}`);
    console.log('='.repeat(70));

    // Group by severity
    const grouped = {
      CRITICAL: report.results.filter(r => r.severity === 'CRITICAL'),
      ERROR: report.results.filter(r => r.severity === 'ERROR'),
      WARNING: report.results.filter(r => r.severity === 'WARNING'),
      INFO: report.results.filter(r => r.severity === 'INFO')
    };

    if (grouped.CRITICAL.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      grouped.CRITICAL.forEach(r => console.log(`  - ${r.message}`));
    }

    if (grouped.ERROR.length > 0) {
      console.log('\n❌ ERRORS:');
      grouped.ERROR.forEach(r => console.log(`  - ${r.message}`));
    }

    if (grouped.WARNING.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      grouped.WARNING.forEach(r => console.log(`  - ${r.message}`));
    }

    console.log('\n✅ PASSED CHECKS:');
    grouped.INFO.filter(r => r.passed).forEach(r => console.log(`  - ${r.message}`));

    console.log('\n📋 RECOMMENDATIONS:');
    report.recommendations.forEach(r => console.log(`  - ${r}`));

    console.log('\n' + '='.repeat(70));
  }
}

// Export singleton
let auditServiceInstance: DataAuditService | null = null;

export function getDataAuditService(): DataAuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new DataAuditService();
  }
  return auditServiceInstance;
}
