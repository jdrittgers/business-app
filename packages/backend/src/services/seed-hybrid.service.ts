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

  /**
   * Get area-wide average prices for seed hybrids
   * Groups by product name and commodity type to calculate avg, min, max prices
   */
  async getAreaAverages(): Promise<Array<{
    name: string;
    commodityType: string;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    farmerCount: number;
  }>> {
    const results = await prisma.$queryRaw<Array<{
      name: string;
      commodity_type: string;
      avg_price: number;
      min_price: number;
      max_price: number;
      farmer_count: bigint;
    }>>`
      SELECT
        UPPER(TRIM(name)) as name,
        commodity_type,
        AVG(price_per_bag) as avg_price,
        MIN(price_per_bag) as min_price,
        MAX(price_per_bag) as max_price,
        COUNT(DISTINCT business_id) as farmer_count
      FROM seed_hybrids
      WHERE is_active = true
      GROUP BY UPPER(TRIM(name)), commodity_type
      HAVING COUNT(DISTINCT business_id) >= 2
      ORDER BY name
    `;

    return results.map(r => ({
      name: r.name,
      commodityType: r.commodity_type,
      avgPrice: Number(r.avg_price),
      minPrice: Number(r.min_price),
      maxPrice: Number(r.max_price),
      farmerCount: Number(r.farmer_count)
    }));
  }
}
