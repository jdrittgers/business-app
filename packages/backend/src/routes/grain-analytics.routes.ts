import { Router } from 'express';
import { GrainAnalyticsController } from '../controllers/grain-analytics.controller';
import { authenticate } from '../middleware/auth';
import { requireGrainAccess } from '../middleware/grain-access';

const router = Router();
const controller = new GrainAnalyticsController();

// All routes require authentication AND Rittgers Farm membership
router.use(authenticate);
router.use(requireGrainAccess);

// Analytics routes
router.get('/businesses/:businessId/grain-analytics/dashboard', (req, res) => controller.getDashboardSummary(req, res));
router.get('/grain-contracts/:contractId/accumulator-performance', (req, res) => controller.getAccumulatorPerformance(req, res));

export default router;
