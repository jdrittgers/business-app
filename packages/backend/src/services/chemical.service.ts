import { prisma } from '../prisma/client';
import { Chemical, CreateChemicalRequest, UpdateChemicalRequest, UnitType, ChemicalCategory } from '@business-app/shared';

export class ChemicalService {
  async getAll(businessId: string, category?: ChemicalCategory): Promise<Chemical[]> {
    const chemicals = await prisma.chemical.findMany({
      where: {
        businessId,
        ...(category && { category })
      },
      orderBy: { name: 'asc' }
    });

    return chemicals.map(c => ({
      ...c,
      pricePerUnit: Number(c.pricePerUnit),
      unit: c.unit as UnitType,
      category: c.category as ChemicalCategory,
      defaultRatePerAcre: c.defaultRatePerAcre ? Number(c.defaultRatePerAcre) : undefined,
      rateUnit: c.rateUnit || undefined
    }));
  }

  async getById(id: string, businessId: string): Promise<Chemical | null> {
    const chemical = await prisma.chemical.findFirst({
      where: { id, businessId }
    });

    if (!chemical) return null;

    return {
      ...chemical,
      pricePerUnit: Number(chemical.pricePerUnit),
      unit: chemical.unit as UnitType,
      category: chemical.category as ChemicalCategory,
      defaultRatePerAcre: chemical.defaultRatePerAcre ? Number(chemical.defaultRatePerAcre) : undefined,
      rateUnit: chemical.rateUnit || undefined
    };
  }

  async create(businessId: string, data: CreateChemicalRequest): Promise<Chemical> {
    const chemical = await prisma.chemical.create({
      data: {
        businessId,
        name: data.name,
        pricePerUnit: data.pricePerUnit,
        unit: data.unit,
        category: data.category || ChemicalCategory.HERBICIDE,
        defaultRatePerAcre: data.defaultRatePerAcre,
        rateUnit: data.rateUnit
      }
    });

    return {
      ...chemical,
      pricePerUnit: Number(chemical.pricePerUnit),
      unit: chemical.unit as UnitType,
      category: chemical.category as ChemicalCategory,
      defaultRatePerAcre: chemical.defaultRatePerAcre ? Number(chemical.defaultRatePerAcre) : undefined,
      rateUnit: chemical.rateUnit || undefined
    };
  }

  async update(id: string, businessId: string, data: UpdateChemicalRequest): Promise<Chemical> {
    // Verify chemical belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Chemical not found');
    }

    const chemical = await prisma.chemical.update({
      where: { id },
      data
    });

    return {
      ...chemical,
      pricePerUnit: Number(chemical.pricePerUnit),
      unit: chemical.unit as UnitType,
      category: chemical.category as ChemicalCategory,
      defaultRatePerAcre: chemical.defaultRatePerAcre ? Number(chemical.defaultRatePerAcre) : undefined,
      rateUnit: chemical.rateUnit || undefined
    };
  }

  async delete(id: string, businessId: string): Promise<void> {
    // Verify chemical belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Chemical not found');
    }

    await prisma.chemical.delete({
      where: { id }
    });
  }

  /**
   * Create a chemical with needsPricing=true (for workers adding products without price info)
   */
  async createWithoutPrice(businessId: string, name: string, unit: UnitType, category: ChemicalCategory = ChemicalCategory.HERBICIDE): Promise<Chemical> {
    const chemical = await prisma.chemical.create({
      data: {
        businessId,
        name,
        pricePerUnit: 0,
        unit,
        category,
        needsPricing: true
      }
    });

    return {
      ...chemical,
      pricePerUnit: Number(chemical.pricePerUnit),
      unit: chemical.unit as UnitType,
      category: chemical.category as ChemicalCategory,
      defaultRatePerAcre: chemical.defaultRatePerAcre ? Number(chemical.defaultRatePerAcre) : undefined,
      rateUnit: chemical.rateUnit || undefined
    };
  }

  /**
   * Get all chemicals that need pricing
   */
  async getNeedsPricing(businessId: string): Promise<Chemical[]> {
    const chemicals = await prisma.chemical.findMany({
      where: { businessId, needsPricing: true },
      orderBy: { createdAt: 'desc' }
    });

    return chemicals.map(c => ({
      ...c,
      pricePerUnit: Number(c.pricePerUnit),
      unit: c.unit as UnitType,
      category: c.category as ChemicalCategory,
      defaultRatePerAcre: c.defaultRatePerAcre ? Number(c.defaultRatePerAcre) : undefined,
      rateUnit: c.rateUnit || undefined
    }));
  }

  /**
   * Set price for a chemical (clears needsPricing flag)
   */
  async setPrice(id: string, businessId: string, pricePerUnit: number): Promise<Chemical> {
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Chemical not found');
    }

    const chemical = await prisma.chemical.update({
      where: { id },
      data: { pricePerUnit, needsPricing: false }
    });

    return {
      ...chemical,
      pricePerUnit: Number(chemical.pricePerUnit),
      unit: chemical.unit as UnitType,
      category: chemical.category as ChemicalCategory,
      defaultRatePerAcre: chemical.defaultRatePerAcre ? Number(chemical.defaultRatePerAcre) : undefined,
      rateUnit: chemical.rateUnit || undefined
    };
  }

  /**
   * Get area-wide average prices for chemicals
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
      FROM chemicals
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
