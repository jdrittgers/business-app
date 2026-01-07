import { prisma } from '../prisma/client';
import {
  DashboardSummary,
  EntityProductionSummary,
  AccumulatorPerformance,
  GetDashboardSummaryQuery,
  CommodityType,
  ContractType,
  GrainContract
} from '@business-app/shared';

export class GrainAnalyticsService {
  // Get comprehensive dashboard summary
  async getDashboardSummary(
    businessId: string,
    query: GetDashboardSummaryQuery
  ): Promise<DashboardSummary> {
    const year = query.year || new Date().getFullYear();
    const entityFilter = query.grainEntityId ? { id: query.grainEntityId } : {};

    // Get all entities for this business
    const entities = await prisma.grainEntity.findMany({
      where: { businessId, ...entityFilter },
      include: {
        productions: {
          where: { year }
        },
        contracts: {
          where: { year },
          include: {
            accumulatorDetails: {
              include: {
                dailyEntries: true
              }
            }
          }
        }
      }
    });

    // Calculate entity summaries
    const byEntity: EntityProductionSummary[] = [];
    let totalProjectedAll = 0;
    let totalSoldAll = 0;

    const byCommodityMap = new Map<CommodityType, { projected: number; sold: number }>();
    const byContractTypeMap = new Map<ContractType, number>();
    const byCommodityPriceMap = new Map<CommodityType, { totalValue: number; totalBushels: number }>();

    for (const entity of entities) {
      for (const production of entity.productions) {
        const commodityType = production.commodityType as CommodityType;
        const totalProjected = Number(production.totalProjected);

        // Calculate total sold for this entity/commodity/year
        const relevantContracts = entity.contracts.filter(
          c => c.commodityType === commodityType && c.year === year
        );

        const totalSold = relevantContracts.reduce(
          (sum, contract) => sum + this.calculateBushelsDelivered(contract),
          0
        );

        const totalRemaining = totalProjected - totalSold;
        const percentageSold = totalProjected > 0 ? (totalSold / totalProjected) * 100 : 0;

        // Calculate average price for this entity/commodity
        let entityTotalValue = 0;
        let entityTotalBushels = 0;

        for (const contract of relevantContracts) {
          const bushelsDelivered = this.calculateBushelsDelivered(contract);
          const effectivePrice = this.calculateEffectivePrice(contract);

          if (effectivePrice !== null && bushelsDelivered > 0) {
            const value = bushelsDelivered * effectivePrice;
            entityTotalValue += value;
            entityTotalBushels += bushelsDelivered;

            // Aggregate for commodity totals
            const commodityPrice = byCommodityPriceMap.get(commodityType) ||
              { totalValue: 0, totalBushels: 0 };
            commodityPrice.totalValue += value;
            commodityPrice.totalBushels += bushelsDelivered;
            byCommodityPriceMap.set(commodityType, commodityPrice);
          }
        }

        const averagePrice = entityTotalBushels > 0
          ? entityTotalValue / entityTotalBushels
          : 0;

        byEntity.push({
          grainEntityId: entity.id,
          grainEntityName: entity.name,
          commodityType,
          year,
          totalProjected,
          totalSold,
          totalRemaining,
          percentageSold,
          averagePrice,
          contracts: relevantContracts.map(c => this.mapContract(c))
        });

        // Aggregate totals
        totalProjectedAll += totalProjected;
        totalSoldAll += totalSold;

        // By commodity
        const commodityData = byCommodityMap.get(commodityType) || { projected: 0, sold: 0 };
        commodityData.projected += totalProjected;
        commodityData.sold += totalSold;
        byCommodityMap.set(commodityType, commodityData);

        // By contract type
        for (const contract of relevantContracts) {
          const contractType = contract.contractType as ContractType;
          const current = byContractTypeMap.get(contractType) || 0;
          byContractTypeMap.set(contractType, current + Number(contract.totalBushels));
        }
      }
    }

    const totalRemainingAll = totalProjectedAll - totalSoldAll;
    const percentageSoldAll = totalProjectedAll > 0 ? (totalSoldAll / totalProjectedAll) * 100 : 0;

    // Format by commodity
    const byCommodity = Array.from(byCommodityMap.entries()).map(([commodityType, data]) => {
      const priceData = byCommodityPriceMap.get(commodityType);
      const averagePrice = priceData && priceData.totalBushels > 0
        ? priceData.totalValue / priceData.totalBushels
        : 0;

      return {
        commodityType,
        projected: data.projected,
        sold: data.sold,
        remaining: data.projected - data.sold,
        averagePrice
      };
    });

    // Format by contract type
    const byContractType = Array.from(byContractTypeMap.entries()).map(([contractType, totalBushels]) => ({
      contractType,
      totalBushels,
      percentageOfTotal: totalProjectedAll > 0 ? (totalBushels / totalProjectedAll) * 100 : 0
    }));

    return {
      totalProjected: totalProjectedAll,
      totalSold: totalSoldAll,
      totalRemaining: totalRemainingAll,
      percentageSold: percentageSoldAll,
      byCommodity,
      byContractType,
      byEntity
    };
  }

  // Get accumulator performance metrics
  async getAccumulatorPerformance(contractId: string): Promise<AccumulatorPerformance> {
    const contract = await prisma.grainContract.findUnique({
      where: { id: contractId },
      include: {
        accumulatorDetails: {
          include: {
            dailyEntries: {
              orderBy: { date: 'asc' }
            }
          }
        }
      }
    });

    if (!contract || !contract.accumulatorDetails) {
      throw new Error('Accumulator contract not found');
    }

    const details = contract.accumulatorDetails;
    const entries = details.dailyEntries || [];

    const totalDays = entries.length;
    const daysDoubled = entries.filter(e => e.wasDoubledUp).length;
    const totalMarketed = entries.reduce((sum, e) => sum + Number(e.bushelsMarketed), 0);
    const averageDailyRate = totalDays > 0 ? totalMarketed / totalDays : 0;
    const totalMarketValue = entries.reduce(
      (sum, e) => sum + Number(e.bushelsMarketed) * Number(e.marketPrice),
      0
    );
    const averageMarketPrice = totalMarketed > 0 ? totalMarketValue / totalMarketed : 0;

    return {
      contractId,
      totalDays,
      daysDoubled,
      averageDailyRate,
      knockoutReached: details.knockoutReached || false,
      knockoutDate: details.knockoutDate || undefined,
      totalMarketed,
      averageMarketPrice
    };
  }

  // Helper to calculate bushels delivered (auto-calculates for accumulators)
  private calculateBushelsDelivered(contract: any): number {
    let bushelsDelivered = Number(contract.bushelsDelivered);

    if (contract.contractType === 'ACCUMULATOR' && contract.accumulatorDetails) {
      const details = contract.accumulatorDetails;
      const startDate = new Date(details.startDate);
      const now = new Date();

      // Determine end date: knockout date, contract end date, or today
      let effectiveEndDate = now;
      if (details.knockoutReached && details.knockoutDate) {
        effectiveEndDate = new Date(details.knockoutDate);
      } else if (details.endDate) {
        const contractEndDate = new Date(details.endDate);
        effectiveEndDate = contractEndDate < now ? contractEndDate : now;
      }

      // Calculate days between start and effective end
      if (effectiveEndDate >= startDate) {
        const millisecondsPerDay = 1000 * 60 * 60 * 24;
        const daysDiff = Math.floor((effectiveEndDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1;
        const dailyBushels = Number(details.dailyBushels);

        // Calculate marketed bushels
        bushelsDelivered = daysDiff * dailyBushels;

        // Don't exceed total bushels
        if (bushelsDelivered > Number(contract.totalBushels)) {
          bushelsDelivered = Number(contract.totalBushels);
        }
      }
    }

    return bushelsDelivered;
  }

  // Helper to calculate effective price per contract
  private calculateEffectivePrice(contract: any): number | null {
    const contractType = contract.contractType;

    // CASH contract
    if (contractType === 'CASH') {
      return contract.cashPrice ? Number(contract.cashPrice) : null;
    }

    // BASIS contract
    if (contractType === 'BASIS') {
      if (contract.basisPrice !== null && contract.futuresPrice !== null) {
        return Number(contract.futuresPrice) + Number(contract.basisPrice);
      }
      return null;
    }

    // HTA contract
    if (contractType === 'HTA') {
      const futuresPrice = contract.futuresPrice ? Number(contract.futuresPrice) : null;
      if (!futuresPrice) return null;

      let basis: number;
      if (contract.accumulatorDetails?.basisLocked && contract.basisPrice) {
        basis = Number(contract.basisPrice);
      } else {
        // Use default basis assumptions
        const commodity = contract.commodityType;
        if (commodity === 'CORN') basis = -0.45;
        else if (commodity === 'SOYBEANS') basis = -0.75;
        else if (commodity === 'WHEAT') basis = -0.60;
        else return null;
      }

      return futuresPrice + basis;
    }

    // ACCUMULATOR contract
    if (contractType === 'ACCUMULATOR' && contract.accumulatorDetails) {
      const details = contract.accumulatorDetails;
      const entries = details.dailyEntries || [];

      // If we have daily entries, calculate actual weighted average
      if (entries.length > 0) {
        const totalMarketed = entries.reduce((sum: number, e: any) =>
          sum + Number(e.bushelsMarketed), 0);
        const totalValue = entries.reduce((sum: number, e: any) =>
          sum + Number(e.bushelsMarketed) * Number(e.marketPrice), 0);

        return totalMarketed > 0 ? totalValue / totalMarketed : null;
      }

      // No daily entries yet - estimate using doubleUpPrice minus basis
      const doubleUpPrice = details.doubleUpPrice ? Number(details.doubleUpPrice) : null;
      if (!doubleUpPrice) return null;

      let basis: number;
      if (details.basisLocked && contract.basisPrice) {
        basis = Number(contract.basisPrice);
      } else {
        // Use default basis assumptions
        const commodity = contract.commodityType;
        if (commodity === 'CORN') basis = -0.45;
        else if (commodity === 'SOYBEANS') basis = -0.75;
        else if (commodity === 'WHEAT') basis = -0.60;
        else return null;
      }

      return doubleUpPrice + basis; // basis is negative, so this subtracts
    }

    return null;
  }

  // Helper to map contract
  private mapContract(contract: any): GrainContract {
    return {
      id: contract.id,
      grainEntityId: contract.grainEntityId,
      createdBy: contract.createdBy,
      contractType: contract.contractType as ContractType,
      cropYear: contract.cropYear,
      year: contract.year,
      commodityType: contract.commodityType as CommodityType,
      contractNumber: contract.contractNumber || undefined,
      buyer: contract.buyer,
      totalBushels: Number(contract.totalBushels),
      deliveryStartDate: contract.deliveryStartDate || undefined,
      deliveryEndDate: contract.deliveryEndDate || undefined,
      cashPrice: contract.cashPrice ? Number(contract.cashPrice) : undefined,
      basisPrice: contract.basisPrice ? Number(contract.basisPrice) : undefined,
      futuresMonth: contract.futuresMonth || undefined,
      futuresPrice: contract.futuresPrice ? Number(contract.futuresPrice) : undefined,
      bushelsDelivered: this.calculateBushelsDelivered(contract),
      isActive: contract.isActive,
      notes: contract.notes || undefined,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt
    };
  }
}
