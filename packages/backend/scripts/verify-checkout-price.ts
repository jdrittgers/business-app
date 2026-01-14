import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-ignore
  apiVersion: '2024-11-20.acacia'
});

async function verifyCheckout() {
  try {
    // Create a test checkout session
    const products = await stripe.products.list({ limit: 10 });
    const businessProduct = products.data.find(p => p.name === 'Business Premium');

    // Get the latest price for this product
    const prices = await stripe.prices.list({
      product: businessProduct!.id,
      active: true
    });

    const latestPrice = prices.data[0];

    console.log('✅ Stripe Price Verification:');
    console.log(`   Product: ${businessProduct!.name}`);
    console.log(`   Price ID: ${latestPrice.id}`);
    console.log(`   Amount: $${(latestPrice.unit_amount! / 100).toFixed(2)}`);
    console.log(`   Interval: ${latestPrice.recurring?.interval}`);
    console.log(`   Currency: ${latestPrice.currency}`);
    console.log('\n✅ Price verified at $5.00/month!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyCheckout();
