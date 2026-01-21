import { Router, Request, Response } from 'express';
import { retailerAccessService } from '../services/retailer-access.service';
import { requireRetailerRole, RetailerAuthRequest } from '../middleware/retailer-auth';

const router = Router();

// ===== Farmer Endpoints =====

/**
 * GET /api/businesses/:businessId/retailer-access
 * Get all retailer access requests for a business
 */
router.get('/businesses/:businessId/retailer-access', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const requests = await retailerAccessService.getAccessRequestsForBusiness(businessId);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching retailer access requests:', error);
    res.status(500).json({ error: 'Failed to fetch retailer access requests' });
  }
});

/**
 * GET /api/businesses/:businessId/retailer-access/pending
 * Get pending retailer access requests for a business
 */
router.get('/businesses/:businessId/retailer-access/pending', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const requests = await retailerAccessService.getPendingRequestsForBusiness(businessId);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching pending access requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending access requests' });
  }
});

/**
 * GET /api/businesses/:businessId/retailer-access/summary
 * Get access summary (counts) for a business
 */
router.get('/businesses/:businessId/retailer-access/summary', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const summary = await retailerAccessService.getAccessSummaryForBusiness(businessId);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching access summary:', error);
    res.status(500).json({ error: 'Failed to fetch access summary' });
  }
});

/**
 * PUT /api/businesses/:businessId/retailer-access/:requestId
 * Respond to a retailer access request (approve/deny)
 */
router.put('/businesses/:businessId/retailer-access/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { type, status } = req.body;
    const userId = (req as any).user?.userId;

    if (!type || !status) {
      return res.status(400).json({
        error: 'Missing required fields: type (inputs/grain), status (APPROVED/DENIED)'
      });
    }

    if (!['inputs', 'grain'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "inputs" or "grain"' });
    }

    if (!['APPROVED', 'DENIED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "APPROVED" or "DENIED"' });
    }

    const request = await retailerAccessService.respondToRequest(requestId, {
      type,
      status,
      respondedBy: userId
    });

    res.json(request);
  } catch (error) {
    console.error('Error responding to access request:', error);
    res.status(500).json({ error: 'Failed to respond to access request' });
  }
});

// ===== Retailer Endpoints =====

/**
 * GET /api/retailer/access-requests
 * Get all access requests for the authenticated retailer
 */
router.get('/retailer/access-requests', requireRetailerRole, async (req: RetailerAuthRequest, res: Response) => {
  try {
    const retailerId = req.retailer?.id;
    if (!retailerId) {
      return res.status(401).json({ error: 'Retailer not authenticated' });
    }

    const requests = await retailerAccessService.getAccessRequestsForRetailer(retailerId);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching retailer access requests:', error);
    res.status(500).json({ error: 'Failed to fetch access requests' });
  }
});

/**
 * GET /api/retailer/access-summary
 * Get access summary for the authenticated retailer
 */
router.get('/retailer/access-summary', requireRetailerRole, async (req: RetailerAuthRequest, res: Response) => {
  try {
    const retailerId = req.retailer?.id;
    if (!retailerId) {
      return res.status(401).json({ error: 'Retailer not authenticated' });
    }

    const summary = await retailerAccessService.getAccessSummaryForRetailer(retailerId);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching retailer access summary:', error);
    res.status(500).json({ error: 'Failed to fetch access summary' });
  }
});

/**
 * POST /api/retailer/trigger-access-requests
 * Manually trigger access request creation for retailer's radius
 * Useful after profile update or manual refresh
 */
router.post('/retailer/trigger-access-requests', requireRetailerRole, async (req: RetailerAuthRequest, res: Response) => {
  try {
    const retailerId = req.retailer?.id;
    if (!retailerId) {
      return res.status(401).json({ error: 'Retailer not authenticated' });
    }

    const count = await retailerAccessService.createAccessRequestsForRadius(retailerId);
    res.json({
      success: true,
      message: `Created ${count} new access request(s)`,
      requestsCreated: count
    });
  } catch (error) {
    console.error('Error triggering access requests:', error);
    res.status(500).json({ error: 'Failed to trigger access requests' });
  }
});

export default router;
