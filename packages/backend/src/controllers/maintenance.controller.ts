import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requireGrainAccess } from '../middleware/grain-access';
import { maintenanceService } from '../services/maintenance.service';

const router = Router();

// Apply auth and grain access middleware to all routes
router.use(authenticate);
router.use(requireGrainAccess);

// ===== Business-level maintenance routes =====

// Get all maintenance items for a business
router.get('/businesses/:businessId/maintenance', async (req: AuthRequest, res: Response) => {
  try {
    const items = await maintenanceService.getByBusiness(req.params.businessId);
    res.json(items);
  } catch (error: any) {
    console.error('Error getting maintenance items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming maintenance items for a business
router.get('/businesses/:businessId/maintenance/upcoming', async (req: AuthRequest, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 14;
    const items = await maintenanceService.getUpcoming(req.params.businessId, days);
    res.json(items);
  } catch (error: any) {
    console.error('Error getting upcoming maintenance:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Equipment-level maintenance routes =====

// Get all maintenance items for a specific equipment
router.get('/equipment/:equipmentId/maintenance', async (req: AuthRequest, res: Response) => {
  try {
    const items = await maintenanceService.getByEquipment(req.params.equipmentId);
    res.json(items);
  } catch (error: any) {
    console.error('Error getting equipment maintenance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new maintenance schedule for equipment
router.post('/equipment/:equipmentId/maintenance', async (req: AuthRequest, res: Response) => {
  try {
    const item = await maintenanceService.create({
      ...req.body,
      equipmentId: req.params.equipmentId
    });
    res.status(201).json(item);
  } catch (error: any) {
    console.error('Error creating maintenance schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Individual maintenance item routes =====

// Get a specific maintenance item
router.get('/maintenance/:id', async (req: AuthRequest, res: Response) => {
  try {
    const item = await maintenanceService.getById(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Maintenance item not found' });
      return;
    }
    res.json(item);
  } catch (error: any) {
    console.error('Error getting maintenance item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a maintenance schedule
router.put('/maintenance/:id', async (req: AuthRequest, res: Response) => {
  try {
    const item = await maintenanceService.update(req.params.id, req.body);
    res.json(item);
  } catch (error: any) {
    console.error('Error updating maintenance schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a maintenance schedule
router.delete('/maintenance/:id', async (req: AuthRequest, res: Response) => {
  try {
    await maintenanceService.delete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting maintenance schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete a maintenance item
router.post('/maintenance/:id/complete', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const item = await maintenanceService.complete(req.params.id, req.body, userId);
    res.json(item);
  } catch (error: any) {
    console.error('Error completing maintenance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get maintenance history
router.get('/maintenance/:id/history', async (req: AuthRequest, res: Response) => {
  try {
    const history = await maintenanceService.getHistory(req.params.id);
    res.json(history);
  } catch (error: any) {
    console.error('Error getting maintenance history:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
