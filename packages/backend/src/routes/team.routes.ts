import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as teamController from '../controllers/team.controller';

const router = Router();

// All team routes require authentication
router.use(authenticate);

/**
 * GET /api/team/business/:businessId
 * Get all team members for a business (Owner only)
 */
router.get('/business/:businessId', (req, res) => teamController.getTeamMembers(req, res));

/**
 * DELETE /api/team/member/:membershipId
 * Remove a team member (Owner only)
 */
router.delete('/member/:membershipId', (req, res) => teamController.removeMember(req, res));

/**
 * PATCH /api/team/member/:membershipId/role
 * Update a team member's role (Owner only)
 */
router.patch('/member/:membershipId/role', (req, res) => teamController.updateMemberRole(req, res));

export default router;
