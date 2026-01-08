import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding demo account...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@demo.com' },
    update: {},
    create: {
      email: 'demo@demo.com',
      passwordHash: hashedPassword,
      firstName: 'Demo',
      lastName: 'User',
      role: 'OWNER'
    }
  });

  console.log('✅ Demo user created:', demoUser.email);

  // Find or create demo business
  let demoBusiness = await prisma.business.findFirst({
    where: { name: 'Demo Farm' }
  });

  if (!demoBusiness) {
    demoBusiness = await prisma.business.create({
      data: {
        name: 'Demo Farm',
        city: 'Demo City',
        state: 'Iowa'
      }
    });
  }

  console.log('✅ Demo business found/created:', demoBusiness.name);

  if (!demoBusiness) {
    throw new Error('Failed to create demo business');
  }

  // Create business membership
  await prisma.businessMember.upsert({
    where: {
      userId_businessId: {
        userId: demoUser.id,
        businessId: demoBusiness.id
      }
    },
    update: {},
    create: {
      userId: demoUser.id,
      businessId: demoBusiness.id,
      role: 'OWNER'
    }
  });

  console.log('✅ Business membership created');

  // Create demo farms
  const cornFarm = await prisma.farm.upsert({
    where: {
      name_businessId: {
        name: 'Demo Corn Field',
        businessId: demoBusiness.id
      }
    },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Demo Corn Field',
      acres: 500,
      location: 'North Section'
    }
  });

  const soyFarm = await prisma.farm.upsert({
    where: {
      name_businessId: {
        name: 'Demo Soybean Field',
        businessId: demoBusiness.id
      }
    },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Demo Soybean Field',
      acres: 500,
      location: 'South Section'
    }
  });

  console.log('✅ Demo farms created: 500 acres corn + 500 acres soybeans');

  // Create demo grain entity
  const demoEntity = await prisma.grainEntity.upsert({
    where: {
      name_businessId: {
        name: 'Demo Farm LLC',
        businessId: demoBusiness.id
      }
    },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Demo Farm LLC',
      entityType: 'LLC'
    }
  });

  console.log('✅ Demo grain entity created');

  // Create demo grain production for corn
  await prisma.grainProduction.upsert({
    where: {
      grainEntityId_cropYear_year_commodityType: {
        grainEntityId: demoEntity.id,
        cropYear: 'NEW_CROP',
        year: 2026,
        commodityType: 'CORN'
      }
    },
    update: {},
    create: {
      businessId: demoBusiness.id,
      grainEntityId: demoEntity.id,
      cropYear: 'NEW_CROP',
      year: 2026,
      commodityType: 'CORN',
      projectedBushels: 87500, // 500 acres * 175 bu/acre
      isProjected: true
    }
  });

  // Create demo grain production for soybeans
  await prisma.grainProduction.upsert({
    where: {
      grainEntityId_cropYear_year_commodityType: {
        grainEntityId: demoEntity.id,
        cropYear: 'NEW_CROP',
        year: 2026,
        commodityType: 'SOYBEANS'
      }
    },
    update: {},
    create: {
      businessId: demoBusiness.id,
      grainEntityId: demoEntity.id,
      cropYear: 'NEW_CROP',
      year: 2026,
      commodityType: 'SOYBEANS',
      projectedBushels: 27500, // 500 acres * 55 bu/acre
      isProjected: true
    }
  });

  console.log('✅ Demo grain production created');

  // Create demo grain contract
  await prisma.grainContract.create({
    data: {
      businessId: demoBusiness.id,
      grainEntityId: demoEntity.id,
      contractType: 'CASH',
      cropYear: 'NEW_CROP',
      year: 2026,
      commodityType: 'CORN',
      contractNumber: 'DEMO-2026-001',
      buyer: 'Demo Grain Co',
      totalBushels: 25000,
      deliveryStartDate: new Date('2026-10-01'),
      deliveryEndDate: new Date('2026-12-31'),
      cashPrice: 4.25,
      notes: 'Demo cash contract',
      isActive: true
    }
  });

  console.log('✅ Demo grain contract created');

  // Create demo chemicals
  await prisma.chemical.upsert({
    where: {
      name_businessId: {
        name: 'Demo Herbicide A',
        businessId: demoBusiness.id
      }
    },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Demo Herbicide A',
      pricePerUnit: 28.50,
      unit: 'GAL'
    }
  });

  await prisma.chemical.upsert({
    where: {
      name_businessId: {
        name: 'Demo Fungicide B',
        businessId: demoBusiness.id
      }
    },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Demo Fungicide B',
      pricePerUnit: 32.75,
      unit: 'GAL'
    }
  });

  console.log('✅ Demo chemicals created');

  // Create demo fertilizers
  await prisma.fertilizer.upsert({
    where: {
      name_businessId: {
        name: 'Demo 28-0-0 UAN',
        businessId: demoBusiness.id
      }
    },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Demo 28-0-0 UAN',
      pricePerUnit: 0.45,
      unit: 'GAL'
    }
  });

  await prisma.fertilizer.upsert({
    where: {
      name_businessId: {
        name: 'Demo 10-34-0 Starter',
        businessId: demoBusiness.id
      }
    },
    update: {},
    create: {
      businessId: demoBusiness.id,
      name: 'Demo 10-34-0 Starter',
      pricePerUnit: 0.85,
      unit: 'GAL'
    }
  });

  console.log('✅ Demo fertilizers created');

  // Create demo bid request
  const demoBidRequest = await prisma.bidRequest.create({
    data: {
      businessId: demoBusiness.id,
      createdBy: demoUser.id,
      title: 'Demo Chemical Request',
      description: 'Looking for competitive bids on herbicides',
      status: 'OPEN',
      desiredDeliveryDate: new Date('2026-04-15'),
      notes: 'Demo bid request',
      items: {
        create: [
          {
            productType: 'CHEMICAL',
            productName: 'Demo Herbicide A',
            quantity: 100,
            unit: 'GAL'
          },
          {
            productType: 'CHEMICAL',
            productName: 'Demo Fungicide B',
            quantity: 50,
            unit: 'GAL'
          }
        ]
      }
    }
  });

  console.log('✅ Demo bid request created');

  console.log('\n🎉 Demo account seeding complete!');
  console.log('\n📝 Demo Login Credentials:');
  console.log('   Email: demo@demo.com');
  console.log('   Password: demo');
  console.log('\n📊 Demo Data:');
  console.log('   - Demo Farm (1000 acres total)');
  console.log('   - 500 acres corn, 500 acres soybeans');
  console.log('   - 1 grain contract');
  console.log('   - 2 chemicals, 2 fertilizers');
  console.log('   - 1 open bid request');
}

main()
  .catch((e) => {
    console.error('Error seeding demo account:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
