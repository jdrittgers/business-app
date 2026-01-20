import { PrismaClient, CommodityType } from '@prisma/client';

const prisma = new PrismaClient();

export interface OldCropInventoryItem {
  id: string;
  businessId: string;
  commodityType: CommodityType;
  unpricedBushels: number;
  cropYear: number;
  updatedAt: Date;
  createdAt: Date;
}

export interface UpdateOldCropInventoryRequest {
  commodityType: CommodityType;
  unpricedBushels: number;
  cropYear: number;
}

export const oldCropInventoryService = {
  /**
   * Get all old crop inventory for a business
   */
  async getInventory(businessId: string): Promise<OldCropInventoryItem[]> {
    const inventory = await prisma.oldCropInventory.findMany({
      where: { businessId },
      orderBy: [
        { cropYear: 'desc' },
        { commodityType: 'asc' }
      ]
    });

    return inventory.map(item => ({
      ...item,
      unpricedBushels: Number(item.unpricedBushels)
    }));
  },

  /**
   * Get inventory for a specific commodity and crop year
   */
  async getInventoryByCommodity(
    businessId: string,
    commodityType: CommodityType,
    cropYear: number
  ): Promise<OldCropInventoryItem | null> {
    const inventory = await prisma.oldCropInventory.findUnique({
      where: {
        businessId_commodityType_cropYear: {
          businessId,
          commodityType,
          cropYear
        }
      }
    });

    if (!inventory) return null;

    return {
      ...inventory,
      unpricedBushels: Number(inventory.unpricedBushels)
    };
  },

  /**
   * Update or create old crop inventory
   */
  async updateInventory(
    businessId: string,
    data: UpdateOldCropInventoryRequest
  ): Promise<OldCropInventoryItem> {
    const inventory = await prisma.oldCropInventory.upsert({
      where: {
        businessId_commodityType_cropYear: {
          businessId,
          commodityType: data.commodityType,
          cropYear: data.cropYear
        }
      },
      update: {
        unpricedBushels: data.unpricedBushels
      },
      create: {
        businessId,
        commodityType: data.commodityType,
        unpricedBushels: data.unpricedBushels,
        cropYear: data.cropYear
      }
    });

    return {
      ...inventory,
      unpricedBushels: Number(inventory.unpricedBushels)
    };
  },

  /**
   * Delete old crop inventory entry
   */
  async deleteInventory(
    businessId: string,
    commodityType: CommodityType,
    cropYear: number
  ): Promise<void> {
    await prisma.oldCropInventory.delete({
      where: {
        businessId_commodityType_cropYear: {
          businessId,
          commodityType,
          cropYear
        }
      }
    });
  },

  /**
   * Get total unpriced bushels for a commodity across all crop years
   */
  async getTotalUnpricedBushels(
    businessId: string,
    commodityType: CommodityType
  ): Promise<number> {
    const result = await prisma.oldCropInventory.aggregate({
      where: {
        businessId,
        commodityType
      },
      _sum: {
        unpricedBushels: true
      }
    });

    return Number(result._sum.unpricedBushels || 0);
  }
};
