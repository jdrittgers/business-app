import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testStripe() {
  console.log('🔍 Testing Stripe Configuration...\n');

  // Check if API key is set
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey || apiKey === 'sk_test_placeholder') {
    console.error('❌ STRIPE_SECRET_KEY not set in environment');
    console.log('\n📝 Please add to .env:');
    console.log('STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE\n');
    process.exit(1);
  }

  console.log('✓ Stripe API key found');

  // Initialize Stripe
  const stripe = new Stripe(apiKey, {
    apiVersion: '2024-11-20.acacia'
  });

  try {
    // Test 1: List products
    console.log('\n1️⃣ Testing Stripe connection...');
    const products = await stripe.products.list({ limit: 5 });
    console.log(`✓ Connected! Found ${products.data.length} products`);

    // Test 2: Check subscription plans in database
    console.log('\n2️⃣ Checking subscription plans in database...');
    const plans = await prisma.subscriptionPlan.findMany();
    console.log(`✓ Found ${plans.length} subscription plans:`);

    for (const plan of plans) {
      console.log(`   - ${plan.name} (${plan.entityType}): $${plan.price}/month`);
      if (plan.stripePriceId) {
        console.log(`     ✓ Price ID: ${plan.stripePriceId}`);

        // Verify price exists in Stripe
        try {
          const price = await stripe.prices.retrieve(plan.stripePriceId);
          console.log(`     ✓ Verified in Stripe: $${price.unit_amount! / 100}/${price.recurring?.interval}`);
        } catch (error: any) {
          console.log(`     ⚠️  Warning: Price not found in Stripe: ${error.message}`);
        }
      } else {
        console.log(`     ℹ️  No Stripe price (free plan)`);
      }
    }

    // Test 3: Check webhook endpoint secret
    console.log('\n3️⃣ Checking webhook configuration...');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.log('⚠️  STRIPE_WEBHOOK_SECRET not set');
      console.log('   This is needed for webhook signature verification');
    } else {
      console.log(`✓ Webhook secret configured: ${webhookSecret.substring(0, 12)}...`);
    }

    // Test 4: List any existing customers
    console.log('\n4️⃣ Checking existing Stripe customers...');
    const customers = await stripe.customers.list({ limit: 5 });
    console.log(`✓ Found ${customers.data.length} customers`);

    for (const customer of customers.data) {
      console.log(`   - ${customer.name || customer.email || customer.id}`);
    }

    // Test 5: Check subscriptions in database
    console.log('\n5️⃣ Checking existing subscriptions...');
    const businessSubs = await prisma.businessSubscription.count();
    const retailerSubs = await prisma.retailerSubscription.count();
    console.log(`✓ Business subscriptions: ${businessSubs}`);
    console.log(`✓ Retailer subscriptions: ${retailerSubs}`);

    console.log('\n✅ All tests passed!');
    console.log('\n📋 Next steps:');
    console.log('1. Create products in Stripe Dashboard');
    console.log('2. Update subscription plans with Price IDs');
    console.log('3. Configure webhook endpoint');
    console.log('4. Test subscription creation\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.log('\n💡 Your API key might be invalid. Check:');
      console.log('   - Is it the secret key (starts with sk_)?');
      console.log('   - Is it from the correct Stripe account?');
      console.log('   - Has it been revoked?\n');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testStripe();
