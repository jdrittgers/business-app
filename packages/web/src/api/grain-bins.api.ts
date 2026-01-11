import apiClient from './client';
import {
  GrainBin,
  CreateGrainBinRequest,
  UpdateGrainBinRequest,
  AddGrainRequest,
  BinTransaction,
  BinSummary
} from '@business-app/shared';

export const grainBinsApi = {
  // Get all bins for a business
  getBinsByBusiness: async (businessId: string): Promise<GrainBin[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/grain-bins`);
    return response.data;
  },

  // Get bins by grain entity
  getBinsByGrainEntity: async (grainEntityId: string): Promise<GrainBin[]> => {
    const response = await apiClient.get(`/api/grain-entities/${grainEntityId}/grain-bins`);
    return response.data;
  },

  // Get a single bin
  getBin: async (binId: string): Promise<GrainBin> => {
    const response = await apiClient.get(`/api/grain-bins/${binId}`);
    return response.data;
  },

  // Create a new bin
  createBin: async (businessId: string, data: CreateGrainBinRequest): Promise<GrainBin> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/grain-bins`, data);
    return response.data;
  },

  // Update a bin
  updateBin: async (binId: string, data: UpdateGrainBinRequest): Promise<GrainBin> => {
    const response = await apiClient.patch(`/api/grain-bins/${binId}`, data);
    return response.data;
  },

  // Add grain to a bin
  addGrain: async (binId: string, data: AddGrainRequest): Promise<GrainBin> => {
    const response = await apiClient.post(`/api/grain-bins/${binId}/add-grain`, data);
    return response.data;
  },

  // Get transaction history
  getTransactions: async (binId: string): Promise<BinTransaction[]> => {
    const response = await apiClient.get(`/api/grain-bins/${binId}/transactions`);
    return response.data;
  },

  // Get summary by year
  getSummary: async (businessId: string, year?: number): Promise<BinSummary[]> => {
    const params = year ? { year } : {};
    const response = await apiClient.get(`/api/businesses/${businessId}/grain-bins/summary`, {
      params
    });
    return response.data;
  }
};
