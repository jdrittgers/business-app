import { CommodityType } from './grain';
import { Chemical } from './breakeven';

// ===== Chemical Plan Template Types =====

export interface ChemicalPlanTemplate {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  commodityType?: CommodityType;
  year?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  items?: ChemicalPlanTemplateItem[];
  applications?: ChemicalPlanApplication[];
  // Computed fields
  usageCount?: number; // Number of farms using this template
}

export interface ChemicalPlanTemplateItem {
  id: string;
  templateId: string;
  chemicalId: string;
  ratePerAcre: number;
  notes?: string;
  order: number;
  createdAt: Date;
  chemical?: Chemical;
}

export interface ChemicalPlanApplication {
  id: string;
  templateId: string;
  farmId: string;
  appliedAt: Date;
  appliedById?: string;
  hasOverrides: boolean;
  template?: ChemicalPlanTemplate;
  farm?: {
    id: string;
    name: string;
    acres: number;
    commodityType: CommodityType;
    year: number;
  };
  appliedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// ===== Create/Update Request Types =====

export interface CreateChemicalPlanTemplateRequest {
  name: string;
  description?: string;
  commodityType?: CommodityType;
  year?: number;
  items?: CreateChemicalPlanTemplateItemRequest[];
}

export interface UpdateChemicalPlanTemplateRequest {
  name?: string;
  description?: string;
  commodityType?: CommodityType;
  year?: number;
  isActive?: boolean;
}

export interface CreateChemicalPlanTemplateItemRequest {
  chemicalId: string;
  ratePerAcre: number;
  notes?: string;
  order?: number;
}

export interface UpdateChemicalPlanTemplateItemRequest {
  ratePerAcre?: number;
  notes?: string;
  order?: number;
}

// ===== Apply Template Types =====

export interface ApplyTemplateRequest {
  farmIds?: string[];           // Specific farm IDs to apply to
  commodityType?: CommodityType; // Apply to all farms of this commodity
  year?: number;                 // Filter by year
}

export interface ApplyTemplateResponse {
  applied: number;             // Count of farms template was applied to
  skipped: number;             // Farms that already had this template
  farmIds: string[];           // List of farm IDs affected
}

export interface RemoveTemplateRequest {
  farmIds: string[];
}

// ===== Query Types =====

export interface GetChemicalPlanTemplatesQuery {
  commodityType?: CommodityType;
  year?: number;
  isActive?: boolean;
}

export interface FarmWithTemplateApplication {
  farmId: string;
  farmName: string;
  acres: number;
  commodityType: CommodityType;
  year: number;
  grainEntityName?: string;
  appliedAt: Date;
  hasOverrides: boolean;
}

// ===== Farm Template Info (for farm views) =====

export interface FarmTemplateInfo {
  templateId: string;
  templateName: string;
  appliedAt: Date;
  hasOverrides: boolean;
}
