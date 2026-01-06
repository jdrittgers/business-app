import apiClient from './client';
import { LoginRequest, LoginResponse, UserWithBusinesses } from '@business-app/shared';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/auth/logout');
  },

  getCurrentUser: async (): Promise<UserWithBusinesses> => {
    const response = await apiClient.get<UserWithBusinesses>('/api/auth/me');
    return response.data;
  },

  refreshToken: async (): Promise<{ accessToken: string }> => {
    const response = await apiClient.post<{ accessToken: string }>('/api/auth/refresh');
    return response.data;
  }
};
