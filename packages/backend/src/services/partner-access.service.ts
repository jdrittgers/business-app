import { PrismaClient, PartnerPermissionLevel } from '@prisma/client';
import {
  PartnerModule,
  PartnerPermissions,
  MODULE_TO_FIELD,
  hasPermissionLevel
} from '@business-app/shared';

const prisma = new PrismaClient();

// Map PartnerModule to Prisma field names for queries
const MODULE_TO_PRISMA_FIELD: Record<PartnerModule, string> = {
  [PartnerModule.FERTILIZER_CHEMICALS]: 'fertilizerChemicalsAccess',
  [PartnerModule.SEED]: 'seedAccess',
  [PartnerModule.GRAIN_CONTRACTS]: 'grainContractsAccess',
  [PartnerModule.GRAIN_BINS]: 'grainBinsAccess',
  [PartnerModule.LAND_LOANS]: 'landLoansAccess',
  [PartnerModule.OPERATING_LOANS]: 'operatingLoansAccess',
  [PartnerModule.EQUIPMENT_LOANS]: 'equipmentLoansAccess'
};

// Permission level numeric values for comparison
const PERMISSION_LEVELS: Record<PartnerPermissionLevel, number> = {
  NONE: 0,
  VIEW: 1,
  ADD: 2,
  EDIT: 3
};

class PartnerAccessService {
  /**
   * Check if partner has required permission level for a module
   */
  async checkAccess(
    retailerId: string,
    businessId: string,
    module: PartnerModule,
    requiredLevel: PartnerPermissionLevel
  ): Promise<boolean> {
    const request = await prisma.retailerAccessRequest.findUnique({
      where: {
        retailerId_businessId: {
          retailerId,
          businessId
        }
      }
    });

    if (!request) return false;

    const field = MODULE_TO_PRISMA_FIELD[module] as keyof typeof request;
    const currentLevel = request[field] as PartnerPermissionLevel;

    // Check if current level meets required level
    return PERMISSION_LEVELS[currentLevel] >= PERMISSION_LEVELS[requiredLevel];
  }

  /**
   * Get all permissions for a partner-business pair
   */
  async getPermissions(retailerId: string, businessId: string): Promise<PartnerPermissions | null> {
    const request = await prisma.retailerAccessRequest.findUnique({
      where: {
        retailerId_businessId: {
          retailerId,
          businessId
        }
      }
    });

    if (!request) return null;

    return {
      fertilizerChemicalsAccess: request.fertilizerChemicalsAccess as unknown as PartnerPermissions['fertilizerChemicalsAccess'],
      seedAccess: request.seedAccess as unknown as PartnerPermissions['seedAccess'],
      grainContractsAccess: request.grainContractsAccess as unknown as PartnerPermissions['grainContractsAccess'],
      grainBinsAccess: request.grainBinsAccess as unknown as PartnerPermissions['grainBinsAccess'],
      landLoansAccess: request.landLoansAccess as unknown as PartnerPermissions['landLoansAccess'],
      operatingLoansAccess: request.operatingLoansAccess as unknown as PartnerPermissions['operatingLoansAccess'],
      equipmentLoansAccess: request.equipmentLoansAccess as unknown as PartnerPermissions['equipmentLoansAccess']
    };
  }

  /**
   * Update permissions for a partner-business relationship (farmer action)
   */
  async updatePermissions(
    requestId: string,
    permissions: Partial<PartnerPermissions>,
    respondedBy: string
  ) {
    // Build update data
    const updateData: any = {
      permissionsUpdatedAt: new Date(),
      respondedBy
    };

    // Map TypeScript permission fields to Prisma fields
    if (permissions.fertilizerChemicalsAccess !== undefined) {
      updateData.fertilizerChemicalsAccess = permissions.fertilizerChemicalsAccess;
    }
    if (permissions.seedAccess !== undefined) {
      updateData.seedAccess = permissions.seedAccess;
    }
    if (permissions.grainContractsAccess !== undefined) {
      updateData.grainContractsAccess = permissions.grainContractsAccess;
    }
    if (permissions.grainBinsAccess !== undefined) {
      updateData.grainBinsAccess = permissions.grainBinsAccess;
    }
    if (permissions.landLoansAccess !== undefined) {
      updateData.landLoansAccess = permissions.landLoansAccess;
    }
    if (permissions.operatingLoansAccess !== undefined) {
      updateData.operatingLoansAccess = permissions.operatingLoansAccess;
    }
    if (permissions.equipmentLoansAccess !== undefined) {
      updateData.equipmentLoansAccess = permissions.equipmentLoansAccess;
    }

    // Also update legacy inputsStatus/grainStatus for backwards compatibility
    // If any input-related permission is granted, set inputsStatus to APPROVED
    const hasInputAccess =
      (permissions.fertilizerChemicalsAccess && permissions.fertilizerChemicalsAccess !== 'NONE') ||
      (permissions.seedAccess && permissions.seedAccess !== 'NONE');

    if (hasInputAccess) {
      updateData.inputsStatus = 'APPROVED';
      updateData.inputsRespondedAt = new Date();
    }

    // If any grain-related permission is granted, set grainStatus to APPROVED
    const hasGrainAccess =
      (permissions.grainContractsAccess && permissions.grainContractsAccess !== 'NONE') ||
      (permissions.grainBinsAccess && permissions.grainBinsAccess !== 'NONE');

    if (hasGrainAccess) {
      updateData.grainStatus = 'APPROVED';
      updateData.grainRespondedAt = new Date();
    }

    const updated = await prisma.retailerAccessRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        retailer: {
          include: { user: true }
        },
        business: true
      }
    });

    console.log(`📧 Permissions updated for ${updated.retailer.companyName} by ${updated.business.name}`);

    return updated;
  }

  /**
   * Get businesses that partner can access for a specific module with minimum permission level
   */
  async getAccessibleBusinesses(
    retailerId: string,
    module: PartnerModule,
    minLevel: PartnerPermissionLevel = 'VIEW'
  ) {
    const field = MODULE_TO_PRISMA_FIELD[module];

    // Get all levels that meet the minimum requirement
    const validLevels: PartnerPermissionLevel[] = [];
    for (const [level, value] of Object.entries(PERMISSION_LEVELS)) {
      if (value >= PERMISSION_LEVELS[minLevel]) {
        validLevels.push(level as PartnerPermissionLevel);
      }
    }

    const requests = await prisma.retailerAccessRequest.findMany({
      where: {
        retailerId,
        [field]: { in: validLevels }
      },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true
          }
        }
      }
    });

    return requests.map(r => ({
      businessId: r.businessId,
      business: r.business,
      permissionLevel: (r as any)[field] as PartnerPermissionLevel
    }));
  }

  /**
   * Get all retailers with any level of access to a business
   */
  async getRetailersWithAccess(businessId: string) {
    const requests = await prisma.retailerAccessRequest.findMany({
      where: {
        businessId,
        OR: [
          { fertilizerChemicalsAccess: { not: 'NONE' } },
          { seedAccess: { not: 'NONE' } },
          { grainContractsAccess: { not: 'NONE' } },
          { grainBinsAccess: { not: 'NONE' } },
          { landLoansAccess: { not: 'NONE' } },
          { operatingLoansAccess: { not: 'NONE' } },
          { equipmentLoansAccess: { not: 'NONE' } }
        ]
      },
      include: {
        retailer: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    return requests;
  }

  /**
   * Check if retailer has any access to any module for a business
   */
  async hasAnyAccess(retailerId: string, businessId: string): Promise<boolean> {
    const permissions = await this.getPermissions(retailerId, businessId);
    if (!permissions) return false;

    return Object.values(permissions).some(level => level !== 'NONE');
  }

  /**
   * Get summary of what modules a retailer can access for a specific business
   */
  async getAccessSummary(retailerId: string, businessId: string) {
    const permissions = await this.getPermissions(retailerId, businessId);
    if (!permissions) return null;

    const summary: Record<string, { hasAccess: boolean; level: string }> = {};

    for (const [module, field] of Object.entries(MODULE_TO_FIELD)) {
      const level = permissions[field as keyof PartnerPermissions];
      summary[module] = {
        hasAccess: level !== 'NONE',
        level
      };
    }

    return summary;
  }
}

export const partnerAccessService = new PartnerAccessService();
