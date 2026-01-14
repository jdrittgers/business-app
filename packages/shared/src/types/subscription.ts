export interface SubscriptionPlan {
  id: string;
  name: string;
  entityType: 'BUSINESS' | 'RETAILER';
  stripePriceId: string | null;
  price: number;
  interval: string;
  maxContracts: number | null;
  maxBins: number | null;
  maxBidsPerMonth: number | null;
  maxFarms: number | null;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSubscription {
  id: string;
  businessId: string;
  planId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  createdAt: string;
  updatedAt: string;
  plan: SubscriptionPlan;
}

export interface RetailerSubscription {
  id: string;
  retailerId: string;
  planId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  createdAt: string;
  updatedAt: string;
  plan: SubscriptionPlan;
}

export interface CreateCheckoutSessionRequest {
  entityId: string;
  entityType: 'BUSINESS' | 'RETAILER';
  planId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionResponse {
  url: string;
}

export interface CreatePortalSessionRequest {
  customerId: string;
  returnUrl: string;
}

export interface CreatePortalSessionResponse {
  url: string;
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
}

export interface DeletedItem {
  id: string;
  type: string;
  name: string;
  deletedAt: string;
  canRestore: boolean;
}

export interface SubscriptionUsageLimits {
  maxContracts?: number | null;
  maxBins?: number | null;
  maxBidsPerMonth?: number | null;
  maxFarms?: number | null;
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  plan: SubscriptionPlan;
  subscription?: BusinessSubscription | RetailerSubscription;
  usage?: {
    contracts: number;
    bins: number;
    bidsThisMonth: number;
    farms: number;
  };
  limits: SubscriptionUsageLimits;
}
