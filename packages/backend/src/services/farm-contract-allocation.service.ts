import { prisma } from '../prisma/client';
import {
  FarmContractAllocation,
  CreateFarmAllocationRequest,
  UpdateFarmAllocationRequest,
  SetContractAllocationsRequest,
  AutoAllocateRequest,
  AllocationResult,
  ContractWithAllocations,
  FarmAllocationSummary,
  AllocationType,
  CommodityType,
  FarmBasicInfo
} from '@business-app/shared';
import { Decimal } from '@prisma/client/runtime/library';

export class FarmContractAllocationService {
  /**
   * Get all allocations for a contract
   */
  async getContractAllocations(contractId: string, businessId: string): Promise<FarmContractAllocation[]> {
    // Verify contract belongs to business
    const contract = await prisma.grainContract.findFirst({
      where: {
        id: contractId,
        grainEntity: { businessId }
      }
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const allocations = await prisma.farmContractAllocation.findMany({
      where: { contractId },
      include: {
        farm: true
      },
      orderBy: { allocatedBushels: 'desc' }
    });

    return allocations.map(this.mapAllocationToResponse);
  }

  /**
   * Get contract with all allocations and summary info
   */
  async getContractWithAllocations(contractId: string, businessId: string): Promise<ContractWithAllocations> {
    const contract = await prisma.grainContract.findFirst({
      where: {
        id: contractId,
        grainEntity: { businessId }
      },
      include: {
        grainEntity: true,
        farmAllocations: {
          include: { farm: true }
        }
      }
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const totalAllocated = contract.farmAllocations.reduce(
      (sum, a) => sum + Number(a.allocatedBushels),
      0
    );

    return {
      id: contract.id,
      grainEntityId: contract.grainEntityId,
      createdBy: contract.createdBy,
      contractType: contract.contractType as any,
      cropYear: contract.cropYear as any,
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
      bushelsDelivered: Number(contract.bushelsDelivered),
      isActive: contract.isActive,
      notes: contract.notes || undefined,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      grainEntity: contract.grainEntity,
      farmAllocations: contract.farmAllocations.map(this.mapAllocationToResponse),
      totalAllocated,
      unallocatedBushels: Number(contract.totalBushels) - totalAllocated
    };
  }

  /**
   * Calculate proportional allocations for farms matching contract criteria
   */
  async calculateProportionalAllocations(
    contractId: string,
    businessId: string
  ): Promise<{ farmId: string; farmName: string; expectedBushels: number; share: number; allocatedBushels: number }[]> {
    const contract = await prisma.grainContract.findFirst({
      where: {
        id: contractId,
        grainEntity: { businessId }
      },
      include: { grainEntity: true }
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Get all farms matching contract's entity, commodity, and year
    const farms = await prisma.farm.findMany({
      where: {
        grainEntityId: contract.grainEntityId,
        commodityType: contract.commodityType,
        year: contract.year,
        deletedAt: null
      }
    });

    if (farms.length === 0) {
      return [];
    }

    // Calculate expected bushels for each farm
    const farmExpectedBushels = farms.map(farm => ({
      farmId: farm.id,
      farmName: farm.name,
      expectedBushels: Number(farm.acres) * Number(farm.projectedYield)
    }));

    // Calculate total expected bushels
    const totalExpected = farmExpectedBushels.reduce((sum, f) => sum + f.expectedBushels, 0);

    if (totalExpected === 0) {
      return farmExpectedBushels.map(f => ({
        ...f,
        share: 0,
        allocatedBushels: 0
      }));
    }

    // Calculate proportional allocation
    const contractBushels = Number(contract.totalBushels);
    return farmExpectedBushels.map(f => ({
      ...f,
      share: f.expectedBushels / totalExpected,
      allocatedBushels: Math.round((f.expectedBushels / totalExpected) * contractBushels * 100) / 100
    }));
  }

  /**
   * Auto-allocate contract to farms proportionally
   */
  async autoAllocateContract(
    contractId: string,
    businessId: string,
    request?: AutoAllocateRequest
  ): Promise<AllocationResult> {
    const calculations = await this.calculateProportionalAllocations(contractId, businessId);

    if (calculations.length === 0) {
      return {
        success: false,
        allocationsCreated: 0,
        allocationsUpdated: 0,
        totalAllocated: 0,
        errors: ['No matching farms found for this contract']
      };
    }

    // Filter to specific farms if requested
    const targetFarms = request?.farmIds
      ? calculations.filter(c => request.farmIds!.includes(c.farmId))
      : calculations;

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const farm of targetFarms) {
      try {
        await prisma.farmContractAllocation.upsert({
          where: {
            contractId_farmId: {
              contractId,
              farmId: farm.farmId
            }
          },
          create: {
            contractId,
            farmId: farm.farmId,
            allocationType: 'PROPORTIONAL',
            allocatedBushels: farm.allocatedBushels
          },
          update: {
            allocationType: 'PROPORTIONAL',
            allocatedBushels: farm.allocatedBushels,
            manualPercentage: null
          }
        });

        // Check if it existed
        const existing = await prisma.farmContractAllocation.findUnique({
          where: {
            contractId_farmId: { contractId, farmId: farm.farmId }
          }
        });
        if (existing) {
          updated++;
        } else {
          created++;
        }
      } catch (error: any) {
        errors.push(`Failed to allocate to farm ${farm.farmName}: ${error.message}`);
      }
    }

    const totalAllocated = targetFarms.reduce((sum, f) => sum + f.allocatedBushels, 0);

    return {
      success: errors.length === 0,
      allocationsCreated: created,
      allocationsUpdated: updated,
      totalAllocated,
      errors
    };
  }

  /**
   * Set manual allocations for a contract
   */
  async setContractAllocations(
    contractId: string,
    businessId: string,
    request: SetContractAllocationsRequest
  ): Promise<AllocationResult> {
    // Verify contract
    const contract = await prisma.grainContract.findFirst({
      where: {
        id: contractId,
        grainEntity: { businessId }
      }
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    // Delete existing allocations not in the new set
    const newFarmIds = request.allocations.map(a => a.farmId);
    await prisma.farmContractAllocation.deleteMany({
      where: {
        contractId,
        farmId: { notIn: newFarmIds }
      }
    });

    for (const allocation of request.allocations) {
      try {
        const existing = await prisma.farmContractAllocation.findUnique({
          where: {
            contractId_farmId: { contractId, farmId: allocation.farmId }
          }
        });

        await prisma.farmContractAllocation.upsert({
          where: {
            contractId_farmId: {
              contractId,
              farmId: allocation.farmId
            }
          },
          create: {
            contractId,
            farmId: allocation.farmId,
            allocationType: allocation.allocationType,
            allocatedBushels: allocation.allocatedBushels || 0,
            manualPercentage: allocation.manualPercentage,
            notes: allocation.notes
          },
          update: {
            allocationType: allocation.allocationType,
            allocatedBushels: allocation.allocatedBushels || 0,
            manualPercentage: allocation.manualPercentage,
            notes: allocation.notes
          }
        });

        if (existing) {
          updated++;
        } else {
          created++;
        }
      } catch (error: any) {
        errors.push(`Failed to set allocation for farm ${allocation.farmId}: ${error.message}`);
      }
    }

    const totalAllocated = request.allocations.reduce((sum, a) => sum + (a.allocatedBushels || 0), 0);

    return {
      success: errors.length === 0,
      allocationsCreated: created,
      allocationsUpdated: updated,
      totalAllocated,
      errors
    };
  }

  /**
   * Reset contract allocations to proportional
   */
  async resetToProportional(contractId: string, businessId: string): Promise<AllocationResult> {
    return this.autoAllocateContract(contractId, businessId);
  }

  /**
   * Get all allocations for a farm with coverage summary
   */
  async getFarmAllocations(
    farmId: string,
    businessId: string,
    year?: number
  ): Promise<FarmAllocationSummary> {
    const farm = await prisma.farm.findFirst({
      where: {
        id: farmId,
        grainEntity: { businessId },
        deletedAt: null
      }
    });

    if (!farm) {
      throw new Error('Farm not found');
    }

    const whereClause: any = { farmId };
    if (year) {
      whereClause.contract = { year };
    }

    const allocations = await prisma.farmContractAllocation.findMany({
      where: whereClause,
      include: {
        contract: {
          include: { grainEntity: true }
        }
      }
    });

    const expectedBushels = Number(farm.acres) * Number(farm.projectedYield);
    const totalContracted = allocations.reduce((sum, a) => sum + Number(a.allocatedBushels), 0);

    // Calculate blended price (weighted average)
    let blendedPrice: number | undefined;
    if (totalContracted > 0) {
      let totalValue = 0;
      for (const alloc of allocations) {
        const contract = alloc.contract;
        const bushels = Number(alloc.allocatedBushels);
        // Use cash price if available, otherwise futures + basis
        const price = contract.cashPrice
          ? Number(contract.cashPrice)
          : (contract.futuresPrice && contract.basisPrice
              ? Number(contract.futuresPrice) + Number(contract.basisPrice)
              : 0);
        totalValue += price * bushels;
      }
      blendedPrice = totalValue / totalContracted;
    }

    return {
      farm: {
        id: farm.id,
        grainEntityId: farm.grainEntityId,
        name: farm.name,
        acres: Number(farm.acres),
        commodityType: farm.commodityType as CommodityType,
        year: farm.year,
        projectedYield: Number(farm.projectedYield),
        aph: Number(farm.aph)
      },
      expectedBushels,
      allocations: allocations.map(this.mapAllocationToResponse),
      totalContracted,
      uncontractedBushels: expectedBushels - totalContracted,
      coveragePercentage: expectedBushels > 0 ? (totalContracted / expectedBushels) * 100 : 0,
      blendedPrice
    };
  }

  /**
   * Get allocation summaries for all farms in an entity
   */
  async getEntityFarmAllocations(
    grainEntityId: string,
    businessId: string,
    year: number,
    commodityType?: CommodityType
  ): Promise<FarmAllocationSummary[]> {
    const whereClause: any = {
      grainEntityId,
      year,
      deletedAt: null,
      grainEntity: { businessId }
    };

    if (commodityType) {
      whereClause.commodityType = commodityType;
    }

    const farms = await prisma.farm.findMany({
      where: whereClause,
      include: {
        contractAllocations: {
          include: {
            contract: true
          }
        }
      }
    });

    return farms.map(farm => {
      const expectedBushels = Number(farm.acres) * Number(farm.projectedYield);
      const totalContracted = farm.contractAllocations.reduce(
        (sum, a) => sum + Number(a.allocatedBushels),
        0
      );

      // Calculate blended price
      let blendedPrice: number | undefined;
      if (totalContracted > 0) {
        let totalValue = 0;
        for (const alloc of farm.contractAllocations) {
          const contract = alloc.contract;
          const bushels = Number(alloc.allocatedBushels);
          const price = contract.cashPrice
            ? Number(contract.cashPrice)
            : (contract.futuresPrice && contract.basisPrice
                ? Number(contract.futuresPrice) + Number(contract.basisPrice)
                : 0);
          totalValue += price * bushels;
        }
        blendedPrice = totalValue / totalContracted;
      }

      return {
        farm: {
          id: farm.id,
          grainEntityId: farm.grainEntityId,
          name: farm.name,
          acres: Number(farm.acres),
          commodityType: farm.commodityType as CommodityType,
          year: farm.year,
          projectedYield: Number(farm.projectedYield),
          aph: Number(farm.aph)
        },
        expectedBushels,
        allocations: farm.contractAllocations.map(this.mapAllocationToResponse),
        totalContracted,
        uncontractedBushels: expectedBushels - totalContracted,
        coveragePercentage: expectedBushels > 0 ? (totalContracted / expectedBushels) * 100 : 0,
        blendedPrice
      };
    });
  }

  /**
   * Delete a specific allocation
   */
  async deleteAllocation(contractId: string, farmId: string, businessId: string): Promise<void> {
    // Verify contract belongs to business
    const contract = await prisma.grainContract.findFirst({
      where: {
        id: contractId,
        grainEntity: { businessId }
      }
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    await prisma.farmContractAllocation.delete({
      where: {
        contractId_farmId: { contractId, farmId }
      }
    });
  }

  /**
   * Helper: Map Prisma allocation to response type
   */
  private mapAllocationToResponse(allocation: any): FarmContractAllocation {
    return {
      id: allocation.id,
      contractId: allocation.contractId,
      farmId: allocation.farmId,
      allocationType: allocation.allocationType as AllocationType,
      allocatedBushels: Number(allocation.allocatedBushels),
      manualPercentage: allocation.manualPercentage ? Number(allocation.manualPercentage) : undefined,
      notes: allocation.notes || undefined,
      createdAt: allocation.createdAt,
      updatedAt: allocation.updatedAt,
      farm: allocation.farm ? {
        id: allocation.farm.id,
        grainEntityId: allocation.farm.grainEntityId,
        name: allocation.farm.name,
        acres: Number(allocation.farm.acres),
        commodityType: allocation.farm.commodityType,
        year: allocation.farm.year,
        projectedYield: Number(allocation.farm.projectedYield),
        aph: Number(allocation.farm.aph)
      } : undefined,
      contract: allocation.contract ? {
        id: allocation.contract.id,
        grainEntityId: allocation.contract.grainEntityId,
        createdBy: allocation.contract.createdBy,
        contractType: allocation.contract.contractType,
        cropYear: allocation.contract.cropYear,
        year: allocation.contract.year,
        commodityType: allocation.contract.commodityType,
        buyer: allocation.contract.buyer,
        totalBushels: Number(allocation.contract.totalBushels),
        bushelsDelivered: Number(allocation.contract.bushelsDelivered),
        isActive: allocation.contract.isActive,
        createdAt: allocation.contract.createdAt,
        updatedAt: allocation.contract.updatedAt
      } : undefined
    };
  }
}
