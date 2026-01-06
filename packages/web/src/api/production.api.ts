import apiClient from './client';
import {
  CropYearProduction,
  CreateProductionRequest,
  UpdateProductionRequest,
  GetProductionsQuery
} from '@business-app/shared';

export const productionApi = {
  // Get productions
  getProductions: async (businessId: string, query?: GetProductionsQuery): Promise<CropYearProduction[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/grain-productions`, {
      params: query
    });
    return response.data;
  },

  // Get single production
  getProduction: async (productionId: string): Promise<CropYearProduction> => {
    const response = await apiClient.get(`/api/grain-productions/${productionId}`);
    return response.data;
  },

  // Create production
  createProduction: async (data: CreateProductionRequest): Promise<CropYearProduction> => {
    const response = await apiClient.post(`/api/grain-productions`, data);
    return response.data;
  },

  // Update production
  updateProduction: async (productionId: string, data: UpdateProductionRequest): Promise<CropYearProduction> => {
    const response = await apiClient.patch(`/api/grain-productions/${productionId}`, data);
    return response.data;
  },

  // Delete production
  deleteProduction: async (productionId: string): Promise<void> => {
    await apiClient.delete(`/api/grain-productions/${productionId}`);
  },

  // Get production summary
  getProductionSummary: async (businessId: string, grainEntityId?: string, year?: number): Promise<any[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/grain-productions/summary`, {
      params: { grainEntityId, year }
    });
    return response.data;
  }
};
