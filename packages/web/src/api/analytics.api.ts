import apiClient from './client';
import {
  DashboardSummary,
  GetDashboardSummaryQuery,
  AccumulatorPerformance
} from '@business-app/shared';

export const analyticsApi = {
  // Get dashboard summary
  getDashboardSummary: async (businessId: string, query?: GetDashboardSummaryQuery): Promise<DashboardSummary> => {
    const response = await apiClient.get(`/api/businesses/${businessId}/grain-analytics/dashboard`, {
      params: query
    });
    return response.data;
  },

  // Get accumulator performance
  getAccumulatorPerformance: async (contractId: string): Promise<AccumulatorPerformance> => {
    const response = await apiClient.get(`/api/grain-contracts/${contractId}/accumulator-performance`);
    return response.data;
  }
};
