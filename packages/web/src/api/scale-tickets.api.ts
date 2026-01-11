import apiClient from './client';
import { ScaleTicket, AssignBinRequest } from '@business-app/shared';

export const scaleTicketsApi = {
  // Upload a scale ticket
  uploadScaleTicket: async (businessId: string, file: File): Promise<ScaleTicket> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(
      `/api/businesses/${businessId}/scale-tickets`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data;
  },

  // Get all scale tickets for a business
  getScaleTickets: async (businessId: string): Promise<ScaleTicket[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/scale-tickets`);
    return response.data;
  },

  // Get a single scale ticket
  getScaleTicket: async (businessId: string, ticketId: string): Promise<ScaleTicket> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/scale-tickets/${ticketId}`);
    return response.data;
  },

  // Assign bin and process ticket
  assignBinAndProcess: async (
    businessId: string,
    ticketId: string,
    data: AssignBinRequest
  ): Promise<ScaleTicket> => {
    const response = await apiClient.post(
      `/api/businesses/${businessId}/scale-tickets/${ticketId}/assign-bin`,
      data
    );
    return response.data;
  },

  // Delete a scale ticket
  deleteScaleTicket: async (businessId: string, ticketId: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/scale-tickets/${ticketId}`);
  }
};
