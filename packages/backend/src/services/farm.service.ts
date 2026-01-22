import { prisma } from '../prisma/client';
import {
  Farm,
  CreateFarmRequest,
  UpdateFarmRequest,
  CreateFarmFertilizerUsageRequest,
  CreateFarmChemicalUsageRequest,
  CreateFarmSeedUsageRequest,
  CreateFarmOtherCostRequest,
  GetFarmsQuery,
  FarmPlanView,
  ChemicalCategory,
  TrialType,
  TrialStatus
} from '@business-app/shared';

export class FarmService {
  async getAll(businessId: string, query?: GetFarmsQuery): Promise<Farm[]> {
    const farms = await prisma.farm.findMany({
      where: {
        grainEntity: { businessId },
        ...(query?.grainEntityId && { grainEntityId: query.grainEntityId }),
        ...(query?.year && { year: query.year }),
        ...(query?.commodityType && { commodityType: query.commodityType })
      },
      include: {
        grainEntity: true
      },
      orderBy: [
        { year: 'desc' },
        { grainEntity: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    return farms.map(f => ({
      ...f,
      acres: Number(f.acres),
      projectedYield: Number(f.projectedYield),
      aph: Number(f.aph),
      commodityType: f.commodityType as any,
      grainEntity: f.grainEntity,
      notes: f.notes || undefined,
      landParcelId: f.landParcelId || undefined,
      planApproved: f.planApproved,
      planApprovedAt: f.planApprovedAt || undefined,
      planApprovedBy: f.planApprovedBy || undefined
    }));
  }

  async getById(id: string, businessId: string): Promise<Farm | null> {
    const farm = await prisma.farm.findFirst({
      where: {
        id,
        grainEntity: { businessId }
      },
      include: {
        grainEntity: true,
        fertilizerUsage: {
          include: {
            fertilizer: true,
            completedBy: { select: { firstName: true, lastName: true } }
          }
        },
        chemicalUsage: {
          include: {
            chemical: true,
            completedBy: { select: { firstName: true, lastName: true } }
          }
        },
        seedUsage: {
          include: {
            seedHybrid: true,
            completedBy: { select: { firstName: true, lastName: true } }
          }
        },
        otherCosts: true
      }
    });

    if (!farm) return null;

    return {
      ...farm,
      acres: Number(farm.acres),
      projectedYield: Number(farm.projectedYield),
      aph: Number(farm.aph),
      commodityType: farm.commodityType as any,
      grainEntity: farm.grainEntity,
      notes: farm.notes || undefined,
      landParcelId: farm.landParcelId || undefined,
      planApproved: farm.planApproved,
      planApprovedAt: farm.planApprovedAt || undefined,
      planApprovedBy: farm.planApprovedBy || undefined,
      fertilizerUsage: farm.fertilizerUsage?.map(fu => ({
        id: fu.id,
        farmId: fu.farmId,
        fertilizerId: fu.fertilizerId,
        amountUsed: Number(fu.amountUsed),
        ratePerAcre: fu.ratePerAcre ? Number(fu.ratePerAcre) : undefined,
        acresApplied: fu.acresApplied ? Number(fu.acresApplied) : undefined,
        completedAt: fu.completedAt || undefined,
        completedById: fu.completedById || undefined,
        completedByName: (fu as any).completedBy ? `${(fu as any).completedBy.firstName} ${(fu as any).completedBy.lastName}` : undefined,
        calendarEventId: fu.calendarEventId || undefined,
        createdAt: fu.createdAt,
        updatedAt: fu.updatedAt,
        fertilizer: fu.fertilizer ? {
          ...fu.fertilizer,
          pricePerUnit: Number(fu.fertilizer.pricePerUnit),
          unit: fu.fertilizer.unit as any,
          needsPricing: fu.fertilizer.needsPricing
        } : undefined
      })),
      chemicalUsage: farm.chemicalUsage?.map(cu => ({
        id: cu.id,
        farmId: cu.farmId,
        chemicalId: cu.chemicalId,
        amountUsed: Number(cu.amountUsed),
        ratePerAcre: cu.ratePerAcre ? Number(cu.ratePerAcre) : undefined,
        acresApplied: cu.acresApplied ? Number(cu.acresApplied) : undefined,
        completedAt: cu.completedAt || undefined,
        completedById: cu.completedById || undefined,
        completedByName: (cu as any).completedBy ? `${(cu as any).completedBy.firstName} ${(cu as any).completedBy.lastName}` : undefined,
        calendarEventId: cu.calendarEventId || undefined,
        createdAt: cu.createdAt,
        updatedAt: cu.updatedAt,
        chemical: cu.chemical ? {
          ...cu.chemical,
          pricePerUnit: Number(cu.chemical.pricePerUnit),
          unit: cu.chemical.unit as any,
          category: cu.chemical.category as ChemicalCategory,
          needsPricing: cu.chemical.needsPricing
        } : undefined
      })),
      seedUsage: farm.seedUsage?.map(su => ({
        id: su.id,
        farmId: su.farmId,
        seedHybridId: su.seedHybridId,
        bagsUsed: Number(su.bagsUsed),
        ratePerAcre: su.ratePerAcre ? Number(su.ratePerAcre) : undefined,
        acresApplied: su.acresApplied ? Number(su.acresApplied) : undefined,
        isVRT: su.isVRT,
        vrtMinRate: su.vrtMinRate ? Number(su.vrtMinRate) : undefined,
        vrtMaxRate: su.vrtMaxRate ? Number(su.vrtMaxRate) : undefined,
        completedAt: su.completedAt || undefined,
        completedById: su.completedById || undefined,
        completedByName: (su as any).completedBy ? `${(su as any).completedBy.firstName} ${(su as any).completedBy.lastName}` : undefined,
        calendarEventId: su.calendarEventId || undefined,
        createdAt: su.createdAt,
        updatedAt: su.updatedAt,
        seedHybrid: su.seedHybrid ? {
          ...su.seedHybrid,
          pricePerBag: Number(su.seedHybrid.pricePerBag),
          commodityType: su.seedHybrid.commodityType as any,
          needsPricing: su.seedHybrid.needsPricing
        } : undefined
      })),
      otherCosts: farm.otherCosts?.map(oc => ({
        ...oc,
        amount: Number(oc.amount),
        costType: oc.costType as any,
        description: oc.description || undefined
      }))
    };
  }

  async create(businessId: string, data: CreateFarmRequest): Promise<Farm> {
    // Verify entity belongs to business
    const entity = await prisma.grainEntity.findFirst({
      where: { id: data.grainEntityId, businessId }
    });

    if (!entity) {
      throw new Error('Grain entity not found');
    }

    const farm = await prisma.farm.create({
      data: {
        grainEntityId: data.grainEntityId,
        name: data.name,
        acres: data.acres,
        commodityType: data.commodityType,
        year: data.year,
        projectedYield: data.projectedYield,
        aph: data.aph,
        notes: data.notes
      },
      include: {
        grainEntity: true
      }
    });

    return {
      ...farm,
      acres: Number(farm.acres),
      projectedYield: Number(farm.projectedYield),
      aph: Number(farm.aph),
      commodityType: farm.commodityType as any,
      grainEntity: farm.grainEntity,
      notes: farm.notes || undefined,
      landParcelId: farm.landParcelId || undefined,
      planApproved: farm.planApproved,
      planApprovedAt: farm.planApprovedAt || undefined,
      planApprovedBy: farm.planApprovedBy || undefined
    };
  }

  async update(id: string, businessId: string, data: UpdateFarmRequest): Promise<Farm> {
    // Verify farm belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Farm not found');
    }

    const farm = await prisma.farm.update({
      where: { id },
      data,
      include: {
        grainEntity: true
      }
    });

    return {
      ...farm,
      acres: Number(farm.acres),
      projectedYield: Number(farm.projectedYield),
      aph: Number(farm.aph),
      commodityType: farm.commodityType as any,
      grainEntity: farm.grainEntity,
      notes: farm.notes || undefined,
      landParcelId: farm.landParcelId || undefined,
      planApproved: farm.planApproved,
      planApprovedAt: farm.planApprovedAt || undefined,
      planApprovedBy: farm.planApprovedBy || undefined
    };
  }

  async delete(id: string, businessId: string): Promise<void> {
    // Verify farm belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Farm not found');
    }

    await prisma.farm.delete({
      where: { id }
    });
  }

  // ===== Usage Tracking Methods =====

  async addFertilizerUsage(businessId: string, data: CreateFarmFertilizerUsageRequest) {
    // Verify farm belongs to business
    const farm = await this.getById(data.farmId, businessId);
    if (!farm) throw new Error('Farm not found');

    // Verify fertilizer belongs to business
    const fertilizer = await prisma.fertilizer.findFirst({
      where: { id: data.fertilizerId, businessId }
    });
    if (!fertilizer) throw new Error('Fertilizer not found');

    // Calculate amountUsed from rate and acres if provided
    let amountUsed = data.amountUsed;
    if (data.ratePerAcre && data.acresApplied) {
      amountUsed = data.ratePerAcre * data.acresApplied;
    }

    if (!amountUsed) {
      throw new Error('Must provide either amountUsed or both ratePerAcre and acresApplied');
    }

    const usage = await prisma.farmFertilizerUsage.create({
      data: {
        farmId: data.farmId,
        fertilizerId: data.fertilizerId,
        amountUsed,
        ratePerAcre: data.ratePerAcre,
        acresApplied: data.acresApplied
      },
      include: {
        fertilizer: true
      }
    });

    return {
      ...usage,
      amountUsed: Number(usage.amountUsed),
      ratePerAcre: usage.ratePerAcre ? Number(usage.ratePerAcre) : undefined,
      acresApplied: usage.acresApplied ? Number(usage.acresApplied) : undefined,
      fertilizer: {
        ...usage.fertilizer,
        pricePerUnit: Number(usage.fertilizer.pricePerUnit)
      }
    };
  }

  async updateFertilizerUsage(id: string, businessId: string, data: { amountUsed?: number; ratePerAcre?: number; acresApplied?: number }) {
    // Verify usage belongs to farm owned by business
    const usage = await prisma.farmFertilizerUsage.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      }
    });

    if (!usage) throw new Error('Fertilizer usage not found');

    // Calculate amountUsed from rate and acres if provided
    let amountUsed = data.amountUsed;
    if (data.ratePerAcre !== undefined && data.acresApplied !== undefined) {
      amountUsed = data.ratePerAcre * data.acresApplied;
    }

    const updated = await prisma.farmFertilizerUsage.update({
      where: { id },
      data: {
        ...(amountUsed !== undefined && { amountUsed }),
        ...(data.ratePerAcre !== undefined && { ratePerAcre: data.ratePerAcre }),
        ...(data.acresApplied !== undefined && { acresApplied: data.acresApplied })
      },
      include: {
        fertilizer: true
      }
    });

    return {
      ...updated,
      amountUsed: Number(updated.amountUsed),
      ratePerAcre: updated.ratePerAcre ? Number(updated.ratePerAcre) : undefined,
      acresApplied: updated.acresApplied ? Number(updated.acresApplied) : undefined,
      fertilizer: {
        ...updated.fertilizer,
        pricePerUnit: Number(updated.fertilizer.pricePerUnit)
      }
    };
  }

  async deleteFertilizerUsage(id: string, businessId: string) {
    // Verify usage belongs to farm owned by business
    const usage = await prisma.farmFertilizerUsage.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      }
    });

    if (!usage) throw new Error('Fertilizer usage not found');

    await prisma.farmFertilizerUsage.delete({
      where: { id }
    });
  }

  async addChemicalUsage(businessId: string, data: CreateFarmChemicalUsageRequest) {
    // Verify farm belongs to business
    const farm = await this.getById(data.farmId, businessId);
    if (!farm) throw new Error('Farm not found');

    // Verify chemical belongs to business
    const chemical = await prisma.chemical.findFirst({
      where: { id: data.chemicalId, businessId }
    });
    if (!chemical) throw new Error('Chemical not found');

    // Calculate amountUsed from rate and acres if provided
    let amountUsed = data.amountUsed;
    if (data.ratePerAcre && data.acresApplied) {
      amountUsed = data.ratePerAcre * data.acresApplied;
    }

    if (!amountUsed) {
      throw new Error('Must provide either amountUsed or both ratePerAcre and acresApplied');
    }

    const usage = await prisma.farmChemicalUsage.create({
      data: {
        farmId: data.farmId,
        chemicalId: data.chemicalId,
        amountUsed,
        ratePerAcre: data.ratePerAcre,
        acresApplied: data.acresApplied
      },
      include: {
        chemical: true
      }
    });

    return {
      ...usage,
      amountUsed: Number(usage.amountUsed),
      ratePerAcre: usage.ratePerAcre ? Number(usage.ratePerAcre) : undefined,
      acresApplied: usage.acresApplied ? Number(usage.acresApplied) : undefined,
      chemical: {
        ...usage.chemical,
        pricePerUnit: Number(usage.chemical.pricePerUnit)
      }
    };
  }

  async updateChemicalUsage(id: string, businessId: string, data: { amountUsed?: number; ratePerAcre?: number; acresApplied?: number }) {
    // Verify usage belongs to farm owned by business
    const usage = await prisma.farmChemicalUsage.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      }
    });

    if (!usage) throw new Error('Chemical usage not found');

    // Calculate amountUsed from rate and acres if provided
    let amountUsed = data.amountUsed;
    if (data.ratePerAcre !== undefined && data.acresApplied !== undefined) {
      amountUsed = data.ratePerAcre * data.acresApplied;
    }

    const updated = await prisma.farmChemicalUsage.update({
      where: { id },
      data: {
        ...(amountUsed !== undefined && { amountUsed }),
        ...(data.ratePerAcre !== undefined && { ratePerAcre: data.ratePerAcre }),
        ...(data.acresApplied !== undefined && { acresApplied: data.acresApplied })
      },
      include: {
        chemical: true
      }
    });

    return {
      ...updated,
      amountUsed: Number(updated.amountUsed),
      ratePerAcre: updated.ratePerAcre ? Number(updated.ratePerAcre) : undefined,
      acresApplied: updated.acresApplied ? Number(updated.acresApplied) : undefined,
      chemical: {
        ...updated.chemical,
        pricePerUnit: Number(updated.chemical.pricePerUnit)
      }
    };
  }

  async deleteChemicalUsage(id: string, businessId: string) {
    // Verify usage belongs to farm owned by business
    const usage = await prisma.farmChemicalUsage.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      }
    });

    if (!usage) throw new Error('Chemical usage not found');

    await prisma.farmChemicalUsage.delete({
      where: { id }
    });
  }

  async addSeedUsage(businessId: string, data: CreateFarmSeedUsageRequest) {
    // Verify farm belongs to business
    const farm = await this.getById(data.farmId, businessId);
    if (!farm) throw new Error('Farm not found');

    // Verify seed hybrid belongs to business
    const seedHybrid = await prisma.seedHybrid.findFirst({
      where: { id: data.seedHybridId, businessId }
    });
    if (!seedHybrid) throw new Error('Seed hybrid not found');

    // Calculate bagsUsed from population and acres if provided
    // ratePerAcre = population (seeds per acre, e.g., 32000)
    // bagsUsed = (population * acres) / seedsPerBag
    let bagsUsed = data.bagsUsed;
    if (data.ratePerAcre && data.acresApplied) {
      const totalSeeds = data.ratePerAcre * data.acresApplied;
      bagsUsed = totalSeeds / Number(seedHybrid.seedsPerBag);
    }

    if (!bagsUsed) {
      throw new Error('Must provide either bagsUsed or both ratePerAcre and acresApplied');
    }

    const usage = await prisma.farmSeedUsage.create({
      data: {
        farmId: data.farmId,
        seedHybridId: data.seedHybridId,
        bagsUsed,
        ratePerAcre: data.ratePerAcre,
        acresApplied: data.acresApplied
      },
      include: {
        seedHybrid: true
      }
    });

    return {
      ...usage,
      bagsUsed: Number(usage.bagsUsed),
      ratePerAcre: usage.ratePerAcre ? Number(usage.ratePerAcre) : undefined,
      acresApplied: usage.acresApplied ? Number(usage.acresApplied) : undefined,
      seedHybrid: {
        ...usage.seedHybrid,
        pricePerBag: Number(usage.seedHybrid.pricePerBag),
        commodityType: usage.seedHybrid.commodityType as any
      }
    };
  }

  async updateSeedUsage(id: string, businessId: string, data: { bagsUsed?: number; ratePerAcre?: number; acresApplied?: number }) {
    // Verify usage belongs to farm owned by business
    const usage = await prisma.farmSeedUsage.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      },
      include: {
        seedHybrid: true
      }
    });

    if (!usage) throw new Error('Seed usage not found');

    // Calculate bagsUsed from population and acres if provided
    let bagsUsed = data.bagsUsed;
    if (data.ratePerAcre !== undefined && data.acresApplied !== undefined) {
      const totalSeeds = data.ratePerAcre * data.acresApplied;
      bagsUsed = totalSeeds / Number(usage.seedHybrid.seedsPerBag);
    }

    const updated = await prisma.farmSeedUsage.update({
      where: { id },
      data: {
        ...(bagsUsed !== undefined && { bagsUsed }),
        ...(data.ratePerAcre !== undefined && { ratePerAcre: data.ratePerAcre }),
        ...(data.acresApplied !== undefined && { acresApplied: data.acresApplied })
      },
      include: {
        seedHybrid: true
      }
    });

    return {
      ...updated,
      bagsUsed: Number(updated.bagsUsed),
      ratePerAcre: updated.ratePerAcre ? Number(updated.ratePerAcre) : undefined,
      acresApplied: updated.acresApplied ? Number(updated.acresApplied) : undefined,
      seedHybrid: {
        ...updated.seedHybrid,
        pricePerBag: Number(updated.seedHybrid.pricePerBag),
        commodityType: updated.seedHybrid.commodityType as any
      }
    };
  }

  async deleteSeedUsage(id: string, businessId: string) {
    // Verify usage belongs to farm owned by business
    const usage = await prisma.farmSeedUsage.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      }
    });

    if (!usage) throw new Error('Seed usage not found');

    await prisma.farmSeedUsage.delete({
      where: { id }
    });
  }

  async addOtherCost(businessId: string, data: CreateFarmOtherCostRequest) {
    // Verify farm belongs to business
    const farm = await this.getById(data.farmId, businessId);
    if (!farm) throw new Error('Farm not found');

    const cost = await prisma.farmOtherCost.create({
      data: {
        farmId: data.farmId,
        costType: data.costType,
        amount: data.amount,
        isPerAcre: data.isPerAcre,
        description: data.description
      }
    });

    return {
      ...cost,
      amount: Number(cost.amount),
      costType: cost.costType as any
    };
  }

  async updateOtherCost(id: string, businessId: string, data: { amount?: number; isPerAcre?: boolean; description?: string }) {
    // Verify cost belongs to farm owned by business
    const cost = await prisma.farmOtherCost.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      }
    });

    if (!cost) throw new Error('Cost not found');

    const updated = await prisma.farmOtherCost.update({
      where: { id },
      data
    });

    return {
      ...updated,
      amount: Number(updated.amount),
      costType: updated.costType as any
    };
  }

  async deleteOtherCost(id: string, businessId: string) {
    // Verify cost belongs to farm owned by business
    const cost = await prisma.farmOtherCost.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      }
    });

    if (!cost) throw new Error('Cost not found');

    await prisma.farmOtherCost.delete({
      where: { id }
    });
  }

  async getFarmBreakEven(id: string, businessId: string) {
    const farm = await this.getById(id, businessId);
    if (!farm) throw new Error('Farm not found');

    // Use farm's projected yield
    const expectedYield = farm.projectedYield;
    const expectedBushels = farm.acres * expectedYield;

    // Calculate fertilizer cost
    let fertilizerCost = 0;
    if (farm.fertilizerUsage) {
      for (const usage of farm.fertilizerUsage as any[]) {
        const cost = Number(usage.amountUsed) * Number(usage.fertilizer.pricePerUnit);
        fertilizerCost += cost;
      }
    }

    // Calculate chemical cost
    let chemicalCost = 0;
    if (farm.chemicalUsage) {
      for (const usage of farm.chemicalUsage as any[]) {
        const cost = Number(usage.amountUsed) * Number(usage.chemical.pricePerUnit);
        chemicalCost += cost;
      }
    }

    // Calculate seed cost
    let seedCost = 0;
    if (farm.seedUsage) {
      for (const usage of farm.seedUsage as any[]) {
        const totalCost = Number(usage.bagsUsed) * Number(usage.seedHybrid.pricePerBag);
        seedCost += totalCost;
      }
    }

    // Calculate other costs
    let otherCostsTotal = 0;
    if (farm.otherCosts) {
      for (const cost of farm.otherCosts as any[]) {
        const amount = Number(cost.amount);
        if (cost.isPerAcre) {
          otherCostsTotal += amount * farm.acres;
        } else {
          otherCostsTotal += amount;
        }
      }
    }

    const totalCost = fertilizerCost + chemicalCost + seedCost + otherCostsTotal;
    const costPerAcre = totalCost / farm.acres;
    const breakEvenPrice = expectedBushels > 0 ? totalCost / expectedBushels : 0;

    return {
      farmId: farm.id,
      farmName: farm.name,
      acres: farm.acres,
      expectedYield,
      expectedBushels,
      costs: {
        fertilizer: fertilizerCost,
        chemical: chemicalCost,
        seed: seedCost,
        other: otherCostsTotal,
        total: totalCost
      },
      // Also expose at top level for easier access
      totalCost,
      costPerAcre,
      breakEvenPrice
    };
  }

  /**
   * Get farm plan view (worker-friendly, excludes costs)
   */
  async getFarmPlanView(id: string, businessId: string): Promise<FarmPlanView | null> {
    const farm = await prisma.farm.findFirst({
      where: { id },
      include: {
        grainEntity: true,
        seedUsage: {
          include: { seedHybrid: true }
        },
        fertilizerUsage: {
          include: { fertilizer: true }
        },
        chemicalUsage: {
          include: { chemical: true }
        },
        trials: {
          where: {
            status: { in: ['PLANNED', 'ACTIVE'] }
          }
        }
      }
    });

    if (!farm || farm.grainEntity.businessId !== businessId) {
      return null;
    }

    // Build seed plan
    const seedPlan = (farm.seedUsage as any[]).map(usage => ({
      hybridName: usage.seedHybrid.name,
      population: Number(usage.ratePerAcre) || 0,
      isVRT: usage.isVRT || false,
      vrtMinRate: usage.vrtMinRate ? Number(usage.vrtMinRate) : undefined,
      vrtMaxRate: usage.vrtMaxRate ? Number(usage.vrtMaxRate) : undefined,
      acresApplied: Number(usage.acresApplied) || Number(farm.acres)
    }));

    // Build fertilizer plan (no costs)
    const fertilizerPlan = (farm.fertilizerUsage as any[]).map(usage => ({
      productName: usage.fertilizer.name,
      ratePerAcre: Number(usage.ratePerAcre) || 0,
      unit: usage.fertilizer.unit,
      acresApplied: Number(usage.acresApplied) || Number(farm.acres)
    }));

    // Split chemicals by category
    const inFurrowPlan = (farm.chemicalUsage as any[])
      .filter(usage => usage.chemical.category === 'IN_FURROW')
      .map(usage => ({
        productName: usage.chemical.name,
        ratePerAcre: Number(usage.ratePerAcre) || 0,
        unit: usage.chemical.unit,
        acresApplied: Number(usage.acresApplied) || Number(farm.acres)
      }));

    const chemicalPlan = (farm.chemicalUsage as any[])
      .filter(usage => usage.chemical.category === 'HERBICIDE' || !usage.chemical.category)
      .map(usage => ({
        productName: usage.chemical.name,
        ratePerAcre: Number(usage.ratePerAcre) || 0,
        unit: usage.chemical.unit,
        acresApplied: Number(usage.acresApplied) || Number(farm.acres)
      }));

    const fungicidePlan = (farm.chemicalUsage as any[])
      .filter(usage => usage.chemical.category === 'FUNGICIDE')
      .map(usage => ({
        productName: usage.chemical.name,
        ratePerAcre: Number(usage.ratePerAcre) || 0,
        unit: usage.chemical.unit,
        acresApplied: Number(usage.acresApplied) || Number(farm.acres)
      }));

    // Build active trials list
    const activeTrials = (farm.trials as any[]).map(trial => ({
      id: trial.id,
      name: trial.name,
      trialType: trial.trialType as TrialType,
      status: trial.status as TrialStatus,
      plotLocation: trial.plotLocation || undefined,
      targetMetric: trial.targetMetric || undefined
    }));

    return {
      farmId: farm.id,
      farmName: farm.name,
      acres: Number(farm.acres),
      commodityType: farm.commodityType as any,
      year: farm.year,
      grainEntityName: farm.grainEntity.name,
      projectedYield: Number(farm.projectedYield),
      planApproved: farm.planApproved,
      planApprovedAt: farm.planApprovedAt || undefined,
      seedPlan,
      inFurrowPlan,
      fertilizerPlan,
      chemicalPlan,
      fungicidePlan,
      activeTrials
    };
  }

  /**
   * Get all farm plan views for a business
   */
  async getAllFarmPlanViews(businessId: string, query?: GetFarmsQuery): Promise<FarmPlanView[]> {
    const farms = await prisma.farm.findMany({
      where: {
        grainEntity: { businessId },
        ...(query?.grainEntityId && { grainEntityId: query.grainEntityId }),
        ...(query?.year && { year: query.year }),
        ...(query?.commodityType && { commodityType: query.commodityType })
      },
      include: {
        grainEntity: true,
        seedUsage: {
          include: { seedHybrid: true }
        },
        fertilizerUsage: {
          include: { fertilizer: true }
        },
        chemicalUsage: {
          include: { chemical: true }
        },
        trials: {
          where: {
            status: { in: ['PLANNED', 'ACTIVE'] }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return farms.map(farm => {
      const seedPlan = (farm.seedUsage as any[]).map(usage => ({
        hybridName: usage.seedHybrid.name,
        population: Number(usage.ratePerAcre) || 0,
        isVRT: usage.isVRT || false,
        vrtMinRate: usage.vrtMinRate ? Number(usage.vrtMinRate) : undefined,
        vrtMaxRate: usage.vrtMaxRate ? Number(usage.vrtMaxRate) : undefined,
        acresApplied: Number(usage.acresApplied) || Number(farm.acres)
      }));

      const fertilizerPlan = (farm.fertilizerUsage as any[]).map(usage => ({
        productName: usage.fertilizer.name,
        ratePerAcre: Number(usage.ratePerAcre) || 0,
        unit: usage.fertilizer.unit,
        acresApplied: Number(usage.acresApplied) || Number(farm.acres)
      }));

      const inFurrowPlan = (farm.chemicalUsage as any[])
        .filter(usage => usage.chemical.category === 'IN_FURROW')
        .map(usage => ({
          productName: usage.chemical.name,
          ratePerAcre: Number(usage.ratePerAcre) || 0,
          unit: usage.chemical.unit,
          acresApplied: Number(usage.acresApplied) || Number(farm.acres)
        }));

      const chemicalPlan = (farm.chemicalUsage as any[])
        .filter(usage => usage.chemical.category === 'HERBICIDE' || !usage.chemical.category)
        .map(usage => ({
          productName: usage.chemical.name,
          ratePerAcre: Number(usage.ratePerAcre) || 0,
          unit: usage.chemical.unit,
          acresApplied: Number(usage.acresApplied) || Number(farm.acres)
        }));

      const fungicidePlan = (farm.chemicalUsage as any[])
        .filter(usage => usage.chemical.category === 'FUNGICIDE')
        .map(usage => ({
          productName: usage.chemical.name,
          ratePerAcre: Number(usage.ratePerAcre) || 0,
          unit: usage.chemical.unit,
          acresApplied: Number(usage.acresApplied) || Number(farm.acres)
        }));

      const activeTrials = (farm.trials as any[]).map(trial => ({
        id: trial.id,
        name: trial.name,
        trialType: trial.trialType as TrialType,
        status: trial.status as TrialStatus,
        plotLocation: trial.plotLocation || undefined,
        targetMetric: trial.targetMetric || undefined
      }));

      return {
        farmId: farm.id,
        farmName: farm.name,
        acres: Number(farm.acres),
        commodityType: farm.commodityType as any,
        year: farm.year,
        grainEntityName: farm.grainEntity.name,
        projectedYield: Number(farm.projectedYield),
        planApproved: farm.planApproved,
        planApprovedAt: farm.planApprovedAt || undefined,
        seedPlan,
        inFurrowPlan,
        fertilizerPlan,
        chemicalPlan,
        fungicidePlan,
        activeTrials
      };
    });
  }

  // ===== Activity Completion Methods =====

  async markSeedUsageComplete(id: string, userId: string, businessId: string, completedAt?: Date) {
    // Verify usage belongs to farm owned by business
    const usage = await prisma.farmSeedUsage.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      },
      include: {
        seedHybrid: true,
        farm: {
          include: { grainEntity: true }
        }
      }
    });

    if (!usage) throw new Error('Seed usage not found');
    if (usage.completedAt) throw new Error('Activity already completed');

    const completionDate = completedAt || new Date();

    // Create calendar event
    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        businessId,
        userId,
        title: `Planted ${usage.seedHybrid.name} on ${usage.farm.name}`,
        description: `Population: ${usage.ratePerAcre || 'N/A'} seeds/acre, Acres: ${usage.acresApplied || usage.farm.acres}`,
        startTime: completionDate,
        endTime: completionDate,
        allDay: true,
        color: '#A855F7' // Purple for planting
      }
    });

    // Update usage with completion info
    const updated = await prisma.farmSeedUsage.update({
      where: { id },
      data: {
        completedAt: completionDate,
        completedById: userId,
        calendarEventId: calendarEvent.id
      },
      include: {
        seedHybrid: true,
        completedBy: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    return {
      ...updated,
      bagsUsed: Number(updated.bagsUsed),
      ratePerAcre: updated.ratePerAcre ? Number(updated.ratePerAcre) : undefined,
      acresApplied: updated.acresApplied ? Number(updated.acresApplied) : undefined,
      isVRT: updated.isVRT,
      vrtMinRate: updated.vrtMinRate ? Number(updated.vrtMinRate) : undefined,
      vrtMaxRate: updated.vrtMaxRate ? Number(updated.vrtMaxRate) : undefined,
      completedByName: updated.completedBy ? `${updated.completedBy.firstName} ${updated.completedBy.lastName}` : undefined,
      seedHybrid: {
        ...updated.seedHybrid,
        pricePerBag: Number(updated.seedHybrid.pricePerBag),
        commodityType: updated.seedHybrid.commodityType as any
      }
    };
  }

  async undoSeedUsageComplete(id: string, businessId: string) {
    // Verify usage belongs to farm owned by business
    const usage = await prisma.farmSeedUsage.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      }
    });

    if (!usage) throw new Error('Seed usage not found');
    if (!usage.completedAt) throw new Error('Activity is not completed');

    // Delete calendar event if exists
    if (usage.calendarEventId) {
      await prisma.calendarEvent.delete({
        where: { id: usage.calendarEventId }
      }).catch(() => {}); // Ignore if already deleted
    }

    // Clear completion info
    const updated = await prisma.farmSeedUsage.update({
      where: { id },
      data: {
        completedAt: null,
        completedById: null,
        calendarEventId: null
      },
      include: {
        seedHybrid: true
      }
    });

    return {
      ...updated,
      bagsUsed: Number(updated.bagsUsed),
      ratePerAcre: updated.ratePerAcre ? Number(updated.ratePerAcre) : undefined,
      acresApplied: updated.acresApplied ? Number(updated.acresApplied) : undefined,
      isVRT: updated.isVRT,
      vrtMinRate: updated.vrtMinRate ? Number(updated.vrtMinRate) : undefined,
      vrtMaxRate: updated.vrtMaxRate ? Number(updated.vrtMaxRate) : undefined,
      seedHybrid: {
        ...updated.seedHybrid,
        pricePerBag: Number(updated.seedHybrid.pricePerBag),
        commodityType: updated.seedHybrid.commodityType as any
      }
    };
  }

  async markFertilizerUsageComplete(id: string, userId: string, businessId: string, completedAt?: Date) {
    // Verify usage belongs to farm owned by business
    const usage = await prisma.farmFertilizerUsage.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      },
      include: {
        fertilizer: true,
        farm: {
          include: { grainEntity: true }
        }
      }
    });

    if (!usage) throw new Error('Fertilizer usage not found');
    if (usage.completedAt) throw new Error('Activity already completed');

    const completionDate = completedAt || new Date();

    // Create calendar event
    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        businessId,
        userId,
        title: `Applied ${usage.fertilizer.name} on ${usage.farm.name}`,
        description: `Rate: ${usage.ratePerAcre || 'N/A'} ${usage.fertilizer.unit}/acre, Acres: ${usage.acresApplied || usage.farm.acres}`,
        startTime: completionDate,
        endTime: completionDate,
        allDay: true,
        color: '#3B82F6' // Blue for fertilizer
      }
    });

    // Update usage with completion info
    const updated = await prisma.farmFertilizerUsage.update({
      where: { id },
      data: {
        completedAt: completionDate,
        completedById: userId,
        calendarEventId: calendarEvent.id
      },
      include: {
        fertilizer: true,
        completedBy: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    return {
      ...updated,
      amountUsed: Number(updated.amountUsed),
      ratePerAcre: updated.ratePerAcre ? Number(updated.ratePerAcre) : undefined,
      acresApplied: updated.acresApplied ? Number(updated.acresApplied) : undefined,
      completedByName: updated.completedBy ? `${updated.completedBy.firstName} ${updated.completedBy.lastName}` : undefined,
      fertilizer: {
        ...updated.fertilizer,
        pricePerUnit: Number(updated.fertilizer.pricePerUnit)
      }
    };
  }

  async undoFertilizerUsageComplete(id: string, businessId: string) {
    // Verify usage belongs to farm owned by business
    const usage = await prisma.farmFertilizerUsage.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      }
    });

    if (!usage) throw new Error('Fertilizer usage not found');
    if (!usage.completedAt) throw new Error('Activity is not completed');

    // Delete calendar event if exists
    if (usage.calendarEventId) {
      await prisma.calendarEvent.delete({
        where: { id: usage.calendarEventId }
      }).catch(() => {});
    }

    // Clear completion info
    const updated = await prisma.farmFertilizerUsage.update({
      where: { id },
      data: {
        completedAt: null,
        completedById: null,
        calendarEventId: null
      },
      include: {
        fertilizer: true
      }
    });

    return {
      ...updated,
      amountUsed: Number(updated.amountUsed),
      ratePerAcre: updated.ratePerAcre ? Number(updated.ratePerAcre) : undefined,
      acresApplied: updated.acresApplied ? Number(updated.acresApplied) : undefined,
      fertilizer: {
        ...updated.fertilizer,
        pricePerUnit: Number(updated.fertilizer.pricePerUnit)
      }
    };
  }

  async markChemicalUsageComplete(id: string, userId: string, businessId: string, completedAt?: Date) {
    // Verify usage belongs to farm owned by business
    const usage = await prisma.farmChemicalUsage.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      },
      include: {
        chemical: true,
        farm: {
          include: { grainEntity: true }
        }
      }
    });

    if (!usage) throw new Error('Chemical usage not found');
    if (usage.completedAt) throw new Error('Activity already completed');

    const completionDate = completedAt || new Date();

    // Determine action word and color based on category
    let actionWord = 'Applied';
    let color = '#22C55E'; // Green for herbicide

    if (usage.chemical.category === 'FUNGICIDE') {
      actionWord = 'Sprayed';
      color = '#6366F1'; // Indigo for fungicide
    } else if (usage.chemical.category === 'IN_FURROW') {
      actionWord = 'Applied';
      color = '#14B8A6'; // Teal for in-furrow
    } else {
      actionWord = 'Sprayed';
    }

    // Create calendar event
    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        businessId,
        userId,
        title: `${actionWord} ${usage.chemical.name} on ${usage.farm.name}`,
        description: `Rate: ${usage.ratePerAcre || 'N/A'} ${usage.chemical.unit}/acre, Acres: ${usage.acresApplied || usage.farm.acres}`,
        startTime: completionDate,
        endTime: completionDate,
        allDay: true,
        color
      }
    });

    // Update usage with completion info
    const updated = await prisma.farmChemicalUsage.update({
      where: { id },
      data: {
        completedAt: completionDate,
        completedById: userId,
        calendarEventId: calendarEvent.id
      },
      include: {
        chemical: true,
        completedBy: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    return {
      ...updated,
      amountUsed: Number(updated.amountUsed),
      ratePerAcre: updated.ratePerAcre ? Number(updated.ratePerAcre) : undefined,
      acresApplied: updated.acresApplied ? Number(updated.acresApplied) : undefined,
      completedByName: updated.completedBy ? `${updated.completedBy.firstName} ${updated.completedBy.lastName}` : undefined,
      chemical: {
        ...updated.chemical,
        pricePerUnit: Number(updated.chemical.pricePerUnit),
        category: updated.chemical.category as ChemicalCategory
      }
    };
  }

  async undoChemicalUsageComplete(id: string, businessId: string) {
    // Verify usage belongs to farm owned by business
    const usage = await prisma.farmChemicalUsage.findFirst({
      where: {
        id,
        farm: {
          grainEntity: { businessId }
        }
      }
    });

    if (!usage) throw new Error('Chemical usage not found');
    if (!usage.completedAt) throw new Error('Activity is not completed');

    // Delete calendar event if exists
    if (usage.calendarEventId) {
      await prisma.calendarEvent.delete({
        where: { id: usage.calendarEventId }
      }).catch(() => {});
    }

    // Clear completion info
    const updated = await prisma.farmChemicalUsage.update({
      where: { id },
      data: {
        completedAt: null,
        completedById: null,
        calendarEventId: null
      },
      include: {
        chemical: true
      }
    });

    return {
      ...updated,
      amountUsed: Number(updated.amountUsed),
      ratePerAcre: updated.ratePerAcre ? Number(updated.ratePerAcre) : undefined,
      acresApplied: updated.acresApplied ? Number(updated.acresApplied) : undefined,
      chemical: {
        ...updated.chemical,
        pricePerUnit: Number(updated.chemical.pricePerUnit),
        category: updated.chemical.category as ChemicalCategory
      }
    };
  }
}
