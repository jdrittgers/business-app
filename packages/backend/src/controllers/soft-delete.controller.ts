import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { SoftDeleteService } from '../services/soft-delete.service';
import { UserRole } from '@prisma/client';

const softDeleteService = new SoftDeleteService();

/**
 * Get deleted items for a business
 */
export async function getDeletedItems(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { businessId, retailerId } = req.query;

    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    let deletedItems;

    if (businessId) {
      deletedItems = await softDeleteService.getDeletedItemsForBusiness(businessId as string);
    } else if (retailerId) {
      deletedItems = await softDeleteService.getDeletedItemsForRetailer(retailerId as string);
    } else {
      res.status(400).json({ error: 'Business ID or Retailer ID required' });
      return;
    }

    res.json(deletedItems);
  } catch (error: any) {
    console.error('Get deleted items error:', error);
    res.status(500).json({ error: error.message || 'Failed to get deleted items' });
  }
}

/**
 * Restore a soft-deleted item
 */
export async function restoreItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { type, id } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Verify the item exists and user has permission
    // This should be enhanced with proper authorization checks
    await softDeleteService.restoreItem(type, id);

    res.json({ success: true, message: 'Item restored successfully' });
  } catch (error: any) {
    console.error('Restore item error:', error);
    res.status(500).json({ error: error.message || 'Failed to restore item' });
  }
}

/**
 * Permanently delete an item (admin only)
 */
export async function permanentlyDeleteItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { type, id } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Only owners can permanently delete items
    if (req.user.role !== UserRole.OWNER) {
      res.status(403).json({ error: 'Owner access required' });
      return;
    }

    await softDeleteService.permanentlyDeleteItem(type, id);

    res.json({ success: true, message: 'Item permanently deleted' });
  } catch (error: any) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ error: error.message || 'Failed to permanently delete item' });
  }
}

/**
 * Permanently delete old items (scheduled task endpoint - admin only)
 */
export async function cleanupOldDeletedItems(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Only owners can trigger cleanup
    if (req.user.role !== UserRole.OWNER) {
      res.status(403).json({ error: 'Owner access required' });
      return;
    }

    const result = await softDeleteService.permanentlyDeleteOldItems();

    res.json({
      success: true,
      message: 'Cleanup completed',
      deleted: result
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message || 'Failed to cleanup old items' });
  }
}
