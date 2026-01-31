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
    // When filtering by entity, respect entity splits properly
    const farms = await prisma.farm.findMany({
      where: {
        grainEntity: { businessId },
        deletedAt: null,  // Exclude soft-deleted farms
        year,
        ...(query.commodityType && { commodityType: query.commodityType }),
        // If filtering by entity, include farms where:
        // 1. Entity is in the splits (splits take precedence), OR
        // 2. Entity is primary AND farm has NO splits
        ...(query.grainEntityId && {
          OR: [
            // Farm has this entity in its splits
            { entitySplits: { some: { grainEntityId: query.grainEntityId } } },
            // Farm has this entity as primary AND has no splits (100% ownership)
            {
              grainEntityId: query.grainEntityId,
              entitySplits: { none: {} }
            }
          ]
        })
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
        otherCosts: true,
        entitySplits: {
          include: { grainEntity: true }
        }
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

    // Aggregate by entity - respect entity splits
    const entityMap = new Map<string, EntityBreakEven>();

    // Build a map of farm to entity splits for quick lookup
    const farmSplitsMap = new Map<string, Array<{ grainEntityId: string; grainEntityName: string; percentage: number }>>();
    for (const farm of farms) {
      if (farm.entitySplits && farm.entitySplits.length > 0) {
        farmSplitsMap.set(farm.id, farm.entitySplits.map((s: any) => ({
          grainEntityId: s.grainEntityId,
          grainEntityName: s.grainEntity?.name || '',
          percentage: Number(s.percentage) / 100 // Convert from percent to decimal
        })));
      }
    }

    // Helper function to ensure entity exists in map
    const ensureEntity = (entityId: string, entityName: string, commodityType: CommodityType, expectedYield: number) => {
      const key = `${entityId}-${commodityType}`;
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          grainEntityId: entityId,
          grainEntityName: entityName,
          year,
          commodityType,
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
          expectedYield,
          expectedBushels: 0,
          breakEvenPrice: 0,
          farms: []
        });
      }
      return entityMap.get(key)!;
    };

    // Helper function to add proportional costs to entity
    const addToEntity = (entityBE: EntityBreakEven, farmBE: FarmBreakEven, proportion: number) => {
      entityBE.totalAcres += farmBE.acres * proportion;
      entityBE.totalCost += farmBE.totalCost * proportion;
      entityBE.landLoanInterest += farmBE.landLoanInterest * proportion;
      entityBE.landLoanPrincipal += farmBE.landLoanPrincipal * proportion;
      entityBE.operatingLoanInterest += farmBE.operatingLoanInterest * proportion;
      entityBE.equipmentLoanInterest += farmBE.equipmentLoanInterest * proportion;
      entityBE.equipmentLoanPrincipal += farmBE.equipmentLoanPrincipal * proportion;
      entityBE.totalInterestExpense += farmBE.totalInterestExpense * proportion;
      entityBE.totalPrincipalExpense += farmBE.totalPrincipalExpense * proportion;
      entityBE.totalLoanCost += farmBE.totalLoanCost * proportion;
      entityBE.expectedBushels += farmBE.expectedBushels * proportion;
    };

    for (const farmBE of farmBreakEvens) {
      const splits = farmSplitsMap.get(farmBE.farmId);

      if (splits && splits.length > 0) {
        // Farm has entity splits - distribute costs proportionally
        for (const split of splits) {
          const entityBE = ensureEntity(split.grainEntityId, split.grainEntityName, farmBE.commodityType, farmBE.expectedYield);
          addToEntity(entityBE, farmBE, split.percentage);

          // Add the farm to the entity's farms list (with a note about the split)
          // Only add once per entity to avoid duplicates
          if (!entityBE.farms.some(f => f.farmId === farmBE.farmId)) {
            entityBE.farms.push({
              ...farmBE,
              // Optionally mark that this is a split farm
              farmName: `${farmBE.farmName} (${Math.round(split.percentage * 100)}%)`
            });
          }
        }
      } else {
        // No entity splits - attribute 100% to the primary grainEntityId (current behavior)
        const farm = farms.find(f => f.id === farmBE.farmId);
        const entityName = farm?.grainEntity?.name || '';
        const entityBE = ensureEntity(farmBE.grainEntityId, entityName, farmBE.commodityType, farmBE.expectedYield);
        addToEntity(entityBE, farmBE, 1.0);
        entityBE.farms.push(farmBE);
      }
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

  private async getEffectiveTruckingFee(farm: any): Promise<number> {
    if (farm.truckingFeePerBushel !== null && farm.truckingFeePerBushel !== undefined) {
      return Number(farm.truckingFeePerBushel);
    }
    const business = await prisma.business.findUnique({
      where: { id: farm.grainEntity.businessId },
      select: { defaultTruckingFeePerBushel: true }
    });
    return business ? Number(business.defaultTruckingFeePerBushel) : 0;
  }

  private async calculateFarmBreakEven(
    farm: any,
    productionMap: Map<string, any>,
    year: number
  ): Promise<FarmBreakEven> {
    const acres = Number(farm.acres);

    // Calculate fertilizer cost and nutrient totals
    let fertilizerCost = 0;
    let totalNitrogen = 0;
    let totalPhosphorus = 0;
    let totalPotassium = 0;
    let totalSulfur = 0;

    const fertilizerUsage = farm.fertilizerUsage.map((usage: any) => {
      const amountUsed = Number(usage.amountUsed);
      const pricePerUnit = Number(usage.fertilizer.pricePerUnit);
      const totalCost = amountUsed * pricePerUnit;
      fertilizerCost += totalCost;

      // Calculate nutrients applied (in lbs)
      const acresApplied = usage.acresApplied ? Number(usage.acresApplied) : acres;
      if (usage.fertilizer.isManure) {
        // Manure: nutrient values are lbs per 1,000 gal (liquid) or lbs per ton (dry)
        // amountUsed is stored in 1,000 gal units (liquid) or tons (dry)
        if (usage.fertilizer.nitrogenPct) totalNitrogen += amountUsed * Number(usage.fertilizer.nitrogenPct);
        if (usage.fertilizer.phosphorusPct) totalPhosphorus += amountUsed * Number(usage.fertilizer.phosphorusPct);
        if (usage.fertilizer.potassiumPct) totalPotassium += amountUsed * Number(usage.fertilizer.potassiumPct);
        if (usage.fertilizer.sulfurPct) totalSulfur += amountUsed * Number(usage.fertilizer.sulfurPct);
      } else {
        // Commercial fertilizer: convert to lbs then apply percentage
        const unit = usage.fertilizer.unit;
        let lbsApplied: number;
        if (unit === 'TON') {
          lbsApplied = amountUsed * 2000;
        } else if (unit === 'GAL' && usage.fertilizer.lbsPerGallon) {
          lbsApplied = amountUsed * Number(usage.fertilizer.lbsPerGallon);
        } else {
          lbsApplied = amountUsed;
        }

        if (usage.fertilizer.nitrogenPct) {
          totalNitrogen += lbsApplied * (Number(usage.fertilizer.nitrogenPct) / 100);
        }
        if (usage.fertilizer.phosphorusPct) {
          totalPhosphorus += lbsApplied * (Number(usage.fertilizer.phosphorusPct) / 100);
        }
        if (usage.fertilizer.potassiumPct) {
          totalPotassium += lbsApplied * (Number(usage.fertilizer.potassiumPct) / 100);
        }
        if (usage.fertilizer.sulfurPct) {
          totalSulfur += lbsApplied * (Number(usage.fertilizer.sulfurPct) / 100);
        }
      }

      return {
        name: usage.fertilizer.name,
        amountUsed,
        unit: usage.fertilizer.unit,
        pricePerUnit,
        totalCost
      };
    });

    // Calculate nutrient summary (lbs per acre)
    const nutrientSummary = {
      nitrogenPerAcre: acres > 0 ? totalNitrogen / acres : 0,
      phosphorusPerAcre: acres > 0 ? totalPhosphorus / acres : 0,
      potassiumPerAcre: acres > 0 ? totalPotassium / acres : 0,
      sulfurPerAcre: acres > 0 ? totalSulfur / acres : 0
    };

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

    // Calculate trucking cost
    const truckingFeePerBushel = await this.getEffectiveTruckingFee(farm);
    const expectedYieldForTrucking = Number(farm.projectedYield) || 0;
    const truckingCost = truckingFeePerBushel * expectedYieldForTrucking * acres;

    // Total costs
    const totalCostExcludingInterest = fertilizerCost + chemicalCost + seedCost + landRent + insurance + otherCosts + truckingCost;
    const totalCost = totalCostExcludingInterest + totalLoanCost;
    const costPerAcre = acres > 0 ? totalCost / acres : 0;

    // Get expected yield from production data, with default fallbacks
    const productionKey = `${farm.grainEntityId}-${farm.commodityType}`;
    const production = productionMap.get(productionKey);

    // Default yields by commodity type (used when no production record exists)
    const defaultYields: Record<string, number> = {
      'CORN': 180,
      'SOYBEANS': 55,
      'WHEAT': 60
    };

    const expectedYield = production
      ? Number(production.bushelsPerAcre)
      : (defaultYields[farm.commodityType] || 0);
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
      truckingCost,
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
      seedUsage,
      nutrientSummary
    };
  }
}
