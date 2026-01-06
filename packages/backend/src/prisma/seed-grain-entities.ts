import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding grain entities...');

  // Find Rittgers Farms business
  const business = await prisma.business.findFirst({
    where: { name: 'Rittgers Farms' }
  });

  if (!business) {
    throw new Error('Rittgers Farms business not found');
  }

  console.log('✅ Found business:', business.name);

  // Create grain entities
  const entities = ['JDR AG', 'JVR AG', 'JKC Farms'];

  for (const entityName of entities) {
    const existing = await prisma.grainEntity.findFirst({
      where: {
        businessId: business.id,
        name: entityName
      }
    });

    if (existing) {
      console.log(`⏭️  Skipping ${entityName} (already exists)`);
      continue;
    }

    await prisma.grainEntity.create({
      data: {
        businessId: business.id,
        name: entityName
      }
    });

    console.log(`✅ Created entity: ${entityName}`);
  }

  console.log('\n🎉 Grain entities seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding grain entities:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
