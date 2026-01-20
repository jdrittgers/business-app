import { Router, Request, Response } from 'express';
import { oldCropInventoryService } from '../services/old-crop-inventory.service';
import { CommodityType } from '@prisma/client';

const router = Router();

/**
 * GET /api/businesses/:businessId/old-crop-inventory
 * Get all old crop inventory for a business
 */
router.get('/businesses/:businessId/old-crop-inventory', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const inventory = await oldCropInventoryService.getInventory(businessId);
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching old crop inventory:', error);
    res.status(500).json({ error: 'Failed to fetch old crop inventory' });
  }
});

/**
 * GET /api/businesses/:businessId/old-crop-inventory/:commodityType/:cropYear
 * Get specific inventory entry
 */
router.get('/businesses/:businessId/old-crop-inventory/:commodityType/:cropYear', async (req: Request, res: Response) => {
  try {
    const { businessId, commodityType, cropYear } = req.params;
    const inventory = await oldCropInventoryService.getInventoryByCommodity(
      businessId,
      commodityType as CommodityType,
      parseInt(cropYear)
    );

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory entry not found' });
    }

    res.json(inventory);
  } catch (error) {
    console.error('Error fetching old crop inventory:', error);
    res.status(500).json({ error: 'Failed to fetch old crop inventory' });
  }
});

/**
 * PUT /api/businesses/:businessId/old-crop-inventory
 * Update or create old crop inventory entry
 */
router.put('/businesses/:businessId/old-crop-inventory', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const { commodityType, unpricedBushels, cropYear } = req.body;

    if (!commodityType || unpricedBushels === undefined || !cropYear) {
      return res.status(400).json({
        error: 'Missing required fields: commodityType, unpricedBushels, cropYear'
      });
    }

    const inventory = await oldCropInventoryService.updateInventory(businessId, {
      commodityType: commodityType as CommodityType,
      unpricedBushels: Number(unpricedBushels),
      cropYear: Number(cropYear)
    });

    res.json(inventory);
  } catch (error) {
    console.error('Error updating old crop inventory:', error);
    res.status(500).json({ error: 'Failed to update old crop inventory' });
  }
});

/**
 * DELETE /api/businesses/:businessId/old-crop-inventory/:commodityType/:cropYear
 * Delete old crop inventory entry
 */
router.delete('/businesses/:businessId/old-crop-inventory/:commodityType/:cropYear', async (req: Request, res: Response) => {
  try {
    const { businessId, commodityType, cropYear } = req.params;

    await oldCropInventoryService.deleteInventory(
      businessId,
      commodityType as CommodityType,
      parseInt(cropYear)
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting old crop inventory:', error);
    res.status(500).json({ error: 'Failed to delete old crop inventory' });
  }
});

export default router;
