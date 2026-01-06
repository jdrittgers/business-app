import { Router } from 'express';
import { ProductionTrackingController } from '../controllers/production-tracking.controller';
import { authenticate } from '../middleware/auth';
import { requireGrainAccess } from '../middleware/grain-access';

const router = Router();
const controller = new ProductionTrackingController();

// All routes require authentication AND Rittgers Farm membership
router.use(authenticate);
router.use(requireGrainAccess);

// Production tracking routes
router.get('/businesses/:businessId/grain-productions', (req, res) => controller.getProductions(req, res));
router.get('/businesses/:businessId/grain-productions/summary', (req, res) => controller.getProductionSummary(req, res));
router.post('/grain-productions', (req, res) => controller.createProduction(req, res));
router.get('/grain-productions/:productionId', (req, res) => controller.getProduction(req, res));
router.patch('/grain-productions/:productionId', (req, res) => controller.updateProduction(req, res));
router.delete('/grain-productions/:productionId', (req, res) => controller.deleteProduction(req, res));

export default router;
