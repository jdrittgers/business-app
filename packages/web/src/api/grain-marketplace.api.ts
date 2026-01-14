import apiClient from './client';
import {
  GrainPurchaseOfferWithDetails,
  GrainBinWithDistance,
  CreateGrainPurchaseOfferRequest,
  SearchBinsRequest,
  GrainPurchaseOfferStatus
} from '@business-app/shared';

export const grainMarketplaceApi = {
  /**
   * Search for grain bins within a radius
   */
  async searchBins(params: SearchBinsRequest): Promise<GrainBinWithDistance[]> {
    const response = await apiClient.get('/api/grain-marketplace/bins/search', {
      params
    });
    return response.data;
  },

  /**
   * Create a grain purchase offer
   */
  async createOffer(data: CreateGrainPurchaseOfferRequest): Promise<GrainPurchaseOfferWithDetails> {
    const response = await apiClient.post('/api/grain-marketplace/offers', data);
    return response.data;
  },

  /**
   * Get all offers for a retailer
   */
  async getRetailerOffers(retailerId: string, status?: GrainPurchaseOfferStatus): Promise<GrainPurchaseOfferWithDetails[]> {
    const response = await apiClient.get(`/api/grain-marketplace/retailers/${retailerId}/offers`, {
      params: { status }
    });
    return response.data;
  },

  /**
   * Cancel an offer (retailer only)
   */
  async cancelOffer(retailerId: string, offerId: string): Promise<void> {
    await apiClient.delete(`/api/grain-marketplace/retailers/${retailerId}/offers/${offerId}`);
  },

  /**
   * Get all offers for a farmer's business
   */
  async getFarmerOffers(businessId: string, status?: GrainPurchaseOfferStatus): Promise<GrainPurchaseOfferWithDetails[]> {
    const response = await apiClient.get(`/api/grain-marketplace/businesses/${businessId}/offers`, {
      params: { status }
    });
    return response.data;
  },

  /**
   * Get a single offer by ID
   */
  async getOfferById(offerId: string): Promise<GrainPurchaseOfferWithDetails> {
    const response = await apiClient.get(`/api/grain-marketplace/offers/${offerId}`);
    return response.data;
  },

  /**
   * Accept an offer
   */
  async acceptOffer(offerId: string): Promise<GrainPurchaseOfferWithDetails> {
    const response = await apiClient.post(`/api/grain-marketplace/offers/${offerId}/accept`, {});
    return response.data;
  },

  /**
   * Reject an offer
   */
  async rejectOffer(offerId: string): Promise<GrainPurchaseOfferWithDetails> {
    const response = await apiClient.post(`/api/grain-marketplace/offers/${offerId}/reject`, {});
    return response.data;
  },

  /**
   * Complete an offer (mark as delivered)
   */
  async completeOffer(offerId: string): Promise<GrainPurchaseOfferWithDetails> {
    const response = await apiClient.post(`/api/grain-marketplace/offers/${offerId}/complete`, {});
    return response.data;
  }
};
