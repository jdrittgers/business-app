import apiClient from './client';
import {
  LandParcel,
  CreateLandParcelRequest,
  UpdateLandParcelRequest,
  LandLoan,
  CreateLandLoanRequest,
  UpdateLandLoanRequest,
  LandLoanPayment,
  CreateLandLoanPaymentRequest,
  OperatingLoan,
  CreateOperatingLoanRequest,
  UpdateOperatingLoanRequest,
  OperatingLoanTransaction,
  LoanInterestSummary,
  FarmInterestAllocation,
  Equipment,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  EquipmentLoan,
  CreateEquipmentLoanRequest,
  UpdateEquipmentLoanRequest,
  EquipmentLoanPayment,
  CreateEquipmentLoanPaymentRequest
} from '@business-app/shared';

export const loansApi = {
  // ===== Land Parcels =====

  // Get all land parcels for a business
  getLandParcels: async (businessId: string, isActive?: boolean): Promise<LandParcel[]> => {
    const params = isActive !== undefined ? { isActive } : {};
    const response = await apiClient.get(`/api/businesses/${businessId}/land-parcels`, { params });
    return response.data;
  },

  // Get a single land parcel
  getLandParcel: async (businessId: string, parcelId: string): Promise<LandParcel> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/land-parcels/${parcelId}`);
    return response.data;
  },

  // Create a new land parcel
  createLandParcel: async (businessId: string, data: CreateLandParcelRequest): Promise<LandParcel> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/land-parcels`, data);
    return response.data;
  },

  // Update a land parcel
  updateLandParcel: async (businessId: string, parcelId: string, data: UpdateLandParcelRequest): Promise<LandParcel> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/land-parcels/${parcelId}`, data);
    return response.data;
  },

  // Delete a land parcel (soft delete)
  deleteLandParcel: async (businessId: string, parcelId: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/land-parcels/${parcelId}`);
  },

  // ===== Land Loans =====

  // Get loans for a land parcel
  getLandLoans: async (parcelId: string): Promise<LandLoan[]> => {
    const response = await apiClient.get(`/api/land-parcels/${parcelId}/loans`);
    return response.data;
  },

  // Get a single land loan
  getLandLoan: async (loanId: string): Promise<LandLoan> => {
    const response = await apiClient.get(`/api/land-loans/${loanId}`);
    return response.data;
  },

  // Create a new land loan
  createLandLoan: async (parcelId: string, data: CreateLandLoanRequest): Promise<LandLoan> => {
    const response = await apiClient.post(`/api/land-parcels/${parcelId}/loans`, data);
    return response.data;
  },

  // Update a land loan
  updateLandLoan: async (loanId: string, data: UpdateLandLoanRequest): Promise<LandLoan> => {
    const response = await apiClient.put(`/api/land-loans/${loanId}`, data);
    return response.data;
  },

  // Delete a land loan (soft delete)
  deleteLandLoan: async (loanId: string): Promise<void> => {
    await apiClient.delete(`/api/land-loans/${loanId}`);
  },

  // Record a payment on a land loan
  recordLandLoanPayment: async (loanId: string, data: CreateLandLoanPaymentRequest): Promise<LandLoanPayment> => {
    const response = await apiClient.post(`/api/land-loans/${loanId}/payments`, data);
    return response.data;
  },

  // ===== Operating Loans =====

  // Get all operating loans for a business
  getOperatingLoans: async (
    businessId: string,
    query?: { grainEntityId?: string; year?: number; isActive?: boolean }
  ): Promise<OperatingLoan[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/operating-loans`, { params: query });
    return response.data;
  },

  // Get operating loans for a grain entity
  getOperatingLoansByEntity: async (entityId: string, year?: number): Promise<OperatingLoan[]> => {
    const params = year ? { year } : {};
    const response = await apiClient.get(`/api/grain-entities/${entityId}/operating-loans`, { params });
    return response.data;
  },

  // Get a single operating loan
  getOperatingLoan: async (loanId: string): Promise<OperatingLoan> => {
    const response = await apiClient.get(`/api/operating-loans/${loanId}`);
    return response.data;
  },

  // Create a new operating loan
  createOperatingLoan: async (entityId: string, data: CreateOperatingLoanRequest): Promise<OperatingLoan> => {
    const response = await apiClient.post(`/api/grain-entities/${entityId}/operating-loans`, data);
    return response.data;
  },

  // Update an operating loan
  updateOperatingLoan: async (loanId: string, data: UpdateOperatingLoanRequest): Promise<OperatingLoan> => {
    const response = await apiClient.put(`/api/operating-loans/${loanId}`, data);
    return response.data;
  },

  // Delete an operating loan (soft delete)
  deleteOperatingLoan: async (loanId: string): Promise<void> => {
    await apiClient.delete(`/api/operating-loans/${loanId}`);
  },

  // Record a draw on an operating loan
  recordDraw: async (
    loanId: string,
    data: { amount: number; transactionDate?: string; description?: string }
  ): Promise<OperatingLoanTransaction> => {
    const response = await apiClient.post(`/api/operating-loans/${loanId}/draw`, data);
    return response.data;
  },

  // Record a payment on an operating loan
  recordOperatingLoanPayment: async (
    loanId: string,
    data: { amount: number; transactionDate?: string; description?: string }
  ): Promise<OperatingLoanTransaction> => {
    const response = await apiClient.post(`/api/operating-loans/${loanId}/payment`, data);
    return response.data;
  },

  // ===== Interest Summary =====

  // Get interest summary for a business
  getInterestSummary: async (businessId: string, year?: number): Promise<LoanInterestSummary> => {
    const params = year ? { year } : {};
    const response = await apiClient.get(`/api/businesses/${businessId}/loans/interest-summary`, { params });
    return response.data;
  },

  // Get interest allocation for a specific farm
  getFarmInterestAllocation: async (businessId: string, farmId: string, year?: number): Promise<FarmInterestAllocation> => {
    const params = year ? { year } : {};
    const response = await apiClient.get(`/api/businesses/${businessId}/farms/${farmId}/interest`, { params });
    return response.data;
  },

  // ===== Equipment =====

  // Get all equipment for a business
  getEquipment: async (businessId: string, isActive?: boolean): Promise<Equipment[]> => {
    const params = isActive !== undefined ? { isActive } : {};
    const response = await apiClient.get(`/api/businesses/${businessId}/equipment`, { params });
    return response.data;
  },

  // Get a single equipment item
  getEquipmentById: async (businessId: string, equipmentId: string): Promise<Equipment> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/equipment/${equipmentId}`);
    return response.data;
  },

  // Create new equipment
  createEquipment: async (businessId: string, data: CreateEquipmentRequest): Promise<Equipment> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/equipment`, data);
    return response.data;
  },

  // Update equipment
  updateEquipment: async (businessId: string, equipmentId: string, data: UpdateEquipmentRequest): Promise<Equipment> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/equipment/${equipmentId}`, data);
    return response.data;
  },

  // Delete equipment (soft delete)
  deleteEquipment: async (businessId: string, equipmentId: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/equipment/${equipmentId}`);
  },

  // ===== Equipment Loans =====

  // Get loans for an equipment item
  getEquipmentLoans: async (equipmentId: string): Promise<EquipmentLoan[]> => {
    const response = await apiClient.get(`/api/equipment/${equipmentId}/loans`);
    return response.data;
  },

  // Get a single equipment loan
  getEquipmentLoan: async (loanId: string): Promise<EquipmentLoan> => {
    const response = await apiClient.get(`/api/equipment-loans/${loanId}`);
    return response.data;
  },

  // Create a new equipment loan
  createEquipmentLoan: async (equipmentId: string, data: CreateEquipmentLoanRequest): Promise<EquipmentLoan> => {
    const response = await apiClient.post(`/api/equipment/${equipmentId}/loans`, data);
    return response.data;
  },

  // Update an equipment loan
  updateEquipmentLoan: async (loanId: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoan> => {
    const response = await apiClient.put(`/api/equipment-loans/${loanId}`, data);
    return response.data;
  },

  // Delete an equipment loan (soft delete)
  deleteEquipmentLoan: async (loanId: string): Promise<void> => {
    await apiClient.delete(`/api/equipment-loans/${loanId}`);
  },

  // Record a payment on an equipment loan
  recordEquipmentLoanPayment: async (loanId: string, data: CreateEquipmentLoanPaymentRequest): Promise<EquipmentLoanPayment> => {
    const response = await apiClient.post(`/api/equipment-loans/${loanId}/payments`, data);
    return response.data;
  }
};
