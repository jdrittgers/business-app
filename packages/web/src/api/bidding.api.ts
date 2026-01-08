import apiClient from './client';
import {
  BidRequest,
  CreateBidRequestRequest,
  UpdateBidRequestRequest,
  GetBidRequestsQuery,
  GetOpenBidRequestsQuery,
  RetailerBid,
  CreateRetailerBidRequest,
  UpdateRetailerBidRequest
} from '@business-app/shared';

export const biddingApi = {
  // Farmer Bid Request Operations
  getBidRequests: async (businessId: string, query?: GetBidRequestsQuery): Promise<BidRequest[]> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/bid-requests`, { params: query });
    return response.data;
  },

  getBidRequest: async (businessId: string, id: string): Promise<BidRequest> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/bid-requests/${id}`);
    return response.data;
  },

  createBidRequest: async (businessId: string, data: CreateBidRequestRequest): Promise<BidRequest> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/bid-requests`, data);
    return response.data;
  },

  updateBidRequest: async (businessId: string, id: string, data: UpdateBidRequestRequest): Promise<BidRequest> => {
    const response = await apiClient.put(`/api/businesses/${businessId}/bid-requests/${id}`, data);
    return response.data;
  },

  closeBidRequest: async (businessId: string, id: string): Promise<BidRequest> => {
    const response = await apiClient.post(`/api/businesses/${businessId}/bid-requests/${id}/close`);
    return response.data;
  },

  deleteBidRequest: async (businessId: string, id: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/bid-requests/${id}`);
  },

  deleteRetailerBid: async (businessId: string, bidRequestId: string, bidId: string): Promise<void> => {
    await apiClient.delete(`/api/businesses/${businessId}/bid-requests/${bidRequestId}/bids/${bidId}`);
  },

  acceptBid: async (bidId: string): Promise<void> => {
    await apiClient.post(`/api/bids/${bidId}/accept`);
  },

  // Retailer Operations
  getOpenBidRequests: async (params?: GetOpenBidRequestsQuery): Promise<BidRequest[]> => {
    const response = await apiClient.get('/api/retailer/bid-requests/open', { params });
    return response.data;
  },

  getMyBids: async (): Promise<RetailerBid[]> => {
    const response = await apiClient.get('/api/retailer/bids');
    return response.data;
  },

  createBid: async (data: CreateRetailerBidRequest): Promise<RetailerBid> => {
    const response = await apiClient.post('/api/retailer/bids', data);
    return response.data;
  },

  updateBid: async (id: string, data: UpdateRetailerBidRequest): Promise<RetailerBid> => {
    const response = await apiClient.put(`/api/retailer/bids/${id}`, data);
    return response.data;
  },

  deleteBid: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/retailer/bids/${id}`);
  }
};
