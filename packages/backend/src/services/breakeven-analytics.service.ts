import { prisma } from '../prisma/client';
import {
  OperationBreakEven,
  EntityBreakEven,
  FarmBreakEven,
  GetBreakEvenQuery,
  CommodityType
} from '@business-app/shared';
import { loanInterestService } from './loan.service';

export class BreakEvenAnalyticsService {
  async getOperationBreakEven(
    businessId: string,
    query: GetBreakEvenQuery
  ): Promise<OperationBreakEven> {
    const year = query.year || new Date().getFullYear();

    // Get all farms for this business/year
    const farms = await prisma.farm.findMany({
      where: {
        grainEntity: { businessId },
        year,
        ...(query.grainEntityId && { grainEntityId: query.grainEntityId }),
        ...(query.commodityType && { commodityType: query.commodityType })
      },
      include: {
        grainEntity: true,
        fertilizerUsage: {
          include: { fertilizer: true }
        },
        chemicalUsage: {
          include: { chemical: true }
        },
        seedUsage: {
          include: { seedHybrid: true }
        },
        otherCosts: true
      }
    });

    // Get production data for expected yields
    const productions = await prisma.cropYearProduction.findMany({
      where: {
        grainEntity: {
          businessId,
          ...(query.grainEntityId && { id: query.grainEntityId })
        },
        year,
        ...(query.commodityType && { commodityType: query.commodityType })
      },
      include: {
        grainEntity: true
      }
    });

    const productionMap = new Map(
      productions.map(p => [`${p.grainEntityId}-${p.commodityType}`, p])
    );

    // Calculate farm-level break-evens with loan costs
    const farmBreakEvens: FarmBreakEven[] = [];

    for (const farm of farms) {
      const farmBE = await this.calculateFarmBreakEven(farm, productionMap, year);
      farmBreakEvens.push(farmBE);
    }

    // Aggregate by entity
    const entityMap = new Map<string, EntityBreakEven>();

    for (const farmBE of farmBreakEvens) {
      const key = `${farmBE.grainEntityId}-${farmBE.commodityType}`;

      if (!entityMap.has(key)) {
        const entity = farms.find(f => f.grainEntityId === farmBE.grainEntityId && f.commodityType === farmBE.commodityType)?.grainEntity;
        entityMap.set(key, {
          grainEntityId: farmBE.grainEntityId,
          grainEntityName: entity?.name || '',
          year,
          commodityType: farmBE.commodityType,
          totalAcres: 0,
          totalCost: 0,
          costPerAcre: 0,
          landLoanInterest: 0,
          landLoanPrincipal: 0,
          operatingLoanInterest: 0,
          equipmentLoanInterest: 0,
          equipmentLoanPrincipal: 0,
          totalInterestExpense: 0,
          totalPrincipalExpense: 0,
          totalLoanCost: 0,
          expectedYield: farmBE.expectedYield,
          expectedBushels: 0,
          breakEvenPrice: 0,
          farms: []
        });
      }

      const entityBE = entityMap.get(key)!;
      entityBE.totalAcres += farmBE.acres;
      entityBE.totalCost += farmBE.totalCost;
      entityBE.landLoanInterest += farmBE.landLoanInterest;
      entityBE.landLoanPrincipal += farmBE.landLoanPrincipal;
      entityBE.operatingLoanInterest += farmBE.operatingLoanInterest;
      entityBE.equipmentLoanInterest += farmBE.equipmentLoanInterest;
      entityBE.equipmentLoanPrincipal += farmBE.equipmentLoanPrincipal;
      entityBE.totalInterestExpense += farmBE.totalInterestExpense;
      entityBE.totalPrincipalExpense += farmBE.totalPrincipalExpense;
      entityBE.totalLoanCost += farmBE.totalLoanCost;
      entityBE.expectedBushels += farmBE.expectedBushels;
      entityBE.farms.push(farmBE);
    }

    // Calculate entity-level averages
    for (const entityBE of entityMap.values()) {
      entityBE.costPerAcre = entityBE.totalAcres > 0 ? entityBE.totalCost / entityBE.totalAcres : 0;
      entityBE.breakEvenPrice = entityBE.expectedBushels > 0 ? entityBE.totalCost / entityBE.expectedBushels : 0;
    }

    const byEntity = Array.from(entityMap.values());

    // Aggregate by commodity
    const commodityMap = new Map();

    for (const entityBE of byEntity) {
      if (!commodityMap.has(entityBE.commodityType)) {
        commodityMap.set(entityBE.commodityType, {
          commodityType: entityBE.commodityType,
          acres: 0,
          totalCost: 0,
          costPerAcre: 0,
          landLoanInterest: 0,
          landLoanPrincipal: 0,
          operatingLoanInterest: 0,
          equipmentLoanInterest: 0,
          equipmentLoanPrincipal: 0,
          expectedYield: entityBE.expectedYield,
          expectedBushels: 0,
          breakEvenPrice: 0
        });
      }

      const commodityBE = commodityMap.get(entityBE.commodityType);
      commodityBE.acres += entityBE.totalAcres;
      commodityBE.totalCost += entityBE.totalCost;
      commodityBE.landLoanInterest += entityBE.landLoanInterest;
      commodityBE.landLoanPrincipal += entityBE.landLoanPrincipal;
      commodityBE.operatingLoanInterest += entityBE.operatingLoanInterest;
      commodityBE.equipmentLoanInterest += entityBE.equipmentLoanInterest;
      commodityBE.equipmentLoanPrincipal += entityBE.equipmentLoanPrincipal;
      commodityBE.expectedBushels += entityBE.expectedBushels;
    }

    // Calculate commodity-level averages
    for (const commodityBE of commodityMap.values()) {
      commodityBE.costPerAcre = commodityBE.acres > 0 ? commodityBE.totalCost / commodityBE.acres : 0;
      commodityBE.breakEvenPrice = commodityBE.expectedBushels > 0 ? commodityBE.totalCost / commodityBE.expectedBushels : 0;
    }

    const byCommodity = Array.from(commodityMap.values());

    // Calculate operation totals
    const totalAcres = byCommodity.reduce((sum, c) => sum + c.acres, 0);
    const totalCost = byCommodity.reduce((sum, c) => sum + c.totalCost, 0);
    const totalLandLoanInterest = byCommodity.reduce((sum, c) => sum + c.landLoanInterest, 0);
    const totalLandLoanPrincipal = byCommodity.reduce((sum, c) => sum + c.landLoanPrincipal, 0);
    const totalOperatingLoanInterest = byCommodity.reduce((sum, c) => sum + c.operatingLoanInterest, 0);
    const totalEquipmentLoanInterest = byCommodity.reduce((sum, c) => sum + c.equipmentLoanInterest, 0);
    const totalEquipmentLoanPrincipal = byCommodity.reduce((sum, c) => sum + c.equipmentLoanPrincipal, 0);
    const totalInterestExpense = totalLandLoanInterest + totalOperatingLoanInterest + totalEquipmentLoanInterest;
    const totalPrincipalExpense = totalLandLoanPrincipal + totalEquipmentLoanPrincipal;
    const totalLoanCost = totalInterestExpense + totalPrincipalExpense;

    return {
      businessId,
      year,
      totalAcres,
      totalCost,
      totalInterestExpense,
      totalPrincipalExpense,
      totalLoanCost,
      loanCostBreakdown: {
        landLoanInterest: totalLandLoanInterest,
        landLoanPrincipal: totalLandLoanPrincipal,
        operatingLoanInterest: totalOperatingLoanInterest,
        equipmentLoanInterest: totalEquipmentLoanInterest,
        equipmentLoanPrincipal: totalEquipmentLoanPrincipal
      },
      byCommodity,
      byEntity
    };
  }

  private async calculateFarmBreakEven(
    farm: any,
    productionMap: Map<string, any>,
    year: number
  ): Promise<FarmBreakEven> {
    const acres = Number(farm.acres);

    // Calculate fertilizer cost
    let fertilizerCost = 0;
    const fertilizerUsage = farm.fertilizerUsage.map((usage: any) => {
      const amountUsed = Number(usage.amountUsed);
      const pricePerUnit = Number(usage.fertilizer.pricePerUnit);
      const totalCost = amountUsed * pricePerUnit;
      fertilizerCost += totalCost;

      return {
        name: usage.fertilizer.name,
        amountUsed,
        unit: usage.fertilizer.unit,
        pricePerUnit,
        totalCost
      };
    });

    // Calculate chemical cost
    let chemicalCost = 0;
    const chemicalUsage = farm.chemicalUsage.map((usage: any) => {
      const amountUsed = Number(usage.amountUsed);
      const pricePerUnit = Number(usage.chemical.pricePerUnit);
      const totalCost = amountUsed * pricePerUnit;
      chemicalCost += totalCost;

      return {
        name: usage.chemical.name,
        amountUsed,
        unit: usage.chemical.unit,
        pricePerUnit,
        totalCost
      };
    });

    // Calculate seed cost
    let seedCost = 0;
    let seedUsage = undefined;

    if (farm.seedUsage.length > 0) {
      const usage = farm.seedUsage[0]; // Assuming one hybrid per farm
      const bagsUsed = Number(usage.bagsUsed);
      const pricePerBag = Number(usage.seedHybrid.pricePerBag);
      const seedsPerBag = usage.seedHybrid.seedsPerBag;
      const bagsPerAcre = bagsUsed / acres;
      const population = bagsPerAcre * seedsPerBag; // Calculate population from bags used
      const totalCost = bagsUsed * pricePerBag;
      seedCost = totalCost;

      seedUsage = {
        hybridName: usage.seedHybrid.name,
        population,
        pricePerBag,
        seedsPerBag,
        bagsPerAcre,
        totalCost
      };
    }

    // Calculate other costs
    let landRent = 0;
    let insurance = 0;
    let otherCosts = 0;

    for (const cost of farm.otherCosts) {
      const amount = Number(cost.amount);
      const totalAmount = cost.isPerAcre ? amount * acres : amount;

      if (cost.costType === 'LAND_RENT') {
        landRent += totalAmount;
      } else if (cost.costType === 'INSURANCE') {
        insurance += totalAmount;
      } else {
        otherCosts += totalAmount;
      }
    }

    // Get loan costs from loan interest service
    const loanAllocation = await loanInterestService.getFarmInterestAllocation(farm.id, year);

    const landLoanInterest = loanAllocation.landLoanInterest;
    const landLoanPrincipal = loanAllocation.landLoanPrincipal;
    const operatingLoanInterest = loanAllocation.operatingLoanInterest;
    const equipmentLoanInterest = loanAllocation.equipmentLoanInterest;
    const equipmentLoanPrincipal = loanAllocation.equipmentLoanPrincipal;

    const totalInterestExpense = landLoanInterest + operatingLoanInterest + equipmentLoanInterest;
    const totalPrincipalExpense = landLoanPrincipal + equipmentLoanPrincipal;
    const totalLoanCost = totalInterestExpense + totalPrincipalExpense;

    // Total costs
    const totalCostExcludingInterest = fertilizerCost + chemicalCost + seedCost + landRent + insurance + otherCosts;
    const totalCost = totalCostExcludingInterest + totalLoanCost;
    const costPerAcre = acres > 0 ? totalCost / acres : 0;

    // Get expected yield from production data
    const productionKey = `${farm.grainEntityId}-${farm.commodityType}`;
    const production = productionMap.get(productionKey);
    const expectedYield = production ? Number(production.bushelsPerAcre) : 0;
    const expectedBushels = expectedYield * acres;
    const breakEvenPrice = expectedBushels > 0 ? totalCost / expectedBushels : 0;

    return {
      farmId: farm.id,
      farmName: farm.name,
      grainEntityId: farm.grainEntityId,
      acres,
      commodityType: farm.commodityType as CommodityType,
      year: farm.year,
      fertilizerCost,
      chemicalCost,
      seedCost,
      landRent,
      insurance,
      otherCosts,
      landLoanInterest,
      landLoanPrincipal,
      operatingLoanInterest,
      equipmentLoanInterest,
      equipmentLoanPrincipal,
      totalInterestExpense,
      totalPrincipalExpense,
      totalLoanCost,
      totalCost,
      totalCostExcludingInterest,
      costPerAcre,
      expectedYield,
      expectedBushels,
      breakEvenPrice,
      fertilizerUsage,
      chemicalUsage,
      seedUsage
    };
  }
}
