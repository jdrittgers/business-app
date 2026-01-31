import { prisma } from '../prisma/client';
import {
  GrainContract,
  GrainEntity,
  CreateGrainContractRequest,
  UpdateGrainContractRequest,
  CreateAccumulatorEntryRequest,
  GetGrainContractsQuery,
  AccumulatorDetails,
  AccumulatorDailyEntry,
  UpdateAccumulatorDetailsRequest
} from '@business-app/shared';
import { ContractType, CropYear, CommodityType } from '@prisma/client';

export class GrainContractService {
  // Get all grain entities for a business
  async getGrainEntities(businessId: string): Promise<GrainEntity[]> {
    return await prisma.grainEntity.findMany({
      where: { businessId },
      orderBy: { name: 'asc' }
    });
  }

  // Create a new grain entity
  async createGrainEntity(businessId: string, name: string): Promise<GrainEntity> {
    return await prisma.grainEntity.create({
      data: {
        businessId,
        name
      }
    });
  }

  // Get all contracts with optional filters
  async getContracts(businessId: string, query: GetGrainContractsQuery): Promise<GrainContract[]> {
    const whereClause: any = {
      grainEntity: { businessId },
      deletedAt: null
    };

    if (query.grainEntityId) {
      whereClause.grainEntityId = query.grainEntityId;
    }
    if (query.cropYear) {
      whereClause.cropYear = query.cropYear as CropYear;
    }
    if (query.year) {
      whereClause.year = query.year;
    }
    if (query.contractType) {
      whereClause.contractType = query.contractType as ContractType;
    }
    if (query.commodityType) {
      whereClause.commodityType = query.commodityType as CommodityType;
    }
    if (query.isActive !== undefined) {
      whereClause.isActive = query.isActive === 'true';
    }

    const contracts = await prisma.grainContract.findMany({
      where: whereClause,
      include: {
        grainEntity: true,
        accumulatorDetails: {
          include: {
            dailyEntries: {
              orderBy: { date: 'desc' },
              take: 10
            }
          }
        }
      },
      orderBy: [
        { cropYear: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return contracts.map((contract) => this.mapContractToResponse(contract));
  }

  // Get single contract
  async getContract(contractId: string, businessId?: string): Promise<GrainContract> {
    const contract = await prisma.grainContract.findFirst({
      where: {
        id: contractId,
        ...(businessId ? { grainEntity: { businessId } } : {})
      },
      include: {
        grainEntity: true,
        accumulatorDetails: {
          include: {
            dailyEntries: {
              orderBy: { date: 'desc' }
            }
          }
        }
      }
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    return this.mapContractToResponse(contract);
  }

  // Create grain contract
  async createContract(userId: string, data: CreateGrainContractRequest): Promise<GrainContract> {
    const contract = await prisma.grainContract.create({
      data: {
        grainEntityId: data.grainEntityId,
        createdBy: userId,
        contractType: data.contractType as ContractType,
        cropYear: data.cropYear as CropYear,
        year: data.year || new Date().getFullYear(),
        commodityType: data.commodityType as CommodityType,
        contractNumber: data.contractNumber,
        buyer: data.buyer,
        totalBushels: data.totalBushels,
        deliveryStartDate: data.deliveryStartDate ? new Date(data.deliveryStartDate) : null,
        deliveryEndDate: data.deliveryEndDate ? new Date(data.deliveryEndDate) : null,
        cashPrice: data.cashPrice,
        basisPrice: data.basisPrice,
        futuresMonth: data.futuresMonth,
        futuresPrice: data.futuresPrice,
        notes: data.notes,
        accumulatorDetails: data.accumulatorDetails ? {
          create: {
            accumulatorType: data.accumulatorDetails.accumulatorType || 'WEEKLY',
            knockoutPrice: data.accumulatorDetails.knockoutPrice,
            doubleUpPrice: data.accumulatorDetails.doubleUpPrice,
            dailyBushels: data.accumulatorDetails.dailyBushels,
            weeklyBushels: data.accumulatorDetails.weeklyBushels || (data.accumulatorDetails.dailyBushels * 5),
            startDate: new Date(data.accumulatorDetails.startDate),
            endDate: data.accumulatorDetails.endDate ? new Date(data.accumulatorDetails.endDate) : null,
            isDailyDouble: data.accumulatorDetails.accumulatorType === 'DAILY',
            basisLocked: data.accumulatorDetails.basisLocked || false
          }
        } : undefined
      },
      include: {
        grainEntity: true,
        accumulatorDetails: true
      }
    });

    return this.mapContractToResponse(contract);
  }

  // Update grain contract
  async updateContract(contractId: string, data: UpdateGrainContractRequest, businessId?: string): Promise<GrainContract> {
    // Verify ownership if businessId provided
    if (businessId) {
      await this.getContract(contractId, businessId);
    }

    // Check if grainEntityId is changing — need to clear farm allocations if so
    let entityChanging = false;
    if (data.grainEntityId !== undefined) {
      const existing = await prisma.grainContract.findUnique({
        where: { id: contractId },
        select: { grainEntityId: true }
      });
      if (existing && existing.grainEntityId !== data.grainEntityId) {
        entityChanging = true;
      }
    }

    const updateData: any = {};

    // Core fields
    if (data.grainEntityId !== undefined) updateData.grainEntityId = data.grainEntityId;
    if (data.contractType !== undefined) updateData.contractType = data.contractType as ContractType;
    if (data.cropYear !== undefined) updateData.cropYear = data.cropYear as CropYear;
    if (data.year !== undefined) updateData.year = data.year;
    if (data.commodityType !== undefined) updateData.commodityType = data.commodityType as CommodityType;

    // Contract details
    if (data.contractNumber !== undefined) updateData.contractNumber = data.contractNumber;
    if (data.buyer !== undefined) updateData.buyer = data.buyer;
    if (data.totalBushels !== undefined) updateData.totalBushels = data.totalBushels;
    if (data.deliveryStartDate !== undefined) {
      updateData.deliveryStartDate = data.deliveryStartDate ? new Date(data.deliveryStartDate) : null;
    }
    if (data.deliveryEndDate !== undefined) {
      updateData.deliveryEndDate = data.deliveryEndDate ? new Date(data.deliveryEndDate) : null;
    }

    // Pricing fields
    if (data.cashPrice !== undefined) updateData.cashPrice = data.cashPrice;
    if (data.basisPrice !== undefined) updateData.basisPrice = data.basisPrice;
    if (data.futuresMonth !== undefined) updateData.futuresMonth = data.futuresMonth;
    if (data.futuresPrice !== undefined) updateData.futuresPrice = data.futuresPrice;

    // Status and notes
    if (data.bushelsDelivered !== undefined) updateData.bushelsDelivered = data.bushelsDelivered;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Handle accumulator details update
    if (data.accumulatorDetails) {
      const accDetails = data.accumulatorDetails;
      const accUpdateData: any = {};

      if (accDetails.accumulatorType !== undefined) accUpdateData.accumulatorType = accDetails.accumulatorType;
      if (accDetails.knockoutPrice !== undefined) accUpdateData.knockoutPrice = accDetails.knockoutPrice;
      if (accDetails.doubleUpPrice !== undefined) accUpdateData.doubleUpPrice = accDetails.doubleUpPrice;
      if (accDetails.dailyBushels !== undefined) accUpdateData.dailyBushels = accDetails.dailyBushels;
      if (accDetails.weeklyBushels !== undefined) accUpdateData.weeklyBushels = accDetails.weeklyBushels;
      if (accDetails.startDate !== undefined) accUpdateData.startDate = new Date(accDetails.startDate);
      if (accDetails.endDate !== undefined) accUpdateData.endDate = accDetails.endDate ? new Date(accDetails.endDate) : null;
      if (accDetails.isDailyDouble !== undefined) accUpdateData.isDailyDouble = accDetails.isDailyDouble;
      if (accDetails.basisLocked !== undefined) accUpdateData.basisLocked = accDetails.basisLocked;

      if (Object.keys(accUpdateData).length > 0) {
        // Upsert: update existing or create new accumulator details
        const existing = await prisma.accumulatorDetails.findUnique({
          where: { contractId }
        });

        if (existing) {
          await prisma.accumulatorDetails.update({
            where: { contractId },
            data: accUpdateData
          });
        } else {
          // Create new accumulator details if contract is being changed to ACCUMULATOR
          await prisma.accumulatorDetails.create({
            data: {
              contractId,
              knockoutPrice: accDetails.knockoutPrice || 0,
              doubleUpPrice: accDetails.doubleUpPrice || 0,
              dailyBushels: accDetails.dailyBushels || 0,
              startDate: accDetails.startDate ? new Date(accDetails.startDate) : new Date(),
              ...accUpdateData
            }
          });
        }

        console.log(`[Contract Update] accumulatorDetails updated: ${Object.keys(accUpdateData).join(',')}`);
      }
    }

    console.log(`[Contract Update] id=${contractId}, fields=${Object.keys(updateData).join(',')}`);

    const contract = await prisma.grainContract.update({
      where: { id: contractId },
      data: updateData,
      include: {
        grainEntity: true,
        accumulatorDetails: {
          include: { dailyEntries: { orderBy: { date: 'desc' }, take: 10 } }
        }
      }
    });

    // If entity changed, clear old farm allocations (they belonged to the previous entity's farms)
    if (entityChanging) {
      await prisma.farmContractAllocation.deleteMany({
        where: { contractId }
      });
      console.log(`[Contract Update] Entity changed — cleared farm allocations for contract ${contractId}`);
    }

    return this.mapContractToResponse(contract);
  }

  // Delete contract
  async deleteContract(contractId: string, businessId?: string): Promise<void> {
    if (businessId) {
      await this.getContract(contractId, businessId);
    }
    await prisma.grainContract.delete({
      where: { id: contractId }
    });
  }

  // Add accumulator daily entry
  async addAccumulatorEntry(
    contractId: string,
    data: CreateAccumulatorEntryRequest,
    businessId?: string
  ): Promise<AccumulatorDailyEntry> {
    const contract = await prisma.grainContract.findFirst({
      where: {
        id: contractId,
        ...(businessId ? { grainEntity: { businessId } } : {})
      },
      include: { accumulatorDetails: true }
    });

    if (!contract || !contract.accumulatorDetails) {
      throw new Error('Accumulator contract not found');
    }

    const entry = await prisma.accumulatorDailyEntry.create({
      data: {
        accumulatorId: contract.accumulatorDetails.id,
        date: new Date(data.date),
        bushelsMarketed: data.bushelsMarketed,
        marketPrice: data.marketPrice,
        wasDoubledUp: data.wasDoubledUp || false,
        notes: data.notes
      }
    });

    // Update total bushels marketed
    await prisma.accumulatorDetails.update({
      where: { id: contract.accumulatorDetails.id },
      data: {
        totalBushelsMarketed: {
          increment: data.bushelsMarketed
        }
      }
    });

    // Update contract bushels delivered
    await prisma.grainContract.update({
      where: { id: contractId },
      data: {
        bushelsDelivered: {
          increment: data.bushelsMarketed
        }
      }
    });

    return this.mapAccumulatorEntryToResponse(entry);
  }

  // Update accumulator details
  async updateAccumulatorDetails(
    contractId: string,
    data: UpdateAccumulatorDetailsRequest,
    businessId?: string
  ): Promise<AccumulatorDetails> {
    const contract = await prisma.grainContract.findFirst({
      where: {
        id: contractId,
        ...(businessId ? { grainEntity: { businessId } } : {})
      },
      include: { accumulatorDetails: true }
    });

    if (!contract || !contract.accumulatorDetails) {
      throw new Error('Accumulator contract not found');
    }

    const updateData: any = {};
    if (data.isDailyDouble !== undefined) updateData.isDailyDouble = data.isDailyDouble;
    if (data.isCurrentlyDoubled !== undefined) updateData.isCurrentlyDoubled = data.isCurrentlyDoubled;
    if (data.knockoutReached !== undefined) updateData.knockoutReached = data.knockoutReached;
    if (data.knockoutDate) updateData.knockoutDate = new Date(data.knockoutDate);

    const updated = await prisma.accumulatorDetails.update({
      where: { id: contract.accumulatorDetails.id },
      data: updateData,
      include: {
        dailyEntries: {
          orderBy: { date: 'desc' }
        }
      }
    });

    return this.mapAccumulatorDetailsToResponse(updated);
  }

  // Auto-detect knockout based on market price
  async checkAccumulatorKnockout(contractId: string, currentMarketPrice: number, businessId?: string): Promise<boolean> {
    const contract = await prisma.grainContract.findFirst({
      where: {
        id: contractId,
        ...(businessId ? { grainEntity: { businessId } } : {})
      },
      include: { accumulatorDetails: true }
    });

    if (!contract || !contract.accumulatorDetails) {
      return false;
    }

    const knockoutPrice = Number(contract.accumulatorDetails.knockoutPrice);
    const isKnockedOut = currentMarketPrice >= knockoutPrice;

    if (isKnockedOut && !contract.accumulatorDetails.knockoutReached) {
      await this.updateAccumulatorDetails(contractId, {
        knockoutReached: true,
        knockoutDate: new Date().toISOString()
      });
      return true;
    }

    return isKnockedOut;
  }

  // Helper method to map contract to response
  private mapContractToResponse(contract: any): GrainContract {
    // Auto-calculate bushels delivered for accumulator contracts based on current date
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

    return {
      id: contract.id,
      grainEntityId: contract.grainEntityId,
      createdBy: contract.createdBy,
      contractType: contract.contractType,
      cropYear: contract.cropYear,
      year: contract.year,
      commodityType: contract.commodityType,
      contractNumber: contract.contractNumber || undefined,
      buyer: contract.buyer,
      totalBushels: Number(contract.totalBushels),
      deliveryStartDate: contract.deliveryStartDate || undefined,
      deliveryEndDate: contract.deliveryEndDate || undefined,
      cashPrice: contract.cashPrice ? Number(contract.cashPrice) : undefined,
      basisPrice: contract.basisPrice ? Number(contract.basisPrice) : undefined,
      futuresMonth: contract.futuresMonth || undefined,
      futuresPrice: contract.futuresPrice ? Number(contract.futuresPrice) : undefined,
      bushelsDelivered: bushelsDelivered,
      isActive: contract.isActive,
      notes: contract.notes || undefined,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      grainEntity: contract.grainEntity,
      accumulatorDetails: contract.accumulatorDetails ? this.mapAccumulatorDetailsToResponse(contract.accumulatorDetails, bushelsDelivered) : undefined
    };
  }

  private mapAccumulatorDetailsToResponse(details: any, calculatedBushels?: number): AccumulatorDetails {
    return {
      ...details,
      knockoutPrice: Number(details.knockoutPrice),
      doubleUpPrice: Number(details.doubleUpPrice),
      dailyBushels: Number(details.dailyBushels),
      totalBushelsMarketed: calculatedBushels !== undefined ? calculatedBushels : Number(details.totalBushelsMarketed),
      isDailyDouble: details.isDailyDouble || false,
      isCurrentlyDoubled: details.isCurrentlyDoubled || false,
      knockoutReached: details.knockoutReached || false,
      knockoutDate: details.knockoutDate || undefined,
      basisLocked: details.basisLocked || false,
      dailyEntries: details.dailyEntries?.map((entry: any) => this.mapAccumulatorEntryToResponse(entry))
    };
  }

  private mapAccumulatorEntryToResponse(entry: any): AccumulatorDailyEntry {
    return {
      id: entry.id,
      accumulatorId: entry.accumulatorId,
      date: entry.date,
      bushelsMarketed: Number(entry.bushelsMarketed),
      marketPrice: Number(entry.marketPrice),
      wasDoubledUp: entry.wasDoubledUp,
      notes: entry.notes || undefined,
      createdAt: entry.createdAt
    };
  }
}
