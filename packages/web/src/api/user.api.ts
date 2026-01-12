import apiClient from './client';
import { Business } from '@business-app/shared';

export const userApi = {
  /**
   * Update business location
   */
  updateBusinessLocation: async (businessId: string, zipCode: string): Promise<Business> => {
    const response = await apiClient.put(`/api/user/businesses/${businessId}/location`, { zipCode });
    return response.data;
  },

  /**
   * Delete user account
   */
  deleteAccount: async (): Promise<void> => {
    await apiClient.delete('/api/user/account');
  }
};
