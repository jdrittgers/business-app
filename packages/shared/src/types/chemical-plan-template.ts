import { CommodityType } from './grain';
import { Chemical } from './breakeven';

// ===== Pass Type Enum =====

export enum PassType {
  PRE = 'PRE',
  POST = 'POST',
  FUNGICIDE = 'FUNGICIDE',
  IN_FURROW = 'IN_FURROW'
}

// ===== Chemical Plan Template Types =====

export interface ChemicalPlanTemplate {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  commodityType?: CommodityType;
  passType?: PassType;
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
  rateUnit?: string;  // OZ, PT, QT, GAL, LB - unit for the rate
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
  passType?: PassType;
  year?: number;
  items?: CreateChemicalPlanTemplateItemRequest[];
}

export interface UpdateChemicalPlanTemplateRequest {
  name?: string;
  description?: string;
  commodityType?: CommodityType;
  passType?: PassType;
  year?: number;
  isActive?: boolean;
}

export interface CreateChemicalPlanTemplateItemRequest {
  chemicalId: string;
  ratePerAcre: number;
  rateUnit?: string;  // OZ, PT, QT, GAL, LB - unit for the rate
  notes?: string;
  order?: number;
}

export interface UpdateChemicalPlanTemplateItemRequest {
  ratePerAcre?: number;
  rateUnit?: string;  // OZ, PT, QT, GAL, LB - unit for the rate
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
  passType?: PassType;
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

// ===== Invoice Import Types =====

export interface ImportInvoiceToTemplateRequest {
  invoiceId: string;
  lineItemIds: string[];    // Which line items to import
  templateIds: string[];    // Target template(s)
  defaultRatePerAcre?: number;  // Optional default if not on invoice
}

export interface ImportInvoiceToTemplateResponse {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface InvoiceChemicalForImport {
  lineItemId: string;
  productName: string;
  pricePerUnit: number;
  unit: string;
  ratePerAcre?: number;
  rateUnit?: string;
  matchedChemicalId?: string;
  matchedChemicalName?: string;
}
