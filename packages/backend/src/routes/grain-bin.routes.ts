import { Router } from 'express';
import { GrainBinController } from '../controllers/grain-bin.controller';
import { authenticate } from '../middleware/auth';
import { requireBusinessAccess } from '../middleware/business-access';

const router = Router();
const grainBinController = new GrainBinController();

// Get all bins for a business
router.get(
  '/businesses/:businessId/grain-bins',
  authenticate,
  requireBusinessAccess,
  (req, res) => grainBinController.getBinsByBusiness(req, res)
);

// Get bins by grain entity
router.get(
  '/grain-entities/:grainEntityId/grain-bins',
  authenticate,
  (req, res) => grainBinController.getBinsByGrainEntity(req, res)
);

// Get summary by year
router.get(
  '/businesses/:businessId/grain-bins/summary',
  authenticate,
  requireBusinessAccess,
  (req, res) => grainBinController.getSummaryByYear(req, res)
);

// Get a single bin
router.get(
  '/grain-bins/:binId',
  authenticate,
  (req, res) => grainBinController.getBinById(req, res)
);

// Create a new bin
router.post(
  '/businesses/:businessId/grain-bins',
  authenticate,
  requireBusinessAccess,
  (req, res) => grainBinController.createBin(req, res)
);

// Update a bin
router.patch(
  '/grain-bins/:binId',
  authenticate,
  (req, res) => grainBinController.updateBin(req, res)
);

// Add grain to a bin
router.post(
  '/grain-bins/:binId/add-grain',
  authenticate,
  (req, res) => grainBinController.addGrain(req, res)
);

// Get transaction history
router.get(
  '/grain-bins/:binId/transactions',
  authenticate,
  (req, res) => grainBinController.getTransactions(req, res)
);

export default router;
