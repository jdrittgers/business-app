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
  knockoutPrice: number;
  doubleUpPrice: number;
  dailyBushels: number;
  totalBushelsMarketed: number;
  startDate: Date;
  endDate?: Date;
  isDailyDouble: boolean; // NEW: Can double daily bushels
  isCurrentlyDoubled: boolean; // NEW: Is currently doubled up
  knockoutReached: boolean; // NEW: Knockout price reached
  knockoutDate?: Date; // NEW: When knockout occurred
  basisLocked: boolean; // NEW: Whether basis is locked (false = still HTA)
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
    knockoutPrice: number;
    doubleUpPrice: number;
    dailyBushels: number;
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
