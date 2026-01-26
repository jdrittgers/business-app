import apiClient from './client';
import {
  JohnDeereConnectionStatus,
  JohnDeereOrganization,
  JohnDeereMachine,
  EquipmentJohnDeereMapping,
  JohnDeereSyncResult,
  JohnDeereAuthUrl
} from '@business-app/shared';

export const johnDeereApi = {
  // Get connection status
  getStatus: async (businessId: string): Promise<JohnDeereConnectionStatus> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/john-deere/status`);
    return response.data;
  },

  // Get authorization URL to start OAuth flow
  getAuthUrl: async (businessId: string): Promise<JohnDeereAuthUrl> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/john-deere/auth-url`);
    return response.data;
  },

  // Disconnect from John Deere
  disconnect: async (businessId: string): Promise<void> => {
    await apiClient.post(`/api/businesses/${businessId}/john-deere/disconnect`);
  },

  // Get available organizations
  getOrganizations: async (businessId: string): Promise<JohnDeereOrganization[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/john-deere/organizations`);
    return response.data;
  },

  // Set organization
  setOrganization: async (businessId: string, organizationId: string, organizationName: string): Promise<void> => {
    await apiClient.post(`/api/businesses/${businessId}/john-deere/organization`, {
      organizationId,
      organizationName
    });
  },

  // Get John Deere machines
  getMachines: async (businessId: string): Promise<JohnDeereMachine[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/john-deere/machines`);
    return response.data;
  },

  // Get equipment-to-JD mappings
  getMappings: async (businessId: string): Promise<EquipmentJohnDeereMapping[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/john-deere/mappings`);
    return response.data;
  },

  // Map equipment to John Deere machine
  mapEquipment: async (equipmentId: string, johnDeereMachineId: string | null): Promise<void> => {
    await apiClient.put(`/api/equipment/${equipmentId}/john-deere-mapping`, {
      johnDeereMachineId
    });
  },

  // Trigger manual sync
  sync: async (businessId: string): Promise<JohnDeereSyncResult> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/john-deere/sync`);
    return response.data;
  },

  // Get fields from John Deere
  getFields: async (businessId: string): Promise<Array<{ id: string; name: string; acres?: number; farmName?: string }>> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/john-deere/fields`);
    return response.data;
  },

  // Get farms from John Deere (JD's organizational structure)
  getJDFarms: async (businessId: string): Promise<Array<{ id: string; name: string }>> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/john-deere/farms`);
    return response.data;
  }
};
