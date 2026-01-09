import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TeamService } from '../services/team.service';
import { UserRole } from '@prisma/client';

const teamService = new TeamService();

/**
 * Get all team members for a business
 * GET /api/team/business/:businessId
 */
export async function getTeamMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      res.status(400).json({ error: 'Business ID is required' });
      return;
    }

    const members = await teamService.getTeamMembers(req.user!.userId, businessId);

    res.json(members);
  } catch (error: any) {
    console.error('Get team members error:', error);

    if (error.message.includes('Only business owners')) {
      res.status(403).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to fetch team members' });
  }
}

/**
 * Remove a team member
 * DELETE /api/team/member/:membershipId
 */
export async function removeMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { membershipId } = req.params;

    if (!membershipId) {
      res.status(400).json({ error: 'Membership ID is required' });
      return;
    }

    await teamService.removeMember(req.user!.userId, membershipId);

    res.status(204).send();
  } catch (error: any) {
    console.error('Remove team member error:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Only business owners') || error.message.includes('Cannot remove')) {
      res.status(403).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to remove team member' });
  }
}

/**
 * Update a team member's role
 * PATCH /api/team/member/:membershipId/role
 */
export async function updateMemberRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { membershipId } = req.params;
    const { role } = req.body;

    if (!membershipId) {
      res.status(400).json({ error: 'Membership ID is required' });
      return;
    }

    if (!role) {
      res.status(400).json({ error: 'Role is required' });
      return;
    }

    const updatedMember = await teamService.updateMemberRole(
      req.user!.userId,
      membershipId,
      role as UserRole
    );

    res.json(updatedMember);
  } catch (error: any) {
    console.error('Update team member role error:', error);

    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Only business owners') ||
        error.message.includes('Cannot change') ||
        error.message.includes('Can only set')) {
      res.status(403).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to update team member role' });
  }
}
