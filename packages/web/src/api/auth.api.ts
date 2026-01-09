import apiClient from './client';
import { LoginRequest, LoginResponse, UserWithBusinesses } from '@business-app/shared';

export interface RegisterFarmerRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone: string;
  disclaimerAccepted: boolean;
}

export interface RegisterResponse extends LoginResponse {
  refreshToken: string;
}

export const authApi = {
  registerFarmer: async (data: RegisterFarmerRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/auth/register', data);
    return response.data;
  },

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
