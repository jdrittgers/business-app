import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ProductionTrackingService } from '../services/production-tracking.service';
import {
  CreateProductionRequest,
  UpdateProductionRequest,
  GetProductionsQuery
} from '@business-app/shared';

const productionService = new ProductionTrackingService();

export class ProductionTrackingController {
  // Get productions
  async getProductions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const query: GetProductionsQuery = {
        grainEntityId: req.query.grainEntityId as string,
        commodityType: req.query.commodityType as any,
        year: req.query.year ? parseInt(req.query.year as string) : undefined
      };

      const productions = await productionService.getProductions(businessId, query);
      res.json(productions);
    } catch (error) {
      console.error('Get productions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get single production
  async getProduction(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { productionId } = req.params;
      const production = await productionService.getProduction(productionId);
      res.json(production);
    } catch (error) {
      if (error instanceof Error && error.message === 'Production record not found') {
        res.status(404).json({ error: 'Production record not found' });
        return;
      }
      console.error('Get production error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create production
  async createProduction(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const data: CreateProductionRequest = req.body;

      if (!data.grainEntityId || !data.commodityType || !data.year || !data.acres || !data.bushelsPerAcre) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const production = await productionService.createProduction(data);
      res.status(201).json(production);
    } catch (error) {
      console.error('Create production error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update production
  async updateProduction(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { productionId } = req.params;
      const data: UpdateProductionRequest = req.body;

      const production = await productionService.updateProduction(productionId, data);
      res.json(production);
    } catch (error) {
      console.error('Update production error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Delete production
  async deleteProduction(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { productionId } = req.params;
      await productionService.deleteProduction(productionId);
      res.json({ message: 'Production deleted successfully' });
    } catch (error) {
      console.error('Delete production error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get production summary
  async getProductionSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const grainEntityId = req.query.grainEntityId as string | undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const summary = await productionService.getProductionSummary(businessId, grainEntityId, year);
      res.json(summary);
    } catch (error) {
      console.error('Get production summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
