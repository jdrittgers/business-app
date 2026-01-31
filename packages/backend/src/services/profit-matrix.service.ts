import { prisma } from '../prisma/client';
import { CropInsuranceService } from './crop-insurance.service';
import { LoanInterestService } from './loan.service';
import { ProfitMatrixResponse, ProfitMatrixCell, CostBreakdown, CountyYieldSimulation } from '@business-app/shared';

const insuranceService = new CropInsuranceService();
const loanInterestService = new LoanInterestService();

export class ProfitMatrixService {
  async getProfitMatrix(
    farmId: string,
    businessId: string,
    overrides?: {
      yieldSteps?: number;
      priceSteps?: number;
      expectedCountyYield?: number;
      simulatedCountyYield?: number;
      basis?: number;
      yieldMin?: number;
      yieldMax?: number;
      priceMin?: number;
      priceMax?: number;
    }
  ): Promise<ProfitMatrixResponse> {
    // 1. Load farm with all cost data
    const farm = await prisma.farm.findFirst({
      where: { id: farmId, grainEntity: { businessId }, deletedAt: null },
      include: {
        grainEntity: true,
        fertilizerUsage: { include: { fertilizer: true } },
        chemicalUsage: { include: { chemical: true } },
        seedUsage: { include: { seedHybrid: true } },
        otherCosts: true,
        contractAllocations: {
          include: {
            contract: {
              select: {
                id: true, cashPrice: true, basisPrice: true, futuresPrice: true,
                contractType: true, totalBushels: true, bushelsDelivered: true,
                isActive: true, deletedAt: true, year: true, commodityType: true
              }
            }
          }
        }
      }
    });

    if (!farm) throw new Error('Farm not found or access denied');

    const acres = Number(farm.acres);
    const aph = Number(farm.aph);
    const projectedYield = Number(farm.projectedYield);

    // 2. Resolve effective trucking fee per bushel
    const truckingFeePerBushel = await this.getEffectiveTruckingFee(farm, businessId);

    // 3. Calculate total cost per acre (replicating breakeven logic, excluding trucking — it's yield-dependent)
    const costResult = await this.calculateTotalCostPerAcre(farm, acres);
    const totalCostPerAcre = costResult.totalCostPerAcre;
    const costBreakdown: CostBreakdown = {
      ...costResult.breakdown,
      truckingCostPerBushel: Math.round(truckingFeePerBushel * 10000) / 10000
    };

    // 3. Load insurance policy
    const policy = await insuranceService.getByFarmId(farmId, businessId);

    // 4. Calculate marketed grain from contract allocations
    let marketedBushels = 0;
    let marketedValue = 0;

    for (const alloc of farm.contractAllocations) {
      const contract = alloc.contract;
      if (contract.deletedAt || !contract.isActive) continue;
      if (contract.year !== farm.year || contract.commodityType !== farm.commodityType) continue;

      // Calculate effective price
      let effectivePrice = 0;
      if (contract.cashPrice) {
        effectivePrice = Number(contract.cashPrice);
      } else if (contract.futuresPrice && contract.basisPrice) {
        effectivePrice = Number(contract.futuresPrice) + Number(contract.basisPrice);
      } else if (contract.futuresPrice) {
        effectivePrice = Number(contract.futuresPrice);
      } else if (contract.basisPrice) {
        effectivePrice = Number(contract.basisPrice);
      }

      // Skip contracts with no effective price (e.g., accumulators not yet priced)
      // These don't have a locked-in price and shouldn't drag down the marketed average
      if (effectivePrice <= 0) continue;

      const allocBu = Number(alloc.allocatedBushels);
      marketedBushels += allocBu;
      marketedValue += allocBu * effectivePrice;
    }

    const marketedBuPerAcre = acres > 0 ? marketedBushels / acres : 0;
    const marketedAvgPrice = marketedBushels > 0 ? marketedValue / marketedBushels : 0;
    const unmarketedBuPerAcre = Math.max(0, projectedYield - marketedBuPerAcre);

    // 5. Build yield and price scenarios
    const steps = overrides?.yieldSteps || 7;
    const priceSteps = overrides?.priceSteps || 7;

    const yieldScenarios = this.buildYieldScenarios(aph, steps, overrides?.yieldMin, overrides?.yieldMax);
    const priceScenarios = this.buildPriceScenarios(
      policy?.projectedPrice || this.getDefaultPrice(farm.commodityType),
      priceSteps,
      farm.commodityType,
      overrides?.priceMin,
      overrides?.priceMax
    );

    // 6. Build county yield simulation data (if provided)
    const countyYield: CountyYieldSimulation | null =
      overrides?.expectedCountyYield && overrides?.simulatedCountyYield
        ? {
            expectedCountyYield: overrides.expectedCountyYield,
            simulatedCountyYield: overrides.simulatedCountyYield
          }
        : null;

    // 7. Build the matrix
    const matrix: ProfitMatrixCell[][] = [];

    const insurancePremium = policy
      ? policy.premiumPerAcre + (policy.hasSco ? policy.scoPremiumPerAcre : 0) + (policy.hasEco ? policy.ecoPremiumPerAcre : 0)
      : 0;

    for (let yi = 0; yi < yieldScenarios.length; yi++) {
      const row: ProfitMatrixCell[] = [];
      const scenarioYield = yieldScenarios[yi];

      for (let pi = 0; pi < priceScenarios.length; pi++) {
        const scenarioPrice = priceScenarios[pi];

        // Calculate revenue per acre
        // Marketed bushels are locked in at their contracted prices
        // Unmarketed bushels are sold at the scenario price
        // If yield drops, unmarketed bushels decrease proportionally; marketed stays (contracts are obligations)
        const actualUnmarketedBuPerAcre = Math.max(0, scenarioYield - marketedBuPerAcre);
        // If yield < marketed, farmer still owes delivery but has to buy grain. Simplified: marketed capped at actual yield
        const actualMarketedBuPerAcre = Math.min(marketedBuPerAcre, scenarioYield);
        const marketedRevenue = actualMarketedBuPerAcre * marketedAvgPrice;
        const basis = overrides?.basis ?? 0;
        const unmarketedRevenue = actualUnmarketedBuPerAcre * (scenarioPrice + basis);
        const grossRevenuePerAcre = marketedRevenue + unmarketedRevenue;

        // Calculate insurance indemnity
        // ECO/SCO are area-based: county yield is independent of farm yield.
        // Pass the user's county yield simulation unchanged to every cell.
        let insuranceIndemnity = 0;
        let scoIndemnity = 0;
        let ecoIndemnity = 0;
        if (policy) {
          const cellCountyYield = countyYield ? { ...countyYield } : undefined;
          const indemnity = insuranceService.calculateIndemnity(
            policy, aph, scenarioYield, scenarioPrice, cellCountyYield
          );
          insuranceIndemnity = indemnity.base;
          scoIndemnity = indemnity.sco;
          ecoIndemnity = indemnity.eco;
        }

        const totalInsurancePayout = insuranceIndemnity + scoIndemnity + ecoIndemnity;

        // Trucking cost scales with yield — more bushels = more hauling
        const truckingCostPerAcre = truckingFeePerBushel * scenarioYield;
        const scenarioTotalCostPerAcre = totalCostPerAcre + truckingCostPerAcre;

        const profitWithoutInsurance = grossRevenuePerAcre - scenarioTotalCostPerAcre;
        const netProfitPerAcre = grossRevenuePerAcre - scenarioTotalCostPerAcre - insurancePremium + totalInsurancePayout;

        row.push({
          yieldBuAcre: scenarioYield,
          priceBu: scenarioPrice,
          grossRevenuePerAcre: Math.round(grossRevenuePerAcre * 100) / 100,
          totalCostPerAcre: Math.round(scenarioTotalCostPerAcre * 100) / 100,
          profitWithoutInsurance: Math.round(profitWithoutInsurance * 100) / 100,
          insuranceIndemnity: Math.round(insuranceIndemnity * 100) / 100,
          scoIndemnity: Math.round(scoIndemnity * 100) / 100,
          ecoIndemnity: Math.round(ecoIndemnity * 100) / 100,
          totalInsurancePayout: Math.round(totalInsurancePayout * 100) / 100,
          insurancePremiumCost: Math.round(insurancePremium * 100) / 100,
          netProfitPerAcre: Math.round(netProfitPerAcre * 100) / 100
        });
      }
      matrix.push(row);
    }

    const breakEvenPrice = projectedYield > 0 ? (totalCostPerAcre / projectedYield) + truckingFeePerBushel : 0;

    return {
      farmId,
      farmName: farm.name,
      commodityType: farm.commodityType,
      acres,
      aph,
      projectedYield,
      policy,
      breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
      totalCostPerAcre: Math.round((totalCostPerAcre + truckingFeePerBushel * projectedYield) * 100) / 100,
      costBreakdown,
      marketedBushelsPerAcre: Math.round(marketedBuPerAcre * 100) / 100,
      marketedAvgPrice: Math.round(marketedAvgPrice * 100) / 100,
      unmarketedBushelsPerAcre: Math.round(unmarketedBuPerAcre * 100) / 100,
      basis: overrides?.basis ?? 0,
      countyYield,
      yieldScenarios,
      priceScenarios,
      matrix
    };
  }

  private async calculateTotalCostPerAcre(farm: any, acres: number): Promise<{ totalCostPerAcre: number; breakdown: CostBreakdown }> {
    const emptyBreakdown: CostBreakdown = {
      fertilizerCostPerAcre: 0, chemicalCostPerAcre: 0, seedCostPerAcre: 0,
      landRentPerAcre: 0, otherCostsPerAcre: 0, equipmentLoanCostPerAcre: 0,
      landLoanCostPerAcre: 0, operatingLoanCostPerAcre: 0, truckingCostPerBushel: 0
    };
    if (acres === 0) return { totalCostPerAcre: 0, breakdown: emptyBreakdown };

    // Fertilizer costs
    let fertilizerCost = 0;
    for (const usage of farm.fertilizerUsage) {
      fertilizerCost += Number(usage.amountUsed) * Number(usage.fertilizer.pricePerUnit);
    }

    // Chemical costs
    let chemicalCost = 0;
    for (const usage of farm.chemicalUsage) {
      chemicalCost += Number(usage.amountUsed) * Number(usage.chemical.pricePerUnit);
    }

    // Seed costs
    let seedCost = 0;
    for (const usage of farm.seedUsage) {
      const bagsUsed = usage.bagsUsed ? Number(usage.bagsUsed) : 0;
      seedCost += bagsUsed * Number(usage.seedHybrid.pricePerBag);
    }

    // Other costs (excluding insurance to avoid double-counting with policy premium)
    let landRent = 0;
    let otherCosts = 0;
    for (const cost of farm.otherCosts) {
      if (cost.costType === 'INSURANCE') continue; // Skip — handled by policy premium
      const amount = Number(cost.amount);
      const totalAmount = cost.isPerAcre ? amount * acres : amount;
      if (cost.costType === 'LAND_RENT') {
        landRent += totalAmount;
      } else {
        otherCosts += totalAmount;
      }
    }

    // Loan costs (getFarmInterestAllocation returns total for the farm, not per-acre)
    let equipmentLoanCost = 0;
    let landLoanCost = 0;
    let operatingLoanCost = 0;
    try {
      const loanAllocation = await loanInterestService.getFarmInterestAllocation(farm.id, farm.year);
      equipmentLoanCost = loanAllocation.equipmentLoanInterest + loanAllocation.equipmentLoanPrincipal;
      landLoanCost = loanAllocation.landLoanInterest + loanAllocation.landLoanPrincipal;
      operatingLoanCost = loanAllocation.operatingLoanInterest;
    } catch {
      // No loan data — that's fine
    }

    const totalLoanCost = equipmentLoanCost + landLoanCost + operatingLoanCost;
    const totalCost = fertilizerCost + chemicalCost + seedCost + landRent + otherCosts + totalLoanCost;

    const r = (v: number) => Math.round(v / acres * 100) / 100;
    const breakdown: CostBreakdown = {
      fertilizerCostPerAcre: r(fertilizerCost),
      chemicalCostPerAcre: r(chemicalCost),
      seedCostPerAcre: r(seedCost),
      landRentPerAcre: r(landRent),
      otherCostsPerAcre: r(otherCosts),
      equipmentLoanCostPerAcre: r(equipmentLoanCost),
      landLoanCostPerAcre: r(landLoanCost),
      operatingLoanCostPerAcre: r(operatingLoanCost),
      truckingCostPerBushel: 0
    };

    return { totalCostPerAcre: totalCost / acres, breakdown };
  }

  private async getEffectiveTruckingFee(farm: any, businessId: string): Promise<number> {
    if (farm.truckingFeePerBushel !== null && farm.truckingFeePerBushel !== undefined) {
      return Number(farm.truckingFeePerBushel);
    }
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { defaultTruckingFeePerBushel: true }
    });
    return business ? Number(business.defaultTruckingFeePerBushel) : 0;
  }

  private buildYieldScenarios(aph: number, steps: number, minYield?: number, maxYield?: number): number[] {
    const scenarios: number[] = [];

    if (minYield !== undefined && maxYield !== undefined) {
      // Custom range: linearly space between min and max
      const stepSize = (maxYield - minYield) / (steps - 1);
      for (let i = 0; i < steps; i++) {
        scenarios.push(Math.round(minYield + i * stepSize));
      }
      return scenarios;
    }

    // Default: 50% to 120% of APH
    if (aph <= 0) {
      for (let i = 0; i < steps; i++) {
        scenarios.push(100 + i * 20);
      }
      return scenarios;
    }

    const minPct = 0.50;
    const maxPct = 1.20;
    const stepSize = (maxPct - minPct) / (steps - 1);
    for (let i = 0; i < steps; i++) {
      const pct = minPct + i * stepSize;
      scenarios.push(Math.round(aph * pct));
    }
    return scenarios;
  }

  private buildPriceScenarios(basePrice: number, steps: number, commodityType: string, minPrice?: number, maxPrice?: number): number[] {
    const scenarios: number[] = [];
    const roundPrice = (p: number) =>
      commodityType === 'SOYBEANS' ? Math.round(p * 10) / 10 : Math.round(p * 20) / 20;

    if (minPrice !== undefined && maxPrice !== undefined) {
      // Custom range: linearly space between min and max
      const stepSize = (maxPrice - minPrice) / (steps - 1);
      for (let i = 0; i < steps; i++) {
        scenarios.push(roundPrice(minPrice + i * stepSize));
      }
      return scenarios;
    }

    // Default: ±40% of base price
    const minPct = 0.60;
    const maxPct = 1.40;
    const stepSize = (maxPct - minPct) / (steps - 1);

    for (let i = 0; i < steps; i++) {
      const pct = minPct + i * stepSize;
      scenarios.push(roundPrice(basePrice * pct));
    }
    return scenarios;
  }

  private getDefaultPrice(commodityType: string): number {
    switch (commodityType) {
      case 'CORN': return 4.66;
      case 'SOYBEANS': return 11.20;
      case 'WHEAT': return 5.50;
      default: return 5.00;
    }
  }
}
