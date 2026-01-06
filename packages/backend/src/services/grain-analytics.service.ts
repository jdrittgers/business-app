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

        byEntity.push({
          grainEntityId: entity.id,
          grainEntityName: entity.name,
          commodityType,
          year,
          totalProjected,
          totalSold,
          totalRemaining,
          percentageSold,
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
    const byCommodity = Array.from(byCommodityMap.entries()).map(([commodityType, data]) => ({
      commodityType,
      projected: data.projected,
      sold: data.sold,
      remaining: data.projected - data.sold
    }));

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
