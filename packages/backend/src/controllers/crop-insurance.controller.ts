import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requireGrainAccess } from '../middleware/grain-access';
import { CropInsuranceService } from '../services/crop-insurance.service';
import { ProfitMatrixService } from '../services/profit-matrix.service';

const router = Router();
const insuranceService = new CropInsuranceService();
const profitMatrixService = new ProfitMatrixService();

router.use(authenticate);
router.use(requireGrainAccess);

// Get all insurance policies for a business
router.get('/businesses/:businessId/insurance', async (req: AuthRequest, res: Response) => {
  try {
    const { year } = req.query;
    const policies = await insuranceService.getAllForBusiness(
      req.params.businessId,
      year ? parseInt(year as string) : undefined
    );
    res.json(policies);
  } catch (error: any) {
    console.error('Error getting insurance policies:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get insurance policy for a specific farm
router.get('/businesses/:businessId/farms/:farmId/insurance', async (req: AuthRequest, res: Response) => {
  try {
    const policy = await insuranceService.getByFarmId(req.params.farmId, req.params.businessId);
    res.json(policy);
  } catch (error: any) {
    console.error('Error getting insurance policy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update insurance policy for a farm
router.put('/businesses/:businessId/farms/:farmId/insurance', async (req: AuthRequest, res: Response) => {
  try {
    const policy = await insuranceService.upsert(req.params.farmId, req.params.businessId, req.body);
    res.json(policy);
  } catch (error: any) {
    console.error('Error upserting insurance policy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete insurance policy
router.delete('/businesses/:businessId/farms/:farmId/insurance', async (req: AuthRequest, res: Response) => {
  try {
    await insuranceService.delete(req.params.farmId, req.params.businessId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting insurance policy:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get profit matrix for a farm
router.get('/businesses/:businessId/farms/:farmId/profit-matrix', async (req: AuthRequest, res: Response) => {
  try {
    const { yieldSteps, priceSteps, expectedCountyYield, simulatedCountyYield } = req.query;
    const matrix = await profitMatrixService.getProfitMatrix(
      req.params.farmId,
      req.params.businessId,
      {
        yieldSteps: yieldSteps ? parseInt(yieldSteps as string) : undefined,
        priceSteps: priceSteps ? parseInt(priceSteps as string) : undefined,
        expectedCountyYield: expectedCountyYield ? parseFloat(expectedCountyYield as string) : undefined,
        simulatedCountyYield: simulatedCountyYield ? parseFloat(simulatedCountyYield as string) : undefined,
      }
    );
    res.json(matrix);
  } catch (error: any) {
    console.error('Error getting profit matrix:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
