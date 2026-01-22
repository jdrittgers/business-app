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
      category: c.category as ChemicalCategory
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
      category: chemical.category as ChemicalCategory
    };
  }

  async create(businessId: string, data: CreateChemicalRequest): Promise<Chemical> {
    const chemical = await prisma.chemical.create({
      data: {
        businessId,
        name: data.name,
        pricePerUnit: data.pricePerUnit,
        unit: data.unit,
        category: data.category || ChemicalCategory.HERBICIDE
      }
    });

    return {
      ...chemical,
      pricePerUnit: Number(chemical.pricePerUnit),
      unit: chemical.unit as UnitType,
      category: chemical.category as ChemicalCategory
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
      category: chemical.category as ChemicalCategory
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
