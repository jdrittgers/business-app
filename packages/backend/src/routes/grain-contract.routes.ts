import { Router } from 'express';
import { GrainContractController } from '../controllers/grain-contract.controller';
import { FarmContractAllocationService } from '../services/farm-contract-allocation.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireBusinessAccess } from '../middleware/business-access';
import { Response } from 'express';

const router = Router();
const controller = new GrainContractController();
const allocationService = new FarmContractAllocationService();

// All routes require authentication
router.use(authenticate);

// Grain entities (business-scoped, require membership)
router.get('/businesses/:businessId/grain-entities', requireBusinessAccess, (req, res) => controller.getGrainEntities(req, res));
router.post('/businesses/:businessId/grain-entities', requireBusinessAccess, (req, res) => controller.createGrainEntity(req, res));

// Contracts (business-scoped, require membership)
router.get('/businesses/:businessId/grain-contracts', requireBusinessAccess, (req, res) => controller.getContracts(req, res));
router.post('/grain-contracts', (req, res) => controller.createContract(req, res));
router.get('/grain-contracts/:contractId', (req, res) => controller.getContract(req, res));
router.patch('/grain-contracts/:contractId', (req, res) => controller.updateContract(req, res));
router.delete('/grain-contracts/:contractId', (req, res) => controller.deleteContract(req, res));

// Accumulator entries
router.post('/grain-contracts/:contractId/accumulator-entries', (req, res) => controller.addAccumulatorEntry(req, res));

// ===== Contract Allocation Routes =====

// Get allocations for a contract
router.get('/businesses/:businessId/grain-contracts/:contractId/allocations', requireBusinessAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, contractId } = req.params;
    const allocations = await allocationService.getContractAllocations(contractId, businessId);
    res.json(allocations);
  } catch (error: any) {
    console.error('Error getting contract allocations:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get contract with allocations and summary
router.get('/businesses/:businessId/grain-contracts/:contractId/allocations/summary', requireBusinessAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, contractId } = req.params;
    const result = await allocationService.getContractWithAllocations(contractId, businessId);
    res.json(result);
  } catch (error: any) {
    console.error('Error getting contract with allocations:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Calculate proportional allocations (preview)
router.get('/businesses/:businessId/grain-contracts/:contractId/allocations/calculate', requireBusinessAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, contractId } = req.params;
    const calculations = await allocationService.calculateProportionalAllocations(contractId, businessId);
    res.json(calculations);
  } catch (error: any) {
    console.error('Error calculating allocations:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Auto-allocate contract to farms (proportional)
router.post('/businesses/:businessId/grain-contracts/:contractId/allocations/auto', requireBusinessAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, contractId } = req.params;
    const result = await allocationService.autoAllocateContract(contractId, businessId, req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error auto-allocating contract:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Set manual allocations
router.post('/businesses/:businessId/grain-contracts/:contractId/allocations', requireBusinessAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, contractId } = req.params;
    const result = await allocationService.setContractAllocations(contractId, businessId, req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error setting allocations:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Reset to proportional allocations
router.post('/businesses/:businessId/grain-contracts/:contractId/allocations/reset', requireBusinessAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, contractId } = req.params;
    const result = await allocationService.resetToProportional(contractId, businessId);
    res.json(result);
  } catch (error: any) {
    console.error('Error resetting allocations:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete a specific allocation
router.delete('/businesses/:businessId/grain-contracts/:contractId/allocations/:farmId', requireBusinessAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, contractId, farmId } = req.params;
    await allocationService.deleteAllocation(contractId, farmId, businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting allocation:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// ===== Farm Allocation Routes =====

// Get allocations for a specific farm
router.get('/businesses/:businessId/farms/:farmId/contract-allocations', requireBusinessAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, farmId } = req.params;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const result = await allocationService.getFarmAllocations(farmId, businessId, year);
    res.json(result);
  } catch (error: any) {
    console.error('Error getting farm allocations:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get allocations for all farms in an entity
router.get('/businesses/:businessId/grain-entities/:entityId/farm-allocations', requireBusinessAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId, entityId } = req.params;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const commodityType = req.query.commodityType as string | undefined;
    const result = await allocationService.getEntityFarmAllocations(
      entityId,
      businessId,
      year,
      commodityType as any
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error getting entity farm allocations:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
