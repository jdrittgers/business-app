import { Router, Request, Response } from 'express';
import { retailerAccessService } from '../services/retailer-access.service';
import { partnerAccessService } from '../services/partner-access.service';
import { requireRetailerRole, RetailerAuthRequest } from '../middleware/retailer-auth';
import { PartnerPermissions, PartnerPermissionLevel } from '@business-app/shared';

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

/**
 * PUT /api/businesses/:businessId/retailer-access/:requestId/permissions
 * Update granular permissions for a retailer (farmer action)
 */
router.put('/businesses/:businessId/retailer-access/:requestId/permissions', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { permissions } = req.body as { permissions: Partial<PartnerPermissions> };
    const userId = (req as any).user?.userId;

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        error: 'Missing required field: permissions'
      });
    }

    // Validate permission values
    const validLevels = Object.values(PartnerPermissionLevel);
    for (const [key, value] of Object.entries(permissions)) {
      if (!validLevels.includes(value as PartnerPermissionLevel)) {
        return res.status(400).json({
          error: `Invalid permission level "${value}" for ${key}. Must be one of: ${validLevels.join(', ')}`
        });
      }
    }

    const request = await partnerAccessService.updatePermissions(
      requestId,
      permissions,
      userId
    );

    res.json(request);
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

/**
 * GET /api/businesses/:businessId/retailer-access/:requestId/permissions
 * Get granular permissions for a specific retailer-business relationship
 */
router.get('/businesses/:businessId/retailer-access/:requestId/permissions', async (req: Request, res: Response) => {
  try {
    const { businessId, requestId } = req.params;

    // Get the access request to find the retailer
    const requests = await retailerAccessService.getAccessRequestsForBusiness(businessId);
    const request = requests.find((r: any) => r.id === requestId);

    if (!request) {
      return res.status(404).json({ error: 'Access request not found' });
    }

    const permissions = await partnerAccessService.getPermissions(request.retailerId, businessId);
    res.json(permissions || {});
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * GET /api/businesses/:businessId/partners-with-access
 * Get all retailers/partners that have any level of access to the business
 */
router.get('/businesses/:businessId/partners-with-access', async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const partners = await partnerAccessService.getRetailersWithAccess(businessId);
    res.json(partners);
  } catch (error) {
    console.error('Error fetching partners with access:', error);
    res.status(500).json({ error: 'Failed to fetch partners with access' });
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

/**
 * GET /api/retailer/permissions/:businessId
 * Get the authenticated retailer's permissions for a specific business
 */
router.get('/retailer/permissions/:businessId', requireRetailerRole, async (req: RetailerAuthRequest, res: Response) => {
  try {
    const retailerId = req.retailer?.id;
    if (!retailerId) {
      return res.status(401).json({ error: 'Retailer not authenticated' });
    }

    const { businessId } = req.params;
    const permissions = await partnerAccessService.getPermissions(retailerId, businessId);

    if (!permissions) {
      return res.status(404).json({ error: 'No access relationship found with this business' });
    }

    res.json(permissions);
  } catch (error) {
    console.error('Error fetching retailer permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * GET /api/retailer/access-summary/:businessId
 * Get detailed access summary for a specific business
 */
router.get('/retailer/access-summary/:businessId', requireRetailerRole, async (req: RetailerAuthRequest, res: Response) => {
  try {
    const retailerId = req.retailer?.id;
    if (!retailerId) {
      return res.status(401).json({ error: 'Retailer not authenticated' });
    }

    const { businessId } = req.params;
    const summary = await partnerAccessService.getAccessSummary(retailerId, businessId);

    if (!summary) {
      return res.status(404).json({ error: 'No access relationship found with this business' });
    }

    res.json(summary);
  } catch (error) {
    console.error('Error fetching access summary:', error);
    res.status(500).json({ error: 'Failed to fetch access summary' });
  }
});

/**
 * GET /api/retailer/accessible-businesses/:module
 * Get all businesses the retailer can access for a specific module
 */
router.get('/retailer/accessible-businesses/:module', requireRetailerRole, async (req: RetailerAuthRequest, res: Response) => {
  try {
    const retailerId = req.retailer?.id;
    if (!retailerId) {
      return res.status(401).json({ error: 'Retailer not authenticated' });
    }

    const { module } = req.params;
    const { minLevel } = req.query;

    const businesses = await partnerAccessService.getAccessibleBusinesses(
      retailerId,
      module as any,
      (minLevel as any) || 'VIEW'
    );

    res.json(businesses);
  } catch (error) {
    console.error('Error fetching accessible businesses:', error);
    res.status(500).json({ error: 'Failed to fetch accessible businesses' });
  }
});

export default router;
