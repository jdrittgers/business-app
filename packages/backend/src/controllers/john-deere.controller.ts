import { Router, Response, Request } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { requireGrainAccess } from '../middleware/grain-access';
import { johnDeereService } from '../services/john-deere.service';
import { prisma } from '../prisma/client';

const router = Router();

// Helper to verify user has access to a specific business
async function verifyBusinessAccess(userId: string, businessId: string): Promise<boolean> {
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      businessId
    }
  });
  return !!membership;
}

// ===== Public callback route (no auth required) =====

// OAuth callback from John Deere
router.get('/john-deere/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/loans/equipment?jd_error=${encodeURIComponent(error_description as string || error as string)}`);
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: 'Missing code or state parameter' });
      return;
    }

    await johnDeereService.handleCallback(code as string, state as string);

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/loans/equipment?jd_connected=true`);
  } catch (error: any) {
    console.error('John Deere callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/loans/equipment?jd_error=${encodeURIComponent(error.message)}`);
  }
});

// ===== Protected routes =====

// Apply auth middleware to remaining routes
router.use(authenticate);
router.use(requireGrainAccess);

// Get connection status
router.get('/businesses/:businessId/john-deere/status', async (req: AuthRequest, res: Response) => {
  try {
    // Verify user has access to this business
    if (!await verifyBusinessAccess(req.user!.userId, req.params.businessId)) {
      res.status(403).json({ error: 'Access denied to this business' });
      return;
    }

    const status = await johnDeereService.getConnectionStatus(req.params.businessId);
    res.json(status);
  } catch (error: any) {
    console.error('Error getting JD status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get authorization URL
router.get('/businesses/:businessId/john-deere/auth-url', async (req: AuthRequest, res: Response) => {
  try {
    // Verify user has access to this business
    if (!await verifyBusinessAccess(req.user!.userId, req.params.businessId)) {
      res.status(403).json({ error: 'Access denied to this business' });
      return;
    }

    const result = johnDeereService.getAuthorizationUrl(req.params.businessId);
    res.json(result);
  } catch (error: any) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect from John Deere
router.post('/businesses/:businessId/john-deere/disconnect', async (req: AuthRequest, res: Response) => {
  try {
    // Verify user has access to this business
    if (!await verifyBusinessAccess(req.user!.userId, req.params.businessId)) {
      res.status(403).json({ error: 'Access denied to this business' });
      return;
    }

    await johnDeereService.disconnect(req.params.businessId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting JD:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available organizations
router.get('/businesses/:businessId/john-deere/organizations', async (req: AuthRequest, res: Response) => {
  try {
    // Verify user has access to this business
    if (!await verifyBusinessAccess(req.user!.userId, req.params.businessId)) {
      res.status(403).json({ error: 'Access denied to this business' });
      return;
    }

    const organizations = await johnDeereService.getOrganizations(req.params.businessId);
    res.json(organizations);
  } catch (error: any) {
    console.error('Error getting JD organizations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set organization
router.post('/businesses/:businessId/john-deere/organization', async (req: AuthRequest, res: Response) => {
  try {
    // Verify user has access to this business
    if (!await verifyBusinessAccess(req.user!.userId, req.params.businessId)) {
      res.status(403).json({ error: 'Access denied to this business' });
      return;
    }

    const { organizationId, organizationName } = req.body;
    await johnDeereService.setOrganization(req.params.businessId, organizationId, organizationName);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error setting JD organization:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get John Deere machines
router.get('/businesses/:businessId/john-deere/machines', async (req: AuthRequest, res: Response) => {
  try {
    // Verify user has access to this business
    if (!await verifyBusinessAccess(req.user!.userId, req.params.businessId)) {
      res.status(403).json({ error: 'Access denied to this business' });
      return;
    }

    const machines = await johnDeereService.getMachines(req.params.businessId);
    res.json(machines);
  } catch (error: any) {
    console.error('Error getting JD machines:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get equipment-to-JD mappings
router.get('/businesses/:businessId/john-deere/mappings', async (req: AuthRequest, res: Response) => {
  try {
    // Verify user has access to this business
    if (!await verifyBusinessAccess(req.user!.userId, req.params.businessId)) {
      res.status(403).json({ error: 'Access denied to this business' });
      return;
    }

    console.log('[JohnDeere] Getting mappings for businessId:', req.params.businessId);
    const mappings = await johnDeereService.getEquipmentMappings(req.params.businessId);
    console.log('[JohnDeere] Found', mappings.length, 'equipment for mapping');
    res.json(mappings);
  } catch (error: any) {
    console.error('Error getting JD mappings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Map equipment to John Deere machine
router.put('/equipment/:equipmentId/john-deere-mapping', async (req: AuthRequest, res: Response) => {
  try {
    // Verify user has access to this equipment's business
    const equipment = await prisma.equipment.findUnique({
      where: { id: req.params.equipmentId },
      select: { businessId: true }
    });

    if (!equipment) {
      res.status(404).json({ error: 'Equipment not found' });
      return;
    }

    if (!await verifyBusinessAccess(req.user!.userId, equipment.businessId)) {
      res.status(403).json({ error: 'Access denied to this equipment' });
      return;
    }

    const { johnDeereMachineId } = req.body;

    if (johnDeereMachineId) {
      await johnDeereService.mapEquipmentToMachine(req.params.equipmentId, johnDeereMachineId);
    } else {
      await johnDeereService.unmapEquipment(req.params.equipmentId);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error mapping equipment to JD:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual sync trigger
router.post('/businesses/:businessId/john-deere/sync', async (req: AuthRequest, res: Response) => {
  try {
    // Verify user has access to this business
    if (!await verifyBusinessAccess(req.user!.userId, req.params.businessId)) {
      res.status(403).json({ error: 'Access denied to this business' });
      return;
    }

    const result = await johnDeereService.syncAllEquipmentHours(req.params.businessId);
    res.json(result);
  } catch (error: any) {
    console.error('Error syncing JD hours:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
