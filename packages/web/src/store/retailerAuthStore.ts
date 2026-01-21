import { create } from 'zustand';
import { Retailer, UserRole, RetailerInterest } from '@business-app/shared';
import { retailerAuthApi } from '../api/retailer-auth.api';

interface RetailerAuthState {
  retailer: Retailer | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyName: string;
    zipCode?: string;
    businessLicense?: string;
    phone?: string;
    interest?: RetailerInterest;
    radiusPreference?: number;
  }) => Promise<void>;
  logout: () => void;
  loadRetailer: () => Promise<void>;
  clearError: () => void;
}

export const useRetailerAuthStore = create<RetailerAuthState>((set) => ({
  retailer: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await retailerAuthApi.login({ email, password });

      // Store access token with different key to prevent conflict with farmer auth
      localStorage.setItem('retailerAccessToken', response.accessToken);

      set({
        user: {
          ...response.user,
          role: response.user.role as unknown as UserRole
        },
        retailer: response.retailer,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Login failed',
        isLoading: false,
        isAuthenticated: false,
        user: null,
        retailer: null
      });
      throw error;
    }
  },

  register: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await retailerAuthApi.register(data);

      // Store access token
      localStorage.setItem('retailerAccessToken', response.accessToken);

      set({
        user: {
          ...response.user,
          role: response.user.role as unknown as UserRole
        },
        retailer: response.retailer,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Registration failed',
        isLoading: false,
        isAuthenticated: false,
        user: null,
        retailer: null
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('retailerAccessToken');
    set({
      user: null,
      retailer: null,
      isAuthenticated: false,
      error: null
    });
  },

  loadRetailer: async () => {
    const token = localStorage.getItem('retailerAccessToken');
    if (!token) {
      set({ isAuthenticated: false, user: null, retailer: null });
      return;
    }

    try {
      set({ isLoading: true });
      const data = await retailerAuthApi.getMe();
      set({
        user: {
          ...data.user,
          role: data.user.role as unknown as UserRole
        },
        retailer: data.retailer,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error) {
      localStorage.removeItem('retailerAccessToken');
      set({
        user: null,
        retailer: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  },

  clearError: () => set({ error: null })
}));
