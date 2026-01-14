import { create } from 'zustand';
import {
  SubscriptionPlan,
  BusinessSubscription,
  RetailerSubscription,
  SubscriptionStatus,
  DeletedItem
} from '@business-app/shared';
import { subscriptionApi } from '../api/subscription.api';

interface SubscriptionState {
  // State
  subscription: BusinessSubscription | RetailerSubscription | null;
  subscriptionStatus: SubscriptionStatus | null;
  plans: SubscriptionPlan[];
  deletedItems: DeletedItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadPlans: (entityType?: 'BUSINESS' | 'RETAILER') => Promise<void>;
  loadBusinessSubscription: (businessId: string) => Promise<void>;
  loadRetailerSubscription: (retailerId: string) => Promise<void>;
  loadBusinessStatus: (businessId: string) => Promise<void>;
  loadRetailerStatus: (retailerId: string) => Promise<void>;
  createCheckoutSession: (
    entityId: string,
    entityType: 'BUSINESS' | 'RETAILER',
    planId: string,
    successUrl: string,
    cancelUrl: string
  ) => Promise<string>;
  openCustomerPortal: (customerId: string, returnUrl: string) => Promise<string>;
  cancelSubscription: (subscriptionId: string, cancelAtPeriodEnd?: boolean) => Promise<void>;
  loadDeletedItems: (businessId: string) => Promise<void>;
  restoreItem: (type: string, id: string) => Promise<void>;
  permanentlyDeleteItem: (type: string, id: string) => Promise<void>;
  clearError: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  // Initial state
  subscription: null,
  subscriptionStatus: null,
  plans: [],
  deletedItems: [],
  isLoading: false,
  error: null,

  // Load available plans
  loadPlans: async (entityType?: 'BUSINESS' | 'RETAILER') => {
    try {
      set({ isLoading: true, error: null });
      const plans = await subscriptionApi.getPlans(entityType);
      set({ plans, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to load subscription plans',
        isLoading: false
      });
      throw error;
    }
  },

  // Load business subscription
  loadBusinessSubscription: async (businessId: string) => {
    try {
      set({ isLoading: true, error: null });
      const subscription = await subscriptionApi.getBusinessSubscription(businessId);
      set({ subscription, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to load subscription',
        isLoading: false
      });
      throw error;
    }
  },

  // Load retailer subscription
  loadRetailerSubscription: async (retailerId: string) => {
    try {
      set({ isLoading: true, error: null });
      const subscription = await subscriptionApi.getRetailerSubscription(retailerId);
      set({ subscription, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to load subscription',
        isLoading: false
      });
      throw error;
    }
  },

  // Load business subscription status with usage
  loadBusinessStatus: async (businessId: string) => {
    try {
      set({ isLoading: true, error: null });
      const subscriptionStatus = await subscriptionApi.getBusinessStatus(businessId);
      set({ subscriptionStatus, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to load subscription status',
        isLoading: false
      });
      throw error;
    }
  },

  // Load retailer subscription status with usage
  loadRetailerStatus: async (retailerId: string) => {
    try {
      set({ isLoading: true, error: null });
      const subscriptionStatus = await subscriptionApi.getRetailerStatus(retailerId);
      set({ subscriptionStatus, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to load subscription status',
        isLoading: false
      });
      throw error;
    }
  },

  // Create Stripe checkout session and return URL
  createCheckoutSession: async (
    entityId: string,
    entityType: 'BUSINESS' | 'RETAILER',
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> => {
    try {
      set({ isLoading: true, error: null });
      const response = await subscriptionApi.createCheckoutSession({
        entityId,
        entityType,
        planId,
        successUrl,
        cancelUrl
      });
      set({ isLoading: false });
      return response.url;
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to create checkout session',
        isLoading: false
      });
      throw error;
    }
  },

  // Open Stripe customer portal and return URL
  openCustomerPortal: async (customerId: string, returnUrl: string): Promise<string> => {
    try {
      set({ isLoading: true, error: null });
      const response = await subscriptionApi.createPortalSession({
        customerId,
        returnUrl
      });
      set({ isLoading: false });
      return response.url;
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to open customer portal',
        isLoading: false
      });
      throw error;
    }
  },

  // Cancel subscription
  cancelSubscription: async (subscriptionId: string, cancelAtPeriodEnd: boolean = true) => {
    try {
      set({ isLoading: true, error: null });
      const subscription = await subscriptionApi.cancelSubscription({
        subscriptionId,
        cancelAtPeriodEnd
      });
      set({ subscription, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to cancel subscription',
        isLoading: false
      });
      throw error;
    }
  },

  // Load deleted items
  loadDeletedItems: async (businessId: string) => {
    try {
      set({ isLoading: true, error: null });
      const deletedItems = await subscriptionApi.getDeletedItems(businessId);
      set({ deletedItems, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to load deleted items',
        isLoading: false
      });
      throw error;
    }
  },

  // Restore deleted item
  restoreItem: async (type: string, id: string) => {
    try {
      set({ isLoading: true, error: null });
      await subscriptionApi.restoreItem(type, id);

      // Reload deleted items to refresh the list
      const { deletedItems } = get();
      const updatedItems = deletedItems.filter(item => item.id !== id);
      set({ deletedItems: updatedItems, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to restore item',
        isLoading: false
      });
      throw error;
    }
  },

  // Permanently delete item
  permanentlyDeleteItem: async (type: string, id: string) => {
    try {
      set({ isLoading: true, error: null });
      await subscriptionApi.permanentlyDeleteItem(type, id);

      // Remove from deleted items list
      const { deletedItems } = get();
      const updatedItems = deletedItems.filter(item => item.id !== id);
      set({ deletedItems: updatedItems, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to permanently delete item',
        isLoading: false
      });
      throw error;
    }
  },

  // Clear error
  clearError: () => set({ error: null })
}));
