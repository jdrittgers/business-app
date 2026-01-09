import apiClient from './client';
import { Invoice, UpdateInvoiceLineItemRequest } from '@business-app/shared';

export const invoiceApi = {
  uploadInvoice: async (businessId: string, file: File): Promise<Invoice> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(
      `/api/businesses/${businessId}/invoices`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' }
      }
    );
    return response.data;
  },

  getInvoices: async (businessId: string): Promise<Invoice[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/invoices`);
    return response.data;
  },

  getInvoice: async (businessId: string, id: string): Promise<Invoice> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/invoices/${id}`);
    return response.data;
  },

  updateLineItem: async (
    businessId: string,
    lineItemId: string,
    data: UpdateInvoiceLineItemRequest
  ) => {
    const response = await apiClient.put(
      `/api/businesses/${businessId}/invoices/line-items/${lineItemId}`,
      data
    );
    return response.data;
  },

  lockPrices: async (businessId: string, invoiceId: string): Promise<Invoice> => {
    const response = await apiClient.post(
      `/api/businesses/${businessId}/invoices/${invoiceId}/lock-prices`
    );
    return response.data;
  },

  deleteInvoice: async (businessId: string, id: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/invoices/${id}`);
  }
};
