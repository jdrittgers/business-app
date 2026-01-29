import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedInsurancePolicies() {
  console.log('Seeding crop insurance policies...');

  // Find all farms for demo business
  const farms = await prisma.farm.findMany({
    where: {
      deletedAt: null,
      grainEntity: {
        business: {
          name: { in: ['Demo Farm', 'Rittgers Farm', 'Rittgers Farms'] }
        }
      }
    },
    select: { id: true, name: true, commodityType: true, acres: true, aph: true, year: true }
  });

  console.log(`Found ${farms.length} farms`);

  let created = 0;
  let skipped = 0;

  for (const farm of farms) {
    // Check if policy already exists
    const existing = await prisma.cropInsurancePolicy.findFirst({
      where: { farmId: farm.id, deletedAt: null }
    });
    if (existing) {
      skipped++;
      continue;
    }

    const isCorn = farm.commodityType === 'CORN';
    const isSoybeans = farm.commodityType === 'SOYBEANS';

    await prisma.cropInsurancePolicy.create({
      data: {
        farmId: farm.id,
        planType: 'RP',
        coverageLevel: 80,
        projectedPrice: isCorn ? 4.66 : isSoybeans ? 11.20 : 5.50,
        volatilityFactor: 0.20,
        premiumPerAcre: isCorn ? 15.00 : isSoybeans ? 8.00 : 10.00,
        hasSco: false,
        hasEco: false,
        scoPremiumPerAcre: 0,
        ecoPremiumPerAcre: 0
      }
    });

    console.log(`  Created RP 80% policy for ${farm.name} (${farm.commodityType})`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped (already had policy)`);
}

seedInsurancePolicies()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
