import { prisma } from '../prisma/client';
import {
  FarmTrial,
  FarmTrialPhoto,
  CreateFarmTrialRequest,
  UpdateFarmTrialRequest,
  TrialType,
  TrialStatus,
  ChemicalCategory
} from '@business-app/shared';

export class TrialService {
  async getAll(farmId: string, businessId: string): Promise<FarmTrial[]> {
    // Verify farm belongs to business
    const farm = await prisma.farm.findFirst({
      where: { id: farmId },
      include: { grainEntity: true }
    });

    if (!farm || farm.grainEntity.businessId !== businessId) {
      throw new Error('Farm not found');
    }

    const trials = await prisma.farmTrial.findMany({
      where: { farmId },
      include: {
        seedHybrid: true,
        fertilizer: true,
        chemical: true,
        photos: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return trials.map(t => this.mapTrial(t));
  }

  async getById(id: string, businessId: string): Promise<FarmTrial | null> {
    const trial = await prisma.farmTrial.findFirst({
      where: { id },
      include: {
        farm: { include: { grainEntity: true } },
        seedHybrid: true,
        fertilizer: true,
        chemical: true,
        photos: true
      }
    });

    if (!trial || trial.farm.grainEntity.businessId !== businessId) {
      return null;
    }

    return this.mapTrial(trial);
  }

  async create(businessId: string, data: CreateFarmTrialRequest): Promise<FarmTrial> {
    // Verify farm belongs to business
    const farm = await prisma.farm.findFirst({
      where: { id: data.farmId },
      include: { grainEntity: true }
    });

    if (!farm || farm.grainEntity.businessId !== businessId) {
      throw new Error('Farm not found');
    }

    const trial = await prisma.farmTrial.create({
      data: {
        farmId: data.farmId,
        name: data.name,
        trialType: data.trialType,
        seedHybridId: data.seedHybridId,
        fertilizerId: data.fertilizerId,
        chemicalId: data.chemicalId,
        controlProduct: data.controlProduct,
        controlRate: data.controlRate,
        testRate: data.testRate,
        plotLocation: data.plotLocation,
        plotAcres: data.plotAcres,
        targetMetric: data.targetMetric,
        targetValue: data.targetValue,
        targetUnit: data.targetUnit,
        startDate: data.startDate,
        notes: data.notes
      },
      include: {
        seedHybrid: true,
        fertilizer: true,
        chemical: true,
        photos: true
      }
    });

    return this.mapTrial(trial);
  }

  async update(id: string, businessId: string, data: UpdateFarmTrialRequest): Promise<FarmTrial> {
    // Verify trial belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Trial not found');
    }

    const trial = await prisma.farmTrial.update({
      where: { id },
      data,
      include: {
        seedHybrid: true,
        fertilizer: true,
        chemical: true,
        photos: true
      }
    });

    return this.mapTrial(trial);
  }

  async delete(id: string, businessId: string): Promise<void> {
    // Verify trial belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Trial not found');
    }

    await prisma.farmTrial.delete({
      where: { id }
    });
  }

  async addPhoto(trialId: string, businessId: string, url: string, caption?: string): Promise<FarmTrialPhoto> {
    // Verify trial belongs to business
    const trial = await this.getById(trialId, businessId);
    if (!trial) {
      throw new Error('Trial not found');
    }

    const photo = await prisma.farmTrialPhoto.create({
      data: {
        trialId,
        url,
        caption,
        takenAt: new Date()
      }
    });

    return {
      id: photo.id,
      trialId: photo.trialId,
      url: photo.url,
      caption: photo.caption || undefined,
      takenAt: photo.takenAt || undefined,
      createdAt: photo.createdAt
    };
  }

  async deletePhoto(photoId: string, businessId: string): Promise<void> {
    const photo = await prisma.farmTrialPhoto.findFirst({
      where: { id: photoId },
      include: {
        trial: {
          include: {
            farm: { include: { grainEntity: true } }
          }
        }
      }
    });

    if (!photo || photo.trial.farm.grainEntity.businessId !== businessId) {
      throw new Error('Photo not found');
    }

    await prisma.farmTrialPhoto.delete({
      where: { id: photoId }
    });
  }

  private mapTrial(trial: any): FarmTrial {
    return {
      id: trial.id,
      farmId: trial.farmId,
      name: trial.name,
      trialType: trial.trialType as TrialType,
      status: trial.status as TrialStatus,
      seedHybridId: trial.seedHybridId || undefined,
      fertilizerId: trial.fertilizerId || undefined,
      chemicalId: trial.chemicalId || undefined,
      controlProduct: trial.controlProduct || undefined,
      controlRate: trial.controlRate ? Number(trial.controlRate) : undefined,
      testRate: trial.testRate ? Number(trial.testRate) : undefined,
      plotLocation: trial.plotLocation || undefined,
      plotAcres: trial.plotAcres ? Number(trial.plotAcres) : undefined,
      targetMetric: trial.targetMetric || undefined,
      targetValue: trial.targetValue ? Number(trial.targetValue) : undefined,
      targetUnit: trial.targetUnit || undefined,
      controlResult: trial.controlResult ? Number(trial.controlResult) : undefined,
      testResult: trial.testResult ? Number(trial.testResult) : undefined,
      yieldDifference: trial.yieldDifference ? Number(trial.yieldDifference) : undefined,
      resultNotes: trial.resultNotes || undefined,
      startDate: trial.startDate || undefined,
      endDate: trial.endDate || undefined,
      notes: trial.notes || undefined,
      createdAt: trial.createdAt,
      updatedAt: trial.updatedAt,
      seedHybrid: trial.seedHybrid ? {
        id: trial.seedHybrid.id,
        businessId: trial.seedHybrid.businessId,
        name: trial.seedHybrid.name,
        commodityType: trial.seedHybrid.commodityType,
        pricePerBag: Number(trial.seedHybrid.pricePerBag),
        seedsPerBag: trial.seedHybrid.seedsPerBag,
        isActive: trial.seedHybrid.isActive,
        createdAt: trial.seedHybrid.createdAt,
        updatedAt: trial.seedHybrid.updatedAt
      } : undefined,
      fertilizer: trial.fertilizer ? {
        id: trial.fertilizer.id,
        businessId: trial.fertilizer.businessId,
        name: trial.fertilizer.name,
        pricePerUnit: Number(trial.fertilizer.pricePerUnit),
        unit: trial.fertilizer.unit,
        isActive: trial.fertilizer.isActive,
        createdAt: trial.fertilizer.createdAt,
        updatedAt: trial.fertilizer.updatedAt
      } : undefined,
      chemical: trial.chemical ? {
        id: trial.chemical.id,
        businessId: trial.chemical.businessId,
        name: trial.chemical.name,
        pricePerUnit: Number(trial.chemical.pricePerUnit),
        unit: trial.chemical.unit,
        category: trial.chemical.category as ChemicalCategory,
        isActive: trial.chemical.isActive,
        createdAt: trial.chemical.createdAt,
        updatedAt: trial.chemical.updatedAt
      } : undefined,
      photos: trial.photos?.map((p: any) => ({
        id: p.id,
        trialId: p.trialId,
        url: p.url,
        caption: p.caption || undefined,
        takenAt: p.takenAt || undefined,
        createdAt: p.createdAt
      }))
    };
  }
}
