import apiClient from './client';
import {
  ChemicalPlanTemplate,
  ChemicalPlanTemplateItem,
  ChemicalPlanApplication,
  CreateChemicalPlanTemplateRequest,
  UpdateChemicalPlanTemplateRequest,
  CreateChemicalPlanTemplateItemRequest,
  UpdateChemicalPlanTemplateItemRequest,
  ApplyTemplateRequest,
  ApplyTemplateResponse,
  GetChemicalPlanTemplatesQuery,
  FarmWithTemplateApplication,
  ImportInvoiceToTemplateRequest,
  ImportInvoiceToTemplateResponse,
  InvoiceChemicalForImport
} from '@business-app/shared';

export const chemicalPlanTemplateApi = {
  // ===== Template CRUD =====

  getAll: async (businessId: string, query?: GetChemicalPlanTemplatesQuery): Promise<ChemicalPlanTemplate[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/chemical-plan-templates`, { params: query });
    return response.data;
  },

  getById: async (businessId: string, templateId: string): Promise<ChemicalPlanTemplate> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/chemical-plan-templates/${templateId}`);
    return response.data;
  },

  create: async (businessId: string, data: CreateChemicalPlanTemplateRequest): Promise<ChemicalPlanTemplate> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/chemical-plan-templates`, data);
    return response.data;
  },

  update: async (businessId: string, templateId: string, data: UpdateChemicalPlanTemplateRequest): Promise<ChemicalPlanTemplate> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/chemical-plan-templates/${templateId}`, data);
    return response.data;
  },

  delete: async (businessId: string, templateId: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/chemical-plan-templates/${templateId}`);
  },

  // ===== Template Items =====

  addItem: async (businessId: string, templateId: string, data: CreateChemicalPlanTemplateItemRequest): Promise<ChemicalPlanTemplateItem> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/chemical-plan-templates/${templateId}/items`, data);
    return response.data;
  },

  updateItem: async (businessId: string, templateId: string, itemId: string, data: UpdateChemicalPlanTemplateItemRequest): Promise<ChemicalPlanTemplateItem> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/chemical-plan-templates/${templateId}/items/${itemId}`, data);
    return response.data;
  },

  removeItem: async (businessId: string, templateId: string, itemId: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/chemical-plan-templates/${templateId}/items/${itemId}`);
  },

  // ===== Apply/Remove Template =====

  applyToFarms: async (businessId: string, templateId: string, request: ApplyTemplateRequest): Promise<ApplyTemplateResponse> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/chemical-plan-templates/${templateId}/apply`, request);
    return response.data;
  },

  removeFromFarms: async (businessId: string, templateId: string, farmIds: string[]): Promise<void> => {
    await apiClient.post(`/api/businesses/${businessId}/chemical-plan-templates/${templateId}/remove`, { farmIds });
  },

  getFarmsWithTemplate: async (businessId: string, templateId: string): Promise<FarmWithTemplateApplication[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/chemical-plan-templates/${templateId}/farms`);
    return response.data;
  },

  // ===== Farm Template Info =====

  getTemplateForFarm: async (businessId: string, farmId: string): Promise<ChemicalPlanApplication | null> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/farms/${farmId}/chemical-plan-template`);
    return response.data;
  },

  resetToTemplate: async (businessId: string, farmId: string, templateId: string): Promise<void> => {
    await apiClient.post(`/api/businesses/${businessId}/farms/${farmId}/reset-to-template/${templateId}`);
  },

  // ===== Invoice Import =====

  getImportableChemicals: async (businessId: string, invoiceId: string): Promise<InvoiceChemicalForImport[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/invoices/${invoiceId}/importable-chemicals`);
    return response.data;
  },

  importFromInvoice: async (businessId: string, request: ImportInvoiceToTemplateRequest): Promise<ImportInvoiceToTemplateResponse> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/chemical-plan-templates/import-from-invoice`, request);
    return response.data;
  }
};
