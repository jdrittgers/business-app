import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SubscriptionService } from '../services/subscription.service';
import Stripe from 'stripe';

const subscriptionService = new SubscriptionService();

/**
 * Get business subscription details
 */
export async function getBusinessSubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { businessId } = req.params;

    // Verify user has access to this business
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const subscription = await subscriptionService.getBusinessSubscription(businessId);

    res.json(subscription);
  } catch (error: any) {
    console.error('Get business subscription error:', error);
    res.status(500).json({ error: error.message || 'Failed to get subscription' });
  }
}

/**
 * Get retailer subscription details
 */
export async function getRetailerSubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { retailerId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const subscription = await subscriptionService.getRetailerSubscription(retailerId);

    res.json(subscription);
  } catch (error: any) {
    console.error('Get retailer subscription error:', error);
    res.status(500).json({ error: error.message || 'Failed to get subscription' });
  }
}

/**
 * Create Stripe Checkout session for subscription
 */
export async function createCheckoutSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { entityId, entityType, planId, successUrl, cancelUrl } = req.body;

    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!entityId || !entityType || !planId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!['BUSINESS', 'RETAILER'].includes(entityType)) {
      res.status(400).json({ error: 'Invalid entity type' });
      return;
    }

    const session = await subscriptionService.createCheckoutSession(
      entityId,
      entityType,
      planId,
      successUrl || `${process.env.APP_URL}/subscription/success`,
      cancelUrl || `${process.env.APP_URL}/subscription/cancel`
    );

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Create checkout session error:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
}

/**
 * Create Stripe Customer Portal session
 */
export async function createPortalSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { customerId, returnUrl } = req.body;

    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!customerId) {
      res.status(400).json({ error: 'Customer ID required' });
      return;
    }

    const session = await subscriptionService.createPortalSession(
      customerId,
      returnUrl || `${process.env.APP_URL}/subscription`
    );

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Create portal session error:', error);
    res.status(500).json({ error: error.message || 'Failed to create portal session' });
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { subscriptionId, cancelAtPeriodEnd } = req.body;

    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!subscriptionId) {
      res.status(400).json({ error: 'Subscription ID required' });
      return;
    }

    const result = await subscriptionService.cancelSubscription(
      subscriptionId,
      cancelAtPeriodEnd !== false // Default to true
    );

    res.json(result);
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
}

/**
 * Handle Stripe webhooks
 */
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      // @ts-expect-error - Stripe API version mismatch
      apiVersion: '2024-11-20.acacia'
    });

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );

    // Handle the event
    await subscriptionService.handleWebhook(event);

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message || 'Webhook error' });
  }
}

/**
 * Get all subscription plans
 */
export async function getPlans(req: Request, res: Response): Promise<void> {
  try {
    const { entityType } = req.query;

    // This would come from your database
    // For now, we'll return a simple response
    res.json({ message: 'Plans endpoint - to be implemented' });
  } catch (error: any) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: error.message || 'Failed to get plans' });
  }
}

/**
 * Get subscription usage stats
 */
export async function getUsageStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { businessId, retailerId } = req.query;

    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // This would query your database for current usage
    // For now, we'll return a simple response
    res.json({ message: 'Usage stats endpoint - to be implemented' });
  } catch (error: any) {
    console.error('Get usage stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to get usage stats' });
  }
}
