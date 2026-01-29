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
  marketedBushelsPerAcre: number;
  marketedAvgPrice: number;
  unmarketedBushelsPerAcre: number;
  yieldScenarios: number[];
  priceScenarios: number[];
  matrix: ProfitMatrixCell[][];
}
