import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { SubscriptionService } from '../services/subscription.service';
import { UserRole } from '@prisma/client';

const subscriptionService = new SubscriptionService();

export interface SubscriptionRequest extends AuthRequest {
  subscription?: {
    status: string;
    planName: string;
    features: string[];
    limits: {
      maxContracts?: number | null;
      maxBins?: number | null;
      maxBidsPerMonth?: number | null;
      maxFarms?: number | null;
    };
  };
}

/**
 * Middleware to check if business has an active subscription
 */
export async function requireBusinessSubscription(
  req: SubscriptionRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const businessId = req.body.businessId || req.params.businessId || req.query.businessId;

    if (!businessId) {
      res.status(400).json({ error: 'Business ID required' });
      return;
    }

    try {
      const subscription = await subscriptionService.getBusinessSubscription(businessId);

      // Allow access if subscription is active or trialing
      if (!['active', 'trialing'].includes(subscription.status)) {
        res.status(402).json({
          error: 'Subscription required',
          message: 'Your subscription is not active. Please upgrade to continue.',
          status: subscription.status
        });
        return;
      }

      // Parse features from JSON if needed
      let features: string[] = [];
      if (typeof subscription.plan.features === 'string') {
        try {
          features = JSON.parse(subscription.plan.features);
        } catch (e) {
          features = [];
        }
      } else if (Array.isArray(subscription.plan.features)) {
        features = subscription.plan.features as string[];
      }

      // Attach subscription info to request
      req.subscription = {
        status: subscription.status,
        planName: subscription.plan.name,
        features,
        limits: {
          maxContracts: subscription.plan.maxContracts,
          maxBins: subscription.plan.maxBins,
          maxBidsPerMonth: subscription.plan.maxBidsPerMonth,
          maxFarms: subscription.plan.maxFarms
        }
      };

      next();
    } catch (error: any) {
      // If no subscription found, they might be on a free tier by default
      // For now, we'll allow access but you can change this behavior
      console.warn(`No subscription found for business ${businessId}:`, error.message);

      // Default to free plan limits
      req.subscription = {
        status: 'none',
        planName: 'Free',
        features: [],
        limits: {
          maxContracts: 3,
          maxBins: 2,
          maxBidsPerMonth: 5,
          maxFarms: 1
        }
      };

      next();
    }
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Middleware to check if retailer has an active subscription
 */
export async function requireRetailerSubscription(
  req: SubscriptionRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (req.user.role !== UserRole.RETAILER) {
      res.status(403).json({ error: 'Retailer access required' });
      return;
    }

    const retailerId = req.body.retailerId || req.params.retailerId;

    if (!retailerId) {
      res.status(400).json({ error: 'Retailer ID required' });
      return;
    }

    try {
      const subscription = await subscriptionService.getRetailerSubscription(retailerId);

      if (!['active', 'trialing'].includes(subscription.status)) {
        res.status(402).json({
          error: 'Subscription required',
          message: 'Your subscription is not active. Please upgrade to continue.',
          status: subscription.status
        });
        return;
      }

      // Parse features from JSON if needed
      let features: string[] = [];
      if (typeof subscription.plan.features === 'string') {
        try {
          features = JSON.parse(subscription.plan.features);
        } catch (e) {
          features = [];
        }
      } else if (Array.isArray(subscription.plan.features)) {
        features = subscription.plan.features as string[];
      }

      req.subscription = {
        status: subscription.status,
        planName: subscription.plan.name,
        features,
        limits: {
          maxBidsPerMonth: subscription.plan.maxBidsPerMonth
        }
      };

      next();
    } catch (error: any) {
      // Default to free plan limits for retailers
      console.warn(`No subscription found for retailer ${retailerId}:`, error.message);

      req.subscription = {
        status: 'none',
        planName: 'Free',
        features: [],
        limits: {
          maxBidsPerMonth: 5
        }
      };

      next();
    }
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Middleware to check if user has access to a specific feature
 */
export function requireFeature(featureName: string) {
  return async (
    req: SubscriptionRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.subscription) {
      res.status(500).json({ error: 'Subscription not loaded' });
      return;
    }

    if (!req.subscription.features.includes(featureName)) {
      res.status(403).json({
        error: 'Feature not available',
        message: `This feature requires an upgrade. Current plan: ${req.subscription.planName}`,
        requiredFeature: featureName
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check usage limits before creating resources
 */
export async function checkUsageLimit(resourceType: string) {
  return async (
    req: SubscriptionRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.subscription || !req.user) {
        res.status(500).json({ error: 'Subscription or user not loaded' });
        return;
      }

      const businessId = req.body.businessId || req.params.businessId || req.query.businessId;
      const retailerId = req.body.retailerId || req.params.retailerId;

      if (businessId) {
        const canCreate = await subscriptionService.checkBusinessUsageLimit(
          businessId,
          resourceType,
          req.subscription.limits
        );

        if (!canCreate) {
          res.status(403).json({
            error: 'Usage limit reached',
            message: `You have reached your ${resourceType.toLowerCase()} limit. Upgrade to continue.`,
            currentPlan: req.subscription.planName,
            resourceType
          });
          return;
        }
      } else if (retailerId) {
        const canCreate = await subscriptionService.checkRetailerUsageLimit(
          retailerId,
          resourceType,
          req.subscription.limits
        );

        if (!canCreate) {
          res.status(403).json({
            error: 'Usage limit reached',
            message: `You have reached your ${resourceType.toLowerCase()} limit. Upgrade to continue.`,
            currentPlan: req.subscription.planName,
            resourceType
          });
          return;
        }
      }

      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
