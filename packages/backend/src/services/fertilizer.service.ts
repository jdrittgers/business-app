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
      unit: f.unit as UnitType
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
      unit: fertilizer.unit as UnitType
    };
  }

  async create(businessId: string, data: CreateFertilizerRequest): Promise<Fertilizer> {
    const fertilizer = await prisma.fertilizer.create({
      data: {
        businessId,
        name: data.name,
        pricePerUnit: data.pricePerUnit,
        unit: data.unit
      }
    });

    return {
      ...fertilizer,
      pricePerUnit: Number(fertilizer.pricePerUnit),
      unit: fertilizer.unit as UnitType
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
      unit: fertilizer.unit as UnitType
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
}
