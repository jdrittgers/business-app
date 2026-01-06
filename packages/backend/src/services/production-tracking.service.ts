import { prisma } from '../prisma/client';
import {
  CropYearProduction,
  CreateProductionRequest,
  UpdateProductionRequest,
  GetProductionsQuery,
  CommodityType
} from '@business-app/shared';

export class ProductionTrackingService {
  // Get all productions for a business
  async getProductions(businessId: string, query: GetProductionsQuery): Promise<CropYearProduction[]> {
    const whereClause: any = {
      grainEntity: { businessId }
    };

    if (query.grainEntityId) {
      whereClause.grainEntityId = query.grainEntityId;
    }
    if (query.commodityType) {
      whereClause.commodityType = query.commodityType as any;
    }
    if (query.year) {
      whereClause.year = query.year;
    }

    const productions = await prisma.cropYearProduction.findMany({
      where: whereClause,
      include: {
        grainEntity: true
      },
      orderBy: [
        { year: 'desc' },
        { grainEntity: { name: 'asc' } },
        { commodityType: 'asc' }
      ]
    });

    return productions.map(this.mapProductionToResponse);
  }

  // Get single production
  async getProduction(productionId: string): Promise<CropYearProduction> {
    const production = await prisma.cropYearProduction.findUnique({
      where: { id: productionId },
      include: { grainEntity: true }
    });

    if (!production) {
      throw new Error('Production record not found');
    }

    return this.mapProductionToResponse(production);
  }

  // Create production record
  async createProduction(data: CreateProductionRequest): Promise<CropYearProduction> {
    const totalProjected = Number(data.acres) * Number(data.bushelsPerAcre);

    const production = await prisma.cropYearProduction.create({
      data: {
        grainEntityId: data.grainEntityId,
        commodityType: data.commodityType as any,
        year: data.year,
        acres: data.acres,
        bushelsPerAcre: data.bushelsPerAcre,
        totalProjected,
        notes: data.notes
      },
      include: { grainEntity: true }
    });

    return this.mapProductionToResponse(production);
  }

  // Update production record
  async updateProduction(productionId: string, data: UpdateProductionRequest): Promise<CropYearProduction> {
    // Get existing production to calculate new total
    const existing = await prisma.cropYearProduction.findUnique({
      where: { id: productionId }
    });

    if (!existing) {
      throw new Error('Production record not found');
    }

    const acres = data.acres !== undefined ? data.acres : Number(existing.acres);
    const bushelsPerAcre = data.bushelsPerAcre !== undefined ? data.bushelsPerAcre : Number(existing.bushelsPerAcre);
    const totalProjected = acres * bushelsPerAcre;

    const production = await prisma.cropYearProduction.update({
      where: { id: productionId },
      data: {
        ...(data.acres !== undefined && { acres: data.acres }),
        ...(data.bushelsPerAcre !== undefined && { bushelsPerAcre: data.bushelsPerAcre }),
        totalProjected,
        ...(data.notes !== undefined && { notes: data.notes })
      },
      include: { grainEntity: true }
    });

    return this.mapProductionToResponse(production);
  }

  // Delete production record
  async deleteProduction(productionId: string): Promise<void> {
    await prisma.cropYearProduction.delete({
      where: { id: productionId }
    });
  }

  // Get production summary by entity/commodity/year
  async getProductionSummary(
    businessId: string,
    grainEntityId?: string,
    year?: number
  ): Promise<any[]> {
    const whereEntity: any = { businessId };
    if (grainEntityId) {
      whereEntity.id = grainEntityId;
    }

    const whereProduction: any = {};
    if (year) {
      whereProduction.year = year;
    }

    const entities = await prisma.grainEntity.findMany({
      where: whereEntity,
      include: {
        productions: {
          where: whereProduction,
          orderBy: { year: 'desc' }
        }
      }
    });

    return entities.map(entity => ({
      grainEntityId: entity.id,
      grainEntityName: entity.name,
      productions: entity.productions.map(this.mapProductionToResponse)
    }));
  }

  private mapProductionToResponse(production: any): CropYearProduction {
    return {
      id: production.id,
      grainEntityId: production.grainEntityId,
      commodityType: production.commodityType as CommodityType,
      year: production.year,
      acres: Number(production.acres),
      bushelsPerAcre: Number(production.bushelsPerAcre),
      totalProjected: Number(production.totalProjected),
      notes: production.notes || undefined,
      createdAt: production.createdAt,
      updatedAt: production.updatedAt,
      grainEntity: production.grainEntity
    };
  }
}
