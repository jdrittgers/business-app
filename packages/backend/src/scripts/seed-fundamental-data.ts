/**
 * Seed Fundamental Market Data
 *
 * Run with: npx tsx src/scripts/seed-fundamental-data.ts
 *
 * This script populates the database with:
 * - Historical WASDE data
 * - Seasonal price patterns
 * - USDA report schedule
 * - Sample crop conditions
 * - Sample export sales data
 */

import { prisma } from '../prisma/client';
import { USDADataService } from '../services/usda-data.service';
import { CommodityType } from '@business-app/shared';

async function seedFundamentalData() {
  console.log('🌾 Starting fundamental data seed...\n');

  const usdaService = new USDADataService();

  try {
    // 1. Seed seasonal patterns and WASDE
    console.log('📊 Seeding seasonal patterns and current WASDE...');
    await usdaService.seedHistoricalData();

    // 2. Seed additional historical WASDE data for context
    console.log('\n📈 Seeding historical WASDE data...');
    await seedHistoricalWASDE();

    // 3. Seed crop conditions for current year
    console.log('\n🌱 Seeding crop conditions...');
    await seedCropConditions();

    // 4. Seed export sales data
    console.log('\n🚢 Seeding export sales data...');
    await seedExportSales();

    // 5. Display summary
    await displaySummary();

    console.log('\n✅ Fundamental data seed complete!');
  } catch (error) {
    console.error('Error seeding fundamental data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function seedHistoricalWASDE() {
  const usdaService = new USDADataService();

  // 2023/24 Marketing Year (completed)
  await usdaService.storeWASDE({
    commodityType: CommodityType.CORN,
    marketingYear: '2023/24',
    reportDate: new Date('2024-09-01'),
    beginningStocks: 1360,
    production: 15342,
    imports: 30,
    feedAndResidue: 5650,
    foodSeedIndustrial: 6790,
    ethanolUse: 5400,
    exports: 2142,
    endingStocks: 1760,
    avgFarmPrice: 4.65,
    avgFarmPriceLow: 4.50,
    avgFarmPriceHigh: 4.80
  });

  await usdaService.storeWASDE({
    commodityType: CommodityType.SOYBEANS,
    marketingYear: '2023/24',
    reportDate: new Date('2024-09-01'),
    beginningStocks: 264,
    production: 4165,
    imports: 20,
    feedAndResidue: 0,
    foodSeedIndustrial: 2330,
    exports: 1700,
    endingStocks: 342,
    avgFarmPrice: 12.50,
    avgFarmPriceLow: 12.20,
    avgFarmPriceHigh: 12.80
  });

  await usdaService.storeWASDE({
    commodityType: CommodityType.WHEAT,
    marketingYear: '2023/24',
    reportDate: new Date('2024-06-01'),
    beginningStocks: 570,
    production: 1812,
    imports: 135,
    feedAndResidue: 90,
    foodSeedIndustrial: 945,
    exports: 710,
    endingStocks: 696,
    avgFarmPrice: 7.10,
    avgFarmPriceLow: 6.80,
    avgFarmPriceHigh: 7.40
  });

  // 2022/23 Marketing Year (for trend comparison)
  await usdaService.storeWASDE({
    commodityType: CommodityType.CORN,
    marketingYear: '2022/23',
    reportDate: new Date('2023-09-01'),
    beginningStocks: 1377,
    production: 13730,
    imports: 35,
    feedAndResidue: 5275,
    foodSeedIndustrial: 6715,
    ethanolUse: 5325,
    exports: 1650,
    endingStocks: 1360,
    avgFarmPrice: 6.54,
    avgFarmPriceLow: 6.30,
    avgFarmPriceHigh: 6.80
  });

  await usdaService.storeWASDE({
    commodityType: CommodityType.SOYBEANS,
    marketingYear: '2022/23',
    reportDate: new Date('2023-09-01'),
    beginningStocks: 274,
    production: 4270,
    imports: 15,
    feedAndResidue: 0,
    foodSeedIndustrial: 2240,
    exports: 1980,
    endingStocks: 264,
    avgFarmPrice: 14.20,
    avgFarmPriceLow: 13.90,
    avgFarmPriceHigh: 14.50
  });

  console.log('  - Stored 2022/23 and 2023/24 WASDE data');
}

async function seedCropConditions() {
  const currentYear = new Date().getFullYear();

  // Sample crop condition progression for corn
  const cornConditions = [
    { week: 22, excellent: 14, good: 58, fair: 21, poor: 5, veryPoor: 2 }, // Early June
    { week: 26, excellent: 12, good: 55, fair: 24, poor: 6, veryPoor: 3 }, // Late June
    { week: 30, excellent: 10, good: 52, fair: 27, poor: 7, veryPoor: 4 }, // Late July (drought stress)
    { week: 34, excellent: 9, good: 53, fair: 26, poor: 8, veryPoor: 4 }, // Late August
    { week: 38, excellent: 9, good: 52, fair: 27, poor: 8, veryPoor: 4 }, // Late September
  ];

  for (const cond of cornConditions) {
    const weekEnding = getWeekEndingDate(currentYear, cond.week);
    await prisma.cropProgressData.upsert({
      where: {
        commodityType_year_weekEnding_state: {
          commodityType: CommodityType.CORN,
          year: currentYear,
          weekEnding,
          state: 'NATIONAL'
        }
      },
      update: {
        conditionExcellent: cond.excellent,
        conditionGood: cond.good,
        conditionFair: cond.fair,
        conditionPoor: cond.poor,
        conditionVeryPoor: cond.veryPoor,
        goodExcellentPct: cond.excellent + cond.good
      },
      create: {
        commodityType: CommodityType.CORN,
        year: currentYear,
        weekEnding,
        state: 'NATIONAL',
        conditionExcellent: cond.excellent,
        conditionGood: cond.good,
        conditionFair: cond.fair,
        conditionPoor: cond.poor,
        conditionVeryPoor: cond.veryPoor,
        goodExcellentPct: cond.excellent + cond.good,
        source: 'USDA_NASS'
      }
    });
  }

  // Sample soybean conditions
  const soybeanConditions = [
    { week: 22, excellent: 13, good: 57, fair: 22, poor: 5, veryPoor: 3 },
    { week: 26, excellent: 11, good: 54, fair: 25, poor: 7, veryPoor: 3 },
    { week: 30, excellent: 9, good: 50, fair: 28, poor: 9, veryPoor: 4 },
    { week: 34, excellent: 8, good: 49, fair: 29, poor: 10, veryPoor: 4 },
    { week: 38, excellent: 8, good: 48, fair: 30, poor: 10, veryPoor: 4 },
  ];

  for (const cond of soybeanConditions) {
    const weekEnding = getWeekEndingDate(currentYear, cond.week);
    await prisma.cropProgressData.upsert({
      where: {
        commodityType_year_weekEnding_state: {
          commodityType: CommodityType.SOYBEANS,
          year: currentYear,
          weekEnding,
          state: 'NATIONAL'
        }
      },
      update: {
        conditionExcellent: cond.excellent,
        conditionGood: cond.good,
        conditionFair: cond.fair,
        conditionPoor: cond.poor,
        conditionVeryPoor: cond.veryPoor,
        goodExcellentPct: cond.excellent + cond.good
      },
      create: {
        commodityType: CommodityType.SOYBEANS,
        year: currentYear,
        weekEnding,
        state: 'NATIONAL',
        conditionExcellent: cond.excellent,
        conditionGood: cond.good,
        conditionFair: cond.fair,
        conditionPoor: cond.poor,
        conditionVeryPoor: cond.veryPoor,
        goodExcellentPct: cond.excellent + cond.good,
        source: 'USDA_NASS'
      }
    });
  }

  console.log('  - Stored crop condition data for corn and soybeans');
}

async function seedExportSales() {
  const usdaService = new USDADataService();

  // Sample export sales data for current marketing year
  const exportData = [
    {
      weekNum: 1,
      corn: { sales: 850, exports: 120, cumSales: 850, cumExports: 120, outstanding: 730 },
      soybeans: { sales: 1200, exports: 450, cumSales: 1200, cumExports: 450, outstanding: 750 }
    },
    {
      weekNum: 5,
      corn: { sales: 620, exports: 280, cumSales: 4200, cumExports: 980, outstanding: 3220 },
      soybeans: { sales: 950, exports: 680, cumSales: 5800, cumExports: 2400, outstanding: 3400 }
    },
    {
      weekNum: 10,
      corn: { sales: 480, exports: 420, cumSales: 7500, cumExports: 2800, outstanding: 4700 },
      soybeans: { sales: 720, exports: 850, cumSales: 9200, cumExports: 5100, outstanding: 4100 }
    },
    {
      weekNum: 15,
      corn: { sales: 380, exports: 520, cumSales: 10200, cumExports: 5400, outstanding: 4800 },
      soybeans: { sales: 450, exports: 680, cumSales: 11500, cumExports: 7200, outstanding: 4300 }
    },
  ];

  const marketingYear = '2024/25';
  const myStart = new Date('2024-09-01');

  for (const data of exportData) {
    const weekEnding = new Date(myStart.getTime() + data.weekNum * 7 * 24 * 60 * 60 * 1000);

    await usdaService.storeExportSales({
      commodityType: CommodityType.CORN,
      marketingYear,
      weekEnding,
      weeklySales: data.corn.sales,
      weeklyExports: data.corn.exports,
      cumulativeSales: data.corn.cumSales,
      cumulativeExports: data.corn.cumExports,
      outstandingSales: data.corn.outstanding,
      topBuyer1: 'Mexico',
      topBuyer1Volume: data.corn.sales * 0.35,
      topBuyer2: 'Japan',
      topBuyer2Volume: data.corn.sales * 0.15
    });

    await usdaService.storeExportSales({
      commodityType: CommodityType.SOYBEANS,
      marketingYear,
      weekEnding,
      weeklySales: data.soybeans.sales,
      weeklyExports: data.soybeans.exports,
      cumulativeSales: data.soybeans.cumSales,
      cumulativeExports: data.soybeans.cumExports,
      outstandingSales: data.soybeans.outstanding,
      topBuyer1: 'China',
      topBuyer1Volume: data.soybeans.sales * 0.55,
      topBuyer2: 'EU',
      topBuyer2Volume: data.soybeans.sales * 0.12
    });
  }

  console.log('  - Stored export sales data for corn and soybeans');
}

async function displaySummary() {
  console.log('\n📋 Data Summary:');

  const wasdeCount = await prisma.supplyDemandData.count();
  const cropProgressCount = await prisma.cropProgressData.count();
  const exportSalesCount = await prisma.exportSalesData.count();
  const seasonalCount = await prisma.seasonalPattern.count();
  const reportScheduleCount = await prisma.uSDAReportSchedule.count();

  console.log(`  - WASDE records: ${wasdeCount}`);
  console.log(`  - Crop progress records: ${cropProgressCount}`);
  console.log(`  - Export sales records: ${exportSalesCount}`);
  console.log(`  - Seasonal patterns: ${seasonalCount}`);
  console.log(`  - USDA report schedule: ${reportScheduleCount}`);

  // Show current corn S/U interpretation
  const cornWASDE = await prisma.supplyDemandData.findFirst({
    where: { commodityType: CommodityType.CORN, marketingYear: '2024/25' },
    orderBy: { reportDate: 'desc' }
  });

  if (cornWASDE) {
    const stocksToUse = Number(cornWASDE.stocksToUseRatio);
    const usdaService = new USDADataService();
    const percentile = usdaService.calculateStocksToUsePercentile(CommodityType.CORN, stocksToUse);

    console.log('\n🌽 Current Corn Fundamentals:');
    console.log(`  - Ending Stocks: ${Number(cornWASDE.endingStocks).toLocaleString()} million bushels`);
    console.log(`  - Stocks-to-Use: ${(stocksToUse * 100).toFixed(1)}%`);
    console.log(`  - Historical Percentile: ${percentile.toFixed(0)}th (higher = more bearish)`);
    console.log(`  - USDA Price Range: $${Number(cornWASDE.avgFarmPriceLow).toFixed(2)} - $${Number(cornWASDE.avgFarmPriceHigh).toFixed(2)}`);

    if (stocksToUse < 0.10) {
      console.log('  - Outlook: BULLISH (tight stocks)');
    } else if (stocksToUse > 0.14) {
      console.log('  - Outlook: BEARISH (ample stocks)');
    } else {
      console.log('  - Outlook: NEUTRAL');
    }
  }
}

function getWeekEndingDate(year: number, weekNum: number): Date {
  // Get the first Sunday of the year
  const jan1 = new Date(year, 0, 1);
  const firstSunday = new Date(jan1);
  firstSunday.setDate(jan1.getDate() + (7 - jan1.getDay()) % 7);

  // Add weeks
  const weekEnding = new Date(firstSunday);
  weekEnding.setDate(firstSunday.getDate() + (weekNum - 1) * 7);

  return weekEnding;
}

// Run the seed
seedFundamentalData();
