import { prisma } from '../prisma/client';
import { CommodityType } from '@prisma/client';

interface CreateGrainBinData {
  grainEntityId: string;
  name: string;
  capacity: number;
  currentBushels?: number;
  commodityType: CommodityType;
  cropYear: number;
  notes?: string;
}

interface UpdateGrainBinData {
  name?: string;
  capacity?: number;
  commodityType?: CommodityType;
  cropYear?: number;
  notes?: string;
  isActive?: boolean;
}

interface AddGrainData {
  bushels: number;
  description?: string;
}

interface RemoveGrainData {
  bushels: number;
  description?: string;
  scaleTicketId?: string;
  grainContractId?: string;
}

export class GrainBinService {
  // Get all bins for a business
  async getBinsByBusiness(businessId: string): Promise<any[]> {
    // Get all grain entities for the business
    const grainEntities = await prisma.grainEntity.findMany({
      where: { businessId },
      select: { id: true }
    });

    const grainEntityIds = grainEntities.map(ge => ge.id);

    const bins = await prisma.grainBin.findMany({
      where: {
        grainEntityId: { in: grainEntityIds },
        isActive: true
      },
      include: {
        grainEntity: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { cropYear: 'desc' },
        { name: 'asc' }
      ]
    });

    return bins.map(bin => ({
      id: bin.id,
      grainEntityId: bin.grainEntityId,
      grainEntityName: bin.grainEntity.name,
      name: bin.name,
      capacity: Number(bin.capacity),
      currentBushels: Number(bin.currentBushels),
      contractedBushels: Number(bin.contractedBushels),
      commodityType: bin.commodityType,
      cropYear: bin.cropYear,
      isAvailableForSale: bin.isAvailableForSale,
      notes: bin.notes || undefined,
      isActive: bin.isActive,
      createdAt: bin.createdAt,
      updatedAt: bin.updatedAt,
      fillPercentage: Math.round((Number(bin.currentBushels) / Number(bin.capacity)) * 100)
    }));
  }

  // Get bins by grain entity
  async getBinsByGrainEntity(grainEntityId: string): Promise<any[]> {
    const bins = await prisma.grainBin.findMany({
      where: {
        grainEntityId,
        isActive: true
      },
      orderBy: [
        { cropYear: 'desc' },
        { name: 'asc' }
      ]
    });

    return bins.map(bin => ({
      id: bin.id,
      grainEntityId: bin.grainEntityId,
      name: bin.name,
      capacity: Number(bin.capacity),
      currentBushels: Number(bin.currentBushels),
      contractedBushels: Number(bin.contractedBushels),
      commodityType: bin.commodityType,
      cropYear: bin.cropYear,
      isAvailableForSale: bin.isAvailableForSale,
      notes: bin.notes || undefined,
      isActive: bin.isActive,
      createdAt: bin.createdAt,
      updatedAt: bin.updatedAt,
      fillPercentage: Math.round((Number(bin.currentBushels) / Number(bin.capacity)) * 100)
    }));
  }

  // Get a single bin by ID
  async getById(binId: string): Promise<any | null> {
    const bin = await prisma.grainBin.findUnique({
      where: { id: binId },
      include: {
        grainEntity: {
          select: {
            id: true,
            name: true,
            businessId: true
          }
        }
      }
    });

    if (!bin) return null;

    return {
      id: bin.id,
      grainEntityId: bin.grainEntityId,
      grainEntityName: bin.grainEntity.name,
      businessId: bin.grainEntity.businessId,
      name: bin.name,
      capacity: Number(bin.capacity),
      currentBushels: Number(bin.currentBushels),
      contractedBushels: Number(bin.contractedBushels),
      commodityType: bin.commodityType,
      cropYear: bin.cropYear,
      isAvailableForSale: bin.isAvailableForSale,
      notes: bin.notes || undefined,
      isActive: bin.isActive,
      createdAt: bin.createdAt,
      updatedAt: bin.updatedAt,
      fillPercentage: Math.round((Number(bin.currentBushels) / Number(bin.capacity)) * 100)
    };
  }

  // Create a new grain bin
  async createBin(userId: string, data: CreateGrainBinData): Promise<any> {
    // Verify user has access to this grain entity
    const grainEntity = await prisma.grainEntity.findUnique({
      where: { id: data.grainEntityId },
      include: {
        business: {
          include: {
            members: {
              where: { userId }
            }
          }
        }
      }
    });

    if (!grainEntity || grainEntity.business.members.length === 0) {
      throw new Error('Not authorized to create bins for this grain entity');
    }

    const initialBushels = data.currentBushels || 0;

    // Create bin in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const bin = await tx.grainBin.create({
        data: {
          grainEntityId: data.grainEntityId,
          name: data.name,
          capacity: data.capacity,
          currentBushels: initialBushels,
          commodityType: data.commodityType,
          cropYear: data.cropYear,
          notes: data.notes
        }
      });

      // If initial bushels provided, create an ADDITION transaction
      if (initialBushels > 0) {
        await tx.binTransaction.create({
          data: {
            binId: bin.id,
            type: 'ADDITION',
            bushels: initialBushels,
            description: 'Initial grain inventory',
            createdBy: userId
          }
        });
      }

      return bin;
    });

    return this.getById(result.id);
  }

  // Update a grain bin
  async updateBin(binId: string, userId: string, data: UpdateGrainBinData): Promise<any> {
    // Verify user has access
    const bin = await this.getById(binId);
    if (!bin) {
      throw new Error('Bin not found');
    }

    const membership = await prisma.businessMember.findFirst({
      where: {
        userId,
        businessId: bin.businessId
      }
    });

    if (!membership) {
      throw new Error('Not authorized to update this bin');
    }

    const updated = await prisma.grainBin.update({
      where: { id: binId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.commodityType && { commodityType: data.commodityType }),
        ...(data.cropYear !== undefined && { cropYear: data.cropYear }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    });

    return this.getById(updated.id);
  }

  // Add grain to a bin
  async addGrain(binId: string, userId: string, data: AddGrainData): Promise<any> {
    if (data.bushels <= 0) {
      throw new Error('Bushels must be greater than 0');
    }

    // Verify user has access
    const bin = await this.getById(binId);
    if (!bin) {
      throw new Error('Bin not found');
    }

    const membership = await prisma.businessMember.findFirst({
      where: {
        userId,
        businessId: bin.businessId
      }
    });

    if (!membership) {
      throw new Error('Not authorized to modify this bin');
    }

    // Check capacity
    const newTotal = bin.currentBushels + data.bushels;
    if (newTotal > bin.capacity) {
      throw new Error(`Adding ${data.bushels} bushels would exceed bin capacity of ${bin.capacity} bushels`);
    }

    // Add grain in transaction
    await prisma.$transaction(async (tx) => {
      // Update bin balance
      await tx.grainBin.update({
        where: { id: binId },
        data: {
          currentBushels: {
            increment: data.bushels
          }
        }
      });

      // Create transaction record
      await tx.binTransaction.create({
        data: {
          binId,
          type: 'ADDITION',
          bushels: data.bushels,
          description: data.description || 'Grain added',
          createdBy: userId
        }
      });
    });

    return this.getById(binId);
  }

  // Remove grain from a bin
  async removeGrain(binId: string, userId: string, data: RemoveGrainData): Promise<any> {
    if (data.bushels <= 0) {
      throw new Error('Bushels must be greater than 0');
    }

    // Verify user has access
    const bin = await this.getById(binId);
    if (!bin) {
      throw new Error('Bin not found');
    }

    const membership = await prisma.businessMember.findFirst({
      where: {
        userId,
        businessId: bin.businessId
      }
    });

    if (!membership) {
      throw new Error('Not authorized to modify this bin');
    }

    // Check sufficient balance
    if (bin.currentBushels < data.bushels) {
      throw new Error(`Insufficient grain. Available: ${bin.currentBushels} bushels, Requested: ${data.bushels} bushels`);
    }

    // Determine transaction type
    const transactionType = data.grainContractId ? 'SALE' : 'REMOVAL';

    // Remove grain in transaction
    await prisma.$transaction(async (tx) => {
      // Update bin balance
      await tx.grainBin.update({
        where: { id: binId },
        data: {
          currentBushels: {
            decrement: data.bushels
          }
        }
      });

      // Create transaction record
      await tx.binTransaction.create({
        data: {
          binId,
          type: transactionType,
          bushels: data.bushels,
          description: data.description,
          scaleTicketId: data.scaleTicketId,
          grainContractId: data.grainContractId,
          createdBy: userId
        }
      });
    });

    return this.getById(binId);
  }

  // Get transaction history for a bin
  async getTransactions(binId: string, userId: string): Promise<any[]> {
    // Verify user has access
    const bin = await this.getById(binId);
    if (!bin) {
      throw new Error('Bin not found');
    }

    const membership = await prisma.businessMember.findFirst({
      where: {
        userId,
        businessId: bin.businessId
      }
    });

    if (!membership) {
      throw new Error('Not authorized to view this bin');
    }

    const transactions = await prisma.binTransaction.findMany({
      where: { binId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        scaleTicket: {
          select: {
            id: true,
            loadNumber: true,
            ticketDate: true
          }
        },
        grainContract: {
          select: {
            id: true,
            contractNumber: true,
            buyer: true
          }
        }
      },
      orderBy: {
        transactionDate: 'desc'
      }
    });

    return transactions.map(tx => ({
      id: tx.id,
      binId: tx.binId,
      type: tx.type,
      bushels: Number(tx.bushels),
      description: tx.description || undefined,
      scaleTicket: tx.scaleTicket || undefined,
      grainContract: tx.grainContract || undefined,
      createdBy: {
        id: tx.user.id,
        name: `${tx.user.firstName} ${tx.user.lastName}`,
        email: tx.user.email
      },
      transactionDate: tx.transactionDate,
      createdAt: tx.createdAt
    }));
  }

  // Get summary by year for a business
  async getSummaryByYear(businessId: string, year: number): Promise<any> {
    // Get all grain entities for the business
    const grainEntities = await prisma.grainEntity.findMany({
      where: { businessId },
      select: { id: true }
    });

    const grainEntityIds = grainEntities.map(ge => ge.id);

    const bins = await prisma.grainBin.findMany({
      where: {
        grainEntityId: { in: grainEntityIds },
        cropYear: year,
        isActive: true
      }
    });

    // Group by commodity type
    const summary = bins.reduce((acc, bin) => {
      const commodity = bin.commodityType;
      if (!acc[commodity]) {
        acc[commodity] = {
          commodityType: commodity,
          totalCapacity: 0,
          totalBushels: 0,
          binCount: 0
        };
      }

      acc[commodity].totalCapacity += Number(bin.capacity);
      acc[commodity].totalBushels += Number(bin.currentBushels);
      acc[commodity].binCount += 1;

      return acc;
    }, {} as Record<string, any>);

    return Object.values(summary);
  }
}
