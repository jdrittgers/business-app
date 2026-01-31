export type InsurancePlanType = 'RP' | 'YP' | 'RP_HPE';

export interface CropInsurancePolicy {
  id: string;
  farmId: string;
  planType: InsurancePlanType;
  coverageLevel: number;
  projectedPrice: number;
  volatilityFactor: number;
  premiumPerAcre: number;
  hasSco: boolean;
  hasEco: boolean;
  ecoLevel: number | null;
  scoPremiumPerAcre: number;
  ecoPremiumPerAcre: number;
}

export interface UpsertInsurancePolicyRequest {
  planType: InsurancePlanType;
  coverageLevel: number;
  projectedPrice: number;
  volatilityFactor?: number;
  premiumPerAcre: number;
  hasSco?: boolean;
  hasEco?: boolean;
  ecoLevel?: number | null;
  scoPremiumPerAcre?: number;
  ecoPremiumPerAcre?: number;
}

export interface ProfitMatrixCell {
  yieldBuAcre: number;
  priceBu: number;
  grossRevenuePerAcre: number;
  totalCostPerAcre: number;
  profitWithoutInsurance: number;
  insuranceIndemnity: number;
  scoIndemnity: number;
  ecoIndemnity: number;
  totalInsurancePayout: number;
  insurancePremiumCost: number;
  netProfitPerAcre: number;
}

export interface CostBreakdown {
  fertilizerCostPerAcre: number;
  chemicalCostPerAcre: number;
  seedCostPerAcre: number;
  landRentPerAcre: number;
  otherCostsPerAcre: number;
  equipmentLoanCostPerAcre: number;
  landLoanCostPerAcre: number;
  operatingLoanCostPerAcre: number;
  truckingCostPerBushel: number;
}

export interface CountyYieldSimulation {
  expectedCountyYield: number;   // RMA expected county yield (bu/ac) — published before planting
  simulatedCountyYield: number;  // What the farmer thinks county will actually produce (bu/ac)
}

export interface ProfitMatrixResponse {
  farmId: string;
  farmName: string;
  commodityType: string;
  acres: number;
  aph: number;
  projectedYield: number;
  policy: CropInsurancePolicy | null;
  breakEvenPrice: number;
  totalCostPerAcre: number;
  costBreakdown: CostBreakdown;
  marketedBushelsPerAcre: number;
  marketedAvgPrice: number;
  unmarketedBushelsPerAcre: number;
  countyYield: CountyYieldSimulation | null;
  yieldScenarios: number[];
  priceScenarios: number[];
  matrix: ProfitMatrixCell[][];
}
