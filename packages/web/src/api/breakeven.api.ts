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
  CommodityType,
  UnitType,
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

export interface ProductsNeedsPricing {
  fertilizers: Fertilizer[];
  chemicals: Chemical[];
  seedHybrids: SeedHybrid[];
  totalCount: number;
}

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

  // Activity Completion
  markSeedUsageComplete: async (businessId: string, id: string, completedAt?: Date) => {
    const response = await apiClient.post(`/api/businesses/${businessId}/farms/seed-usage/${id}/complete`, {
      completedAt: completedAt?.toISOString()
    });
    return response.data;
  },

  undoSeedUsageComplete: async (businessId: string, id: string) => {
    const response = await apiClient.delete(`/api/businesses/${businessId}/farms/seed-usage/${id}/complete`);
    return response.data;
  },

  markFertilizerUsageComplete: async (businessId: string, id: string, completedAt?: Date) => {
    const response = await apiClient.post(`/api/businesses/${businessId}/farms/fertilizer-usage/${id}/complete`, {
      completedAt: completedAt?.toISOString()
    });
    return response.data;
  },

  undoFertilizerUsageComplete: async (businessId: string, id: string) => {
    const response = await apiClient.delete(`/api/businesses/${businessId}/farms/fertilizer-usage/${id}/complete`);
    return response.data;
  },

  markChemicalUsageComplete: async (businessId: string, id: string, completedAt?: Date) => {
    const response = await apiClient.post(`/api/businesses/${businessId}/farms/chemical-usage/${id}/complete`, {
      completedAt: completedAt?.toISOString()
    });
    return response.data;
  },

  undoChemicalUsageComplete: async (businessId: string, id: string) => {
    const response = await apiClient.delete(`/api/businesses/${businessId}/farms/chemical-usage/${id}/complete`);
    return response.data;
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
  },

  // Plan Approval
  approveFarmPlan: async (businessId: string, farmId: string): Promise<{ success: boolean; planApproved: boolean; planApprovedAt: string }> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/farms/${farmId}/approve-plan`);
    return response.data;
  },

  unapproveFarmPlan: async (businessId: string, farmId: string): Promise<{ success: boolean; planApproved: boolean }> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/farms/${farmId}/unapprove-plan`);
    return response.data;
  },

  // Products Needing Pricing
  getProductsNeedingPricing: async (businessId: string): Promise<ProductsNeedsPricing> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/products/needs-pricing`);
    return response.data;
  },

  // Set prices (clears needsPricing)
  setFertilizerPrice: async (businessId: string, id: string, pricePerUnit: number): Promise<Fertilizer> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/fertilizers/${id}/set-price`, { pricePerUnit });
    return response.data;
  },

  setChemicalPrice: async (businessId: string, id: string, pricePerUnit: number): Promise<Chemical> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/chemicals/${id}/set-price`, { pricePerUnit });
    return response.data;
  },

  setSeedHybridPrice: async (businessId: string, id: string, pricePerBag: number): Promise<SeedHybrid> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/seed-hybrids/${id}/set-price`, { pricePerBag });
    return response.data;
  },

  // Worker product creation (creates with needsPricing=true)
  createFertilizerAsWorker: async (businessId: string, name: string, unit: UnitType): Promise<Fertilizer> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/fertilizers/worker`, { name, unit });
    return response.data;
  },

  createChemicalAsWorker: async (businessId: string, name: string, unit: UnitType, category?: ChemicalCategory): Promise<Chemical> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/chemicals/worker`, { name, unit, category });
    return response.data;
  },

  createSeedHybridAsWorker: async (businessId: string, name: string, commodityType: CommodityType, seedsPerBag?: number): Promise<SeedHybrid> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/seed-hybrids/worker`, { name, commodityType, seedsPerBag });
    return response.data;
  },

  // Scan fertilizer bill for a specific farm
  scanFertilizerBill: async (businessId: string, farmId: string, file: File): Promise<{
    invoice: any;
    appliedItems: Array<{
      id: string;
      productName: string;
      quantity: number;
      unit: string;
      pricePerUnit: number;
      ratePerAcre: number | null;
      amountUsed: number;
      totalCost: number;
      isNew: boolean;
    }>;
    newProducts: Array<{
      id: string;
      name: string;
      pricePerUnit: number;
      unit: string;
    }>;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(
      `/api/businesses/${businessId}/farms/${farmId}/scan-fertilizer-bill`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  // Scan seed bill and add to catalog
  scanSeedBillToCatalog: async (businessId: string, file: File): Promise<{
    invoice: any;
    addedProducts: Array<{
      id: string;
      name: string;
      pricePerBag: number;
      commodityType: string;
      isNew: boolean;
    }>;
    updatedProducts: Array<{
      id: string;
      name: string;
      pricePerBag: number;
      commodityType: string;
      isNew: boolean;
    }>;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(
      `/api/businesses/${businessId}/catalog/scan-seed-bill`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  // Scan fertilizer bill and add to catalog
  scanFertilizerBillToCatalog: async (businessId: string, file: File): Promise<{
    invoice: any;
    addedProducts: Array<{
      id: string;
      name: string;
      pricePerUnit: number;
      unit: string;
      isNew: boolean;
    }>;
    updatedProducts: Array<{
      id: string;
      name: string;
      pricePerUnit: number;
      unit: string;
      isNew: boolean;
    }>;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(
      `/api/businesses/${businessId}/catalog/scan-fertilizer-bill`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  // Scan chemical bill and add to catalog
  scanChemicalBillToCatalog: async (businessId: string, file: File): Promise<{
    invoice: any;
    addedProducts: Array<{
      id: string;
      name: string;
      pricePerUnit: number;
      unit: string;
      category: string;
      isNew: boolean;
    }>;
    updatedProducts: Array<{
      id: string;
      name: string;
      pricePerUnit: number;
      unit: string;
      category: string;
      isNew: boolean;
    }>;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(
      `/api/businesses/${businessId}/catalog/scan-chemical-bill`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  }
};
