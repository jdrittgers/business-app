import apiClient from './client';
import {
  EquipmentMaintenance,
  MaintenanceHistory,
  CreateMaintenanceRequest,
  UpdateMaintenanceRequest,
  CompleteMaintenanceRequest
} from '@business-app/shared';

export const maintenanceApi = {
  // ===== Business-level maintenance =====

  // Get all maintenance items for a business
  getAll: async (businessId: string): Promise<EquipmentMaintenance[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/maintenance`);
    return response.data;
  },

  // Get upcoming maintenance items (due within X days)
  getUpcoming: async (businessId: string, days: number = 14): Promise<EquipmentMaintenance[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/maintenance/upcoming`, {
      params: { days }
    });
    return response.data;
  },

  // ===== Equipment-level maintenance =====

  // Get all maintenance items for a specific equipment
  getByEquipment: async (equipmentId: string): Promise<EquipmentMaintenance[]> => {
    const response = await apiClient.get(`/api/equipment/${equipmentId}/maintenance`);
    return response.data;
  },

  // Create a new maintenance schedule for equipment
  create: async (equipmentId: string, data: CreateMaintenanceRequest): Promise<EquipmentMaintenance> => {
    const response = await apiClient.post(`/api/equipment/${equipmentId}/maintenance`, data);
    return response.data;
  },

  // ===== Individual maintenance item =====

  // Get a single maintenance item by ID
  getById: async (id: string): Promise<EquipmentMaintenance> => {
    const response = await apiClient.get(`/api/maintenance/${id}`);
    return response.data;
  },

  // Update a maintenance schedule
  update: async (id: string, data: UpdateMaintenanceRequest): Promise<EquipmentMaintenance> => {
    const response = await apiClient.put(`/api/maintenance/${id}`, data);
    return response.data;
  },

  // Delete a maintenance schedule
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/maintenance/${id}`);
  },

  // Complete a maintenance item
  complete: async (id: string, data: CompleteMaintenanceRequest): Promise<EquipmentMaintenance> => {
    const response = await apiClient.post(`/api/maintenance/${id}/complete`, data);
    return response.data;
  },

  // Get maintenance history
  getHistory: async (id: string): Promise<MaintenanceHistory[]> => {
    const response = await apiClient.get(`/api/maintenance/${id}/history`);
    return response.data;
  }
};
