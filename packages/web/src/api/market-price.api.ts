import apiClient from './client';
import {
  MarketPrice,
  GetMarketPricesQuery,
  CommodityType
} from '@business-app/shared';

export const marketPriceApi = {
  // Get market prices
  getMarketPrices: async (query?: GetMarketPricesQuery): Promise<MarketPrice[]> => {
    const response = await apiClient.get(`/api/market-prices`, {
      params: query
    });
    return response.data;
  },

  // Get latest prices
  getLatestPrices: async (): Promise<{ [key in CommodityType]?: number }> => {
    const response = await apiClient.get(`/api/market-prices/latest`);
    return response.data;
  },

  // Trigger price fetch
  fetchLivePrices: async (): Promise<{ message: string }> => {
    const response = await apiClient.post(`/api/market-prices/fetch`, {});
    return response.data;
  },

  // Save manual price
  saveManualPrice: async (commodityType: CommodityType, price: number): Promise<MarketPrice> => {
    const response = await apiClient.post(`/api/market-prices/manual`, {
      commodityType,
      price
    });
    return response.data;
  }
};
