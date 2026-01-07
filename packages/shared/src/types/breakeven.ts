import { CommodityType, GrainEntity } from './grain';

// Enums
export enum CostType {
  LAND_RENT = 'LAND_RENT',
  INSURANCE = 'INSURANCE',
  CUSTOM_WORK = 'CUSTOM_WORK',
  FUEL = 'FUEL',
  LABOR = 'LABOR',
  OTHER = 'OTHER'
}

export enum UnitType {
  LB = 'LB',
  GAL = 'GAL',
  BAG = 'BAG'
}

// ===== Product Catalog Types =====

export interface Fertilizer {
  id: string;
  businessId: string;
  name: string;
  pricePerUnit: number;
  unit: UnitType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFertilizerRequest {
  name: string;
  pricePerUnit: number;
  unit: UnitType;
}

export interface UpdateFertilizerRequest {
  name?: string;
  pricePerUnit?: number;
  unit?: UnitType;
  isActive?: boolean;
}

export interface Chemical {
  id: string;
  businessId: string;
  name: string;
  pricePerUnit: number;
  unit: UnitType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChemicalRequest {
  name: string;
  pricePerUnit: number;
  unit: UnitType;
}

export interface UpdateChemicalRequest {
  name?: string;
  pricePerUnit?: number;
  unit?: UnitType;
  isActive?: boolean;
}

export interface SeedHybrid {
  id: string;
  businessId: string;
  name: string;
  commodityType: CommodityType;
  pricePerBag: number;
  seedsPerBag: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSeedHybridRequest {
  name: string;
  commodityType: CommodityType;
  pricePerBag: number;
  seedsPerBag: number;
}

export interface UpdateSeedHybridRequest {
  name?: string;
  pricePerBag?: number;
  seedsPerBag?: number;
  isActive?: boolean;
}

// ===== Farm Types =====

export interface Farm {
  id: string;
  grainEntityId: string;
  name: string;
  acres: number;
  commodityType: CommodityType;
  year: number;
  projectedYield: number;
  aph: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  grainEntity?: GrainEntity;
  fertilizerUsage?: FarmFertilizerUsage[];
  chemicalUsage?: FarmChemicalUsage[];
  seedUsage?: FarmSeedUsage[];
  otherCosts?: FarmOtherCost[];
}

export interface CreateFarmRequest {
  grainEntityId: string;
  name: string;
  acres: number;
  commodityType: CommodityType;
  year: number;
  projectedYield: number;
  aph: number;
  notes?: string;
}

export interface UpdateFarmRequest {
  name?: string;
  acres?: number;
  commodityType?: CommodityType;
  projectedYield?: number;
  aph?: number;
  notes?: string;
}

export interface GetFarmsQuery {
  grainEntityId?: string;
  year?: number;
  commodityType?: CommodityType;
}

// ===== Usage Types =====

export interface FarmFertilizerUsage {
  id: string;
  farmId: string;
  fertilizerId: string;
  amountUsed: number;
  createdAt: Date;
  updatedAt: Date;
  fertilizer?: Fertilizer;
}

export interface CreateFarmFertilizerUsageRequest {
  farmId: string;
  fertilizerId: string;
  amountUsed: number;
}

export interface UpdateFarmFertilizerUsageRequest {
  amountUsed?: number;
}

export interface FarmChemicalUsage {
  id: string;
  farmId: string;
  chemicalId: string;
  amountUsed: number;
  createdAt: Date;
  updatedAt: Date;
  chemical?: Chemical;
}

export interface CreateFarmChemicalUsageRequest {
  farmId: string;
  chemicalId: string;
  amountUsed: number;
}

export interface UpdateFarmChemicalUsageRequest {
  amountUsed?: number;
}

export interface FarmSeedUsage {
  id: string;
  farmId: string;
  seedHybridId: string;
  bagsUsed: number;
  createdAt: Date;
  updatedAt: Date;
  seedHybrid?: SeedHybrid;
}

export interface CreateFarmSeedUsageRequest {
  farmId: string;
  seedHybridId: string;
  bagsUsed: number;
}

export interface UpdateFarmSeedUsageRequest {
  bagsUsed?: number;
}

export interface FarmOtherCost {
  id: string;
  farmId: string;
  costType: CostType;
  amount: number;
  isPerAcre: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFarmOtherCostRequest {
  farmId: string;
  costType: CostType;
  amount: number;
  isPerAcre: boolean;
  description?: string;
}

export interface UpdateFarmOtherCostRequest {
  amount?: number;
  isPerAcre?: boolean;
  description?: string;
}

// ===== Break-Even Analysis Types =====

export interface FarmBreakEven {
  farmId: string;
  farmName: string;
  grainEntityId: string;
  acres: number;
  commodityType: CommodityType;
  year: number;

  // Cost breakdown
  fertilizerCost: number;
  chemicalCost: number;
  seedCost: number;
  landRent: number;
  insurance: number;
  otherCosts: number;

  // Totals
  totalCost: number;
  costPerAcre: number;

  // Break-even calculations
  expectedYield: number; // bu/acre (from CropYearProduction)
  expectedBushels: number; // acres * expectedYield
  breakEvenPrice: number; // totalCost / expectedBushels

  // Usage details (for drill-down)
  fertilizerUsage: Array<{
    name: string;
    amountUsed: number;
    unit: string;
    pricePerUnit: number;
    totalCost: number;
  }>;
  chemicalUsage: Array<{
    name: string;
    amountUsed: number;
    unit: string;
    pricePerUnit: number;
    totalCost: number;
  }>;
  seedUsage?: {
    hybridName: string;
    population: number;
    pricePerBag: number;
    seedsPerBag: number;
    bagsPerAcre: number;
    totalCost: number;
  };
}

export interface EntityBreakEven {
  grainEntityId: string;
  grainEntityName: string;
  year: number;
  commodityType: CommodityType;

  totalAcres: number;
  totalCost: number;
  costPerAcre: number;

  expectedYield: number;
  expectedBushels: number;
  breakEvenPrice: number;

  farms: FarmBreakEven[];
}

export interface OperationBreakEven {
  businessId: string;
  year: number;

  totalAcres: number;
  totalCost: number;

  // By commodity
  byCommodity: Array<{
    commodityType: CommodityType;
    acres: number;
    totalCost: number;
    costPerAcre: number;
    expectedYield: number;
    expectedBushels: number;
    breakEvenPrice: number;
  }>;

  // By entity
  byEntity: EntityBreakEven[];
}

export interface GetBreakEvenQuery {
  year?: number;
  grainEntityId?: string;
  commodityType?: CommodityType;
}
