// Partner Access Portal Types
// Granular permission system for retailers/partners to access farmer data

// Permission modules that can be individually controlled
export enum PartnerModule {
  FERTILIZER_CHEMICALS = 'FERTILIZER_CHEMICALS',
  SEED = 'SEED',
  GRAIN_CONTRACTS = 'GRAIN_CONTRACTS',
  GRAIN_BINS = 'GRAIN_BINS',
  LAND_LOANS = 'LAND_LOANS',
  OPERATING_LOANS = 'OPERATING_LOANS',
  EQUIPMENT_LOANS = 'EQUIPMENT_LOANS'
}

// Permission levels for each module
export enum PartnerPermissionLevel {
  NONE = 'NONE',   // No access to this module
  VIEW = 'VIEW',   // Can view data only
  ADD = 'ADD',     // Can view and add new records
  EDIT = 'EDIT'    // Can view, add, and edit existing records
}

// All permissions for a partner-business relationship
export interface PartnerPermissions {
  fertilizerChemicalsAccess: PartnerPermissionLevel;
  seedAccess: PartnerPermissionLevel;
  grainContractsAccess: PartnerPermissionLevel;
  grainBinsAccess: PartnerPermissionLevel;
  landLoansAccess: PartnerPermissionLevel;
  operatingLoansAccess: PartnerPermissionLevel;
  equipmentLoansAccess: PartnerPermissionLevel;
}

// Request to update partner permissions (farmer action)
export interface UpdatePartnerPermissionsRequest {
  permissions: Partial<PartnerPermissions>;
}

// Extended retailer access request with new permission fields
export interface RetailerAccessRequestWithPermissions {
  id: string;
  retailerId: string;
  businessId: string;

  // Legacy fields (kept for backwards compatibility)
  inputsStatus: 'PENDING' | 'APPROVED' | 'DENIED';
  grainStatus: 'PENDING' | 'APPROVED' | 'DENIED';

  // Granular module permissions
  fertilizerChemicalsAccess: PartnerPermissionLevel;
  seedAccess: PartnerPermissionLevel;
  grainContractsAccess: PartnerPermissionLevel;
  grainBinsAccess: PartnerPermissionLevel;
  landLoansAccess: PartnerPermissionLevel;
  operatingLoansAccess: PartnerPermissionLevel;
  equipmentLoansAccess: PartnerPermissionLevel;

  // Timestamps
  inputsRespondedAt?: Date;
  grainRespondedAt?: Date;
  permissionsUpdatedAt?: Date;
  respondedBy?: string;
  notificationSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Relations (populated when needed)
  retailer?: {
    id: string;
    companyName: string;
    user?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  business?: {
    id: string;
    name: string;
  };
}

// Helper to check if a permission level meets the required level
export function hasPermissionLevel(
  current: PartnerPermissionLevel,
  required: PartnerPermissionLevel
): boolean {
  const levels: Record<PartnerPermissionLevel, number> = {
    [PartnerPermissionLevel.NONE]: 0,
    [PartnerPermissionLevel.VIEW]: 1,
    [PartnerPermissionLevel.ADD]: 2,
    [PartnerPermissionLevel.EDIT]: 3
  };
  return levels[current] >= levels[required];
}

// Map module to its database field name
export const MODULE_TO_FIELD: Record<PartnerModule, keyof PartnerPermissions> = {
  [PartnerModule.FERTILIZER_CHEMICALS]: 'fertilizerChemicalsAccess',
  [PartnerModule.SEED]: 'seedAccess',
  [PartnerModule.GRAIN_CONTRACTS]: 'grainContractsAccess',
  [PartnerModule.GRAIN_BINS]: 'grainBinsAccess',
  [PartnerModule.LAND_LOANS]: 'landLoansAccess',
  [PartnerModule.OPERATING_LOANS]: 'operatingLoansAccess',
  [PartnerModule.EQUIPMENT_LOANS]: 'equipmentLoansAccess'
};

// Human-readable module names for UI
export const MODULE_DISPLAY_NAMES: Record<PartnerModule, string> = {
  [PartnerModule.FERTILIZER_CHEMICALS]: 'Fertilizer & Chemicals',
  [PartnerModule.SEED]: 'Seed',
  [PartnerModule.GRAIN_CONTRACTS]: 'Grain Contracts',
  [PartnerModule.GRAIN_BINS]: 'Grain Bins',
  [PartnerModule.LAND_LOANS]: 'Land & Loans',
  [PartnerModule.OPERATING_LOANS]: 'Operating Loans',
  [PartnerModule.EQUIPMENT_LOANS]: 'Equipment & Loans'
};

// Human-readable permission level names for UI
export const PERMISSION_DISPLAY_NAMES: Record<PartnerPermissionLevel, string> = {
  [PartnerPermissionLevel.NONE]: 'No Access',
  [PartnerPermissionLevel.VIEW]: 'View Only',
  [PartnerPermissionLevel.ADD]: 'View & Add',
  [PartnerPermissionLevel.EDIT]: 'Full Access'
};
