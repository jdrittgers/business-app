import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireBusinessAccess } from '../middleware/business-access';
import * as invitationController from '../controllers/invitation.controller';

const router = Router();

/**
 * GET /api/invitations/validate/:code
 * Validate an invitation code (PUBLIC - no auth required for new users)
 */
router.get('/validate/:code', (req, res) => invitationController.validateInvitationCode(req, res));

// All other invitation routes require authentication
router.use(authenticate);

/**
 * POST /api/invitations
 * Create a new invitation code (Owner only)
 */
router.post('/', (req, res) => invitationController.createInvitation(req, res));

/**
 * GET /api/invitations/business/:businessId
 * Get all invitations for a business (Owner only)
 */
router.get('/business/:businessId', requireBusinessAccess, (req, res) => invitationController.getBusinessInvitations(req, res));

/**
 * POST /api/invitations/accept
 * Accept an invitation and join a business
 */
router.post('/accept', (req, res) => invitationController.acceptInvitation(req, res));

/**
 * DELETE /api/invitations/:invitationId
 * Deactivate an invitation (Owner only)
 */
router.delete('/:invitationId', (req, res) => invitationController.deactivateInvitation(req, res));

/**
 * POST /api/invitations/:invitationId/send-email
 * Send invitation via email (Owner only)
 */
router.post('/:invitationId/send-email', (req, res) => invitationController.sendInvitationEmail(req, res));

export default router;
