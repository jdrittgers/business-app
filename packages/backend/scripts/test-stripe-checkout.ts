import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

async function testStripeCheckout() {
  try {
    // 1. Find a subscription plan
    console.log('📋 Finding subscription plans...');
    const plans = await prisma.subscriptionPlan.findMany({
      where: { entityType: 'BUSINESS', isActive: true }
    });
    
    console.log(`Found ${plans.length} plans:`);
    plans.forEach(plan => {
      console.log(`  - ${plan.name}: $${plan.price} (ID: ${plan.id})`);
    });

    // 2. Find or create a test user and business
    console.log('\n👤 Finding test user with business...');
    let user = await prisma.user.findFirst({
      where: {
        businessMemberships: {
          some: {}
        }
      },
      include: { businessMemberships: { include: { business: true } } }
    });

    if (!user || user.businessMemberships.length === 0) {
      console.log('No user with business found. Creating test user and business...');
      user = await prisma.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          passwordHash: 'test-hash',
          firstName: 'Test',
          lastName: 'User',
          role: 'OWNER'
        }
      });

      const business = await prisma.business.create({
        data: {
          name: 'Test Subscription Farm',
          members: {
            create: {
              userId: user.id,
              role: 'OWNER'
            }
          }
        }
      });

      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: { businessMemberships: { include: { business: true } } }
      });
    }

    console.log(`Found user: ${user!.email}`);
    const business = user!.businessMemberships[0]?.business;
    console.log(`Found business: ${business?.name} (ID: ${business?.id})`);

    if (!business) {
      console.error('❌ No business found for user');
      return;
    }

    // 3. Get premium plan
    const premiumPlan = plans.find(p => p.name === 'Premium');
    if (!premiumPlan) {
      console.error('❌ Premium plan not found');
      return;
    }

    console.log(`\n💳 Testing Stripe checkout with plan: ${premiumPlan.name}`);
    console.log(`   Business ID: ${business.id}`);
    console.log(`   Plan ID: ${premiumPlan.id}`);
    console.log(`   Stripe Price ID: ${premiumPlan.stripePriceId}`);

    // 4. Create checkout session via API
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // @ts-ignore
      apiVersion: '2024-11-20.acacia'
    });

    // Create a Stripe customer
    const customer = await stripe.customers.create({
      email: user!.email,
      metadata: {
        businessId: business.id,
        entityType: 'BUSINESS'
      }
    });

    console.log(`\n✅ Created Stripe customer: ${customer.id}`);

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: premiumPlan.stripePriceId!,
          quantity: 1
        }
      ],
      success_url: 'http://localhost:5173/subscription/success',
      cancel_url: 'http://localhost:5173/subscription/cancel',
      metadata: {
        businessId: business.id,
        entityType: 'BUSINESS',
        planId: premiumPlan.id
      }
    });

    console.log(`\n✅ Created Stripe checkout session!`);
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Session URL: ${session.url}`);
    console.log(`\n🌐 Open this URL in your browser to test:`);
    console.log(`   ${session.url}`);
    console.log(`\n💳 Use test card: 4242 4242 4242 4242`);
    console.log(`   Any future expiry date, any CVC, any ZIP`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testStripeCheckout();
