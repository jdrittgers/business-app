import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

// Initialize Stripe - handle case where API key is not set (for development)
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
const stripe = new Stripe(stripeKey, {
  // @ts-expect-error - Stripe API version mismatch
  apiVersion: '2024-11-20.acacia'
});

export class SubscriptionService {
  /**
   * Create or get a free subscription for a business
   */
  async createBusinessSubscription(
    businessId: string,
    planId: string,
    paymentMethodId?: string
  ) {
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    });

    if (!business) {
      throw new Error('Business not found');
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan || plan.entityType !== 'BUSINESS') {
      throw new Error('Invalid plan');
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: business.email || undefined,
      name: business.name,
      metadata: {
        businessId: businessId,
        entityType: 'BUSINESS'
      }
    });

    // If it's a free plan, just create the subscription record
    if (!plan.stripePriceId) {
      return prisma.businessSubscription.create({
        data: {
          businessId,
          planId,
          stripeCustomerId: customer.id,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        },
        include: {
          plan: true
        }
      });
    }

    // For paid plans, create Stripe subscription
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [{ price: plan.stripePriceId }],
      trial_period_days: 14,
      metadata: {
        businessId,
        planId,
        entityType: 'BUSINESS'
      }
    };

    if (paymentMethodId) {
      subscriptionParams.default_payment_method = paymentMethodId;
    }

    const stripeSubscription = await stripe.subscriptions.create(subscriptionParams);

    // Create database record
    return prisma.businessSubscription.create({
      data: {
        businessId,
        planId,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        // @ts-expect-error - Stripe Response type issue
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        // @ts-expect-error - Stripe Response type issue
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialStart: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000)
          : null,
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null
      },
      include: {
        plan: true
      }
    });
  }

  /**
   * Create or get a subscription for a retailer
   */
  async createRetailerSubscription(
    retailerId: string,
    planId: string,
    paymentMethodId?: string
  ) {
    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
      include: { user: true }
    });

    if (!retailer) {
      throw new Error('Retailer not found');
    }

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan || plan.entityType !== 'RETAILER') {
      throw new Error('Invalid plan');
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: retailer.user.email,
      name: retailer.companyName,
      metadata: {
        retailerId: retailerId,
        entityType: 'RETAILER'
      }
    });

    // If it's a free plan, just create the subscription record
    if (!plan.stripePriceId) {
      return prisma.retailerSubscription.create({
        data: {
          retailerId,
          planId,
          stripeCustomerId: customer.id,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
        },
        include: {
          plan: true
        }
      });
    }

    // For paid plans, create Stripe subscription
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [{ price: plan.stripePriceId }],
      trial_period_days: 14,
      metadata: {
        retailerId,
        planId,
        entityType: 'RETAILER'
      }
    };

    if (paymentMethodId) {
      subscriptionParams.default_payment_method = paymentMethodId;
    }

    const stripeSubscription = await stripe.subscriptions.create(subscriptionParams);

    // Create database record
    return prisma.retailerSubscription.create({
      data: {
        retailerId,
        planId,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        // @ts-expect-error - Stripe Response type issue
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        // @ts-expect-error - Stripe Response type issue
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        trialStart: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000)
          : null,
        trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null
      },
      include: {
        plan: true
      }
    });
  }

  /**
   * Get business subscription
   */
  async getBusinessSubscription(businessId: string) {
    const subscription = await prisma.businessSubscription.findUnique({
      where: { businessId },
      include: {
        plan: true
      }
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    return subscription;
  }

  /**
   * Get retailer subscription
   */
  async getRetailerSubscription(retailerId: string) {
    const subscription = await prisma.retailerSubscription.findUnique({
      where: { retailerId },
      include: {
        plan: true
      }
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    return subscription;
  }

  /**
   * Check if business can create a resource based on usage limits
   */
  async checkBusinessUsageLimit(
    businessId: string,
    resourceType: string,
    limits: {
      maxContracts?: number | null;
      maxBins?: number | null;
      maxBidsPerMonth?: number | null;
      maxFarms?: number | null;
    }
  ): Promise<boolean> {
    switch (resourceType) {
      case 'CONTRACT':
        if (limits.maxContracts === null || limits.maxContracts === undefined) return true;
        const contractCount = await prisma.grainContract.count({
          where: {
            grainEntity: {
              businessId
            },
            deletedAt: null
          }
        });
        return contractCount < limits.maxContracts;

      case 'BIN':
        if (limits.maxBins === null || limits.maxBins === undefined) return true;
        const binCount = await prisma.grainBin.count({
          where: {
            grainEntity: {
              businessId
            },
            deletedAt: null
          }
        });
        return binCount < limits.maxBins;

      case 'BID_REQUEST': {
        if (limits.maxBidsPerMonth === null || limits.maxBidsPerMonth === undefined) return true;
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const bidCount = await prisma.bidRequest.count({
          where: {
            businessId,
            createdAt: {
              gte: periodStart,
              lte: periodEnd
            },
            deletedAt: null
          }
        });
        return bidCount < limits.maxBidsPerMonth;
      }

      case 'FARM':
        if (limits.maxFarms === null || limits.maxFarms === undefined) return true;
        const farmCount = await prisma.farm.count({
          where: {
            grainEntity: {
              businessId
            },
            deletedAt: null
          }
        });
        return farmCount < limits.maxFarms;

      default:
        return true;
    }
  }

  /**
   * Check if retailer can create a resource based on usage limits
   */
  async checkRetailerUsageLimit(
    retailerId: string,
    resourceType: string,
    limits: {
      maxBidsPerMonth?: number | null;
    }
  ): Promise<boolean> {
    if (resourceType === 'BID_SUBMISSION') {
      if (limits.maxBidsPerMonth === null || limits.maxBidsPerMonth === undefined) return true;

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const bidCount = await prisma.retailerBid.count({
        where: {
          retailerId,
          createdAt: {
            gte: periodStart,
            lte: periodEnd
          }
        }
      });

      return bidCount < limits.maxBidsPerMonth;
    }

    return true;
  }

  /**
   * Create Stripe Checkout Session
   */
  async createCheckoutSession(
    entityId: string,
    entityType: 'BUSINESS' | 'RETAILER',
    planId: string,
    successUrl: string,
    cancelUrl: string
  ) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan || !plan.stripePriceId) {
      throw new Error('Invalid plan or plan has no price');
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        entityId,
        entityType,
        planId
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          entityId,
          entityType,
          planId
        }
      }
    });

    return session;
  }

  /**
   * Create Customer Portal Session
   */
  async createPortalSession(customerId: string, returnUrl: string) {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    return session;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, immediately: boolean = false) {
    if (immediately) {
      await stripe.subscriptions.cancel(subscriptionId);
    } else {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true
      });
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event) {
    console.log(`Processing webhook: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.syncSubscription(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await this.recordPayment(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Sync subscription from Stripe to database
   */
  private async syncSubscription(stripeSubscription: Stripe.Subscription) {
    const metadata = stripeSubscription.metadata;
    const entityType = metadata.entityType;

    if (entityType === 'BUSINESS') {
      const existing = await prisma.businessSubscription.findUnique({
        where: { stripeSubscriptionId: stripeSubscription.id }
      });

      if (existing) {
        await prisma.businessSubscription.update({
          where: { stripeSubscriptionId: stripeSubscription.id },
          data: {
            status: stripeSubscription.status,
            // @ts-expect-error - Stripe type issue
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            // @ts-expect-error - Stripe type issue
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
          }
        });
      }
    } else if (entityType === 'RETAILER') {
      const existing = await prisma.retailerSubscription.findUnique({
        where: { stripeSubscriptionId: stripeSubscription.id }
      });

      if (existing) {
        await prisma.retailerSubscription.update({
          where: { stripeSubscriptionId: stripeSubscription.id },
          data: {
            status: stripeSubscription.status,
            // @ts-expect-error - Stripe type issue
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            // @ts-expect-error - Stripe type issue
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
          }
        });
      }
    }

    console.log(`Synced subscription: ${stripeSubscription.id}`);
  }

  /**
   * Handle subscription deletion
   */
  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
    const metadata = stripeSubscription.metadata;
    const entityType = metadata.entityType;

    if (entityType === 'BUSINESS') {
      await prisma.businessSubscription.update({
        where: { stripeSubscriptionId: stripeSubscription.id },
        data: {
          status: 'canceled',
          canceledAt: new Date()
        }
      });
    } else if (entityType === 'RETAILER') {
      await prisma.retailerSubscription.update({
        where: { stripeSubscriptionId: stripeSubscription.id },
        data: {
          status: 'canceled',
          canceledAt: new Date()
        }
      });
    }

    console.log(`Subscription deleted: ${stripeSubscription.id}`);
  }

  /**
   * Record successful payment
   */
  private async recordPayment(invoice: Stripe.Invoice) {
    // @ts-expect-error - Stripe Invoice type issue
    const subscriptionId = invoice.subscription as string;

    // Find subscription
    const businessSub = await prisma.businessSubscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId }
    });

    const retailerSub = await prisma.retailerSubscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId }
    });

    await prisma.paymentHistory.create({
      data: {
        businessSubscriptionId: businessSub?.id,
        retailerSubscriptionId: retailerSub?.id,
        stripeInvoiceId: invoice.id,
        // @ts-expect-error - Stripe Invoice type issue
        stripePaymentIntentId: invoice.payment_intent as string,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: 'paid',
        invoiceUrl: invoice.hosted_invoice_url || undefined,
        invoicePdf: invoice.invoice_pdf || undefined,
        paidAt: invoice.status_transitions.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : null
      }
    });

    console.log(`Payment recorded: ${invoice.id}`);
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    // @ts-expect-error - Stripe Invoice type issue
    const subscriptionId = invoice.subscription as string;

    // Find subscription
    const businessSub = await prisma.businessSubscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId }
    });

    const retailerSub = await prisma.retailerSubscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId }
    });

    await prisma.paymentHistory.create({
      data: {
        businessSubscriptionId: businessSub?.id,
        retailerSubscriptionId: retailerSub?.id,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        status: 'failed'
      }
    });

    console.log(`Payment failed: ${invoice.id}`);
    // TODO: Send notification email about failed payment
  }
}
