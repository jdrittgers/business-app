import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const demoUser = await p.user.findFirst({ where: { email: 'demo@demo.com' } });
  if (!demoUser) { console.log('Demo user not found'); return; }
  const demoMember = await p.businessMember.findFirst({ where: { userId: demoUser.id } });
  if (!demoMember) { console.log('No membership'); return; }
  const businessId = demoMember.businessId;
  console.log('Demo business:', businessId);

  // Use Main Farm entity for new farms
  const mainEntity = await p.grainEntity.findFirst({ where: { businessId, name: 'Main Farm' } });
  if (!mainEntity) { console.log('Main Farm entity not found'); return; }
  const entityId = mainEntity.id;

  // --- Create 2 more farms (1 corn, 1 soybean) ---
  const existingFarms = await p.farm.findMany({ where: { grainEntityId: entityId, year: 2025, deletedAt: null } });
  console.log('Existing farms:', existingFarms.map(f => f.name));

  let cornFarm2: any = existingFarms.find(f => f.name === 'Corn Farm - Section C');
  if (!cornFarm2) {
    cornFarm2 = await p.farm.create({
      data: {
        name: 'Corn Farm - Section C',
        acres: 480,
        commodityType: 'CORN',
        year: 2025,
        grainEntityId: entityId,
        projectedYield: 210,
      }
    });
    console.log('Created Corn Farm - Section C');
  }

  let beanFarm2: any = existingFarms.find(f => f.name === 'Soybean Farm - Section D');
  if (!beanFarm2) {
    beanFarm2 = await p.farm.create({
      data: {
        name: 'Soybean Farm - Section D',
        acres: 520,
        commodityType: 'SOYBEANS',
        year: 2025,
        grainEntityId: entityId,
        projectedYield: 55,
      }
    });
    console.log('Created Soybean Farm - Section D');
  }

  // Get all 4 farms
  const allFarms = await p.farm.findMany({ where: { grainEntityId: entityId, year: 2025, deletedAt: null } });
  const cornFarms = allFarms.filter(f => f.commodityType === 'CORN');
  const beanFarms = allFarms.filter(f => f.commodityType === 'SOYBEANS');
  console.log('Corn farms:', cornFarms.map(f => `${f.name} (${f.acres} ac)`));
  console.log('Bean farms:', beanFarms.map(f => `${f.name} (${f.acres} ac)`));

  // --- Seed Fertilizers ---
  const fertData = [
    { name: 'UREA 46-0-0', pricePerUnit: 610, unit: 'TON', nitrogenPct: 46, isLiquid: false, isManure: false },
    { name: 'DAP 18-46-0', pricePerUnit: 798, unit: 'TON', nitrogenPct: 18, phosphorusPct: 46, isLiquid: false, isManure: false },
    { name: 'POTASH 0-0-60', pricePerUnit: 460, unit: 'TON', nitrogenPct: 0, phosphorusPct: 0, potassiumPct: 60, sulfurPct: 0, isLiquid: false, isManure: false },
    { name: '32% UAN', pricePerUnit: 400, unit: 'TON', nitrogenPct: 32, isLiquid: true, lbsPerGallon: 11.06, isManure: false },
    { name: 'ATS 12-0-0-26S', pricePerUnit: 330, unit: 'TON', nitrogenPct: 12, sulfurPct: 26, isLiquid: true, lbsPerGallon: 11.5, isManure: false },
    { name: 'SULFUR 90', pricePerUnit: 0.46, unit: 'LB', sulfurPct: 90, isLiquid: false, isManure: false },
  ];

  const fertMap: Record<string, string> = {};
  for (const fd of fertData) {
    let existing = await p.fertilizer.findFirst({ where: { businessId, name: fd.name } });
    if (!existing) {
      existing = await p.fertilizer.create({
        data: {
          businessId,
          name: fd.name,
          pricePerUnit: fd.pricePerUnit,
          unit: fd.unit as any,
          nitrogenPct: fd.nitrogenPct ?? null,
          phosphorusPct: fd.phosphorusPct ?? null,
          potassiumPct: fd.potassiumPct ?? null,
          sulfurPct: fd.sulfurPct ?? null,
          isLiquid: fd.isLiquid,
          lbsPerGallon: fd.lbsPerGallon ?? null,
          isManure: fd.isManure,
          isActive: true,
        }
      });
      console.log('Created fertilizer:', fd.name);
    } else {
      console.log('Fertilizer exists:', fd.name);
    }
    fertMap[fd.name] = existing.id;
  }

  // --- Seed Chemicals ---
  const chemData = [
    { name: 'Halex GT', pricePerUnit: 38.03, unit: 'GAL', category: 'HERBICIDE' },
    { name: 'Atrazine 4L', pricePerUnit: 16.21, unit: 'GAL', category: 'HERBICIDE' },
    { name: 'Sterling Blue', pricePerUnit: 49.39, unit: 'GAL', category: 'HERBICIDE' },
    { name: 'ClassAct NG', pricePerUnit: 12.81, unit: 'GAL', category: 'HERBICIDE' },
    { name: 'Enlist One', pricePerUnit: 45.72, unit: 'GAL', category: 'HERBICIDE' },
    { name: 'Flexact Pro', pricePerUnit: 16.00, unit: 'GAL', category: 'HERBICIDE' },
    { name: 'Dual Magnum', pricePerUnit: 54.60, unit: 'GAL', category: 'HERBICIDE' },
    { name: 'Liberty Ultra', pricePerUnit: 41.87, unit: 'GAL', category: 'HERBICIDE' },
    { name: 'Endex ZCX', pricePerUnit: 205.25, unit: 'GAL', category: 'INSECTICIDE' },
    { name: 'Mideo Neo', pricePerUnit: 153.33, unit: 'GAL', category: 'FUNGICIDE' },
  ];

  const chemMap: Record<string, string> = {};
  for (const cd of chemData) {
    let existing = await p.chemical.findFirst({ where: { businessId, name: cd.name } });
    if (!existing) {
      existing = await p.chemical.create({
        data: {
          businessId,
          name: cd.name,
          pricePerUnit: cd.pricePerUnit,
          unit: cd.unit as any,
          category: cd.category as any,
          isActive: true,
        }
      });
      console.log('Created chemical:', cd.name);
    } else {
      console.log('Chemical exists:', cd.name);
    }
    chemMap[cd.name] = existing.id;
  }

  // --- Add $300/acre Land Rent to all farms ---
  for (const farm of allFarms) {
    const existingRent = await p.farmOtherCost.findFirst({
      where: { farmId: farm.id, costType: 'LAND_RENT' }
    });
    if (!existingRent) {
      await p.farmOtherCost.create({
        data: {
          farmId: farm.id,
          costType: 'LAND_RENT',
          description: 'Cash Rent',
          amount: 300,
          isPerAcre: true,
        }
      });
      console.log(`Added $300/ac rent to ${farm.name}`);
    } else {
      console.log(`Rent exists for ${farm.name}`);
    }
  }

  // --- Add Fertilizer Usage to Corn Farms ---
  // Typical corn: UREA ~350 lbs/ac, DAP ~150 lbs/ac, Potash ~100 lbs/ac
  for (const farm of cornFarms) {
    const existingUsage = await p.farmFertilizerUsage.findMany({ where: { farmId: farm.id } });
    if (existingUsage.length > 0) {
      console.log(`Fert usage exists for ${farm.name} (${existingUsage.length})`);
      continue;
    }

    // UREA 46-0-0: 350 lbs/ac
    await p.farmFertilizerUsage.create({
      data: {
        farmId: farm.id,
        fertilizerId: fertMap['UREA 46-0-0'],
        ratePerAcre: 350,
        acresApplied: Number(farm.acres),
        amountUsed: 350 * Number(farm.acres),
      }
    });

    // DAP 18-46-0: 150 lbs/ac
    await p.farmFertilizerUsage.create({
      data: {
        farmId: farm.id,
        fertilizerId: fertMap['DAP 18-46-0'],
        ratePerAcre: 150,
        acresApplied: Number(farm.acres),
        amountUsed: 150 * Number(farm.acres),
      }
    });

    // POTASH 0-0-60: 100 lbs/ac
    await p.farmFertilizerUsage.create({
      data: {
        farmId: farm.id,
        fertilizerId: fertMap['POTASH 0-0-60'],
        ratePerAcre: 100,
        acresApplied: Number(farm.acres),
        amountUsed: 100 * Number(farm.acres),
      }
    });

    console.log(`Added fert usage to ${farm.name}`);
  }

  // --- Add Fertilizer Usage to Bean Farms ---
  // Typical beans: DAP ~100 lbs/ac, Potash ~150 lbs/ac
  for (const farm of beanFarms) {
    const existingUsage = await p.farmFertilizerUsage.findMany({ where: { farmId: farm.id } });
    if (existingUsage.length > 0) {
      console.log(`Fert usage exists for ${farm.name} (${existingUsage.length})`);
      continue;
    }

    // DAP 18-46-0: 100 lbs/ac
    await p.farmFertilizerUsage.create({
      data: {
        farmId: farm.id,
        fertilizerId: fertMap['DAP 18-46-0'],
        ratePerAcre: 100,
        acresApplied: Number(farm.acres),
        amountUsed: 100 * Number(farm.acres),
      }
    });

    // POTASH 0-0-60: 150 lbs/ac
    await p.farmFertilizerUsage.create({
      data: {
        farmId: farm.id,
        fertilizerId: fertMap['POTASH 0-0-60'],
        ratePerAcre: 150,
        acresApplied: Number(farm.acres),
        amountUsed: 150 * Number(farm.acres),
      }
    });

    console.log(`Added fert usage to ${farm.name}`);
  }

  // --- Add Chemical Usage to Corn Farms ---
  // Corn herbicide program: Halex GT 3.6 pt/ac + Atrazine 1 qt/ac + ClassAct NG 2.5% v/v
  for (const farm of cornFarms) {
    const existingUsage = await p.farmChemicalUsage.findMany({ where: { farmId: farm.id } });
    if (existingUsage.length > 0) {
      console.log(`Chem usage exists for ${farm.name} (${existingUsage.length})`);
      continue;
    }

    // Halex GT: 3.6 pt/ac = 0.45 gal/ac
    await p.farmChemicalUsage.create({
      data: {
        farmId: farm.id,
        chemicalId: chemMap['Halex GT'],
        ratePerAcre: 0.45,
        acresApplied: Number(farm.acres),
        amountUsed: 0.45 * Number(farm.acres),
      }
    });

    // Atrazine 4L: 1 qt/ac = 0.25 gal/ac
    await p.farmChemicalUsage.create({
      data: {
        farmId: farm.id,
        chemicalId: chemMap['Atrazine 4L'],
        ratePerAcre: 0.25,
        acresApplied: Number(farm.acres),
        amountUsed: 0.25 * Number(farm.acres),
      }
    });

    // ClassAct NG: 1 gal/ac (surfactant)
    await p.farmChemicalUsage.create({
      data: {
        farmId: farm.id,
        chemicalId: chemMap['ClassAct NG'],
        ratePerAcre: 1,
        acresApplied: Number(farm.acres),
        amountUsed: 1 * Number(farm.acres),
      }
    });

    // Endex ZCX (insecticide): 0.04 gal/ac
    if (chemMap['Endex ZCX']) {
      await p.farmChemicalUsage.create({
        data: {
          farmId: farm.id,
          chemicalId: chemMap['Endex ZCX'],
          ratePerAcre: 0.04,
          acresApplied: Number(farm.acres),
          amountUsed: 0.04 * Number(farm.acres),
        }
      });
    }

    console.log(`Added chem usage to ${farm.name}`);
  }

  // --- Add Chemical Usage to Bean Farms ---
  // Bean herbicide program: Enlist One 2 pt/ac + Liberty Ultra 32 oz/ac + Dual Magnum 1 pt/ac
  for (const farm of beanFarms) {
    const existingUsage = await p.farmChemicalUsage.findMany({ where: { farmId: farm.id } });
    if (existingUsage.length > 0) {
      console.log(`Chem usage exists for ${farm.name} (${existingUsage.length})`);
      continue;
    }

    // Enlist One: 2 pt/ac = 0.25 gal/ac
    await p.farmChemicalUsage.create({
      data: {
        farmId: farm.id,
        chemicalId: chemMap['Enlist One'],
        ratePerAcre: 0.25,
        acresApplied: Number(farm.acres),
        amountUsed: 0.25 * Number(farm.acres),
      }
    });

    // Liberty Ultra: 32 oz/ac = 0.25 gal/ac
    await p.farmChemicalUsage.create({
      data: {
        farmId: farm.id,
        chemicalId: chemMap['Liberty Ultra'],
        ratePerAcre: 0.25,
        acresApplied: Number(farm.acres),
        amountUsed: 0.25 * Number(farm.acres),
      }
    });

    // Dual Magnum: 1 pt/ac = 0.125 gal/ac
    await p.farmChemicalUsage.create({
      data: {
        farmId: farm.id,
        chemicalId: chemMap['Dual Magnum'],
        ratePerAcre: 0.125,
        acresApplied: Number(farm.acres),
        amountUsed: 0.125 * Number(farm.acres),
      }
    });

    // Mideo Neo (fungicide): 7 oz/ac = 0.055 gal/ac
    if (chemMap['Mideo Neo']) {
      await p.farmChemicalUsage.create({
        data: {
          farmId: farm.id,
          chemicalId: chemMap['Mideo Neo'],
          ratePerAcre: 0.055,
          acresApplied: Number(farm.acres),
          amountUsed: 0.055 * Number(farm.acres),
        }
      });
    }

    console.log(`Added chem usage to ${farm.name}`);
  }

  // --- Add misc costs: seed, crop insurance, drying (corn only) ---
  for (const farm of allFarms) {
    const existingCosts = await p.farmOtherCost.findMany({ where: { farmId: farm.id } });
    const existingTypes = existingCosts.map(c => c.costType);

    if (farm.commodityType === 'CORN') {
      if (!existingTypes.includes('CUSTOM_WORK')) {
        await p.farmOtherCost.create({
          data: { farmId: farm.id, costType: 'CUSTOM_WORK', description: 'Seed Corn', amount: 120, isPerAcre: true }
        });
        console.log(`Added seed cost to ${farm.name}`);
      }
      if (!existingTypes.includes('INSURANCE')) {
        await p.farmOtherCost.create({
          data: { farmId: farm.id, costType: 'INSURANCE', description: 'Crop Insurance', amount: 28, isPerAcre: true }
        });
        console.log(`Added insurance to ${farm.name}`);
      }
      if (!existingTypes.includes('OTHER')) {
        await p.farmOtherCost.create({
          data: { farmId: farm.id, costType: 'OTHER', description: 'Grain Drying', amount: 25, isPerAcre: true }
        });
        console.log(`Added drying cost to ${farm.name}`);
      }
    } else {
      if (!existingTypes.includes('CUSTOM_WORK')) {
        await p.farmOtherCost.create({
          data: { farmId: farm.id, costType: 'CUSTOM_WORK', description: 'Seed Soybeans', amount: 65, isPerAcre: true }
        });
        console.log(`Added seed cost to ${farm.name}`);
      }
      if (!existingTypes.includes('INSURANCE')) {
        await p.farmOtherCost.create({
          data: { farmId: farm.id, costType: 'INSURANCE', description: 'Crop Insurance', amount: 18, isPerAcre: true }
        });
        console.log(`Added insurance to ${farm.name}`);
      }
    }
  }

  // --- Update existing farms with projected yield if missing ---
  for (const farm of allFarms) {
    if (!farm.projectedYield || Number(farm.projectedYield) === 0) {
      const yield_ = farm.commodityType === 'CORN' ? 200 : 55;
      await p.farm.update({ where: { id: farm.id }, data: { projectedYield: yield_ } });
      console.log(`Updated ${farm.name} projected yield to ${yield_}`);
    }
  }

  console.log('\nDone! Demo data seeded successfully.');
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
