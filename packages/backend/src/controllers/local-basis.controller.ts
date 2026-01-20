import { Router, Request, Response } from 'express';
import { localBasisService } from '../services/local-basis.service';
import { CommodityType } from '@prisma/client';

const router = Router();

/**
 * GET /api/businesses/:businessId/local-basis
 * Get all local basis values for a business
 */
router.get('/businesses/:businessId/local-basis', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const basis = await localBasisService.getBasis(businessId);
    res.json(basis);
  } catch (error) {
    console.error('Error fetching local basis:', error);
    res.status(500).json({ error: 'Failed to fetch local basis' });
  }
});

/**
 * GET /api/businesses/:businessId/local-basis/:commodityType
 * Get basis for a specific commodity
 */
router.get('/businesses/:businessId/local-basis/:commodityType', async (req: Request, res: Response) => {
  try {
    const { businessId, commodityType } = req.params;
    const basis = await localBasisService.getBasisByCommodity(
      businessId,
      commodityType as CommodityType
    );

    if (!basis) {
      return res.status(404).json({ error: 'Basis entry not found' });
    }

    res.json(basis);
  } catch (error) {
    console.error('Error fetching local basis:', error);
    res.status(500).json({ error: 'Failed to fetch local basis' });
  }
});

/**
 * PUT /api/businesses/:businessId/local-basis
 * Update or create local basis entry
 */
router.put('/businesses/:businessId/local-basis', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { commodityType, basisValue, notes } = req.body;

    if (!commodityType || basisValue === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: commodityType, basisValue'
      });
    }

    const basis = await localBasisService.updateBasis(businessId, {
      commodityType: commodityType as CommodityType,
      basisValue: Number(basisValue),
      notes
    });

    res.json(basis);
  } catch (error) {
    console.error('Error updating local basis:', error);
    res.status(500).json({ error: 'Failed to update local basis' });
  }
});

/**
 * DELETE /api/businesses/:businessId/local-basis/:commodityType
 * Delete local basis entry
 */
router.delete('/businesses/:businessId/local-basis/:commodityType', async (req: Request, res: Response) => {
  try {
    const { businessId, commodityType } = req.params;

    await localBasisService.deleteBasis(
      businessId,
      commodityType as CommodityType
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting local basis:', error);
    res.status(500).json({ error: 'Failed to delete local basis' });
  }
});

export default router;
