import { prisma } from '../prisma/client';
import { InsurancePlanType } from '@business-app/shared';

export class CropInsuranceService {
  async getByFarmId(farmId: string, businessId: string) {
    const policy = await prisma.cropInsurancePolicy.findFirst({
      where: {
        farmId,
        deletedAt: null,
        farm: { grainEntity: { businessId }, deletedAt: null }
      }
    });
    if (!policy) return null;
    return this.serialize(policy);
  }

  async getAllForBusiness(businessId: string, year?: number) {
    const policies = await prisma.cropInsurancePolicy.findMany({
      where: {
        deletedAt: null,
        farm: {
          grainEntity: { businessId },
          deletedAt: null,
          ...(year ? { year } : {})
        }
      },
      include: {
        farm: {
          select: { id: true, name: true, commodityType: true, acres: true, aph: true, year: true }
        }
      }
    });
    return policies.map(p => ({
      ...this.serialize(p),
      farm: {
        id: p.farm.id,
        name: p.farm.name,
        commodityType: p.farm.commodityType,
        acres: Number(p.farm.acres),
        aph: Number(p.farm.aph),
        year: p.farm.year
      }
    }));
  }

  async upsert(farmId: string, businessId: string, data: {
    planType: InsurancePlanType;
    coverageLevel: number;
    projectedPrice: number;
    volatilityFactor?: number;
    premiumPerAcre: number;
    hasSco?: boolean;
    hasEco?: boolean;
    ecoLevel?: number | null;
    scoPremiumPerAcre?: number;
    ecoPremiumPerAcre?: number;
  }) {
    // Verify farm belongs to business
    const farm = await prisma.farm.findFirst({
      where: { id: farmId, grainEntity: { businessId }, deletedAt: null }
    });
    if (!farm) throw new Error('Farm not found or access denied');

    const policy = await prisma.cropInsurancePolicy.upsert({
      where: { farmId },
      create: {
        farmId,
        planType: data.planType,
        coverageLevel: data.coverageLevel,
        projectedPrice: data.projectedPrice,
        volatilityFactor: data.volatilityFactor ?? 0.20,
        premiumPerAcre: data.premiumPerAcre,
        hasSco: data.hasSco ?? false,
        hasEco: data.hasEco ?? false,
        ecoLevel: data.ecoLevel ?? null,
        scoPremiumPerAcre: data.scoPremiumPerAcre ?? 0,
        ecoPremiumPerAcre: data.ecoPremiumPerAcre ?? 0
      },
      update: {
        planType: data.planType,
        coverageLevel: data.coverageLevel,
        projectedPrice: data.projectedPrice,
        volatilityFactor: data.volatilityFactor ?? 0.20,
        premiumPerAcre: data.premiumPerAcre,
        hasSco: data.hasSco ?? false,
        hasEco: data.hasEco ?? false,
        ecoLevel: data.ecoLevel ?? null,
        scoPremiumPerAcre: data.scoPremiumPerAcre ?? 0,
        ecoPremiumPerAcre: data.ecoPremiumPerAcre ?? 0,
        deletedAt: null
      }
    });
    return this.serialize(policy);
  }

  async delete(farmId: string, businessId: string) {
    const farm = await prisma.farm.findFirst({
      where: { id: farmId, grainEntity: { businessId }, deletedAt: null }
    });
    if (!farm) throw new Error('Farm not found or access denied');

    await prisma.cropInsurancePolicy.updateMany({
      where: { farmId, deletedAt: null },
      data: { deletedAt: new Date() }
    });
  }

  // ===== Insurance Indemnity Calculations =====

  /**
   * Revenue Protection (RP) indemnity per acre.
   * Guarantee = APH × coverage × max(projectedPrice, harvestPrice)
   */
  calculateRPIndemnity(
    aph: number, coverageLevel: number, projectedPrice: number,
    actualYield: number, harvestPrice: number
  ): number {
    const guaranteedRevenue = aph * (coverageLevel / 100) * Math.max(projectedPrice, harvestPrice);
    const actualRevenue = actualYield * harvestPrice;
    return Math.max(0, guaranteedRevenue - actualRevenue);
  }

  /**
   * Yield Protection (YP) indemnity per acre.
   * Guarantee = APH × coverage; payout = shortfall × projectedPrice
   */
  calculateYPIndemnity(
    aph: number, coverageLevel: number, projectedPrice: number,
    actualYield: number
  ): number {
    const guaranteedYield = aph * (coverageLevel / 100);
    const shortfall = Math.max(0, guaranteedYield - actualYield);
    return shortfall * projectedPrice;
  }

  /**
   * Revenue Protection with Harvest Price Exclusion (RP-HPE) per acre.
   * Like RP but guarantee is fixed at projectedPrice (no harvest price increase).
   */
  calculateRPHPEIndemnity(
    aph: number, coverageLevel: number, projectedPrice: number,
    actualYield: number, harvestPrice: number
  ): number {
    const guaranteedRevenue = aph * (coverageLevel / 100) * projectedPrice;
    const actualRevenue = actualYield * harvestPrice;
    return Math.max(0, guaranteedRevenue - actualRevenue);
  }

  /**
   * Supplemental Coverage Option (SCO) — covers 86% down to base coverage level.
   * Area-triggered: uses county yield to determine payout ratio.
   * SCO follows the underlying policy type:
   *   - RP: revenue-based, expected uses max(projected, harvest)
   *   - RP-HPE: revenue-based, expected uses projected price only
   *   - YP: yield-based (compares county yield ratio, not revenue)
   */
  calculateSCOIndemnity(
    aph: number, baseCoverageLevel: number, projectedPrice: number,
    actualYield: number, harvestPrice: number,
    planType: string,
    countyYield?: { expectedCountyYield: number; simulatedCountyYield: number }
  ): number {
    const topPct = 0.86;
    const bottomPct = baseCoverageLevel / 100;

    // Band price depends on underlying policy type
    // RP: max(projected, harvest); RP-HPE/YP: projected only
    const bandPrice = planType === 'RP' ? Math.max(projectedPrice, harvestPrice) : projectedPrice;
    const band = aph * (topPct - bottomPct) * bandPrice;

    if (countyYield && countyYield.expectedCountyYield > 0) {
      let countyRatio: number;

      if (planType === 'YP') {
        // Yield-based: compare county yield ratio
        countyRatio = countyYield.simulatedCountyYield / countyYield.expectedCountyYield;
      } else {
        // Revenue-based: compare county revenue ratio
        // Expected uses projected price; actual uses max(projected, harvest)
        // For RP: harvest price increase provision applies to ACTUAL side (USDA RMA model)
        // For RP-HPE: no harvest price increase, both sides use projected price
        const expectedCountyRevenue = countyYield.expectedCountyYield * projectedPrice;
        const actualPrice = planType === 'RP' ? Math.max(projectedPrice, harvestPrice) : harvestPrice;
        const actualCountyRevenue = countyYield.simulatedCountyYield * actualPrice;
        countyRatio = actualCountyRevenue / expectedCountyRevenue;
      }

      if (countyRatio >= topPct) return 0;
      const lossPct = Math.min(topPct - countyRatio, topPct - bottomPct);
      const payoutRatio = lossPct / (topPct - bottomPct);
      return payoutRatio * band;
    }

    // Fallback: farm-level (simplified)
    const topRevenue = aph * topPct * bandPrice;
    const actualPrice = planType === 'RP' ? Math.max(projectedPrice, harvestPrice) : harvestPrice;
    const actualRevenue = planType === 'YP'
      ? actualYield / aph * (aph * bandPrice)  // yield ratio applied to expected crop value
      : actualYield * actualPrice;
    const loss = Math.max(0, topRevenue - actualRevenue);
    return Math.min(loss, band);
  }

  /**
   * Enhanced Coverage Option (ECO) — covers ecoLevel% down to 86%.
   * Area-triggered: uses county yield to determine payout ratio.
   * ECO follows the underlying policy type (same rules as SCO).
   */
  calculateECOIndemnity(
    aph: number, ecoLevel: number, projectedPrice: number,
    actualYield: number, harvestPrice: number,
    planType: string,
    countyYield?: { expectedCountyYield: number; simulatedCountyYield: number }
  ): number {
    const topPct = ecoLevel / 100;
    const bottomPct = 0.86;

    // Band price depends on underlying policy type
    const bandPrice = planType === 'RP' ? Math.max(projectedPrice, harvestPrice) : projectedPrice;
    const band = aph * (topPct - bottomPct) * bandPrice;

    if (countyYield && countyYield.expectedCountyYield > 0) {
      let countyRatio: number;

      if (planType === 'YP') {
        countyRatio = countyYield.simulatedCountyYield / countyYield.expectedCountyYield;
      } else {
        // Expected uses projected price; actual uses max(projected, harvest) for RP
        const expectedCountyRevenue = countyYield.expectedCountyYield * projectedPrice;
        const actualPrice = planType === 'RP' ? Math.max(projectedPrice, harvestPrice) : harvestPrice;
        const actualCountyRevenue = countyYield.simulatedCountyYield * actualPrice;
        countyRatio = actualCountyRevenue / expectedCountyRevenue;
      }

      if (countyRatio >= topPct) return 0;
      const lossPct = Math.min(topPct - countyRatio, topPct - bottomPct);
      const payoutRatio = lossPct / (topPct - bottomPct);
      return payoutRatio * band;
    }

    // Fallback: farm-level (simplified)
    const topRevenue = aph * topPct * bandPrice;
    const actualPrice = planType === 'RP' ? Math.max(projectedPrice, harvestPrice) : harvestPrice;
    const actualRevenue = planType === 'YP'
      ? actualYield / aph * (aph * bandPrice)
      : actualYield * actualPrice;
    const loss = Math.max(0, topRevenue - actualRevenue);
    return Math.min(loss, band);
  }

  /**
   * Calculate total indemnity for a given policy, yield, and price scenario.
   */
  calculateIndemnity(
    policy: { planType: string; coverageLevel: number; projectedPrice: number; hasSco: boolean; hasEco: boolean; ecoLevel: number | null },
    aph: number, actualYield: number, harvestPrice: number,
    countyYield?: { expectedCountyYield: number; simulatedCountyYield: number }
  ): { base: number; sco: number; eco: number; total: number } {
    let base = 0;
    const coverageLevel = Number(policy.coverageLevel);
    const projectedPrice = Number(policy.projectedPrice);

    switch (policy.planType) {
      case 'RP':
        base = this.calculateRPIndemnity(aph, coverageLevel, projectedPrice, actualYield, harvestPrice);
        break;
      case 'YP':
        base = this.calculateYPIndemnity(aph, coverageLevel, projectedPrice, actualYield);
        break;
      case 'RP_HPE':
        base = this.calculateRPHPEIndemnity(aph, coverageLevel, projectedPrice, actualYield, harvestPrice);
        break;
    }

    let sco = 0;
    if (policy.hasSco) {
      sco = this.calculateSCOIndemnity(aph, coverageLevel, projectedPrice, actualYield, harvestPrice, policy.planType, countyYield);
    }

    let eco = 0;
    if (policy.hasEco && policy.ecoLevel) {
      eco = this.calculateECOIndemnity(aph, Number(policy.ecoLevel), projectedPrice, actualYield, harvestPrice, policy.planType, countyYield);
    }

    return { base, sco, eco, total: base + sco + eco };
  }

  private serialize(policy: any) {
    return {
      id: policy.id,
      farmId: policy.farmId,
      planType: policy.planType as InsurancePlanType,
      coverageLevel: Number(policy.coverageLevel),
      projectedPrice: Number(policy.projectedPrice),
      volatilityFactor: Number(policy.volatilityFactor),
      premiumPerAcre: Number(policy.premiumPerAcre),
      hasSco: policy.hasSco,
      hasEco: policy.hasEco,
      ecoLevel: policy.ecoLevel ? Number(policy.ecoLevel) : null,
      scoPremiumPerAcre: Number(policy.scoPremiumPerAcre),
      ecoPremiumPerAcre: Number(policy.ecoPremiumPerAcre)
    };
  }
}
