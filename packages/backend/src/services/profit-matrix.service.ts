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

    // 2. Calculate total cost per acre (replicating breakeven logic)
    const costResult = await this.calculateTotalCostPerAcre(farm, acres);
    const totalCostPerAcre = costResult.totalCostPerAcre;
    const costBreakdown = costResult.breakdown;

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

    const yieldScenarios = this.buildYieldScenarios(aph, steps);
    const priceScenarios = this.buildPriceScenarios(
      policy?.projectedPrice || this.getDefaultPrice(farm.commodityType),
      priceSteps,
      farm.commodityType
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
        const unmarketedRevenue = actualUnmarketedBuPerAcre * scenarioPrice;
        const grossRevenuePerAcre = marketedRevenue + unmarketedRevenue;

        // Calculate insurance indemnity
        // For ECO/SCO: if county yield simulation is provided, scale simulated county yield
        // proportionally to the farm yield scenario so each cell reflects different severity
        let insuranceIndemnity = 0;
        let scoIndemnity = 0;
        let ecoIndemnity = 0;
        if (policy) {
          let cellCountyYield = countyYield ? { ...countyYield } : undefined;
          if (cellCountyYield && cellCountyYield.expectedCountyYield > 0) {
            // Scale simulated county yield proportionally to the yield scenario
            // If user set simulated = expected (no county loss), scale with farm yield ratio
            // If user set simulated < expected (county drought), apply same farm yield ratio
            const farmYieldRatio = aph > 0 ? scenarioYield / aph : 1;
            cellCountyYield = {
              expectedCountyYield: cellCountyYield.expectedCountyYield,
              simulatedCountyYield: cellCountyYield.simulatedCountyYield * farmYieldRatio
            };
          }
          const indemnity = insuranceService.calculateIndemnity(
            policy, aph, scenarioYield, scenarioPrice, cellCountyYield
          );
          insuranceIndemnity = indemnity.base;
          scoIndemnity = indemnity.sco;
          ecoIndemnity = indemnity.eco;
        }

        const totalInsurancePayout = insuranceIndemnity + scoIndemnity + ecoIndemnity;
        const profitWithoutInsurance = grossRevenuePerAcre - totalCostPerAcre;
        const netProfitPerAcre = grossRevenuePerAcre - totalCostPerAcre - insurancePremium + totalInsurancePayout;

        row.push({
          yieldBuAcre: scenarioYield,
          priceBu: scenarioPrice,
          grossRevenuePerAcre: Math.round(grossRevenuePerAcre * 100) / 100,
          totalCostPerAcre: Math.round(totalCostPerAcre * 100) / 100,
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

    const breakEvenPrice = projectedYield > 0 ? totalCostPerAcre / projectedYield : 0;

    return {
      farmId,
      farmName: farm.name,
      commodityType: farm.commodityType,
      acres,
      aph,
      projectedYield,
      policy,
      breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
      totalCostPerAcre: Math.round(totalCostPerAcre * 100) / 100,
      costBreakdown,
      marketedBushelsPerAcre: Math.round(marketedBuPerAcre * 100) / 100,
      marketedAvgPrice: Math.round(marketedAvgPrice * 100) / 100,
      unmarketedBushelsPerAcre: Math.round(unmarketedBuPerAcre * 100) / 100,
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
      landLoanCostPerAcre: 0, operatingLoanCostPerAcre: 0
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
      operatingLoanCostPerAcre: r(operatingLoanCost)
    };

    return { totalCostPerAcre: totalCost / acres, breakdown };
  }

  private buildYieldScenarios(aph: number, steps: number): number[] {
    // Build scenarios from 50% to 120% of APH
    const minPct = 0.50;
    const maxPct = 1.20;
    const scenarios: number[] = [];

    if (aph <= 0) {
      // Fallback if APH not set
      for (let i = 0; i < steps; i++) {
        scenarios.push(100 + i * 20);
      }
      return scenarios;
    }

    const stepSize = (maxPct - minPct) / (steps - 1);
    for (let i = 0; i < steps; i++) {
      const pct = minPct + i * stepSize;
      scenarios.push(Math.round(aph * pct));
    }
    return scenarios;
  }

  private buildPriceScenarios(basePrice: number, steps: number, commodityType: string): number[] {
    // Build scenarios centered on base price, ±40%
    const scenarios: number[] = [];
    const minPct = 0.60;
    const maxPct = 1.40;
    const stepSize = (maxPct - minPct) / (steps - 1);

    for (let i = 0; i < steps; i++) {
      const pct = minPct + i * stepSize;
      const price = basePrice * pct;
      // Round to nearest nickel for corn/wheat, dime for soybeans
      if (commodityType === 'SOYBEANS') {
        scenarios.push(Math.round(price * 10) / 10);
      } else {
        scenarios.push(Math.round(price * 20) / 20);
      }
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
