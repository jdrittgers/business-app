import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requireGrainAccess } from '../middleware/grain-access';
import { ChemicalPlanTemplateService } from '../services/chemical-plan-template.service';
import { CommodityType, PassType } from '@business-app/shared';

const router = Router();
const templateService = new ChemicalPlanTemplateService();

// Apply auth and grain access middleware to all routes
router.use(authenticate);
router.use(requireGrainAccess);

// ===== Template CRUD =====

// Get all templates for a business
router.get('/businesses/:businessId/chemical-plan-templates', async (req: AuthRequest, res: Response) => {
  try {
    const { commodityType, passType, year, isActive } = req.query;
    const templates = await templateService.getAll(req.params.businessId, {
      commodityType: commodityType as CommodityType | undefined,
      passType: passType as PassType | undefined,
      year: year ? parseInt(year as string) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    });
    res.json(templates);
  } catch (error: any) {
    console.error('Error getting chemical plan templates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single template by ID
router.get('/businesses/:businessId/chemical-plan-templates/:templateId', async (req: AuthRequest, res: Response) => {
  try {
    const template = await templateService.getById(req.params.templateId, req.params.businessId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error: any) {
    console.error('Error getting chemical plan template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new template
router.post('/businesses/:businessId/chemical-plan-templates', async (req: AuthRequest, res: Response) => {
  try {
    const template = await templateService.create(req.params.businessId, req.body);
    res.status(201).json(template);
  } catch (error: any) {
    console.error('Error creating chemical plan template:', error);
    if (error.message.includes('already exists')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update a template
router.put('/businesses/:businessId/chemical-plan-templates/:templateId', async (req: AuthRequest, res: Response) => {
  try {
    const template = await templateService.update(req.params.templateId, req.params.businessId, req.body);
    res.json(template);
  } catch (error: any) {
    console.error('Error updating chemical plan template:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('already exists')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete a template
router.delete('/businesses/:businessId/chemical-plan-templates/:templateId', async (req: AuthRequest, res: Response) => {
  try {
    await templateService.delete(req.params.templateId, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting chemical plan template:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// ===== Template Items =====

// Add an item to a template
router.post('/businesses/:businessId/chemical-plan-templates/:templateId/items', async (req: AuthRequest, res: Response) => {
  try {
    const item = await templateService.addItem(req.params.templateId, req.params.businessId, req.body);
    res.status(201).json(item);
  } catch (error: any) {
    console.error('Error adding template item:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update a template item
router.put('/businesses/:businessId/chemical-plan-templates/:templateId/items/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const item = await templateService.updateItem(req.params.itemId, req.params.businessId, req.body);
    res.json(item);
  } catch (error: any) {
    console.error('Error updating template item:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Remove a template item
router.delete('/businesses/:businessId/chemical-plan-templates/:templateId/items/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    await templateService.removeItem(req.params.itemId, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error removing template item:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// ===== Apply/Remove Template =====

// Apply template to farms
router.post('/businesses/:businessId/chemical-plan-templates/:templateId/apply', async (req: AuthRequest, res: Response) => {
  try {
    const result = await templateService.applyToFarms(
      req.params.templateId,
      req.params.businessId,
      req.body,
      req.user!.userId
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error applying template:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Remove template from farms
router.post('/businesses/:businessId/chemical-plan-templates/:templateId/remove', async (req: AuthRequest, res: Response) => {
  try {
    await templateService.removeFromFarms(
      req.params.templateId,
      req.params.businessId,
      req.body.farmIds
    );
    res.status(204).send();
  } catch (error: any) {
    console.error('Error removing template from farms:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get farms with template applied
router.get('/businesses/:businessId/chemical-plan-templates/:templateId/farms', async (req: AuthRequest, res: Response) => {
  try {
    const farms = await templateService.getFarmsWithTemplate(req.params.templateId, req.params.businessId);
    res.json(farms);
  } catch (error: any) {
    console.error('Error getting farms with template:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// ===== Farm Template Info =====

// Get template applied to a specific farm
router.get('/businesses/:businessId/farms/:farmId/chemical-plan-template', async (req: AuthRequest, res: Response) => {
  try {
    const application = await templateService.getTemplateForFarm(req.params.farmId, req.params.businessId);
    if (!application) {
      return res.json(null); // No template applied
    }
    res.json(application);
  } catch (error: any) {
    console.error('Error getting farm template:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset a farm to use template values
router.post('/businesses/:businessId/farms/:farmId/reset-to-template/:templateId', async (req: AuthRequest, res: Response) => {
  try {
    await templateService.resetToTemplate(
      req.params.farmId,
      req.params.templateId,
      req.params.businessId
    );
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error resetting farm to template:', error);
    if (error.message.includes('not found') || error.message.includes('not applied')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// ===== Invoice Import =====

// Get importable chemicals from an invoice
router.get('/businesses/:businessId/invoices/:invoiceId/importable-chemicals', async (req: AuthRequest, res: Response) => {
  try {
    const chemicals = await templateService.getImportableChemicalsFromInvoice(
      req.params.businessId,
      req.params.invoiceId
    );
    res.json(chemicals);
  } catch (error: any) {
    console.error('Error getting importable chemicals:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Import chemicals from invoice to template(s)
router.post('/businesses/:businessId/chemical-plan-templates/import-from-invoice', async (req: AuthRequest, res: Response) => {
  try {
    const result = await templateService.importFromInvoice(req.params.businessId, req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error importing from invoice:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
