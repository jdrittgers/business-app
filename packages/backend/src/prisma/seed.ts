import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../utils/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create businesses
  console.log('Creating businesses...');
  const business90ten = await prisma.business.upsert({
    where: { id: '90ten-business-id' },
    update: {},
    create: {
      id: '90ten-business-id',
      name: '90ten'
    }
  });

  const businessRittgers = await prisma.business.upsert({
    where: { id: 'rittgers-farm-business-id' },
    update: {},
    create: {
      id: 'rittgers-farm-business-id',
      name: 'Demo Farm',
      address: '1234 Farm Road',
      city: 'Springfield',
      state: 'OH',
      zipCode: '43015',
      phone: '(555) 123-4567',
      email: 'contact@demofarm.com'
    }
  });

  console.log('✓ Businesses created');

  // Create demo user
  console.log('Creating demo user...');
  const demoPassword = await hashPassword('demo');

  const owner = await prisma.user.upsert({
    where: { email: 'demo@demo.com' },
    update: {},
    create: {
      email: 'demo@demo.com',
      passwordHash: demoPassword,
      firstName: 'Demo',
      lastName: 'User',
      role: UserRole.OWNER
    }
  });

  console.log('✓ Demo user created');

  // Associate owner with both businesses
  console.log('Associating owner with businesses...');

  await prisma.businessMember.upsert({
    where: {
      userId_businessId: {
        userId: owner.id,
        businessId: business90ten.id
      }
    },
    update: {},
    create: {
      userId: owner.id,
      businessId: business90ten.id,
      role: UserRole.OWNER
    }
  });

  await prisma.businessMember.upsert({
    where: {
      userId_businessId: {
        userId: owner.id,
        businessId: businessRittgers.id
      }
    },
    update: {},
    create: {
      userId: owner.id,
      businessId: businessRittgers.id,
      role: UserRole.OWNER
    }
  });

  console.log('✓ Owner associated with businesses');

  // Create sample employee users
  console.log('Creating employee users...');

  const employeePassword = await hashPassword('password123');

  const employee1 = await prisma.user.upsert({
    where: { email: 'employee1@90ten.com' },
    update: {},
    create: {
      email: 'employee1@90ten.com',
      passwordHash: employeePassword,
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.EMPLOYEE
    }
  });

  await prisma.businessMember.upsert({
    where: {
      userId_businessId: {
        userId: employee1.id,
        businessId: business90ten.id
      }
    },
    update: {},
    create: {
      userId: employee1.id,
      businessId: business90ten.id,
      role: UserRole.EMPLOYEE
    }
  });

  const employee2 = await prisma.user.upsert({
    where: { email: 'employee2@demofarm.com' },
    update: {},
    create: {
      email: 'employee2@demofarm.com',
      passwordHash: employeePassword,
      firstName: 'Bob',
      lastName: 'Johnson',
      role: UserRole.EMPLOYEE
    }
  });

  await prisma.businessMember.upsert({
    where: {
      userId_businessId: {
        userId: employee2.id,
        businessId: businessRittgers.id
      }
    },
    update: {},
    create: {
      userId: employee2.id,
      businessId: businessRittgers.id,
      role: UserRole.EMPLOYEE
    }
  });

  console.log('✓ Employee users created');

  // Create grain entities for Demo Farm
  console.log('Creating grain entities...');

  const grainEntityNames = [
    'Main Farm',
    'North Fields',
    'South Fields',
    'East Section',
    'West Section'
  ];

  for (const entityName of grainEntityNames) {
    await prisma.grainEntity.upsert({
      where: {
        businessId_name: {
          businessId: businessRittgers.id,
          name: entityName
        }
      },
      update: {},
      create: {
        businessId: businessRittgers.id,
        name: entityName
      }
    });
  }

  console.log('✓ Grain entities created');

  // Create production data for 2026
  console.log('Creating production data for 2026...');

  // Get grain entities
  const mainFarm = await prisma.grainEntity.findFirst({
    where: {
      businessId: businessRittgers.id,
      name: 'Main Farm'
    }
  });

  const northFields = await prisma.grainEntity.findFirst({
    where: {
      businessId: businessRittgers.id,
      name: 'North Fields'
    }
  });

  if (mainFarm) {
    // Main Farm: 500 acres soybeans at 55 bu/acre
    await prisma.cropYearProduction.upsert({
      where: {
        grainEntityId_commodityType_year: {
          grainEntityId: mainFarm.id,
          commodityType: 'SOYBEANS',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: mainFarm.id,
        commodityType: 'SOYBEANS',
        year: 2026,
        acres: 500,
        bushelsPerAcre: 55,
        totalProjected: 500 * 55, // 27,500
        notes: 'Initial projection for 2026 crop year'
      }
    });

    // Main Farm: 600 acres corn at 185 bu/acre
    await prisma.cropYearProduction.upsert({
      where: {
        grainEntityId_commodityType_year: {
          grainEntityId: mainFarm.id,
          commodityType: 'CORN',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: mainFarm.id,
        commodityType: 'CORN',
        year: 2026,
        acres: 600,
        bushelsPerAcre: 185,
        totalProjected: 600 * 185, // 111,000
        notes: 'Initial projection for 2026 crop year'
      }
    });
  }

  if (northFields) {
    // North Fields: 300 acres soybeans at 58 bu/acre
    await prisma.cropYearProduction.upsert({
      where: {
        grainEntityId_commodityType_year: {
          grainEntityId: northFields.id,
          commodityType: 'SOYBEANS',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: northFields.id,
        commodityType: 'SOYBEANS',
        year: 2026,
        acres: 300,
        bushelsPerAcre: 58,
        totalProjected: 300 * 58, // 17,400
        notes: 'Initial projection for 2026 crop year'
      }
    });

    // North Fields: 200 acres corn at 190 bu/acre
    await prisma.cropYearProduction.upsert({
      where: {
        grainEntityId_commodityType_year: {
          grainEntityId: northFields.id,
          commodityType: 'CORN',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: northFields.id,
        commodityType: 'CORN',
        year: 2026,
        acres: 200,
        bushelsPerAcre: 190,
        totalProjected: 200 * 190, // 38,000
        notes: 'Initial projection for 2026 crop year'
      }
    });
  }

  console.log('✓ Production data created for 2026');

  // Create sample grain contracts
  console.log('Creating sample grain contracts...');

  if (mainFarm && owner) {
    // Delete existing contracts for demo
    await prisma.grainContract.deleteMany({
      where: { grainEntityId: mainFarm.id }
    });

    // Corn contract - sold portion
    await prisma.grainContract.create({
      data: {
        grainEntityId: mainFarm.id,
        createdBy: owner.id,
        contractType: 'CASH',
        cropYear: 'NEW_CROP',
        commodityType: 'CORN',
        year: 2026,
        contractNumber: 'CORN-2026-001',
        buyer: 'ABC Grain Co',
        totalBushels: 50000,
        cashPrice: 4.25,
        deliveryStartDate: new Date('2026-11-01'),
        deliveryEndDate: new Date('2026-12-31'),
        isActive: true,
        notes: 'Fall delivery contract'
      }
    });

    // Soybean contract - sold portion
    await prisma.grainContract.create({
      data: {
        grainEntityId: mainFarm.id,
        createdBy: owner.id,
        contractType: 'CASH',
        cropYear: 'NEW_CROP',
        commodityType: 'SOYBEANS',
        year: 2026,
        contractNumber: 'SOY-2026-001',
        buyer: 'XYZ Processors',
        totalBushels: 15000,
        cashPrice: 10.50,
        deliveryStartDate: new Date('2026-10-01'),
        deliveryEndDate: new Date('2026-11-30'),
        isActive: true,
        notes: 'Early harvest delivery'
      }
    });
  }

  console.log('✓ Sample grain contracts created');

  // Create sample farms for break-even analysis
  console.log('Creating sample farms for break-even...');

  // Get Main Farm grain entity for linking farms
  if (mainFarm) {
    // Create Corn Farm
    const cornFarm = await prisma.farm.upsert({
      where: {
        grainEntityId_name_year: {
          grainEntityId: mainFarm.id,
          name: 'Corn Farm - Section A',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: mainFarm.id,
        name: 'Corn Farm - Section A',
        acres: 600,
        commodityType: 'CORN',
        year: 2026,
        projectedYield: 185,
        aph: 180,
        notes: 'Primary corn production area'
      }
    });

    // Create Soybean Farm
    const beanFarm = await prisma.farm.upsert({
      where: {
        grainEntityId_name_year: {
          grainEntityId: mainFarm.id,
          name: 'Soybean Farm - Section B',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: mainFarm.id,
        name: 'Soybean Farm - Section B',
        acres: 500,
        commodityType: 'SOYBEANS',
        year: 2026,
        projectedYield: 55,
        aph: 52,
        notes: 'Primary soybean production area'
      }
    });

    console.log('✓ Sample farms created');

    // Create sample products for break-even
    console.log('Creating sample fertilizers and chemicals...');

    // Delete existing products for demo business
    await prisma.fertilizer.deleteMany({ where: { businessId: businessRittgers.id } });
    await prisma.chemical.deleteMany({ where: { businessId: businessRittgers.id } });
    await prisma.seedHybrid.deleteMany({ where: { businessId: businessRittgers.id } });

    // Fertilizers
    const nitrogen = await prisma.fertilizer.create({
      data: {
        businessId: businessRittgers.id,
        name: '28-0-0 Liquid Nitrogen',
        pricePerUnit: 0.55, // $0.55 per lb
        unit: 'LB'
      }
    });

    const map = await prisma.fertilizer.create({
      data: {
        businessId: businessRittgers.id,
        name: '11-52-0 MAP',
        pricePerUnit: 0.31, // $0.31 per lb
        unit: 'LB'
      }
    });

    const potash = await prisma.fertilizer.create({
      data: {
        businessId: businessRittgers.id,
        name: '0-0-60 Potash',
        pricePerUnit: 0.40, // $0.40 per lb
        unit: 'LB'
      }
    });

    // Chemicals
    const glyphosate = await prisma.chemical.create({
      data: {
        businessId: businessRittgers.id,
        name: 'Glyphosate 4.5 lb',
        pricePerUnit: 22.50, // $22.50 per gallon
        unit: 'GAL'
      }
    });

    const atrazine = await prisma.chemical.create({
      data: {
        businessId: businessRittgers.id,
        name: 'Atrazine 4L',
        pricePerUnit: 18.75, // $18.75 per gallon
        unit: 'GAL'
      }
    });

    // Seed Hybrids
    const cornSeed = await prisma.seedHybrid.create({
      data: {
        businessId: businessRittgers.id,
        name: 'Pioneer P1197 (Corn)',
        commodityType: 'CORN',
        pricePerBag: 300,
        seedsPerBag: 80000
      }
    });

    const soybeanSeed = await prisma.seedHybrid.create({
      data: {
        businessId: businessRittgers.id,
        name: 'Asgrow AG35X9 (Soybeans)',
        commodityType: 'SOYBEANS',
        pricePerBag: 62,
        seedsPerBag: 140000
      }
    });

    console.log('✓ Sample fertilizers and chemicals created');

    // Create farm input usage for corn
    console.log('Creating sample farm inputs for corn...');

    // Delete existing usage for corn farm
    await prisma.farmFertilizerUsage.deleteMany({ where: { farmId: cornFarm.id } });
    await prisma.farmChemicalUsage.deleteMany({ where: { farmId: cornFarm.id } });
    await prisma.farmSeedUsage.deleteMany({ where: { farmId: cornFarm.id } });
    await prisma.farmOtherCost.deleteMany({ where: { farmId: cornFarm.id } });

    // Corn fertilizer usage
    await prisma.farmFertilizerUsage.createMany({
      data: [
        {
          farmId: cornFarm.id,
          fertilizerId: nitrogen.id,
          amountUsed: 150 * 600 // 150 lbs/acre * 600 acres = 90,000 lbs
        },
        {
          farmId: cornFarm.id,
          fertilizerId: map.id,
          amountUsed: 200 * 600 // 200 lbs/acre * 600 acres = 120,000 lbs
        }
      ]
    });

    // Corn chemical usage
    await prisma.farmChemicalUsage.create({
      data: {
        farmId: cornFarm.id,
        chemicalId: glyphosate.id,
        amountUsed: 1.5 * 600 // 1.5 qts/acre * 600 acres = 225 gallons
      }
    });

    // Corn seed usage
    await prisma.farmSeedUsage.create({
      data: {
        farmId: cornFarm.id,
        seedHybridId: cornSeed.id,
        bagsUsed: (32000 * 600) / 80000 // 32k seeds/acre * 600 acres / 80k seeds per bag = 240 bags
      }
    });

    // Corn other costs
    await prisma.farmOtherCost.create({
      data: {
        farmId: cornFarm.id,
        costType: 'LAND_RENT',
        amount: 250,
        isPerAcre: true,
        description: 'Land rent for 2026'
      }
    });

    console.log('✓ Sample farm inputs for corn created');

    // Create farm input usage for soybeans
    console.log('Creating sample farm inputs for soybeans...');

    // Delete existing usage for soybean farm
    await prisma.farmFertilizerUsage.deleteMany({ where: { farmId: beanFarm.id } });
    await prisma.farmChemicalUsage.deleteMany({ where: { farmId: beanFarm.id } });
    await prisma.farmSeedUsage.deleteMany({ where: { farmId: beanFarm.id } });
    await prisma.farmOtherCost.deleteMany({ where: { farmId: beanFarm.id } });

    // Soybean fertilizer usage
    await prisma.farmFertilizerUsage.createMany({
      data: [
        {
          farmId: beanFarm.id,
          fertilizerId: map.id,
          amountUsed: 150 * 500 // 150 lbs/acre * 500 acres = 75,000 lbs
        },
        {
          farmId: beanFarm.id,
          fertilizerId: potash.id,
          amountUsed: 100 * 500 // 100 lbs/acre * 500 acres = 50,000 lbs
        }
      ]
    });

    // Soybean chemical usage
    await prisma.farmChemicalUsage.create({
      data: {
        farmId: beanFarm.id,
        chemicalId: glyphosate.id,
        amountUsed: 1.0 * 500 // 1 qt/acre * 500 acres = 125 gallons
      }
    });

    // Soybean seed usage
    await prisma.farmSeedUsage.create({
      data: {
        farmId: beanFarm.id,
        seedHybridId: soybeanSeed.id,
        bagsUsed: (140000 * 500) / 140000 // 140k seeds/acre * 500 acres / 140k seeds per bag = 500 bags
      }
    });

    // Soybean other costs
    await prisma.farmOtherCost.create({
      data: {
        farmId: beanFarm.id,
        costType: 'LAND_RENT',
        amount: 225,
        isPerAcre: true,
        description: 'Land rent for 2026'
      }
    });

    console.log('✓ Sample farm inputs for soybeans created');
  }

  console.log('\n✅ Seed completed successfully!');
  console.log('\nDemo credentials:');
  console.log('Demo Account: demo@demo.com / demo');
  console.log('Employee 1 (90ten): employee1@90ten.com / password123');
  console.log('Employee 2 (Demo Farm): employee2@demofarm.com / password123');
  console.log('\nGrain Entities (Demo Farm): Main Farm, North Fields, South Fields, East Section, West Section');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
