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
      name: 'Rittgers Farm'
    }
  });

  console.log('✓ Businesses created');

  // Create owner user
  console.log('Creating owner user...');
  const ownerPassword = await hashPassword('password123');

  const owner = await prisma.user.upsert({
    where: { email: 'owner@90ten.com' },
    update: {},
    create: {
      email: 'owner@90ten.com',
      passwordHash: ownerPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.OWNER
    }
  });

  console.log('✓ Owner user created');

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
    where: { email: 'employee2@rittgers.com' },
    update: {},
    create: {
      email: 'employee2@rittgers.com',
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

  // Create grain entities for Rittgers Farm
  console.log('Creating grain entities...');

  const grainEntityNames = [
    'Rittgers Grain',
    'Rittgers Farm',
    'JDR AG',
    'JVR AG',
    'JKC Farms'
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

  // Get JDR AG and JVR AG entities
  const jdrAg = await prisma.grainEntity.findFirst({
    where: {
      businessId: businessRittgers.id,
      name: 'JDR AG'
    }
  });

  const jvrAg = await prisma.grainEntity.findFirst({
    where: {
      businessId: businessRittgers.id,
      name: 'JVR AG'
    }
  });

  if (jdrAg) {
    // JDR AG: 218 acres soybeans at 60 bu/acre
    await prisma.cropYearProduction.upsert({
      where: {
        grainEntityId_commodityType_year: {
          grainEntityId: jdrAg.id,
          commodityType: 'SOYBEANS',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: jdrAg.id,
        commodityType: 'SOYBEANS',
        year: 2026,
        acres: 218,
        bushelsPerAcre: 60,
        totalProjected: 218 * 60, // 13,080
        notes: 'Initial projection for 2026 crop year'
      }
    });

    // JDR AG: 111 acres corn at 200 bu/acre
    await prisma.cropYearProduction.upsert({
      where: {
        grainEntityId_commodityType_year: {
          grainEntityId: jdrAg.id,
          commodityType: 'CORN',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: jdrAg.id,
        commodityType: 'CORN',
        year: 2026,
        acres: 111,
        bushelsPerAcre: 200,
        totalProjected: 111 * 200, // 22,200
        notes: 'Initial projection for 2026 crop year'
      }
    });
  }

  if (jvrAg) {
    // JVR AG: 218 acres soybeans at 60 bu/acre
    await prisma.cropYearProduction.upsert({
      where: {
        grainEntityId_commodityType_year: {
          grainEntityId: jvrAg.id,
          commodityType: 'SOYBEANS',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: jvrAg.id,
        commodityType: 'SOYBEANS',
        year: 2026,
        acres: 218,
        bushelsPerAcre: 60,
        totalProjected: 218 * 60, // 13,080
        notes: 'Initial projection for 2026 crop year'
      }
    });

    // JVR AG: 149 acres corn at 200 bu/acre
    await prisma.cropYearProduction.upsert({
      where: {
        grainEntityId_commodityType_year: {
          grainEntityId: jvrAg.id,
          commodityType: 'CORN',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: jvrAg.id,
        commodityType: 'CORN',
        year: 2026,
        acres: 149,
        bushelsPerAcre: 200,
        totalProjected: 149 * 200, // 29,800
        notes: 'Initial projection for 2026 crop year'
      }
    });
  }

  // Get Rittgers Grain and Rittgers Farm entities
  const rittgersGrain = await prisma.grainEntity.findFirst({
    where: {
      businessId: businessRittgers.id,
      name: 'Rittgers Grain'
    }
  });

  const rittgersFarm = await prisma.grainEntity.findFirst({
    where: {
      businessId: businessRittgers.id,
      name: 'Rittgers Farm'
    }
  });

  if (rittgersGrain) {
    // Rittgers Grain: 682.3 acres soybeans at 60 bu/acre
    await prisma.cropYearProduction.upsert({
      where: {
        grainEntityId_commodityType_year: {
          grainEntityId: rittgersGrain.id,
          commodityType: 'SOYBEANS',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: rittgersGrain.id,
        commodityType: 'SOYBEANS',
        year: 2026,
        acres: 682.3,
        bushelsPerAcre: 60,
        totalProjected: 682.3 * 60, // 40,938
        notes: 'Initial projection for 2026 crop year'
      }
    });

    // Rittgers Grain: 978.3 acres corn at 200 bu/acre
    await prisma.cropYearProduction.upsert({
      where: {
        grainEntityId_commodityType_year: {
          grainEntityId: rittgersGrain.id,
          commodityType: 'CORN',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: rittgersGrain.id,
        commodityType: 'CORN',
        year: 2026,
        acres: 978.3,
        bushelsPerAcre: 200,
        totalProjected: 978.3 * 200, // 195,660
        notes: 'Initial projection for 2026 crop year'
      }
    });
  }

  if (rittgersFarm) {
    // Rittgers Farm: 510.2 acres soybeans at 60 bu/acre
    await prisma.cropYearProduction.upsert({
      where: {
        grainEntityId_commodityType_year: {
          grainEntityId: rittgersFarm.id,
          commodityType: 'SOYBEANS',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: rittgersFarm.id,
        commodityType: 'SOYBEANS',
        year: 2026,
        acres: 510.2,
        bushelsPerAcre: 60,
        totalProjected: 510.2 * 60, // 30,612
        notes: 'Initial projection for 2026 crop year'
      }
    });

    // Rittgers Farm: 886.4 acres corn at 200 bu/acre
    await prisma.cropYearProduction.upsert({
      where: {
        grainEntityId_commodityType_year: {
          grainEntityId: rittgersFarm.id,
          commodityType: 'CORN',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: rittgersFarm.id,
        commodityType: 'CORN',
        year: 2026,
        acres: 886.4,
        bushelsPerAcre: 200,
        totalProjected: 886.4 * 200, // 177,280
        notes: 'Initial projection for 2026 crop year'
      }
    });
  }

  // Get JKC Farms entity
  const jkcFarms = await prisma.grainEntity.findFirst({
    where: {
      businessId: businessRittgers.id,
      name: 'JKC Farms'
    }
  });

  if (jkcFarms) {
    // JKC Farms: 100 acres corn at 200 bu/acre
    await prisma.cropYearProduction.upsert({
      where: {
        grainEntityId_commodityType_year: {
          grainEntityId: jkcFarms.id,
          commodityType: 'CORN',
          year: 2026
        }
      },
      update: {},
      create: {
        grainEntityId: jkcFarms.id,
        commodityType: 'CORN',
        year: 2026,
        acres: 100,
        bushelsPerAcre: 200,
        totalProjected: 100 * 200, // 20,000
        notes: 'Initial projection for 2026 crop year'
      }
    });
  }

  console.log('✓ Production data created for 2026');

  console.log('\n✅ Seed completed successfully!');
  console.log('\nTest credentials:');
  console.log('Owner: owner@90ten.com / password123');
  console.log('Employee 1 (90ten): employee1@90ten.com / password123');
  console.log('Employee 2 (Rittgers Farm): employee2@rittgers.com / password123');
  console.log('\nGrain Entities (Rittgers Farm): Rittgers Grain, Rittgers Farm, JDR AG, JVR AG, JKC Farms');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
