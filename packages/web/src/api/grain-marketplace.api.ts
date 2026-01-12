import axios from 'axios';
import {
  GrainPurchaseOfferWithDetails,
  GrainBinWithDistance,
  CreateGrainPurchaseOfferRequest,
  SearchBinsRequest,
  GrainPurchaseOfferStatus
} from '@business-app/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const grainMarketplaceApi = {
  /**
   * Search for grain bins within a radius
   */
  async searchBins(params: SearchBinsRequest): Promise<GrainBinWithDistance[]> {
    const response = await axios.get(`${API_URL}/api/grain-marketplace/bins/search`, {
      params,
      withCredentials: true
    });
    return response.data;
  },

  /**
   * Create a grain purchase offer
   */
  async createOffer(data: CreateGrainPurchaseOfferRequest): Promise<GrainPurchaseOfferWithDetails> {
    const response = await axios.post(`${API_URL}/api/grain-marketplace/offers`, data, {
      withCredentials: true
    });
    return response.data;
  },

  /**
   * Get all offers for a retailer
   */
  async getRetailerOffers(retailerId: string, status?: GrainPurchaseOfferStatus): Promise<GrainPurchaseOfferWithDetails[]> {
    const response = await axios.get(`${API_URL}/api/grain-marketplace/retailers/${retailerId}/offers`, {
      params: { status },
      withCredentials: true
    });
    return response.data;
  },

  /**
   * Cancel an offer (retailer only)
   */
  async cancelOffer(retailerId: string, offerId: string): Promise<void> {
    await axios.delete(`${API_URL}/api/grain-marketplace/retailers/${retailerId}/offers/${offerId}`, {
      withCredentials: true
    });
  },

  /**
   * Get all offers for a farmer's business
   */
  async getFarmerOffers(businessId: string, status?: GrainPurchaseOfferStatus): Promise<GrainPurchaseOfferWithDetails[]> {
    const response = await axios.get(`${API_URL}/api/grain-marketplace/businesses/${businessId}/offers`, {
      params: { status },
      withCredentials: true
    });
    return response.data;
  },

  /**
   * Get a single offer by ID
   */
  async getOfferById(offerId: string): Promise<GrainPurchaseOfferWithDetails> {
    const response = await axios.get(`${API_URL}/api/grain-marketplace/offers/${offerId}`, {
      withCredentials: true
    });
    return response.data;
  },

  /**
   * Accept an offer
   */
  async acceptOffer(offerId: string): Promise<GrainPurchaseOfferWithDetails> {
    const response = await axios.post(`${API_URL}/api/grain-marketplace/offers/${offerId}/accept`, {}, {
      withCredentials: true
    });
    return response.data;
  },

  /**
   * Reject an offer
   */
  async rejectOffer(offerId: string): Promise<GrainPurchaseOfferWithDetails> {
    const response = await axios.post(`${API_URL}/api/grain-marketplace/offers/${offerId}/reject`, {}, {
      withCredentials: true
    });
    return response.data;
  },

  /**
   * Complete an offer (mark as delivered)
   */
  async completeOffer(offerId: string): Promise<GrainPurchaseOfferWithDetails> {
    const response = await axios.post(`${API_URL}/api/grain-marketplace/offers/${offerId}/complete`, {}, {
      withCredentials: true
    });
    return response.data;
  }
};
