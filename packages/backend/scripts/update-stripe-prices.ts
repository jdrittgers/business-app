import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore
  apiVersion: '2024-11-20.acacia'
});

const prisma = new PrismaClient();

async function updatePrices() {
  try {
    console.log('🔄 Updating Stripe prices to $5/month...\n');

    // Get existing products
    const products = await stripe.products.list({ limit: 10 });
    console.log(`Found ${products.data.length} products in Stripe`);

    let businessProduct = products.data.find(p => p.name === 'Business Premium');
    let retailerProduct = products.data.find(p => p.name === 'Retailer Premium');

    // Create new $5 prices
    console.log('\n💰 Creating new $5/month prices...');
    
    const businessPrice = await stripe.prices.create({
      product: businessProduct!.id,
      unit_amount: 500, // $5.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      }
    });
    console.log(`✅ Business Premium: ${businessPrice.id} ($5/month)`);

    const retailerPrice = await stripe.prices.create({
      product: retailerProduct!.id,
      unit_amount: 500, // $5.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      }
    });
    console.log(`✅ Retailer Premium: ${retailerPrice.id} ($5/month)`);

    // Update database - Railway
    console.log('\n📊 Updating Railway database...');
    const railwayDb = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:IFEGBjBrfpLQlpQadSsiyLOjyukaYkOu@trolley.proxy.rlwy.net:24210/railway'
        }
      }
    });

    await railwayDb.subscriptionPlan.update({
      where: { id: 'business-premium-plan' },
      data: { 
        stripePriceId: businessPrice.id,
        price: 5
      }
    });

    await railwayDb.subscriptionPlan.update({
      where: { id: 'retailer-premium-plan' },
      data: { 
        stripePriceId: retailerPrice.id,
        price: 5
      }
    });
    await railwayDb.$disconnect();
    console.log('✅ Railway database updated');

    // Update database - Local
    console.log('\n📊 Updating local database...');
    await prisma.subscriptionPlan.update({
      where: { id: 'business-premium-plan' },
      data: { 
        stripePriceId: businessPrice.id,
        price: 5
      }
    });

    await prisma.subscriptionPlan.update({
      where: { id: 'retailer-premium-plan' },
      data: { 
        stripePriceId: retailerPrice.id,
        price: 5
      }
    });
    console.log('✅ Local database updated');

    console.log('\n✅ All prices updated to $5/month!');
    console.log('\n📝 Summary:');
    console.log(`   Business Premium: ${businessPrice.id}`);
    console.log(`   Retailer Premium: ${retailerPrice.id}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updatePrices();
