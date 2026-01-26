import apiClient from './client';
import {
  FarmContractAllocation,
  ContractWithAllocations,
  FarmAllocationSummary,
  SetContractAllocationsRequest,
  AutoAllocateRequest,
  AllocationResult,
  CommodityType
} from '@business-app/shared';

export const farmAllocationApi = {
  // ===== Contract Allocations =====

  // Get allocations for a contract
  getContractAllocations: async (businessId: string, contractId: string): Promise<FarmContractAllocation[]> => {
    const response = await apiClient.get(
      `/api/businesses/${businessId}/grain-contracts/${contractId}/allocations`
    );
    return response.data;
  },

  // Get contract with allocations summary
  getContractWithAllocations: async (businessId: string, contractId: string): Promise<ContractWithAllocations> => {
    const response = await apiClient.get(
      `/api/businesses/${businessId}/grain-contracts/${contractId}/allocations/summary`
    );
    return response.data;
  },

  // Calculate proportional allocations (preview without saving)
  calculateAllocations: async (
    businessId: string,
    contractId: string
  ): Promise<{ farmId: string; farmName: string; expectedBushels: number; share: number; allocatedBushels: number }[]> => {
    const response = await apiClient.get(
      `/api/businesses/${businessId}/grain-contracts/${contractId}/allocations/calculate`
    );
    return response.data;
  },

  // Auto-allocate contract proportionally
  autoAllocateContract: async (
    businessId: string,
    contractId: string,
    request?: AutoAllocateRequest
  ): Promise<AllocationResult> => {
    const response = await apiClient.post(
      `/api/businesses/${businessId}/grain-contracts/${contractId}/allocations/auto`,
      request || {}
    );
    return response.data;
  },

  // Set manual allocations
  setContractAllocations: async (
    businessId: string,
    contractId: string,
    request: SetContractAllocationsRequest
  ): Promise<AllocationResult> => {
    const response = await apiClient.post(
      `/api/businesses/${businessId}/grain-contracts/${contractId}/allocations`,
      request
    );
    return response.data;
  },

  // Reset to proportional allocations
  resetToProportional: async (businessId: string, contractId: string): Promise<AllocationResult> => {
    const response = await apiClient.post(
      `/api/businesses/${businessId}/grain-contracts/${contractId}/allocations/reset`
    );
    return response.data;
  },

  // Delete a specific allocation
  deleteAllocation: async (businessId: string, contractId: string, farmId: string): Promise<void> => {
    await apiClient.delete(
      `/api/businesses/${businessId}/grain-contracts/${contractId}/allocations/${farmId}`
    );
  },

  // ===== Farm Allocations =====

  // Get allocations for a specific farm
  getFarmAllocations: async (
    businessId: string,
    farmId: string,
    year?: number
  ): Promise<FarmAllocationSummary> => {
    const response = await apiClient.get(
      `/api/businesses/${businessId}/farms/${farmId}/contract-allocations`,
      { params: { year } }
    );
    return response.data;
  },

  // Get allocations for all farms in an entity
  getEntityFarmAllocations: async (
    businessId: string,
    entityId: string,
    year: number,
    commodityType?: CommodityType
  ): Promise<FarmAllocationSummary[]> => {
    const response = await apiClient.get(
      `/api/businesses/${businessId}/grain-entities/${entityId}/farm-allocations`,
      { params: { year, commodityType } }
    );
    return response.data;
  }
};
