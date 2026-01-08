import { Router } from 'express';
import * as bidRequestController from '../controllers/bid-request.controller';
import { authenticate } from '../middleware/auth';
import { requireBusinessAccess } from '../middleware/business-access';
import { requireRetailerRole } from '../middleware/retailer-auth';

const router = Router();

// Farmer routes - require business membership
router.get(
  '/businesses/:businessId/bid-requests',
  authenticate,
  requireBusinessAccess,
  bidRequestController.getBidRequests
);

router.post(
  '/businesses/:businessId/bid-requests',
  authenticate,
  requireBusinessAccess,
  bidRequestController.createBidRequest
);

router.get(
  '/businesses/:businessId/bid-requests/:id',
  authenticate,
  requireBusinessAccess,
  bidRequestController.getBidRequest
);

router.put(
  '/businesses/:businessId/bid-requests/:id',
  authenticate,
  requireBusinessAccess,
  bidRequestController.updateBidRequest
);

router.post(
  '/businesses/:businessId/bid-requests/:id/close',
  authenticate,
  requireBusinessAccess,
  bidRequestController.closeBidRequest
);

router.delete(
  '/businesses/:businessId/bid-requests/:id',
  authenticate,
  requireBusinessAccess,
  bidRequestController.deleteBidRequest
);

// Delete individual bid (for farmers to remove bids with typos)
router.delete(
  '/businesses/:businessId/bid-requests/:bidRequestId/bids/:bidId',
  authenticate,
  requireBusinessAccess,
  bidRequestController.deleteRetailerBid
);

// Accept a bid
router.post(
  '/bids/:bidId/accept',
  authenticate,
  bidRequestController.acceptBid
);

// Retailer routes - require retailer role
router.get(
  '/retailer/bid-requests/open',
  authenticate,
  requireRetailerRole,
  bidRequestController.getOpenBidRequests
);

export default router;
