import { prisma } from '../prisma/client';
import { Fertilizer, CreateFertilizerRequest, UpdateFertilizerRequest, UnitType } from '@business-app/shared';

export class FertilizerService {
  async getAll(businessId: string): Promise<Fertilizer[]> {
    const fertilizers = await prisma.fertilizer.findMany({
      where: { businessId },
      orderBy: { name: 'asc' }
    });

    return fertilizers.map(f => ({
      ...f,
      pricePerUnit: Number(f.pricePerUnit),
      unit: f.unit as UnitType,
      defaultRatePerAcre: f.defaultRatePerAcre ? Number(f.defaultRatePerAcre) : undefined,
      rateUnit: f.rateUnit || undefined
    }));
  }

  async getById(id: string, businessId: string): Promise<Fertilizer | null> {
    const fertilizer = await prisma.fertilizer.findFirst({
      where: { id, businessId }
    });

    if (!fertilizer) return null;

    return {
      ...fertilizer,
      pricePerUnit: Number(fertilizer.pricePerUnit),
      unit: fertilizer.unit as UnitType,
      defaultRatePerAcre: fertilizer.defaultRatePerAcre ? Number(fertilizer.defaultRatePerAcre) : undefined,
      rateUnit: fertilizer.rateUnit || undefined
    };
  }

  async create(businessId: string, data: CreateFertilizerRequest): Promise<Fertilizer> {
    const fertilizer = await prisma.fertilizer.create({
      data: {
        businessId,
        name: data.name,
        pricePerUnit: data.pricePerUnit,
        unit: data.unit,
        defaultRatePerAcre: data.defaultRatePerAcre,
        rateUnit: data.rateUnit
      }
    });

    return {
      ...fertilizer,
      pricePerUnit: Number(fertilizer.pricePerUnit),
      unit: fertilizer.unit as UnitType,
      defaultRatePerAcre: fertilizer.defaultRatePerAcre ? Number(fertilizer.defaultRatePerAcre) : undefined,
      rateUnit: fertilizer.rateUnit || undefined
    };
  }

  async update(id: string, businessId: string, data: UpdateFertilizerRequest): Promise<Fertilizer> {
    // Verify fertilizer belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Fertilizer not found');
    }

    const fertilizer = await prisma.fertilizer.update({
      where: { id },
      data
    });

    return {
      ...fertilizer,
      pricePerUnit: Number(fertilizer.pricePerUnit),
      unit: fertilizer.unit as UnitType,
      defaultRatePerAcre: fertilizer.defaultRatePerAcre ? Number(fertilizer.defaultRatePerAcre) : undefined,
      rateUnit: fertilizer.rateUnit || undefined
    };
  }

  async delete(id: string, businessId: string): Promise<void> {
    // Verify fertilizer belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Fertilizer not found');
    }

    await prisma.fertilizer.delete({
      where: { id }
    });
  }

  /**
   * Create a fertilizer with needsPricing=true (for workers adding products without price info)
   */
  async createWithoutPrice(businessId: string, name: string, unit: UnitType): Promise<Fertilizer> {
    const fertilizer = await prisma.fertilizer.create({
      data: {
        businessId,
        name,
        pricePerUnit: 0,
        unit,
        needsPricing: true
      }
    });

    return {
      ...fertilizer,
      pricePerUnit: Number(fertilizer.pricePerUnit),
      unit: fertilizer.unit as UnitType,
      defaultRatePerAcre: fertilizer.defaultRatePerAcre ? Number(fertilizer.defaultRatePerAcre) : undefined,
      rateUnit: fertilizer.rateUnit || undefined
    };
  }

  /**
   * Get all fertilizers that need pricing
   */
  async getNeedsPricing(businessId: string): Promise<Fertilizer[]> {
    const fertilizers = await prisma.fertilizer.findMany({
      where: { businessId, needsPricing: true },
      orderBy: { createdAt: 'desc' }
    });

    return fertilizers.map(f => ({
      ...f,
      pricePerUnit: Number(f.pricePerUnit),
      unit: f.unit as UnitType,
      defaultRatePerAcre: f.defaultRatePerAcre ? Number(f.defaultRatePerAcre) : undefined,
      rateUnit: f.rateUnit || undefined
    }));
  }

  /**
   * Set price for a fertilizer (clears needsPricing flag)
   */
  async setPrice(id: string, businessId: string, pricePerUnit: number): Promise<Fertilizer> {
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Fertilizer not found');
    }

    const fertilizer = await prisma.fertilizer.update({
      where: { id },
      data: { pricePerUnit, needsPricing: false }
    });

    return {
      ...fertilizer,
      pricePerUnit: Number(fertilizer.pricePerUnit),
      unit: fertilizer.unit as UnitType,
      defaultRatePerAcre: fertilizer.defaultRatePerAcre ? Number(fertilizer.defaultRatePerAcre) : undefined,
      rateUnit: fertilizer.rateUnit || undefined
    };
  }

  /**
   * Get area-wide average prices for fertilizers
   * Groups by product name and unit to calculate avg, min, max prices
   */
  async getAreaAverages(): Promise<Array<{
    name: string;
    unit: string;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    farmerCount: number;
  }>> {
    // Use raw query to aggregate across all businesses
    const results = await prisma.$queryRaw<Array<{
      name: string;
      unit: string;
      avg_price: number;
      min_price: number;
      max_price: number;
      farmer_count: bigint;
    }>>`
      SELECT
        UPPER(TRIM(name)) as name,
        unit,
        AVG(price_per_unit) as avg_price,
        MIN(price_per_unit) as min_price,
        MAX(price_per_unit) as max_price,
        COUNT(DISTINCT business_id) as farmer_count
      FROM fertilizers
      WHERE is_active = true
      GROUP BY UPPER(TRIM(name)), unit
      HAVING COUNT(DISTINCT business_id) >= 2
      ORDER BY name
    `;

    return results.map(r => ({
      name: r.name,
      unit: r.unit,
      avgPrice: Number(r.avg_price),
      minPrice: Number(r.min_price),
      maxPrice: Number(r.max_price),
      farmerCount: Number(r.farmer_count)
    }));
  }
}
