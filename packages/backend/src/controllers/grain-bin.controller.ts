import { Request, Response } from 'express';
import { GrainBinService } from '../services/grain-bin.service';

const grainBinService = new GrainBinService();

export class GrainBinController {
  // GET /api/businesses/:businessId/grain-bins
  async getBinsByBusiness(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const bins = await grainBinService.getBinsByBusiness(businessId);

      res.json(bins);
    } catch (error) {
      console.error('Error getting bins by business:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get bins'
      });
    }
  }

  // GET /api/grain-entities/:grainEntityId/grain-bins
  async getBinsByGrainEntity(req: Request, res: Response) {
    try {
      const { grainEntityId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const bins = await grainBinService.getBinsByGrainEntity(grainEntityId);

      res.json(bins);
    } catch (error) {
      console.error('Error getting bins by grain entity:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get bins'
      });
    }
  }

  // GET /api/grain-bins/:binId
  async getBinById(req: Request, res: Response) {
    try {
      const { binId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const bin = await grainBinService.getById(binId);

      if (!bin) {
        return res.status(404).json({ error: 'Bin not found' });
      }

      res.json(bin);
    } catch (error) {
      console.error('Error getting bin:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get bin'
      });
    }
  }

  // POST /api/businesses/:businessId/grain-bins
  async createBin(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { grainEntityId, name, capacity, currentBushels, commodityType, cropYear, notes } = req.body;

      // Validation
      if (!grainEntityId || !name || !capacity || !commodityType || !cropYear) {
        return res.status(400).json({
          error: 'Missing required fields: grainEntityId, name, capacity, commodityType, cropYear'
        });
      }

      const bin = await grainBinService.createBin(userId, {
        grainEntityId,
        name,
        capacity: parseFloat(capacity),
        currentBushels: currentBushels ? parseFloat(currentBushels) : undefined,
        commodityType,
        cropYear: parseInt(cropYear),
        notes
      });

      res.status(201).json(bin);
    } catch (error) {
      console.error('Error creating bin:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create bin'
      });
    }
  }

  // PATCH /api/grain-bins/:binId
  async updateBin(req: Request, res: Response) {
    try {
      const { binId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, capacity, commodityType, cropYear, notes, isActive } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (capacity !== undefined) updateData.capacity = parseFloat(capacity);
      if (commodityType !== undefined) updateData.commodityType = commodityType;
      if (cropYear !== undefined) updateData.cropYear = parseInt(cropYear);
      if (notes !== undefined) updateData.notes = notes;
      if (isActive !== undefined) updateData.isActive = isActive;

      const bin = await grainBinService.updateBin(binId, userId, updateData);

      res.json(bin);
    } catch (error) {
      console.error('Error updating bin:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update bin'
      });
    }
  }

  // POST /api/grain-bins/:binId/add-grain
  async addGrain(req: Request, res: Response) {
    try {
      const { binId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { bushels, description } = req.body;

      if (!bushels || bushels <= 0) {
        return res.status(400).json({ error: 'Bushels must be greater than 0' });
      }

      const bin = await grainBinService.addGrain(binId, userId, {
        bushels: parseFloat(bushels),
        description
      });

      res.json(bin);
    } catch (error) {
      console.error('Error adding grain:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to add grain'
      });
    }
  }

  // GET /api/grain-bins/:binId/transactions
  async getTransactions(req: Request, res: Response) {
    try {
      const { binId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const transactions = await grainBinService.getTransactions(binId, userId);

      res.json(transactions);
    } catch (error) {
      console.error('Error getting transactions:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get transactions'
      });
    }
  }

  // GET /api/businesses/:businessId/grain-bins/summary
  async getSummaryByYear(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const { year } = req.query;
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const summaryYear = year ? parseInt(year as string) : new Date().getFullYear();

      const summary = await grainBinService.getSummaryByYear(businessId, summaryYear);

      res.json(summary);
    } catch (error) {
      console.error('Error getting summary:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get summary'
      });
    }
  }
}
