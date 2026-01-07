import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding comprehensive grain data...');

  // Find Rittgers Farms business
  const business = await prisma.business.findFirst({
    where: { name: 'Rittgers Farms' }
  });

  if (!business) {
    throw new Error('Rittgers Farms business not found');
  }

  console.log('✅ Found business:', business.name);

  // Create all grain entities
  const entities = [
    'JDR AG',
    'JVR AG', 
    'JKC Farms',
    'Rittgers Grain',
    'Rittgers Farms'
  ];

  const createdEntities: { [key: string]: any } = {};

  for (const entityName of entities) {
    let entity = await prisma.grainEntity.findFirst({
      where: {
        businessId: business.id,
        name: entityName
      }
    });

    if (!entity) {
      entity = await prisma.grainEntity.create({
        data: {
          businessId: business.id,
          name: entityName
        }
      });
      console.log(`✅ Created entity: ${entityName}`);
    } else {
      console.log(`⏭️  Entity exists: ${entityName}`);
    }

    createdEntities[entityName] = entity;
  }

  // Production data for 2026
  const productionData = [
    { entity: 'JDR AG', commodity: 'SOYBEANS', acres: 218, buPerAcre: 60 },
    { entity: 'JDR AG', commodity: 'CORN', acres: 111, buPerAcre: 200 },
    { entity: 'JVR AG', commodity: 'SOYBEANS', acres: 218, buPerAcre: 60 },
    { entity: 'JVR AG', commodity: 'CORN', acres: 149, buPerAcre: 200 },
    { entity: 'Rittgers Grain', commodity: 'SOYBEANS', acres: 682.3, buPerAcre: 60 },
    { entity: 'Rittgers Grain', commodity: 'CORN', acres: 978.3, buPerAcre: 200 },
    { entity: 'Rittgers Farms', commodity: 'SOYBEANS', acres: 510.2, buPerAcre: 60 },
    { entity: 'Rittgers Farms', commodity: 'CORN', acres: 886.4, buPerAcre: 200 }
  ];

  console.log('\n📊 Creating production records...');
  
  for (const prod of productionData) {
    const entity = createdEntities[prod.entity];
    const totalProjected = prod.acres * prod.buPerAcre;

    const existing = await prisma.cropYearProduction.findFirst({
      where: {
        grainEntityId: entity.id,
        commodityType: prod.commodity as any,
        year: 2026
      }
    });

    if (existing) {
      console.log(`⏭️  Production exists: ${prod.entity} - ${prod.commodity} 2026`);
      continue;
    }

    await prisma.cropYearProduction.create({
      data: {
        grainEntityId: entity.id,
        commodityType: prod.commodity as any,
        year: 2026,
        acres: prod.acres,
        bushelsPerAcre: prod.buPerAcre,
        totalProjected: totalProjected
      }
    });

    console.log(`✅ Created production: ${prod.entity} - ${prod.commodity} (${prod.acres} acres × ${prod.buPerAcre} bu/acre = ${totalProjected} bu)`);
  }

  console.log('\n🎉 Grain data seeded successfully!');
  console.log('\nSummary:');
  console.log('- 5 grain entities created');
  console.log('- 8 production records for 2026');
  console.log('- Ready for contract entry');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding grain data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
