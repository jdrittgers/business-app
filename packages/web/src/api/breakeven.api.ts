import apiClient from './client';
import {
  Fertilizer,
  CreateFertilizerRequest,
  UpdateFertilizerRequest,
  Chemical,
  CreateChemicalRequest,
  UpdateChemicalRequest,
  ChemicalCategory,
  SeedHybrid,
  CreateSeedHybridRequest,
  UpdateSeedHybridRequest,
  Farm,
  CreateFarmRequest,
  UpdateFarmRequest,
  CreateFarmFertilizerUsageRequest,
  CreateFarmChemicalUsageRequest,
  CreateFarmSeedUsageRequest,
  CreateFarmOtherCostRequest,
  UpdateFarmOtherCostRequest,
  OperationBreakEven,
  GetBreakEvenQuery,
  GetFarmsQuery,
  FarmTrial,
  FarmTrialPhoto,
  CreateFarmTrialRequest,
  UpdateFarmTrialRequest,
  FarmPlanView
} from '@business-app/shared';

export const breakevenApi = {
  // Fertilizers
  getFertilizers: async (businessId: string): Promise<Fertilizer[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/fertilizers`);
    return response.data;
  },

  createFertilizer: async (businessId: string, data: CreateFertilizerRequest): Promise<Fertilizer> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/fertilizers`, data);
    return response.data;
  },

  updateFertilizer: async (businessId: string, id: string, data: UpdateFertilizerRequest): Promise<Fertilizer> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/fertilizers/${id}`, data);
    return response.data;
  },

  deleteFertilizer: async (businessId: string, id: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/fertilizers/${id}`);
  },

  // Chemicals
  getChemicals: async (businessId: string, category?: ChemicalCategory): Promise<Chemical[]> => {
    const params = category ? { category } : {};
    const response = await apiClient.get(`/api/businesses/${businessId}/chemicals`, { params });
    return response.data;
  },

  createChemical: async (businessId: string, data: CreateChemicalRequest): Promise<Chemical> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/chemicals`, data);
    return response.data;
  },

  updateChemical: async (businessId: string, id: string, data: UpdateChemicalRequest): Promise<Chemical> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/chemicals/${id}`, data);
    return response.data;
  },

  deleteChemical: async (businessId: string, id: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/chemicals/${id}`);
  },

  // Seed Hybrids
  getSeedHybrids: async (businessId: string, commodityType?: string): Promise<SeedHybrid[]> => {
    const params = commodityType ? { commodityType } : {};
    const response = await apiClient.get(`/api/businesses/${businessId}/seed-hybrids`, { params });
    return response.data;
  },

  createSeedHybrid: async (businessId: string, data: CreateSeedHybridRequest): Promise<SeedHybrid> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/seed-hybrids`, data);
    return response.data;
  },

  updateSeedHybrid: async (businessId: string, id: string, data: UpdateSeedHybridRequest): Promise<SeedHybrid> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/seed-hybrids/${id}`, data);
    return response.data;
  },

  deleteSeedHybrid: async (businessId: string, id: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/seed-hybrids/${id}`);
  },

  // Farms
  getFarms: async (businessId: string, query?: GetFarmsQuery): Promise<Farm[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/farms`, { params: query });
    return response.data;
  },

  getFarm: async (businessId: string, id: string): Promise<Farm> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/farms/${id}`);
    return response.data;
  },

  createFarm: async (businessId: string, data: CreateFarmRequest): Promise<Farm> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/farms`, data);
    return response.data;
  },

  updateFarm: async (businessId: string, id: string, data: UpdateFarmRequest): Promise<Farm> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/farms/${id}`, data);
    return response.data;
  },

  deleteFarm: async (businessId: string, id: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/farms/${id}`);
  },

  // Fertilizer Usage
  addFertilizerUsage: async (businessId: string, data: CreateFarmFertilizerUsageRequest) => {
    const response = await apiClient.post(`/api/businesses/${businessId}/farms/fertilizer-usage`, data);
    return response.data;
  },

  updateFertilizerUsage: async (businessId: string, id: string, amountUsed: number) => {
    const response = await apiClient.put(`/api/businesses/${businessId}/farms/fertilizer-usage/${id}`, { amountUsed });
    return response.data;
  },

  deleteFertilizerUsage: async (businessId: string, id: string) => {
    await apiClient.delete(`/api/businesses/${businessId}/farms/fertilizer-usage/${id}`);
  },

  // Chemical Usage
  addChemicalUsage: async (businessId: string, data: CreateFarmChemicalUsageRequest) => {
    const response = await apiClient.post(`/api/businesses/${businessId}/farms/chemical-usage`, data);
    return response.data;
  },

  updateChemicalUsage: async (businessId: string, id: string, amountUsed: number) => {
    const response = await apiClient.put(`/api/businesses/${businessId}/farms/chemical-usage/${id}`, { amountUsed });
    return response.data;
  },

  deleteChemicalUsage: async (businessId: string, id: string) => {
    await apiClient.delete(`/api/businesses/${businessId}/farms/chemical-usage/${id}`);
  },

  // Seed Usage
  addSeedUsage: async (businessId: string, data: CreateFarmSeedUsageRequest) => {
    const response = await apiClient.post(`/api/businesses/${businessId}/farms/seed-usage`, data);
    return response.data;
  },

  updateSeedUsage: async (businessId: string, id: string, bagsUsed: number) => {
    const response = await apiClient.put(`/api/businesses/${businessId}/farms/seed-usage/${id}`, { bagsUsed });
    return response.data;
  },

  deleteSeedUsage: async (businessId: string, id: string) => {
    await apiClient.delete(`/api/businesses/${businessId}/farms/seed-usage/${id}`);
  },

  // Other Costs
  addOtherCost: async (businessId: string, data: CreateFarmOtherCostRequest) => {
    const response = await apiClient.post(`/api/businesses/${businessId}/farms/other-costs`, data);
    return response.data;
  },

  updateOtherCost: async (businessId: string, id: string, data: UpdateFarmOtherCostRequest) => {
    const response = await apiClient.put(`/api/businesses/${businessId}/farms/other-costs/${id}`, data);
    return response.data;
  },

  deleteOtherCost: async (businessId: string, id: string) => {
    await apiClient.delete(`/api/businesses/${businessId}/farms/other-costs/${id}`);
  },

  // Analytics
  getBreakEvenSummary: async (businessId: string, query?: GetBreakEvenQuery): Promise<OperationBreakEven> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/breakeven/summary`, { params: query });
    return response.data;
  },

  // Farm Break-Even
  getFarmBreakEven: async (businessId: string, farmId: string) => {
    const response = await apiClient.get(`/api/businesses/${businessId}/farms/${farmId}/breakeven`);
    return response.data;
  },

  // Area Price Averages - aggregated across all farmers
  getAreaAverages: async (businessId: string): Promise<{
    fertilizers: Array<{ name: string; unit: string; avgPrice: number; minPrice: number; maxPrice: number; farmerCount: number }>;
    chemicals: Array<{ name: string; unit: string; avgPrice: number; minPrice: number; maxPrice: number; farmerCount: number }>;
    seedHybrids: Array<{ name: string; commodityType: string; avgPrice: number; minPrice: number; maxPrice: number; farmerCount: number }>;
  }> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/products/area-averages`);
    return response.data;
  },

  // Trials
  getTrials: async (businessId: string, farmId: string): Promise<FarmTrial[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/farms/${farmId}/trials`);
    return response.data;
  },

  getTrial: async (businessId: string, trialId: string): Promise<FarmTrial> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/farms/trials/${trialId}`);
    return response.data;
  },

  createTrial: async (businessId: string, farmId: string, data: CreateFarmTrialRequest): Promise<FarmTrial> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/farms/${farmId}/trials`, data);
    return response.data;
  },

  updateTrial: async (businessId: string, trialId: string, data: UpdateFarmTrialRequest): Promise<FarmTrial> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/farms/trials/${trialId}`, data);
    return response.data;
  },

  deleteTrial: async (businessId: string, trialId: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/farms/trials/${trialId}`);
  },

  addTrialPhoto: async (businessId: string, trialId: string, url: string, caption?: string): Promise<FarmTrialPhoto> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/farms/trials/${trialId}/photos`, { url, caption });
    return response.data;
  },

  deleteTrialPhoto: async (businessId: string, photoId: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/farms/trials/photos/${photoId}`);
  },

  // Farm Plan View (Worker-friendly, no costs)
  getFarmPlan: async (businessId: string, farmId: string): Promise<FarmPlanView> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/farms/${farmId}/plan`);
    return response.data;
  },

  getAllFarmPlans: async (businessId: string, year?: number): Promise<FarmPlanView[]> => {
    const params = year ? { year } : {};
    const response = await apiClient.get(`/api/businesses/${businessId}/farm-plans`, { params });
    return response.data;
  }
};
