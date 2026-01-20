import { PrismaClient, CommodityType } from '@prisma/client';

const prisma = new PrismaClient();

export interface LocalBasisItem {
  id: string;
  businessId: string;
  commodityType: CommodityType;
  basisValue: number;
  notes: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export interface UpdateLocalBasisRequest {
  commodityType: CommodityType;
  basisValue: number;
  notes?: string;
}

export const localBasisService = {
  /**
   * Get all local basis values for a business
   */
  async getBasis(businessId: string): Promise<LocalBasisItem[]> {
    const basis = await prisma.localBasis.findMany({
      where: { businessId },
      orderBy: { commodityType: 'asc' }
    });

    return basis.map(item => ({
      ...item,
      basisValue: Number(item.basisValue)
    }));
  },

  /**
   * Get basis for a specific commodity
   */
  async getBasisByCommodity(
    businessId: string,
    commodityType: CommodityType
  ): Promise<LocalBasisItem | null> {
    const basis = await prisma.localBasis.findUnique({
      where: {
        businessId_commodityType: {
          businessId,
          commodityType
        }
      }
    });

    if (!basis) return null;

    return {
      ...basis,
      basisValue: Number(basis.basisValue)
    };
  },

  /**
   * Update or create local basis
   */
  async updateBasis(
    businessId: string,
    data: UpdateLocalBasisRequest
  ): Promise<LocalBasisItem> {
    const basis = await prisma.localBasis.upsert({
      where: {
        businessId_commodityType: {
          businessId,
          commodityType: data.commodityType
        }
      },
      update: {
        basisValue: data.basisValue,
        notes: data.notes
      },
      create: {
        businessId,
        commodityType: data.commodityType,
        basisValue: data.basisValue,
        notes: data.notes
      }
    });

    return {
      ...basis,
      basisValue: Number(basis.basisValue)
    };
  },

  /**
   * Delete local basis entry
   */
  async deleteBasis(
    businessId: string,
    commodityType: CommodityType
  ): Promise<void> {
    await prisma.localBasis.delete({
      where: {
        businessId_commodityType: {
          businessId,
          commodityType
        }
      }
    });
  }
};
