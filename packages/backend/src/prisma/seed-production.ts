import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database...');

  // Hash password
  const passwordHash = await hashPassword('rittgers123');

  // Create user
  const user = await prisma.user.upsert({
    where: { email: 'rittgers@rittgersfarms.com' },
    update: {},
    create: {
      email: 'rittgers@rittgersfarms.com',
      passwordHash,
      firstName: 'Jonathan',
      lastName: 'Rittgers',
      role: 'OWNER'
    }
  });

  console.log('✅ Created user:', user.email);

  // Create business
  const existingBusiness = await prisma.business.findFirst({
    where: { name: 'Rittgers Farms' }
  });

  const business = existingBusiness || await prisma.business.create({
    data: {
      name: 'Rittgers Farms'
    }
  });

  console.log('✅ Created business:', business.name);

  // Create business membership
  await prisma.businessMember.upsert({
    where: {
      userId_businessId: {
        userId: user.id,
        businessId: business.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      businessId: business.id,
      role: 'OWNER'
    }
  });

  console.log('✅ Created business membership');
  console.log('\n🎉 Production database seeded successfully!');
  console.log('\nLogin credentials:');
  console.log('Email: rittgers@rittgersfarms.com');
  console.log('Password: rittgers123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
