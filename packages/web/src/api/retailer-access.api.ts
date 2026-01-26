import apiClient from './client';
import {
  RetailerAccessRequest,
  RespondToAccessRequestData,
  AccessSummary,
  PartnerPermissions,
  PartnerModule
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
  },

  // ===== Granular Permissions Endpoints =====

  /**
   * Update granular permissions for a retailer (farmer action)
   */
  updatePermissions: async (
    businessId: string,
    requestId: string,
    permissions: Partial<PartnerPermissions>
  ): Promise<RetailerAccessRequest> => {
    const response = await apiClient.put(
      `/api/businesses/${businessId}/retailer-access/${requestId}/permissions`,
      { permissions }
    );
    return response.data;
  },

  /**
   * Get granular permissions for a specific access request
   */
  getPermissions: async (
    businessId: string,
    requestId: string
  ): Promise<PartnerPermissions> => {
    const response = await apiClient.get(
      `/api/businesses/${businessId}/retailer-access/${requestId}/permissions`
    );
    return response.data;
  },

  /**
   * Get all partners that have any level of access to the business
   */
  getPartnersWithAccess: async (businessId: string) => {
    const response = await apiClient.get(`/api/businesses/${businessId}/partners-with-access`);
    return response.data;
  },

  /**
   * (Retailer) Get permissions for a specific business
   */
  getMyPermissionsForBusiness: async (businessId: string): Promise<PartnerPermissions> => {
    const response = await apiClient.get(`/api/retailer/permissions/${businessId}`);
    return response.data;
  },

  /**
   * (Retailer) Get detailed access summary for a specific business
   */
  getMyAccessSummaryForBusiness: async (businessId: string) => {
    const response = await apiClient.get(`/api/retailer/access-summary/${businessId}`);
    return response.data;
  },

  /**
   * (Retailer) Get all businesses accessible for a specific module
   */
  getAccessibleBusinesses: async (module: PartnerModule, minLevel?: string) => {
    const params = minLevel ? `?minLevel=${minLevel}` : '';
    const response = await apiClient.get(`/api/retailer/accessible-businesses/${module}${params}`);
    return response.data;
  }
};
