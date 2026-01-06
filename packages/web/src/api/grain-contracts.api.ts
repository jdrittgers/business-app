import apiClient from './client';
import {
  GrainEntity,
  GrainContract,
  CreateGrainContractRequest,
  UpdateGrainContractRequest,
  CreateAccumulatorEntryRequest,
  AccumulatorDailyEntry,
  GetGrainContractsQuery
} from '@business-app/shared';

export const grainContractsApi = {
  // Get grain entities
  getGrainEntities: async (businessId: string): Promise<GrainEntity[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/grain-entities`);
    return response.data;
  },

  // Get contracts
  getContracts: async (businessId: string, query?: GetGrainContractsQuery): Promise<GrainContract[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/grain-contracts`, {
      params: query
    });
    return response.data;
  },

  // Get single contract
  getContract: async (contractId: string): Promise<GrainContract> => {
    const response = await apiClient.get(`/api/grain-contracts/${contractId}`);
    return response.data;
  },

  // Create contract
  createContract: async (data: CreateGrainContractRequest): Promise<GrainContract> => {
    const response = await apiClient.post(`/api/grain-contracts`, data);
    return response.data;
  },

  // Update contract
  updateContract: async (contractId: string, data: UpdateGrainContractRequest): Promise<GrainContract> => {
    const response = await apiClient.patch(`/api/grain-contracts/${contractId}`, data);
    return response.data;
  },

  // Delete contract
  deleteContract: async (contractId: string): Promise<void> => {
    await apiClient.delete(`/api/grain-contracts/${contractId}`);
  },

  // Add accumulator entry
  addAccumulatorEntry: async (contractId: string, data: CreateAccumulatorEntryRequest): Promise<AccumulatorDailyEntry> => {
    const response = await apiClient.post(`/api/grain-contracts/${contractId}/accumulator-entries`, data);
    return response.data;
  }
};
