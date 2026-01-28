import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireBusinessAccess } from '../middleware/business-access';
import { subscriptionLimiter } from '../middleware/rate-limit';
import * as subscriptionController from '../controllers/subscription.controller';

const router = Router();

/**
 * GET /api/subscription/business/:businessId
 * Get business subscription details
 */
router.get(
  '/business/:businessId',
  authenticate,
  requireBusinessAccess,
  subscriptionController.getBusinessSubscription
);

/**
 * GET /api/subscription/retailer/:retailerId
 * Get retailer subscription details
 */
router.get(
  '/retailer/:retailerId',
  authenticate,
  subscriptionController.getRetailerSubscription
);

/**
 * POST /api/subscription/checkout
 * Create Stripe Checkout session
 */
router.post(
  '/checkout',
  authenticate,
  subscriptionLimiter,
  subscriptionController.createCheckoutSession
);

/**
 * POST /api/subscription/portal
 * Create Stripe Customer Portal session
 */
router.post(
  '/portal',
  authenticate,
  subscriptionController.createPortalSession
);

/**
 * POST /api/subscription/cancel
 * Cancel subscription
 */
router.post(
  '/cancel',
  authenticate,
  subscriptionController.cancelSubscription
);

/**
 * POST /api/subscription/webhook
 * Handle Stripe webhooks
 * Note: This endpoint should NOT use authentication middleware
 * Stripe will send webhooks directly
 */
router.post(
  '/webhook',
  subscriptionController.handleWebhook
);

/**
 * GET /api/subscription/plans
 * Get all subscription plans
 */
router.get(
  '/plans',
  subscriptionController.getPlans
);

/**
 * GET /api/subscription/usage
 * Get usage statistics
 */
router.get(
  '/usage',
  authenticate,
  subscriptionController.getUsageStats
);

export default router;
