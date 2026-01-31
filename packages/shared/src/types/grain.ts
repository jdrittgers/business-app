// Enums
export enum CropYear {
  NEW_CROP = 'NEW_CROP',
  OLD_CROP = 'OLD_CROP'
}

export enum ContractType {
  CASH = 'CASH',
  BASIS = 'BASIS',
  HTA = 'HTA',
  ACCUMULATOR = 'ACCUMULATOR'
}

export enum AccumulatorType {
  EURO = 'EURO',       // On expiration, if price > double-up, entire contract doubles
  WEEKLY = 'WEEKLY',   // If Friday close > double-up, that week's bushels double
  DAILY = 'DAILY'      // Each day, if close > double-up, that day's bushels double
}

export enum CommodityType {
  CORN = 'CORN',
  SOYBEANS = 'SOYBEANS',
  WHEAT = 'WHEAT'
}

// Grain Entity
export interface GrainEntity {
  id: string;
  businessId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGrainEntityRequest {
  businessId: string;
  name: string;
}

// Grain Contract
export interface GrainContract {
  id: string;
  grainEntityId: string;
  createdBy: string;
  contractType: ContractType;
  cropYear: CropYear;
  year: number; // NEW: Actual year (2024, 2025, 2026, etc.)
  commodityType: CommodityType;
  contractNumber?: string;
  buyer: string;
  totalBushels: number;
  deliveryStartDate?: Date;
  deliveryEndDate?: Date;
  cashPrice?: number;
  basisPrice?: number;
  futuresMonth?: string;
  futuresPrice?: number;
  bushelsDelivered: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  grainEntity?: GrainEntity;
  accumulatorDetails?: AccumulatorDetails;
}

// Accumulator Details
export interface AccumulatorDetails {
  id: string;
  contractId: string;
  accumulatorType: AccumulatorType;
  knockoutPrice: number;
  doubleUpPrice: number;
  dailyBushels: number;
  weeklyBushels?: number; // For weekly accumulators
  totalBushelsMarketed: number;
  totalDoubledBushels: number; // Track doubled bushels separately
  startDate: Date;
  endDate?: Date;
  isDailyDouble: boolean;
  isCurrentlyDoubled: boolean;
  knockoutReached: boolean;
  knockoutDate?: Date;
  basisLocked: boolean;
  lastProcessedDate?: Date; // Track when we last updated accumulation
  createdAt: Date;
  updatedAt: Date;
  dailyEntries?: AccumulatorDailyEntry[];
}

// Accumulator Daily Entry
export interface AccumulatorDailyEntry {
  id: string;
  accumulatorId: string;
  date: Date;
  bushelsMarketed: number;
  marketPrice: number;
  wasDoubledUp: boolean;
  notes?: string;
  createdAt: Date;
}

// Request types
export interface CreateGrainContractRequest {
  grainEntityId: string;
  contractType: ContractType;
  cropYear: CropYear;
  year?: number; // NEW: Optional year (defaults to current year)
  commodityType: CommodityType;
  contractNumber?: string;
  buyer: string;
  totalBushels: number;
  deliveryStartDate?: string;
  deliveryEndDate?: string;
  cashPrice?: number;
  basisPrice?: number;
  futuresMonth?: string;
  futuresPrice?: number;
  notes?: string;
  // Accumulator specific fields
  accumulatorDetails?: {
    accumulatorType?: AccumulatorType;
    knockoutPrice: number;
    doubleUpPrice: number;
    dailyBushels: number;
    weeklyBushels?: number;
    startDate: string;
    endDate?: string;
    isDailyDouble?: boolean;
    basisLocked?: boolean;
  };
}

export interface UpdateGrainContractRequest {
  // Core fields
  grainEntityId?: string;
  contractType?: ContractType;
  cropYear?: CropYear;
  year?: number;
  commodityType?: CommodityType;
  // Contract details
  contractNumber?: string;
  buyer?: string;
  totalBushels?: number;
  deliveryStartDate?: string;
  deliveryEndDate?: string;
  // Pricing fields
  cashPrice?: number;
  basisPrice?: number;
  futuresMonth?: string;
  futuresPrice?: number;
  // Status and delivery
  bushelsDelivered?: number;
  isActive?: boolean;
  notes?: string;
  // Accumulator details (for updating accumulator-specific fields)
  accumulatorDetails?: {
    accumulatorType?: AccumulatorType;
    knockoutPrice?: number;
    doubleUpPrice?: number;
    dailyBushels?: number;
    weeklyBushels?: number;
    startDate?: string;
    endDate?: string;
    isDailyDouble?: boolean;
    basisLocked?: boolean;
  };
}

export interface CreateAccumulatorEntryRequest {
  date: string;
  bushelsMarketed: number;
  marketPrice: number;
  wasDoubledUp?: boolean;
  notes?: string;
}

export interface GetGrainContractsQuery {
  grainEntityId?: string;
  cropYear?: CropYear;
  contractType?: ContractType;
  commodityType?: CommodityType;
  isActive?: string;
  year?: number; // NEW: Filter by specific year
}

// ===== NEW: Production Tracking Types =====

export interface CropYearProduction {
  id: string;
  grainEntityId: string;
  commodityType: CommodityType;
  year: number;
  acres: number;
  bushelsPerAcre: number;
  totalProjected: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  grainEntity?: GrainEntity;
}

export interface CreateProductionRequest {
  grainEntityId: string;
  commodityType: CommodityType;
  year: number;
  acres: number;
  bushelsPerAcre: number;
  notes?: string;
}

export interface UpdateProductionRequest {
  acres?: number;
  bushelsPerAcre?: number;
  notes?: string;
}

export interface GetProductionsQuery {
  grainEntityId?: string;
  commodityType?: CommodityType;
  year?: number;
}

// ===== NEW: Market Price Types =====

export interface MarketPrice {
  id: string;
  commodityType: CommodityType;
  price: number;
  priceDate: Date;
  source: string;
  marketType: string;
  contractMonth?: string;
  createdAt: Date;
}

export interface GetMarketPricesQuery {
  commodityType?: CommodityType;
  startDate?: string;
  endDate?: string;
  source?: string;
}

export interface PriceAlert {
  id: string;
  businessId: string;
  userId: string;
  commodityType: CommodityType;
  targetPrice: number;
  alertType: 'ABOVE' | 'BELOW';
  isActive: boolean;
  lastTriggered?: Date;
  createdAt: Date;
}

// ===== NEW: Analytics Types =====

export interface EntityProductionSummary {
  grainEntityId: string;
  grainEntityName: string;
  commodityType: CommodityType;
  year: number;
  totalProjected: number;
  totalSold: number;
  totalRemaining: number;
  percentageSold: number;
  averagePrice: number; // Average sale price in $/bu
  contracts: GrainContract[];
}

export interface DashboardSummary {
  totalProjected: number;
  totalSold: number;
  totalRemaining: number;
  percentageSold: number;
  byCommodity: Array<{
    commodityType: CommodityType;
    projected: number;
    sold: number;
    remaining: number;
    averagePrice: number; // Average sale price in $/bu
  }>;
  byContractType: Array<{
    contractType: ContractType;
    totalBushels: number;
    percentageOfTotal: number;
  }>;
  byEntity: EntityProductionSummary[];
}

export interface GetDashboardSummaryQuery {
  grainEntityId?: string;
  year?: number;
}

export interface AccumulatorPerformance {
  contractId: string;
  totalDays: number;
  daysDoubled: number;
  averageDailyRate: number;
  knockoutReached: boolean;
  knockoutDate?: Date;
  totalMarketed: number;
  averageMarketPrice: number;
}

// ===== NEW: Accumulator Update Types =====

export interface UpdateAccumulatorDetailsRequest {
  isDailyDouble?: boolean;
  isCurrentlyDoubled?: boolean;
  knockoutReached?: boolean;
  knockoutDate?: string;
  basisLocked?: boolean;
}

// ===== OLD CROP INVENTORY TYPES =====

export interface OldCropInventory {
  id: string;
  businessId: string;
  commodityType: CommodityType;
  unpricedBushels: number;
  cropYear: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface UpdateOldCropInventoryRequest {
  commodityType: CommodityType;
  unpricedBushels: number;
  cropYear: number;
}

// ===== LOCAL BASIS TYPES =====

export interface LocalBasis {
  id: string;
  businessId: string;
  commodityType: CommodityType;
  basisValue: number; // e.g., -0.25 for 25 cents under
  notes: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export interface UpdateLocalBasisRequest {
  commodityType: CommodityType;
  basisValue: number;
  notes?: string;
}

// ===== FARM CONTRACT ALLOCATION TYPES =====

export enum AllocationType {
  PROPORTIONAL = 'PROPORTIONAL',  // Default: based on expected bushels ratio
  MANUAL = 'MANUAL'               // User-specified allocation
}

// Simplified farm info for allocation views
export interface FarmBasicInfo {
  id: string;
  grainEntityId: string;
  name: string;
  acres: number;
  commodityType: CommodityType;
  year: number;
  projectedYield: number;
  aph: number;
}

export interface FarmContractAllocation {
  id: string;
  contractId: string;
  farmId: string;
  allocationType: AllocationType;
  allocatedBushels: number;
  manualPercentage?: number;  // Only for MANUAL type (0-100)
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Populated relations
  contract?: GrainContract;
  farm?: FarmBasicInfo;
}

// Contract with all farm allocations
export interface ContractWithAllocations extends GrainContract {
  farmAllocations: FarmContractAllocation[];
  totalAllocated: number;
  unallocatedBushels: number;
}

// Farm's allocation summary
export interface FarmAllocationSummary {
  farm: FarmBasicInfo;
  expectedBushels: number;       // acres * projectedYield
  allocations: FarmContractAllocation[];
  totalContracted: number;       // Sum of all allocatedBushels
  uncontractedBushels: number;   // expectedBushels - totalContracted
  coveragePercentage: number;    // (totalContracted / expectedBushels) * 100
  blendedPrice?: number;         // Weighted average of contract prices
}

// Request types
export interface CreateFarmAllocationRequest {
  farmId: string;
  allocationType: AllocationType;
  allocatedBushels?: number;     // Required for MANUAL
  manualPercentage?: number;     // Optional for MANUAL
  notes?: string;
}

export interface UpdateFarmAllocationRequest {
  allocationType?: AllocationType;
  allocatedBushels?: number;
  manualPercentage?: number;
  notes?: string;
}

export interface SetContractAllocationsRequest {
  allocations: CreateFarmAllocationRequest[];
}

export interface AutoAllocateRequest {
  farmIds?: string[];  // Optional: if not provided, allocate to all matching farms
}

// Response types
export interface AllocationResult {
  success: boolean;
  allocationsCreated: number;
  allocationsUpdated: number;
  totalAllocated: number;
  errors: string[];
}
