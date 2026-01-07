import apiClient from './client';
import {
  CreateRetailerRequest,
  RetailerLoginRequest,
  RetailerLoginResponse,
  Retailer
} from '@business-app/shared';

export const retailerAuthApi = {
  register: async (data: CreateRetailerRequest): Promise<RetailerLoginResponse> => {
    const response = await apiClient.post('/api/retailer/register', data);
    return response.data;
  },

  login: async (credentials: RetailerLoginRequest): Promise<RetailerLoginResponse> => {
    const response = await apiClient.post('/api/retailer/login', credentials);
    return response.data;
  },

  getMe: async (): Promise<{ user: any; retailer: Retailer }> => {
    const response = await apiClient.get('/api/retailer/me');
    return response.data;
  }
};
