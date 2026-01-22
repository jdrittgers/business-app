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

export enum ChemicalCategory {
  HERBICIDE = 'HERBICIDE',
  IN_FURROW = 'IN_FURROW',
  FUNGICIDE = 'FUNGICIDE'
}

export enum TrialType {
  SEED = 'SEED',
  FERTILIZER = 'FERTILIZER',
  CHEMICAL = 'CHEMICAL',
  FUNGICIDE = 'FUNGICIDE'
}

export enum TrialStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum NotificationType {
  FARM_PLAN_CHANGE = 'FARM_PLAN_CHANGE',
  PRODUCT_NEEDS_PRICING = 'PRODUCT_NEEDS_PRICING',
  TRIAL_UPDATE = 'TRIAL_UPDATE',
  GENERAL = 'GENERAL'
}

// ===== Product Catalog Types =====

export interface Fertilizer {
  id: string;
  businessId: string;
  name: string;
  pricePerUnit: number;
  unit: UnitType;
  isActive: boolean;
  needsPricing: boolean;
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
  category: ChemicalCategory;
  isActive: boolean;
  needsPricing: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChemicalRequest {
  name: string;
  pricePerUnit: number;
  unit: UnitType;
  category?: ChemicalCategory;
}

export interface UpdateChemicalRequest {
  name?: string;
  pricePerUnit?: number;
  unit?: UnitType;
  category?: ChemicalCategory;
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
  needsPricing: boolean;
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
  planApproved: boolean;
  planApprovedAt?: Date;
  planApprovedBy?: string;
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
  ratePerAcre?: number;
  acresApplied?: number;
  completedAt?: Date;
  completedById?: string;
  completedByName?: string; // Populated from User relation
  calendarEventId?: string;
  createdAt: Date;
  updatedAt: Date;
  fertilizer?: Fertilizer;
}

export interface CreateFarmFertilizerUsageRequest {
  farmId: string;
  fertilizerId: string;
  amountUsed?: number;
  ratePerAcre?: number;
  acresApplied?: number;
}

export interface UpdateFarmFertilizerUsageRequest {
  amountUsed?: number;
  ratePerAcre?: number;
  acresApplied?: number;
}

export interface FarmChemicalUsage {
  id: string;
  farmId: string;
  chemicalId: string;
  amountUsed: number;
  ratePerAcre?: number;
  acresApplied?: number;
  completedAt?: Date;
  completedById?: string;
  completedByName?: string; // Populated from User relation
  calendarEventId?: string;
  createdAt: Date;
  updatedAt: Date;
  chemical?: Chemical;
}

export interface CreateFarmChemicalUsageRequest {
  farmId: string;
  chemicalId: string;
  amountUsed?: number;
  ratePerAcre?: number;
  acresApplied?: number;
}

export interface UpdateFarmChemicalUsageRequest {
  amountUsed?: number;
  ratePerAcre?: number;
  acresApplied?: number;
}

export interface FarmSeedUsage {
  id: string;
  farmId: string;
  seedHybridId: string;
  bagsUsed: number;
  ratePerAcre?: number;
  acresApplied?: number;
  isVRT: boolean;
  vrtMinRate?: number;
  vrtMaxRate?: number;
  completedAt?: Date;
  completedById?: string;
  completedByName?: string; // Populated from User relation
  calendarEventId?: string;
  createdAt: Date;
  updatedAt: Date;
  seedHybrid?: SeedHybrid;
}

export interface CreateFarmSeedUsageRequest {
  farmId: string;
  seedHybridId: string;
  bagsUsed?: number;
  ratePerAcre?: number;
  acresApplied?: number;
  isVRT?: boolean;
  vrtMinRate?: number;
  vrtMaxRate?: number;
}

export interface UpdateFarmSeedUsageRequest {
  bagsUsed?: number;
  ratePerAcre?: number;
  acresApplied?: number;
  isVRT?: boolean;
  vrtMinRate?: number;
  vrtMaxRate?: number;
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

// ===== Farm Trial Types =====

export interface FarmTrialPhoto {
  id: string;
  trialId: string;
  url: string;
  caption?: string;
  takenAt?: Date;
  createdAt: Date;
}

export interface FarmTrial {
  id: string;
  farmId: string;
  name: string;
  trialType: TrialType;
  status: TrialStatus;
  seedHybridId?: string;
  fertilizerId?: string;
  chemicalId?: string;
  controlProduct?: string;
  controlRate?: number;
  testRate?: number;
  plotLocation?: string;
  plotAcres?: number;
  targetMetric?: string;
  targetValue?: number;
  targetUnit?: string;
  controlResult?: number;
  testResult?: number;
  yieldDifference?: number;
  resultNotes?: string;
  startDate?: Date;
  endDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  seedHybrid?: SeedHybrid;
  fertilizer?: Fertilizer;
  chemical?: Chemical;
  photos?: FarmTrialPhoto[];
}

export interface CreateFarmTrialRequest {
  farmId: string;
  name: string;
  trialType: TrialType;
  seedHybridId?: string;
  fertilizerId?: string;
  chemicalId?: string;
  controlProduct?: string;
  controlRate?: number;
  testRate?: number;
  plotLocation?: string;
  plotAcres?: number;
  targetMetric?: string;
  targetValue?: number;
  targetUnit?: string;
  startDate?: Date;
  notes?: string;
}

export interface UpdateFarmTrialRequest {
  name?: string;
  status?: TrialStatus;
  controlProduct?: string;
  controlRate?: number;
  testRate?: number;
  plotLocation?: string;
  plotAcres?: number;
  targetMetric?: string;
  targetValue?: number;
  targetUnit?: string;
  controlResult?: number;
  testResult?: number;
  yieldDifference?: number;
  resultNotes?: string;
  startDate?: Date;
  endDate?: Date;
  notes?: string;
}

// ===== Farm Plan View (Worker-friendly, no costs) =====

export interface FarmPlanSeedEntry {
  hybridName: string;
  population: number;
  isVRT: boolean;
  vrtMinRate?: number;
  vrtMaxRate?: number;
  acresApplied: number;
}

export interface FarmPlanProductEntry {
  productName: string;
  ratePerAcre: number;
  unit: string;
  acresApplied: number;
}

export interface FarmPlanTrialEntry {
  id: string;
  name: string;
  trialType: TrialType;
  status: TrialStatus;
  plotLocation?: string;
  targetMetric?: string;
}

export interface FarmPlanView {
  farmId: string;
  farmName: string;
  acres: number;
  commodityType: CommodityType;
  year: number;
  grainEntityName?: string;
  projectedYield: number;
  planApproved: boolean;
  planApprovedAt?: Date;

  seedPlan: FarmPlanSeedEntry[];
  inFurrowPlan: FarmPlanProductEntry[];
  fertilizerPlan: FarmPlanProductEntry[];
  chemicalPlan: FarmPlanProductEntry[];
  fungicidePlan: FarmPlanProductEntry[];
  activeTrials: FarmPlanTrialEntry[];
}

// ===== Notification Types =====

export interface Notification {
  id: string;
  userId: string;
  businessId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CreateNotificationRequest {
  userId: string;
  businessId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

// ===== Activity Completion Types =====

export interface MarkActivityCompleteRequest {
  completedAt?: Date; // Defaults to today if not provided
}
