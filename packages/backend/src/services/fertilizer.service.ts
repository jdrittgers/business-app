import { prisma } from '../prisma/client';
import { Fertilizer, CreateFertilizerRequest, UpdateFertilizerRequest, UnitType } from '@business-app/shared';

// Preset fertilizer nutrient data for common products
const FERTILIZER_PRESETS = [
  { pattern: /uan.*32|32.*uan|32%/i, nitrogenPct: 32, phosphorusPct: 0, potassiumPct: 0, sulfurPct: 0, isLiquid: true, lbsPerGallon: 11.06 },
  { pattern: /uan.*28|28.*uan|28%/i, nitrogenPct: 28, phosphorusPct: 0, potassiumPct: 0, sulfurPct: 0, isLiquid: true, lbsPerGallon: 10.67 },
  { pattern: /anhydrous|ammonia|nh3|82-0-0/i, nitrogenPct: 82, phosphorusPct: 0, potassiumPct: 0, sulfurPct: 0, isLiquid: false },
  { pattern: /urea|46-0-0/i, nitrogenPct: 46, phosphorusPct: 0, potassiumPct: 0, sulfurPct: 0, isLiquid: false },
  { pattern: /map|11-52-0/i, nitrogenPct: 11, phosphorusPct: 52, potassiumPct: 0, sulfurPct: 0, isLiquid: false },
  { pattern: /dap|18-46-0/i, nitrogenPct: 18, phosphorusPct: 46, potassiumPct: 0, sulfurPct: 0, isLiquid: false },
  { pattern: /potash|potassium|0-0-60|mop/i, nitrogenPct: 0, phosphorusPct: 0, potassiumPct: 60, sulfurPct: 0, isLiquid: false },
  { pattern: /mesz|12-40-0.*10|12-40-0-10/i, nitrogenPct: 12, phosphorusPct: 40, potassiumPct: 0, sulfurPct: 10, isLiquid: false },
  { pattern: /ams|21-0-0.*24|ammonium.*sulfate/i, nitrogenPct: 21, phosphorusPct: 0, potassiumPct: 0, sulfurPct: 24, isLiquid: false },
  { pattern: /thio.*sul|12-0-0.*26/i, nitrogenPct: 12, phosphorusPct: 0, potassiumPct: 0, sulfurPct: 26, isLiquid: true, lbsPerGallon: 11.5 },
  { pattern: /10-34-0/i, nitrogenPct: 10, phosphorusPct: 34, potassiumPct: 0, sulfurPct: 0, isLiquid: true, lbsPerGallon: 11.65 },
  { pattern: /ats|12-0-0-26/i, nitrogenPct: 12, phosphorusPct: 0, potassiumPct: 0, sulfurPct: 26, isLiquid: true, lbsPerGallon: 11.5 },
];

export class FertilizerService {
  /**
   * Look up preset nutrient data based on fertilizer name
   */
  getPresetData(name: string): { nitrogenPct: number; phosphorusPct: number; potassiumPct: number; sulfurPct: number; isLiquid: boolean; lbsPerGallon?: number } | null {
    for (const preset of FERTILIZER_PRESETS) {
      if (preset.pattern.test(name)) {
        return {
          nitrogenPct: preset.nitrogenPct,
          phosphorusPct: preset.phosphorusPct,
          potassiumPct: preset.potassiumPct,
          sulfurPct: preset.sulfurPct,
          isLiquid: preset.isLiquid,
          lbsPerGallon: preset.lbsPerGallon
        };
      }
    }
    return null;
  }

  /**
   * Calculate price per application unit from purchase unit price
   * For liquid: pricePerGallon = pricePerTon / (2000 / lbsPerGallon)
   */
  calculatePricePerUnit(pricePerPurchaseUnit: number, purchaseUnit: string, lbsPerGallon?: number): number {
    if (purchaseUnit === 'TON' && lbsPerGallon) {
      // Convert price per ton to price per gallon
      const gallonsPerTon = 2000 / lbsPerGallon;
      return pricePerPurchaseUnit / gallonsPerTon;
    } else if (purchaseUnit === 'TON') {
      // Convert price per ton to price per lb
      return pricePerPurchaseUnit / 2000;
    }
    return pricePerPurchaseUnit;
  }

  /**
   * Convert Prisma fertilizer to typed Fertilizer interface
   */
  private toFertilizer(f: any): Fertilizer {
    return {
      ...f,
      pricePerUnit: Number(f.pricePerUnit),
      unit: f.unit as UnitType,
      defaultRatePerAcre: f.defaultRatePerAcre ? Number(f.defaultRatePerAcre) : undefined,
      rateUnit: f.rateUnit || undefined,
      nitrogenPct: f.nitrogenPct ? Number(f.nitrogenPct) : undefined,
      phosphorusPct: f.phosphorusPct ? Number(f.phosphorusPct) : undefined,
      potassiumPct: f.potassiumPct ? Number(f.potassiumPct) : undefined,
      sulfurPct: f.sulfurPct ? Number(f.sulfurPct) : undefined,
      isLiquid: f.isLiquid || false,
      lbsPerGallon: f.lbsPerGallon ? Number(f.lbsPerGallon) : undefined,
      purchaseUnit: f.purchaseUnit || undefined,
      pricePerPurchaseUnit: f.pricePerPurchaseUnit ? Number(f.pricePerPurchaseUnit) : undefined
    };
  }

  async getAll(businessId: string): Promise<Fertilizer[]> {
    const fertilizers = await prisma.fertilizer.findMany({
      where: { businessId },
      orderBy: { name: 'asc' }
    });

    return fertilizers.map(f => this.toFertilizer(f));
  }

  async getById(id: string, businessId: string): Promise<Fertilizer | null> {
    const fertilizer = await prisma.fertilizer.findFirst({
      where: { id, businessId }
    });

    if (!fertilizer) return null;

    return this.toFertilizer(fertilizer);
  }

  async create(businessId: string, data: CreateFertilizerRequest): Promise<Fertilizer> {
    // Auto-populate nutrients from preset if not provided
    const preset = this.getPresetData(data.name);

    // Calculate pricePerUnit from purchase unit if provided
    let pricePerUnit = data.pricePerUnit;
    if (data.pricePerPurchaseUnit && data.purchaseUnit) {
      pricePerUnit = this.calculatePricePerUnit(
        data.pricePerPurchaseUnit,
        data.purchaseUnit,
        data.lbsPerGallon || preset?.lbsPerGallon
      );
    }

    const fertilizer = await prisma.fertilizer.create({
      data: {
        businessId,
        name: data.name,
        pricePerUnit: pricePerUnit,
        unit: data.unit,
        defaultRatePerAcre: data.defaultRatePerAcre,
        rateUnit: data.rateUnit,
        // Use provided values or fall back to preset
        nitrogenPct: data.nitrogenPct ?? preset?.nitrogenPct,
        phosphorusPct: data.phosphorusPct ?? preset?.phosphorusPct,
        potassiumPct: data.potassiumPct ?? preset?.potassiumPct,
        sulfurPct: data.sulfurPct ?? preset?.sulfurPct,
        isLiquid: data.isLiquid ?? preset?.isLiquid ?? false,
        lbsPerGallon: data.lbsPerGallon ?? preset?.lbsPerGallon,
        purchaseUnit: data.purchaseUnit,
        pricePerPurchaseUnit: data.pricePerPurchaseUnit
      }
    });

    return this.toFertilizer(fertilizer);
  }

  async update(id: string, businessId: string, data: UpdateFertilizerRequest): Promise<Fertilizer> {
    // Verify fertilizer belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Fertilizer not found');
    }

    // Recalculate pricePerUnit if purchase unit price is being updated
    let updateData: any = { ...data };
    if (data.pricePerPurchaseUnit !== undefined && data.purchaseUnit) {
      updateData.pricePerUnit = this.calculatePricePerUnit(
        data.pricePerPurchaseUnit,
        data.purchaseUnit,
        data.lbsPerGallon || existing.lbsPerGallon
      );
    }

    const fertilizer = await prisma.fertilizer.update({
      where: { id },
      data: updateData
    });

    return this.toFertilizer(fertilizer);
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
    // Auto-populate nutrients from preset
    const preset = this.getPresetData(name);

    const fertilizer = await prisma.fertilizer.create({
      data: {
        businessId,
        name,
        pricePerUnit: 0,
        unit,
        needsPricing: true,
        nitrogenPct: preset?.nitrogenPct,
        phosphorusPct: preset?.phosphorusPct,
        potassiumPct: preset?.potassiumPct,
        sulfurPct: preset?.sulfurPct,
        isLiquid: preset?.isLiquid ?? false,
        lbsPerGallon: preset?.lbsPerGallon
      }
    });

    return this.toFertilizer(fertilizer);
  }

  /**
   * Get all fertilizers that need pricing
   */
  async getNeedsPricing(businessId: string): Promise<Fertilizer[]> {
    const fertilizers = await prisma.fertilizer.findMany({
      where: { businessId, needsPricing: true },
      orderBy: { createdAt: 'desc' }
    });

    return fertilizers.map(f => this.toFertilizer(f));
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

    return this.toFertilizer(fertilizer);
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
