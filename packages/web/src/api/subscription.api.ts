import apiClient from './client';
import {
  SubscriptionPlan,
  BusinessSubscription,
  RetailerSubscription,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  CreatePortalSessionResponse,
  CancelSubscriptionRequest,
  DeletedItem,
  SubscriptionStatus
} from '@business-app/shared';

export const subscriptionApi = {
  // Get all available subscription plans
  getPlans: async (entityType?: 'BUSINESS' | 'RETAILER'): Promise<SubscriptionPlan[]> => {
    const response = await apiClient.get('/api/subscription/plans', {
      params: entityType ? { entityType } : undefined
    });
    return response.data;
  },

  // Get business subscription
  getBusinessSubscription: async (businessId: string): Promise<BusinessSubscription | null> => {
    const response = await apiClient.get(`/api/subscription/business/${businessId}`);
    return response.data;
  },

  // Get retailer subscription
  getRetailerSubscription: async (retailerId: string): Promise<RetailerSubscription | null> => {
    const response = await apiClient.get(`/api/subscription/retailer/${retailerId}`);
    return response.data;
  },

  // Get subscription status with usage
  getBusinessStatus: async (businessId: string): Promise<SubscriptionStatus> => {
    const response = await apiClient.get(`/api/subscription/business/${businessId}/status`);
    return response.data;
  },

  // Get retailer subscription status with usage
  getRetailerStatus: async (retailerId: string): Promise<SubscriptionStatus> => {
    const response = await apiClient.get(`/api/subscription/retailer/${retailerId}/status`);
    return response.data;
  },

  // Create Stripe checkout session
  createCheckoutSession: async (data: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> => {
    const response = await apiClient.post('/api/subscription/checkout', data);
    return response.data;
  },

  // Create Stripe customer portal session
  createPortalSession: async (data: CreatePortalSessionRequest): Promise<CreatePortalSessionResponse> => {
    const response = await apiClient.post('/api/subscription/portal', data);
    return response.data;
  },

  // Cancel subscription
  cancelSubscription: async (data: CancelSubscriptionRequest): Promise<BusinessSubscription | RetailerSubscription> => {
    const response = await apiClient.post('/api/subscription/cancel', data);
    return response.data;
  },

  // Get deleted items for business
  getDeletedItems: async (businessId: string): Promise<DeletedItem[]> => {
    const response = await apiClient.get('/api/deleted-items', {
      params: { businessId }
    });
    return response.data;
  },

  // Restore deleted item
  restoreItem: async (type: string, id: string): Promise<void> => {
    await apiClient.post(`/api/restore/${type}/${id}`);
  },

  // Permanently delete item
  permanentlyDeleteItem: async (type: string, id: string): Promise<void> => {
    await apiClient.delete(`/api/permanent-delete/${type}/${id}`);
  }
};
