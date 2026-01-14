import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSubscriptionPlans() {
  console.log('🌱 Seeding subscription plans...');

  try {
    // Business Free Plan
    const businessFree = await prisma.subscriptionPlan.upsert({
      where: {
        id: 'business-free-plan'
      },
      update: {},
      create: {
        id: 'business-free-plan',
        name: 'Free',
        entityType: 'BUSINESS',
        stripePriceId: null, // Free plan has no Stripe price ID
        price: 0,
        interval: 'month',
        maxContracts: 3,
        maxBins: 2,
        maxBidsPerMonth: 5,
        maxFarms: 1,
        features: JSON.stringify([
          'Up to 3 grain contracts',
          'Up to 2 grain bins',
          '5 bid requests per month',
          '1 farm for break-even calculator',
          '30-day data retention',
          'Basic support'
        ]),
        isActive: true
      }
    });
    console.log('✓ Business Free plan created');

    // Business Premium Plan
    const businessPremium = await prisma.subscriptionPlan.upsert({
      where: {
        id: 'business-premium-plan'
      },
      update: {},
      create: {
        id: 'business-premium-plan',
        name: 'Premium',
        entityType: 'BUSINESS',
        stripePriceId: null, // TODO: Update with actual Stripe price ID after Stripe setup
        price: 5.00,
        interval: 'month',
        maxContracts: null, // Unlimited
        maxBins: null, // Unlimited
        maxBidsPerMonth: null, // Unlimited
        maxFarms: null, // Unlimited
        features: JSON.stringify([
          'Unlimited grain contracts',
          'Unlimited grain bins',
          'Unlimited bid requests',
          'Unlimited farms',
          '2-year data retention',
          'Priority support',
          'Advanced analytics',
          'Bulk operations',
          'Custom reports'
        ]),
        isActive: true
      }
    });
    console.log('✓ Business Premium plan created');

    // Retailer Free Plan
    const retailerFree = await prisma.subscriptionPlan.upsert({
      where: {
        id: 'retailer-free-plan'
      },
      update: {},
      create: {
        id: 'retailer-free-plan',
        name: 'Free',
        entityType: 'RETAILER',
        stripePriceId: null, // Free plan has no Stripe price ID
        price: 0,
        interval: 'month',
        maxContracts: null, // N/A for retailers
        maxBins: null, // N/A for retailers
        maxBidsPerMonth: 5, // 5 bid submissions per month
        maxFarms: null, // N/A for retailers
        features: JSON.stringify([
          'View up to 10 bid requests per month',
          'Submit 5 bids per month',
          'Basic marketplace access',
          'Basic support'
        ]),
        isActive: true
      }
    });
    console.log('✓ Retailer Free plan created');

    // Retailer Premium Plan
    const retailerPremium = await prisma.subscriptionPlan.upsert({
      where: {
        id: 'retailer-premium-plan'
      },
      update: {},
      create: {
        id: 'retailer-premium-plan',
        name: 'Premium',
        entityType: 'RETAILER',
        stripePriceId: null, // TODO: Update with actual Stripe price ID after Stripe setup
        price: 5.00,
        interval: 'month',
        maxContracts: null, // N/A for retailers
        maxBins: null, // N/A for retailers
        maxBidsPerMonth: null, // Unlimited
        maxFarms: null, // N/A for retailers
        features: JSON.stringify([
          'Unlimited bid viewing',
          'Unlimited bid submissions',
          'Priority bid placement',
          'Advanced marketplace filters',
          'Bulk bidding',
          'Analytics dashboard',
          'Priority support'
        ]),
        isActive: true
      }
    });
    console.log('✓ Retailer Premium plan created');

    console.log('\n✅ Subscription plans seeded successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Set up Stripe products and get price IDs');
    console.log('2. Update stripePriceId fields with actual Stripe price IDs');
    console.log('3. Run this seed script again to update the plans\n');

  } catch (error) {
    console.error('❌ Error seeding subscription plans:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedSubscriptionPlans()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
