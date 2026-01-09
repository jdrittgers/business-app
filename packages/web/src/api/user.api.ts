import apiClient from './client';

export const userApi = {
  /**
   * Delete user account
   */
  deleteAccount: async (): Promise<void> => {
    await apiClient.delete('/api/user/account');
  }
};
