import { prisma } from '../prisma/client';
import { CropInsuranceService } from './crop-insurance.service';
import { LoanInterestService } from './loan.service';
import { ProfitMatrixResponse, ProfitMatrixCell } from '@business-app/shared';

const insuranceService = new CropInsuranceService();
const loanInterestService = new LoanInterestService();

export class ProfitMatrixService {
  async getProfitMatrix(
    farmId: string,
    businessId: string,
    overrides?: {
      yieldSteps?: number;
      priceSteps?: number;
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
    const totalCostPerAcre = await this.calculateTotalCostPerAcre(farm, acres);

    // 3. Load insurance policy
    const policy = await insuranceService.getByFarmId(farmId, businessId);

    // 4. Calculate marketed grain from contract allocations
    let marketedBushels = 0;
    let marketedValue = 0;

    for (const alloc of farm.contractAllocations) {
      const contract = alloc.contract;
      if (contract.deletedAt || !contract.isActive) continue;
      if (contract.year !== farm.year || contract.commodityType !== farm.commodityType) continue;

      const allocBu = Number(alloc.allocatedBushels);
      marketedBushels += allocBu;

      // Calculate effective price
      let effectivePrice = 0;
      if (contract.cashPrice) {
        effectivePrice = Number(contract.cashPrice);
      } else if (contract.futuresPrice && contract.basisPrice) {
        effectivePrice = Number(contract.futuresPrice) + Number(contract.basisPrice);
      } else if (contract.futuresPrice) {
        effectivePrice = Number(contract.futuresPrice);
      } else if (contract.basisPrice) {
        // Basis-only: will need to add futures later, use 0 for now
        effectivePrice = Number(contract.basisPrice);
      }

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

    // 6. Build the matrix
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
        const yieldRatio = projectedYield > 0 ? scenarioYield / projectedYield : 0;
        const actualUnmarketedBuPerAcre = Math.max(0, scenarioYield - marketedBuPerAcre);
        // If yield < marketed, farmer still owes delivery but has to buy grain. Simplified: marketed capped at actual yield
        const actualMarketedBuPerAcre = Math.min(marketedBuPerAcre, scenarioYield);
        const marketedRevenue = actualMarketedBuPerAcre * marketedAvgPrice;
        const unmarketedRevenue = actualUnmarketedBuPerAcre * scenarioPrice;
        const grossRevenuePerAcre = marketedRevenue + unmarketedRevenue;

        // Calculate insurance indemnity
        let insuranceIndemnity = 0;
        let scoIndemnity = 0;
        let ecoIndemnity = 0;
        if (policy) {
          const indemnity = insuranceService.calculateIndemnity(
            policy, aph, scenarioYield, scenarioPrice
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
      marketedBushelsPerAcre: Math.round(marketedBuPerAcre * 100) / 100,
      marketedAvgPrice: Math.round(marketedAvgPrice * 100) / 100,
      unmarketedBushelsPerAcre: Math.round(unmarketedBuPerAcre * 100) / 100,
      yieldScenarios,
      priceScenarios,
      matrix
    };
  }

  private async calculateTotalCostPerAcre(farm: any, acres: number): Promise<number> {
    if (acres === 0) return 0;

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
    let otherCosts = 0;
    for (const cost of farm.otherCosts) {
      if (cost.costType === 'INSURANCE') continue; // Skip — handled by policy premium
      const amount = Number(cost.amount);
      otherCosts += cost.isPerAcre ? amount * acres : amount;
    }

    // Loan costs (getFarmInterestAllocation returns total for the farm, not per-acre)
    let totalLoanCost = 0;
    try {
      const loanAllocation = await loanInterestService.getFarmInterestAllocation(farm.id, farm.year);
      totalLoanCost = loanAllocation.totalLoanCost;
    } catch {
      // No loan data — that's fine
    }

    const totalCost = fertilizerCost + chemicalCost + seedCost + otherCosts + totalLoanCost;
    return totalCost / acres;
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
