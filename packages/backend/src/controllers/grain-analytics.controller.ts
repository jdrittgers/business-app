import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { GrainAnalyticsService } from '../services/grain-analytics.service';
import { GetDashboardSummaryQuery } from '@business-app/shared';

const analyticsService = new GrainAnalyticsService();

export class GrainAnalyticsController {
  // Get dashboard summary
  async getDashboardSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const query: GetDashboardSummaryQuery = {
        grainEntityId: req.query.grainEntityId as string,
        year: req.query.year ? parseInt(req.query.year as string) : undefined
      };

      const summary = await analyticsService.getDashboardSummary(businessId, query);
      res.json(summary);
    } catch (error) {
      console.error('Get dashboard summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get accumulator performance metrics
  async getAccumulatorPerformance(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { contractId } = req.params;
      const performance = await analyticsService.getAccumulatorPerformance(contractId);
      res.json(performance);
    } catch (error) {
      if (error instanceof Error && error.message === 'Accumulator contract not found') {
        res.status(404).json({ error: 'Accumulator contract not found' });
        return;
      }
      console.error('Get accumulator performance error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
