import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requireGrainAccess } from '../middleware/grain-access';
import { FertilizerService } from '../services/fertilizer.service';
import { ChemicalService } from '../services/chemical.service';
import { SeedHybridService } from '../services/seed-hybrid.service';
import { FarmService } from '../services/farm.service';
import { BreakEvenAnalyticsService } from '../services/breakeven-analytics.service';
import { TrialService } from '../services/trial.service';

const router = Router();
const fertilizerService = new FertilizerService();
const chemicalService = new ChemicalService();
const seedHybridService = new SeedHybridService();
const farmService = new FarmService();
const analyticsService = new BreakEvenAnalyticsService();
const trialService = new TrialService();

// Apply auth and grain access middleware to all routes
router.use(authenticate);
router.use(requireGrainAccess);

// ===== Fertilizers =====
router.get('/businesses/:businessId/fertilizers', async (req: AuthRequest, res: Response) => {
  try {
    const fertilizers = await fertilizerService.getAll(req.params.businessId);
    res.json(fertilizers);
  } catch (error: any) {
    console.error('Error getting fertilizers:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/businesses/:businessId/fertilizers', async (req: AuthRequest, res: Response) => {
  try {
    const fertilizer = await fertilizerService.create(req.params.businessId, req.body);
    res.status(201).json(fertilizer);
  } catch (error: any) {
    console.error('Error creating fertilizer:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/businesses/:businessId/fertilizers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const fertilizer = await fertilizerService.update(req.params.id, req.params.businessId, req.body);
    res.json(fertilizer);
  } catch (error: any) {
    console.error('Error updating fertilizer:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/businesses/:businessId/fertilizers/:id', async (req: AuthRequest, res: Response) => {
  try {
    await fertilizerService.delete(req.params.id, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting fertilizer:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Chemicals =====
router.get('/businesses/:businessId/chemicals', async (req: AuthRequest, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const chemicals = await chemicalService.getAll(req.params.businessId, category as any);
    res.json(chemicals);
  } catch (error: any) {
    console.error('Error getting chemicals:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/businesses/:businessId/chemicals', async (req: AuthRequest, res: Response) => {
  try {
    const chemical = await chemicalService.create(req.params.businessId, req.body);
    res.status(201).json(chemical);
  } catch (error: any) {
    console.error('Error creating chemical:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/businesses/:businessId/chemicals/:id', async (req: AuthRequest, res: Response) => {
  try {
    const chemical = await chemicalService.update(req.params.id, req.params.businessId, req.body);
    res.json(chemical);
  } catch (error: any) {
    console.error('Error updating chemical:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/businesses/:businessId/chemicals/:id', async (req: AuthRequest, res: Response) => {
  try {
    await chemicalService.delete(req.params.id, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting chemical:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Seed Hybrids =====
router.get('/businesses/:businessId/seed-hybrids', async (req: AuthRequest, res: Response) => {
  try {
    const { commodityType } = req.query;
    const seedHybrids = await seedHybridService.getAll(req.params.businessId, commodityType as string | undefined);
    res.json(seedHybrids);
  } catch (error: any) {
    console.error('Error getting seed hybrids:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/businesses/:businessId/seed-hybrids', async (req: AuthRequest, res: Response) => {
  try {
    const seedHybrid = await seedHybridService.create(req.params.businessId, req.body);
    res.status(201).json(seedHybrid);
  } catch (error: any) {
    console.error('Error creating seed hybrid:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/businesses/:businessId/seed-hybrids/:id', async (req: AuthRequest, res: Response) => {
  try {
    const seedHybrid = await seedHybridService.update(req.params.id, req.params.businessId, req.body);
    res.json(seedHybrid);
  } catch (error: any) {
    console.error('Error updating seed hybrid:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/businesses/:businessId/seed-hybrids/:id', async (req: AuthRequest, res: Response) => {
  try {
    await seedHybridService.delete(req.params.id, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting seed hybrid:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Farms =====
router.get('/businesses/:businessId/farms', async (req: AuthRequest, res: Response) => {
  try {
    const { grainEntityId, year, commodityType } = req.query;
    const farms = await farmService.getAll(req.params.businessId, {
      grainEntityId: grainEntityId as string | undefined,
      year: year ? parseInt(year as string) : undefined,
      commodityType: commodityType as any
    });
    res.json(farms);
  } catch (error: any) {
    console.error('Error getting farms:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/businesses/:businessId/farms/:id', async (req: AuthRequest, res: Response) => {
  try {
    const farm = await farmService.getById(req.params.id, req.params.businessId);
    if (!farm) {
      res.status(404).json({ error: 'Farm not found' });
      return;
    }
    res.json(farm);
  } catch (error: any) {
    console.error('Error getting farm:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/businesses/:businessId/farms', async (req: AuthRequest, res: Response) => {
  try {
    const farm = await farmService.create(req.params.businessId, req.body);
    res.status(201).json(farm);
  } catch (error: any) {
    console.error('Error creating farm:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/businesses/:businessId/farms/:id', async (req: AuthRequest, res: Response) => {
  try {
    const farm = await farmService.update(req.params.id, req.params.businessId, req.body);
    res.json(farm);
  } catch (error: any) {
    console.error('Error updating farm:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/businesses/:businessId/farms/:id', async (req: AuthRequest, res: Response) => {
  try {
    await farmService.delete(req.params.id, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting farm:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get farm break-even calculation
router.get('/businesses/:businessId/farms/:id/breakeven', async (req: AuthRequest, res: Response) => {
  try {
    const breakeven = await farmService.getFarmBreakEven(req.params.id, req.params.businessId);
    res.json(breakeven);
  } catch (error: any) {
    console.error('Error getting farm break-even:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Fertilizer Usage =====
router.post('/businesses/:businessId/farms/fertilizer-usage', async (req: AuthRequest, res: Response) => {
  try {
    const usage = await farmService.addFertilizerUsage(req.params.businessId, req.body);
    res.status(201).json(usage);
  } catch (error: any) {
    console.error('Error adding fertilizer usage:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/businesses/:businessId/farms/fertilizer-usage/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { amountUsed, ratePerAcre, acresApplied } = req.body;
    const usage = await farmService.updateFertilizerUsage(req.params.id, req.params.businessId, {
      amountUsed,
      ratePerAcre,
      acresApplied
    });
    res.json(usage);
  } catch (error: any) {
    console.error('Error updating fertilizer usage:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/businesses/:businessId/farms/fertilizer-usage/:id', async (req: AuthRequest, res: Response) => {
  try {
    await farmService.deleteFertilizerUsage(req.params.id, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting fertilizer usage:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Chemical Usage =====
router.post('/businesses/:businessId/farms/chemical-usage', async (req: AuthRequest, res: Response) => {
  try {
    const usage = await farmService.addChemicalUsage(req.params.businessId, req.body);
    res.status(201).json(usage);
  } catch (error: any) {
    console.error('Error adding chemical usage:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/businesses/:businessId/farms/chemical-usage/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { amountUsed, ratePerAcre, acresApplied } = req.body;
    const usage = await farmService.updateChemicalUsage(req.params.id, req.params.businessId, {
      amountUsed,
      ratePerAcre,
      acresApplied
    });
    res.json(usage);
  } catch (error: any) {
    console.error('Error updating chemical usage:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/businesses/:businessId/farms/chemical-usage/:id', async (req: AuthRequest, res: Response) => {
  try {
    await farmService.deleteChemicalUsage(req.params.id, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting chemical usage:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Seed Usage =====
router.post('/businesses/:businessId/farms/seed-usage', async (req: AuthRequest, res: Response) => {
  try {
    const usage = await farmService.addSeedUsage(req.params.businessId, req.body);
    res.status(201).json(usage);
  } catch (error: any) {
    console.error('Error adding seed usage:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/businesses/:businessId/farms/seed-usage/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { bagsUsed, ratePerAcre, acresApplied } = req.body;
    const usage = await farmService.updateSeedUsage(req.params.id, req.params.businessId, {
      bagsUsed,
      ratePerAcre,
      acresApplied
    });
    res.json(usage);
  } catch (error: any) {
    console.error('Error updating seed usage:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/businesses/:businessId/farms/seed-usage/:id', async (req: AuthRequest, res: Response) => {
  try {
    await farmService.deleteSeedUsage(req.params.id, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting seed usage:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Other Costs =====
router.post('/businesses/:businessId/farms/other-costs', async (req: AuthRequest, res: Response) => {
  try {
    const cost = await farmService.addOtherCost(req.params.businessId, req.body);
    res.status(201).json(cost);
  } catch (error: any) {
    console.error('Error adding other cost:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/businesses/:businessId/farms/other-costs/:id', async (req: AuthRequest, res: Response) => {
  try {
    const cost = await farmService.updateOtherCost(req.params.id, req.params.businessId, req.body);
    res.json(cost);
  } catch (error: any) {
    console.error('Error updating other cost:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/businesses/:businessId/farms/other-costs/:id', async (req: AuthRequest, res: Response) => {
  try {
    await farmService.deleteOtherCost(req.params.id, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting other cost:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Analytics =====
router.get('/businesses/:businessId/breakeven/summary', async (req: AuthRequest, res: Response) => {
  try {
    const { year, grainEntityId, commodityType } = req.query;
    const summary = await analyticsService.getOperationBreakEven(req.params.businessId, {
      year: year ? parseInt(year as string) : undefined,
      grainEntityId: grainEntityId as string | undefined,
      commodityType: commodityType as any
    });
    res.json(summary);
  } catch (error: any) {
    console.error('Error getting break-even summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Area Price Averages =====
// Get aggregated average prices for products across all farmers
router.get('/businesses/:businessId/products/area-averages', async (req: AuthRequest, res: Response) => {
  try {
    const [fertilizerAverages, chemicalAverages, seedAverages] = await Promise.all([
      fertilizerService.getAreaAverages(),
      chemicalService.getAreaAverages(),
      seedHybridService.getAreaAverages()
    ]);

    res.json({
      fertilizers: fertilizerAverages,
      chemicals: chemicalAverages,
      seedHybrids: seedAverages
    });
  } catch (error: any) {
    console.error('Error getting area averages:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Farm Trials =====

router.get('/businesses/:businessId/farms/:farmId/trials', async (req: AuthRequest, res: Response) => {
  try {
    const trials = await trialService.getAll(req.params.farmId, req.params.businessId);
    res.json(trials);
  } catch (error: any) {
    console.error('Error getting trials:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/businesses/:businessId/farms/:farmId/trials', async (req: AuthRequest, res: Response) => {
  try {
    const trial = await trialService.create(req.params.businessId, {
      ...req.body,
      farmId: req.params.farmId
    });
    res.status(201).json(trial);
  } catch (error: any) {
    console.error('Error creating trial:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/businesses/:businessId/farms/trials/:id', async (req: AuthRequest, res: Response) => {
  try {
    const trial = await trialService.getById(req.params.id, req.params.businessId);
    if (!trial) {
      return res.status(404).json({ error: 'Trial not found' });
    }
    res.json(trial);
  } catch (error: any) {
    console.error('Error getting trial:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/businesses/:businessId/farms/trials/:id', async (req: AuthRequest, res: Response) => {
  try {
    const trial = await trialService.update(req.params.id, req.params.businessId, req.body);
    res.json(trial);
  } catch (error: any) {
    console.error('Error updating trial:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/businesses/:businessId/farms/trials/:id', async (req: AuthRequest, res: Response) => {
  try {
    await trialService.delete(req.params.id, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting trial:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trial photos
router.post('/businesses/:businessId/farms/trials/:id/photos', async (req: AuthRequest, res: Response) => {
  try {
    const { url, caption } = req.body;
    const photo = await trialService.addPhoto(req.params.id, req.params.businessId, url, caption);
    res.status(201).json(photo);
  } catch (error: any) {
    console.error('Error adding trial photo:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/businesses/:businessId/farms/trials/photos/:photoId', async (req: AuthRequest, res: Response) => {
  try {
    await trialService.deletePhoto(req.params.photoId, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting trial photo:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Farm Plan View (Worker-friendly, no costs) =====

router.get('/businesses/:businessId/farms/:farmId/plan', async (req: AuthRequest, res: Response) => {
  try {
    const plan = await farmService.getFarmPlanView(req.params.farmId, req.params.businessId);
    if (!plan) {
      return res.status(404).json({ error: 'Farm not found' });
    }
    res.json(plan);
  } catch (error: any) {
    console.error('Error getting farm plan:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/businesses/:businessId/farm-plans', async (req: AuthRequest, res: Response) => {
  try {
    const query = {
      year: req.query.year ? parseInt(req.query.year as string) : undefined,
      grainEntityId: req.query.grainEntityId as string | undefined,
      commodityType: req.query.commodityType as any
    };
    const plans = await farmService.getAllFarmPlanViews(req.params.businessId, query);
    res.json(plans);
  } catch (error: any) {
    console.error('Error getting farm plans:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
