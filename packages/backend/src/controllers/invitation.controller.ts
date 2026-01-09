import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { InvitationService } from '../services/invitation.service';
import { EmailService } from '../services/email.service';
import { prisma } from '../prisma/client';
import { UserRole } from '@prisma/client';

const invitationService = new InvitationService();
const emailService = new EmailService();

/**
 * Create a new invitation code
 * POST /api/invitations
 */
export async function createInvitation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { businessId, role, email, expiresInDays, maxUses } = req.body;

    if (!businessId || !role) {
      res.status(400).json({ error: 'Business ID and role are required' });
      return;
    }

    // Validate role
    if (!['MANAGER', 'EMPLOYEE'].includes(role)) {
      res.status(400).json({ error: 'Role must be MANAGER or EMPLOYEE' });
      return;
    }

    const invitation = await invitationService.createInvitation(req.user!.userId, {
      businessId,
      role: role as UserRole,
      email,
      expiresInDays,
      maxUses
    });

    res.status(201).json(invitation);
  } catch (error: any) {
    console.error('Create invitation error:', error);

    if (error.message.includes('Only business owners')) {
      res.status(403).json({ error: error.message });
      return;
    }

    if (error.message.includes('Can only create')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to create invitation' });
  }
}

/**
 * Get all invitations for a business
 * GET /api/invitations/business/:businessId
 */
export async function getBusinessInvitations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      res.status(400).json({ error: 'Business ID is required' });
      return;
    }

    const invitations = await invitationService.getBusinessInvitations(
      req.user!.userId,
      businessId
    );

    res.json(invitations);
  } catch (error: any) {
    console.error('Get business invitations error:', error);

    if (error.message.includes('Only business owners')) {
      res.status(403).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
}

/**
 * Deactivate an invitation
 * DELETE /api/invitations/:invitationId
 */
export async function deactivateInvitation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { invitationId } = req.params;

    if (!invitationId) {
      res.status(400).json({ error: 'Invitation ID is required' });
      return;
    }

    await invitationService.deactivateInvitation(req.user!.userId, invitationId);

    res.status(204).send();
  } catch (error: any) {
    console.error('Deactivate invitation error:', error);

    if (error.message.includes('Invitation not found')) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error.message.includes('Only business owners')) {
      res.status(403).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to deactivate invitation' });
  }
}

/**
 * Get invitation details by code (public endpoint for validation)
 * GET /api/invitations/validate/:code
 */
export async function validateInvitationCode(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { code } = req.params;

    if (!code) {
      res.status(400).json({ error: 'Invitation code is required' });
      return;
    }

    const invitation = await invitationService.getInvitationByCode(code);

    res.json(invitation);
  } catch (error: any) {
    console.error('Validate invitation code error:', error);

    if (error.message.includes('Invalid invitation') ||
        error.message.includes('deactivated') ||
        error.message.includes('expired') ||
        error.message.includes('maximum number')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to validate invitation code' });
  }
}

/**
 * Accept an invitation and join a business
 * POST /api/invitations/accept
 */
export async function acceptInvitation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Invitation code is required' });
      return;
    }

    const result = await invitationService.acceptInvitation(req.user!.userId, code);

    res.json({
      message: 'Successfully joined business',
      businessId: result.businessId,
      role: result.role
    });
  } catch (error: any) {
    console.error('Accept invitation error:', error);

    if (error.message.includes('Invalid invitation') ||
        error.message.includes('deactivated') ||
        error.message.includes('expired') ||
        error.message.includes('maximum number') ||
        error.message.includes('specific email') ||
        error.message.includes('already a member')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to accept invitation' });
  }
}

/**
 * Send invitation email
 * POST /api/invitations/:invitationId/send-email
 */
export async function sendInvitationEmail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { invitationId } = req.params;
    const { email } = req.body;

    if (!invitationId) {
      res.status(400).json({ error: 'Invitation ID is required' });
      return;
    }

    if (!email) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }

    // Get invitation details
    const invitation = await prisma.businessInvitation.findUnique({
      where: { id: invitationId },
      include: {
        business: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' });
      return;
    }

    // Verify user is owner of this business
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: req.user!.userId,
          businessId: invitation.businessId
        }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!membership || membership.role !== 'OWNER') {
      res.status(403).json({ error: 'Only business owners can send invitation emails' });
      return;
    }

    if (!invitation.isActive) {
      res.status(400).json({ error: 'Cannot send email for inactive invitation' });
      return;
    }

    // Get app URL from environment
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const invitationLink = `${appUrl}/register?code=${invitation.code}`;

    // Send email
    await emailService.sendInvitationEmail({
      toEmail: email,
      businessName: invitation.business.name,
      invitationCode: invitation.code,
      invitationLink,
      role: invitation.role,
      fromName: `${membership.user.firstName} ${membership.user.lastName}`
    });

    res.json({ message: 'Invitation email sent successfully' });
  } catch (error: any) {
    console.error('Send invitation email error:', error);

    if (error.message.includes('Email service not configured')) {
      res.status(503).json({ error: 'Email service is not configured. Please contact support.' });
      return;
    }

    if (error.message.includes('Failed to send email')) {
      res.status(500).json({ error: 'Failed to send email. Please try again later.' });
      return;
    }

    res.status(500).json({ error: 'Failed to send invitation email' });
  }
}
