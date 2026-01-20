import apiClient from './client';
import type { OldCropInventory, UpdateOldCropInventoryRequest, CommodityType } from '@business-app/shared';

export const oldCropInventoryApi = {
  /**
   * Get all old crop inventory for a business
   */
  getInventory: async (businessId: string): Promise<OldCropInventory[]> => {
    const response = await apiClient.get(`/businesses/${businessId}/old-crop-inventory`);
    return response.data;
  },

  /**
   * Get specific inventory entry
   */
  getInventoryByCommodity: async (
    businessId: string,
    commodityType: CommodityType,
    cropYear: number
  ): Promise<OldCropInventory> => {
    const response = await apiClient.get(
      `/businesses/${businessId}/old-crop-inventory/${commodityType}/${cropYear}`
    );
    return response.data;
  },

  /**
   * Update or create old crop inventory entry
   */
  updateInventory: async (
    businessId: string,
    data: UpdateOldCropInventoryRequest
  ): Promise<OldCropInventory> => {
    const response = await apiClient.put(
      `/businesses/${businessId}/old-crop-inventory`,
      data
    );
    return response.data;
  },

  /**
   * Delete old crop inventory entry
   */
  deleteInventory: async (
    businessId: string,
    commodityType: CommodityType,
    cropYear: number
  ): Promise<void> => {
    await apiClient.delete(
      `/businesses/${businessId}/old-crop-inventory/${commodityType}/${cropYear}`
    );
  }
};
