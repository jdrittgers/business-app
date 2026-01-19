/**
 * Test Marketing AI Signal Fixes
 *
 * Run with: DATABASE_URL="postgresql://..." npx tsx src/scripts/test-signal-fixes.ts
 */

import { prisma } from '../prisma/client';
import { SignalGenerationService } from '../services/signal-generation.service';

async function testSignals() {
  console.log('='.repeat(70));
  console.log('MARKETING AI SIGNAL TEST - After Fixes');
  console.log('='.repeat(70));

  // Clear old signals
  console.log('\nClearing old signals...');
  await prisma.marketingSignal.deleteMany({});

  // Show current futures data
  console.log('\n--- CURRENT MARKET DATA ---');
  const futures = await prisma.futuresQuote.findMany({
    orderBy: { quoteDate: 'desc' },
    distinct: ['commodityType']
  });
  for (const f of futures) {
    console.log(`  ${f.commodityType} ${f.contractMonth} ${f.contractYear}: $${Number(f.settlementPrice).toFixed(2)}`);
  }

  // Show accumulator contracts
  console.log('\n--- ACCUMULATOR CONTRACTS ---');
  const accumulators = await prisma.grainContract.findMany({
    where: { contractType: 'ACCUMULATOR', isActive: true },
    include: {
      accumulatorDetails: true,
      grainEntity: { include: { business: { select: { name: true } } } }
    }
  });

  console.log(`Found ${accumulators.length} active accumulators`);

  for (const acc of accumulators) {
    if (!acc.accumulatorDetails) continue;
    const d = acc.accumulatorDetails;
    console.log(`\n  ${acc.grainEntity.business.name} - ${acc.commodityType} Accumulator:`);
    console.log(`    Base Price: $${d.basePrice ? Number(d.basePrice).toFixed(2) : 'Not set'}`);
    console.log(`    Knockout: $${Number(d.knockoutPrice).toFixed(2)}`);
    console.log(`    Double-Up: $${Number(d.doubleUpPrice).toFixed(2)}`);
    console.log(`    Daily Bushels: ${Number(d.dailyBushels)}`);
  }

  // Generate signals for first business with accumulators
  if (accumulators.length > 0) {
    const businessId = accumulators[0].grainEntity.businessId;
    console.log(`\n--- GENERATING SIGNALS FOR: ${accumulators[0].grainEntity.business.name} ---`);

    const signalService = new SignalGenerationService();

    try {
      const signals = await signalService.generateSignalsForBusiness(businessId);

      console.log(`\nGenerated ${signals.length} signals:\n`);

      for (const signal of signals) {
        const cropLabel = signal.isNewCrop ? 'NEW CROP' : 'OLD CROP';
        console.log('-'.repeat(70));
        console.log(`${signal.commodityType} | ${signal.signalType} | ${signal.strength}`);
        console.log(`Crop Year: ${signal.cropYear || 'N/A'} (${cropLabel})`);
        console.log(`Title: ${signal.title}`);
        console.log(`Current Price: $${signal.currentPrice.toFixed(2)}/bu`);
        console.log(`Break-Even/Base: $${signal.breakEvenPrice.toFixed(2)}/bu`);
        console.log(`Margin: $${signal.priceAboveBreakeven.toFixed(2)} (${(signal.percentAboveBreakeven * 100).toFixed(1)}%)`);
        console.log(`Summary: ${signal.summary}`);
        if (signal.recommendedAction) {
          console.log(`Action: ${signal.recommendedAction}`);
        }
        const ctx = signal.marketContext?.accumulatorContext;
        if (ctx) {
          console.log('Accumulator Context:');
          if (ctx.basePrice != null) console.log(`  Base: $${ctx.basePrice.toFixed(2)}`);
          if (ctx.knockoutPrice != null) console.log(`  Knockout: $${ctx.knockoutPrice.toFixed(2)}`);
          if (ctx.doubleUpPrice != null) console.log(`  Double-Up: $${ctx.doubleUpPrice.toFixed(2)}`);
        }
        console.log('');
      }
    } catch (err: any) {
      console.error('Error generating signals:', err.message);
      console.error(err.stack);
    }
  } else {
    console.log('\nNo accumulator contracts found to test');
  }

  await prisma.$disconnect();
}

testSignals();
