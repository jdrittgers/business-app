import apiClient from './client';
import {
  CropInsurancePolicy,
  UpsertInsurancePolicyRequest,
  ProfitMatrixResponse
} from '@business-app/shared';

export const insuranceApi = {
  getPolicy: async (businessId: string, farmId: string): Promise<CropInsurancePolicy | null> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/farms/${farmId}/insurance`);
    return response.data;
  },

  getAllPolicies: async (businessId: string, year?: number): Promise<(CropInsurancePolicy & { farm: { id: string; name: string; commodityType: string; acres: number; aph: number; year: number } })[]> => {
    const params = year ? { year } : {};
    const response = await apiClient.get(`/api/businesses/${businessId}/insurance`, { params });
    return response.data;
  },

  upsertPolicy: async (businessId: string, farmId: string, data: UpsertInsurancePolicyRequest): Promise<CropInsurancePolicy> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/farms/${farmId}/insurance`, data);
    return response.data;
  },

  deletePolicy: async (businessId: string, farmId: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/farms/${farmId}/insurance`);
  },

  getProfitMatrix: async (businessId: string, farmId: string, params?: { yieldSteps?: number; priceSteps?: number; expectedCountyYield?: number; simulatedCountyYield?: number; basis?: number; yieldMin?: number; yieldMax?: number; priceMin?: number; priceMax?: number }): Promise<ProfitMatrixResponse> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/farms/${farmId}/profit-matrix`, { params });
    return response.data;
  }
};
