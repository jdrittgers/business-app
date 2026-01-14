import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as softDeleteController from '../controllers/soft-delete.controller';

const router = Router();

/**
 * GET /api/deleted-items
 * Get deleted items for a business or retailer
 * Query params: businessId or retailerId
 */
router.get(
  '/',
  authenticate,
  softDeleteController.getDeletedItems
);

/**
 * POST /api/deleted-items/restore/:type/:id
 * Restore a soft-deleted item
 * Types: business, grain-entity, grain-contract, grain-bin, farm, bid-request, retailer
 */
router.post(
  '/restore/:type/:id',
  authenticate,
  softDeleteController.restoreItem
);

/**
 * DELETE /api/deleted-items/permanent/:type/:id
 * Permanently delete an item (admin only)
 */
router.delete(
  '/permanent/:type/:id',
  authenticate,
  softDeleteController.permanentlyDeleteItem
);

/**
 * POST /api/deleted-items/cleanup
 * Cleanup old deleted items (admin only - for scheduled tasks)
 */
router.post(
  '/cleanup',
  authenticate,
  softDeleteController.cleanupOldDeletedItems
);

export default router;
