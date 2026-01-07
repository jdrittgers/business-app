import { Router } from 'express';
import * as retailerBidController from '../controllers/retailer-bid.controller';
import { authenticate } from '../middleware/auth';
import { requireRetailerRole } from '../middleware/retailer-auth';

const router = Router();

// All routes require retailer authentication
router.get(
  '/retailer/bids',
  authenticate,
  requireRetailerRole,
  retailerBidController.getMyBids
);

router.post(
  '/retailer/bids',
  authenticate,
  requireRetailerRole,
  retailerBidController.createBid
);

router.put(
  '/retailer/bids/:id',
  authenticate,
  requireRetailerRole,
  retailerBidController.updateBid
);

router.delete(
  '/retailer/bids/:id',
  authenticate,
  requireRetailerRole,
  retailerBidController.deleteBid
);

export default router;
