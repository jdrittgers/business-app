import { Router } from 'express';
import { MarketPriceController } from '../controllers/market-price.controller';
import { authenticate } from '../middleware/auth';
import { requireGrainAccess } from '../middleware/grain-access';

const router = Router();
const controller = new MarketPriceController();

// All routes require authentication AND Rittgers Farm membership
router.use(authenticate);
router.use(requireGrainAccess);

// Market price routes
router.get('/market-prices', (req, res) => controller.getMarketPrices(req, res));
router.get('/market-prices/latest', (req, res) => controller.getLatestPrices(req, res));
router.post('/market-prices/fetch', (req, res) => controller.fetchLivePrices(req, res));
router.post('/market-prices/manual', (req, res) => controller.saveManualPrice(req, res));

export default router;
