import { create } from 'zustand';
import { UserWithBusinesses } from '@business-app/shared';
import { authApi } from '../api/auth.api';
import { disconnectSocket } from '../config/socket';

// Refresh token every hour to prevent session expiration during long data entry
const TOKEN_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

let refreshIntervalId: NodeJS.Timeout | null = null;

interface AuthState {
  user: UserWithBusinesses | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
  startTokenRefresh: () => void;
  stopTokenRefresh: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.login({ email, password });

      // Store access token
      localStorage.setItem('accessToken', response.accessToken);

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      // Start proactive token refresh
      get().startTokenRefresh();
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Login failed',
        isLoading: false,
        isAuthenticated: false,
        user: null
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      // Stop token refresh
      get().stopTokenRefresh();
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');

      // Disconnect socket on logout
      disconnectSocket();

      set({
        user: null,
        isAuthenticated: false,
        error: null
      });
    }
  },

  loadUser: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      set({ isLoading: true });
      const user = await authApi.getCurrentUser();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      // Start proactive token refresh after loading user
      get().startTokenRefresh();
    } catch (error) {
      localStorage.removeItem('accessToken');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  },

  clearError: () => set({ error: null }),

  startTokenRefresh: () => {
    // Clear any existing interval
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
    }

    // Set up interval to refresh token proactively
    refreshIntervalId = setInterval(async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        get().stopTokenRefresh();
        return;
      }

      try {
        // Call the refresh endpoint to get a new token
        const response = await authApi.refreshToken();
        if (response.accessToken) {
          localStorage.setItem('accessToken', response.accessToken);
          console.log('[Auth] Token refreshed proactively');
        }
      } catch (error) {
        console.error('[Auth] Proactive token refresh failed:', error);
        // Don't logout on refresh failure - let the 401 interceptor handle it
      }
    }, TOKEN_REFRESH_INTERVAL);

    console.log('[Auth] Token refresh interval started');
  },

  stopTokenRefresh: () => {
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
      refreshIntervalId = null;
      console.log('[Auth] Token refresh interval stopped');
    }
  }
}));
