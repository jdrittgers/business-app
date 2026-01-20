import apiClient from './client';
import type { LocalBasis, UpdateLocalBasisRequest, CommodityType } from '@business-app/shared';

export const localBasisApi = {
  /**
   * Get all local basis values for a business
   */
  getBasis: async (businessId: string): Promise<LocalBasis[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/local-basis`);
    return response.data;
  },

  /**
   * Get basis for a specific commodity
   */
  getBasisByCommodity: async (
    businessId: string,
    commodityType: CommodityType
  ): Promise<LocalBasis> => {
    const response = await apiClient.get(
      `/api/businesses/${businessId}/local-basis/${commodityType}`
    );
    return response.data;
  },

  /**
   * Update or create local basis entry
   */
  updateBasis: async (
    businessId: string,
    data: UpdateLocalBasisRequest
  ): Promise<LocalBasis> => {
    const response = await apiClient.put(
      `/api/businesses/${businessId}/local-basis`,
      data
    );
    return response.data;
  },

  /**
   * Delete local basis entry
   */
  deleteBasis: async (
    businessId: string,
    commodityType: CommodityType
  ): Promise<void> => {
    await apiClient.delete(
      `/api/businesses/${businessId}/local-basis/${commodityType}`
    );
  }
};
