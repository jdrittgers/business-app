import apiClient from './client';
import {
  MarketingSignal,
  MarketingPreferences,
  UpdateMarketingPreferencesRequest,
  GetSignalsQuery,
  StrategyRecommendation,
  MarketOutlook,
  FuturesQuote,
  BasisData,
  PriceTrendAnalysis,
  OptionsPosition,
  CreateOptionsPositionRequest,
  UpdateOptionsPositionRequest,
  CommodityType
} from '@business-app/shared';

export const marketingAiApi = {
  // ===== Signals =====

  getSignals: async (
    businessId: string,
    query?: GetSignalsQuery
  ): Promise<MarketingSignal[]> => {
    const params = new URLSearchParams();
    if (query?.status) params.append('status', query.status);
    if (query?.signalType) params.append('signalType', query.signalType);
    if (query?.commodityType) params.append('commodityType', query.commodityType);
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.offset) params.append('offset', String(query.offset));

    const queryString = params.toString();
    const url = `/api/businesses/${businessId}/marketing-ai/signals${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get(url);
    return response.data;
  },

  getSignal: async (businessId: string, signalId: string): Promise<MarketingSignal> => {
    const response = await apiClient.get(
      `/api/businesses/${businessId}/marketing-ai/signals/${signalId}`
    );
    return response.data;
  },

  generateSignals: async (businessId: string): Promise<MarketingSignal[]> => {
    const response = await apiClient.post(
      `/api/businesses/${businessId}/marketing-ai/signals/generate`
    );
    return response.data;
  },

  dismissSignal: async (
    businessId: string,
    signalId: string,
    reason?: string
  ): Promise<MarketingSignal> => {
    const response = await apiClient.post(
      `/api/businesses/${businessId}/marketing-ai/signals/${signalId}/dismiss`,
      { reason }
    );
    return response.data;
  },

  recordAction: async (
    businessId: string,
    signalId: string,
    action: string
  ): Promise<MarketingSignal> => {
    const response = await apiClient.post(
      `/api/businesses/${businessId}/marketing-ai/signals/${signalId}/action`,
      { action }
    );
    return response.data;
  },

  // ===== Preferences =====

  getPreferences: async (businessId: string): Promise<MarketingPreferences> => {
    const response = await apiClient.get(
      `/api/businesses/${businessId}/marketing-ai/preferences`
    );
    return response.data;
  },

  updatePreferences: async (
    businessId: string,
    data: UpdateMarketingPreferencesRequest
  ): Promise<MarketingPreferences> => {
    const response = await apiClient.put(
      `/api/businesses/${businessId}/marketing-ai/preferences`,
      data
    );
    return response.data;
  },

  // ===== AI Analysis =====

  requestAnalysis: async (
    businessId: string,
    analysisType: string,
    signalId?: string,
    commodityType?: CommodityType
  ): Promise<{ analysis: string }> => {
    const response = await apiClient.post(
      `/api/businesses/${businessId}/marketing-ai/analyze`,
      { analysisType, signalId, commodityType }
    );
    return response.data;
  },

  getStrategyRecommendation: async (
    businessId: string
  ): Promise<StrategyRecommendation> => {
    const response = await apiClient.get(
      `/api/businesses/${businessId}/marketing-ai/strategy-recommendation`
    );
    return response.data;
  },

  getMarketOutlook: async (
    businessId: string,
    commodityType: CommodityType
  ): Promise<MarketOutlook> => {
    const response = await apiClient.get(
      `/api/businesses/${businessId}/marketing-ai/market-outlook/${commodityType}`
    );
    return response.data;
  },

  // ===== Market Data =====

  getFuturesQuotes: async (commodityType: CommodityType): Promise<FuturesQuote[]> => {
    const response = await apiClient.get(`/api/market-data/futures/${commodityType}`);
    return response.data;
  },

  getBasisData: async (
    commodityType: CommodityType,
    location?: string
  ): Promise<BasisData[]> => {
    const url = location
      ? `/api/market-data/basis/${commodityType}?location=${encodeURIComponent(location)}`
      : `/api/market-data/basis/${commodityType}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  getPriceTrend: async (commodityType: CommodityType): Promise<PriceTrendAnalysis> => {
    const response = await apiClient.get(`/api/market-data/trend/${commodityType}`);
    return response.data;
  },

  getHarvestContracts: async (harvestYear: number): Promise<{
    harvestYear: number;
    corn: { contractMonth: string; closePrice: number; priceChange?: number; quoteDate: string; source: string } | null;
    soybeans: { contractMonth: string; closePrice: number; priceChange?: number; quoteDate: string; source: string } | null;
    source: 'live' | 'mock';
  }> => {
    const response = await apiClient.get(`/api/market-data/harvest/${harvestYear}`);
    return response.data;
  },

  // ===== Options Positions =====

  getOptionsPositions: async (businessId: string): Promise<OptionsPosition[]> => {
    const response = await apiClient.get(
      `/api/businesses/${businessId}/options-positions`
    );
    return response.data;
  },

  createOptionsPosition: async (
    businessId: string,
    data: CreateOptionsPositionRequest
  ): Promise<OptionsPosition> => {
    const response = await apiClient.post(
      `/api/businesses/${businessId}/options-positions`,
      data
    );
    return response.data;
  },

  updateOptionsPosition: async (
    businessId: string,
    positionId: string,
    data: UpdateOptionsPositionRequest
  ): Promise<OptionsPosition> => {
    const response = await apiClient.put(
      `/api/businesses/${businessId}/options-positions/${positionId}`,
      data
    );
    return response.data;
  },

  deleteOptionsPosition: async (
    businessId: string,
    positionId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/api/businesses/${businessId}/options-positions/${positionId}`
    );
  }
};
