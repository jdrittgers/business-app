import { prisma } from '../prisma/client';
import { SeedHybrid, CreateSeedHybridRequest, UpdateSeedHybridRequest } from '@business-app/shared';

export class SeedHybridService {
  async getAll(businessId: string, commodityType?: string): Promise<SeedHybrid[]> {
    const seedHybrids = await prisma.seedHybrid.findMany({
      where: {
        businessId,
        ...(commodityType && { commodityType: commodityType as any })
      },
      orderBy: { name: 'asc' }
    });

    return seedHybrids.map(s => ({
      ...s,
      pricePerBag: Number(s.pricePerBag),
      commodityType: s.commodityType as any
    }));
  }

  async getById(id: string, businessId: string): Promise<SeedHybrid | null> {
    const seedHybrid = await prisma.seedHybrid.findFirst({
      where: { id, businessId }
    });

    if (!seedHybrid) return null;

    return {
      ...seedHybrid,
      pricePerBag: Number(seedHybrid.pricePerBag),
      commodityType: seedHybrid.commodityType as any
    };
  }

  async create(businessId: string, data: CreateSeedHybridRequest): Promise<SeedHybrid> {
    const seedHybrid = await prisma.seedHybrid.create({
      data: {
        businessId,
        name: data.name,
        commodityType: data.commodityType,
        pricePerBag: data.pricePerBag,
        seedsPerBag: data.seedsPerBag
      }
    });

    return {
      ...seedHybrid,
      pricePerBag: Number(seedHybrid.pricePerBag),
      commodityType: seedHybrid.commodityType as any
    };
  }

  async update(id: string, businessId: string, data: UpdateSeedHybridRequest): Promise<SeedHybrid> {
    // Verify seed hybrid belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Seed hybrid not found');
    }

    const seedHybrid = await prisma.seedHybrid.update({
      where: { id },
      data
    });

    return {
      ...seedHybrid,
      pricePerBag: Number(seedHybrid.pricePerBag),
      commodityType: seedHybrid.commodityType as any
    };
  }

  async delete(id: string, businessId: string): Promise<void> {
    // Verify seed hybrid belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Seed hybrid not found');
    }

    await prisma.seedHybrid.delete({
      where: { id }
    });
  }
}
