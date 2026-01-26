/**
 * Fix script to recalculate amountUsed for all FarmChemicalUsage records
 * that are linked to template items.
 *
 * The old calculation was: amountUsed = ratePerAcre * acresApplied
 * The correct calculation converts rate units to purchase units first:
 *   e.g., 8 OZ/acre * 100 acres = 800 OZ = 6.25 GAL
 *
 * Run with: DATABASE_URL="..." npx tsx src/scripts/fix-chemical-usage-amounts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Unit conversion helper
function convertRateToBaseUnit(rate: number, rateUnit: string, purchaseUnit: string): number {
  if (rateUnit === purchaseUnit) return rate;

  // Volume conversions (to GAL)
  const volumeToGal: Record<string, number> = {
    'GAL': 1,
    'QT': 0.25,      // 1 quart = 0.25 gallon
    'PT': 0.125,     // 1 pint = 0.125 gallon
    'OZ': 0.0078125  // 1 fl oz = 1/128 gallon
  };

  // Weight conversions (to LB)
  const weightToLb: Record<string, number> = {
    'LB': 1,
    'OZ': 0.0625     // 1 oz = 1/16 lb
  };

  // Handle volume-based chemicals (GAL purchase unit)
  if (purchaseUnit === 'GAL' && volumeToGal[rateUnit]) {
    return rate * volumeToGal[rateUnit];
  }

  // Handle weight-based chemicals (LB purchase unit)
  if (purchaseUnit === 'LB' && weightToLb[rateUnit]) {
    return rate * weightToLb[rateUnit];
  }

  // If units don't match type, return as-is
  return rate;
}

async function fixChemicalUsageAmounts() {
  console.log('Starting fix for FarmChemicalUsage amountUsed values...\n');

  // Get all FarmChemicalUsage records that have a templateItemId
  const usages = await prisma.farmChemicalUsage.findMany({
    where: {
      templateItemId: { not: null }
    },
    include: {
      chemical: true,
      templateItem: true,
      farm: true
    }
  });

  console.log(`Found ${usages.length} FarmChemicalUsage records linked to templates\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const usage of usages) {
    try {
      if (!usage.templateItem || !usage.chemical) {
        console.log(`  Skipping ${usage.id} - missing template item or chemical`);
        skippedCount++;
        continue;
      }

      const ratePerAcre = Number(usage.ratePerAcre);
      const acresApplied = Number(usage.acresApplied);
      const currentAmountUsed = Number(usage.amountUsed);

      // Get rate unit from template item, fallback to chemical's rateUnit or unit
      const rateUnit = usage.templateItem.rateUnit || usage.chemical.rateUnit || usage.chemical.unit;
      const purchaseUnit = usage.chemical.unit;

      // Calculate correct amount
      const rateInPurchaseUnits = convertRateToBaseUnit(ratePerAcre, rateUnit, purchaseUnit);
      const correctAmountUsed = rateInPurchaseUnits * acresApplied;

      // Check if update is needed (allow small floating point differences)
      if (Math.abs(correctAmountUsed - currentAmountUsed) < 0.001) {
        skippedCount++;
        continue;
      }

      console.log(`Fixing: ${usage.farm?.name || usage.farmId}`);
      console.log(`  Chemical: ${usage.chemical.name}`);
      console.log(`  Rate: ${ratePerAcre} ${rateUnit}/acre × ${acresApplied} acres`);
      console.log(`  Old amountUsed: ${currentAmountUsed} ${purchaseUnit}`);
      console.log(`  New amountUsed: ${correctAmountUsed.toFixed(4)} ${purchaseUnit}`);
      console.log('');

      // Update the record
      await prisma.farmChemicalUsage.update({
        where: { id: usage.id },
        data: { amountUsed: correctAmountUsed }
      });

      updatedCount++;
    } catch (err) {
      console.error(`Error processing usage ${usage.id}:`, err);
      errorCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped (already correct): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
}

fixChemicalUsageAmounts()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
