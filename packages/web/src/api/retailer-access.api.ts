import apiClient from './client';
import {
  RetailerAccessRequest,
  RespondToAccessRequestData,
  AccessSummary
} from '@business-app/shared';

export const retailerAccessApi = {
  // ===== Farmer Endpoints =====

  /**
   * Get all access requests for a business (farmer view)
   */
  getAccessRequests: async (businessId: string): Promise<RetailerAccessRequest[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/retailer-access`);
    return response.data;
  },

  /**
   * Get pending access requests for a business
   */
  getPendingRequests: async (businessId: string): Promise<RetailerAccessRequest[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/retailer-access/pending`);
    return response.data;
  },

  /**
   * Get access summary counts for a business
   */
  getAccessSummary: async (businessId: string): Promise<AccessSummary> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/retailer-access/summary`);
    return response.data;
  },

  /**
   * Respond to an access request (approve/deny)
   */
  respondToRequest: async (
    businessId: string,
    requestId: string,
    data: RespondToAccessRequestData
  ): Promise<RetailerAccessRequest> => {
    const response = await apiClient.put(
      `/api/businesses/${businessId}/retailer-access/${requestId}`,
      data
    );
    return response.data;
  },

  // ===== Retailer Endpoints =====

  /**
   * Get all access requests for the current retailer
   */
  getMyAccessRequests: async (): Promise<RetailerAccessRequest[]> => {
    const response = await apiClient.get('/api/retailer/access-requests');
    return response.data;
  },

  /**
   * Get access summary for the current retailer
   */
  getMyAccessSummary: async (): Promise<AccessSummary> => {
    const response = await apiClient.get('/api/retailer/access-summary');
    return response.data;
  }
};
