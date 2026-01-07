import { prisma } from '../prisma/client';
import { Chemical, CreateChemicalRequest, UpdateChemicalRequest, UnitType } from '@business-app/shared';

export class ChemicalService {
  async getAll(businessId: string): Promise<Chemical[]> {
    const chemicals = await prisma.chemical.findMany({
      where: { businessId },
      orderBy: { name: 'asc' }
    });

    return chemicals.map(c => ({
      ...c,
      pricePerUnit: Number(c.pricePerUnit),
      unit: c.unit as UnitType
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
      unit: chemical.unit as UnitType
    };
  }

  async create(businessId: string, data: CreateChemicalRequest): Promise<Chemical> {
    const chemical = await prisma.chemical.create({
      data: {
        businessId,
        name: data.name,
        pricePerUnit: data.pricePerUnit,
        unit: data.unit
      }
    });

    return {
      ...chemical,
      pricePerUnit: Number(chemical.pricePerUnit),
      unit: chemical.unit as UnitType
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
      unit: chemical.unit as UnitType
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
}
