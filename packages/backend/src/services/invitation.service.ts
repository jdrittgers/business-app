import { prisma } from '../prisma/client';
import { UserRole } from '@prisma/client';

/**
 * Generate a random 8-character alphanumeric invitation code
 */
function generateInvitationCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

export interface CreateInvitationRequest {
  businessId: string;
  role: UserRole;
  email?: string;
  expiresInDays?: number;
  maxUses?: number;
}

export interface InvitationResponse {
  id: string;
  code: string;
  role: UserRole;
  email?: string;
  expiresAt: Date;
  maxUses: number;
  currentUses: number;
  isActive: boolean;
  createdAt: Date;
}

export class InvitationService {
  /**
   * Create a new invitation code (Owner only)
   */
  async createInvitation(
    userId: string,
    data: CreateInvitationRequest
  ): Promise<InvitationResponse> {
    const { businessId, role, email, expiresInDays = 365, maxUses = 999 } = data;

    // Verify user is an owner of this business
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId
        }
      }
    });

    if (!membership || membership.role !== 'OWNER') {
      throw new Error('Only business owners can create invitations');
    }

    // Don't allow creating OWNER or RETAILER role invitations
    if (role === 'OWNER' || role === 'RETAILER') {
      throw new Error('Can only create MANAGER or EMPLOYEE invitations');
    }

    // Generate unique code
    let code = generateInvitationCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.businessInvitation.findUnique({
        where: { code }
      });
      if (!existing) break;
      code = generateInvitationCode();
      attempts++;
    }

    if (attempts >= 10) {
      throw new Error('Failed to generate unique invitation code');
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invitation
    const invitation = await prisma.businessInvitation.create({
      data: {
        businessId,
        code,
        role,
        createdBy: userId,
        email,
        expiresAt,
        maxUses,
        currentUses: 0,
        isActive: true
      }
    });

    return {
      id: invitation.id,
      code: invitation.code,
      role: invitation.role,
      email: invitation.email || undefined,
      expiresAt: invitation.expiresAt,
      maxUses: invitation.maxUses,
      currentUses: invitation.currentUses,
      isActive: invitation.isActive,
      createdAt: invitation.createdAt
    };
  }

  /**
   * Get all invitations for a business (Owner only)
   */
  async getBusinessInvitations(userId: string, businessId: string): Promise<InvitationResponse[]> {
    // Verify user is an owner of this business
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId
        }
      }
    });

    if (!membership || membership.role !== 'OWNER') {
      throw new Error('Only business owners can view invitations');
    }

    const invitations = await prisma.businessInvitation.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' }
    });

    return invitations.map(inv => ({
      id: inv.id,
      code: inv.code,
      role: inv.role,
      email: inv.email || undefined,
      expiresAt: inv.expiresAt,
      maxUses: inv.maxUses,
      currentUses: inv.currentUses,
      isActive: inv.isActive,
      createdAt: inv.createdAt
    }));
  }

  /**
   * Deactivate an invitation (Owner only)
   */
  async deactivateInvitation(userId: string, invitationId: string): Promise<void> {
    const invitation = await prisma.businessInvitation.findUnique({
      where: { id: invitationId },
      include: { business: true }
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Verify user is an owner of this business
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId: invitation.businessId
        }
      }
    });

    if (!membership || membership.role !== 'OWNER') {
      throw new Error('Only business owners can deactivate invitations');
    }

    await prisma.businessInvitation.update({
      where: { id: invitationId },
      data: { isActive: false }
    });
  }

  /**
   * Validate and get invitation details (Public)
   */
  async getInvitationByCode(code: string): Promise<InvitationResponse & { businessName: string }> {
    const invitation = await prisma.businessInvitation.findUnique({
      where: { code },
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
      throw new Error('Invalid invitation code');
    }

    if (!invitation.isActive) {
      throw new Error('This invitation has been deactivated');
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error('This invitation has expired');
    }

    if (invitation.currentUses >= invitation.maxUses) {
      throw new Error('This invitation has reached its maximum number of uses');
    }

    return {
      id: invitation.id,
      code: invitation.code,
      role: invitation.role,
      email: invitation.email || undefined,
      expiresAt: invitation.expiresAt,
      maxUses: invitation.maxUses,
      currentUses: invitation.currentUses,
      isActive: invitation.isActive,
      createdAt: invitation.createdAt,
      businessName: invitation.business.name
    };
  }

  /**
   * Accept an invitation and join a business
   */
  async acceptInvitation(userId: string, code: string): Promise<{ businessId: string; role: UserRole }> {
    return await prisma.$transaction(async (tx) => {
      // Get invitation
      const invitation = await tx.businessInvitation.findUnique({
        where: { code },
        include: {
          business: true
        }
      });

      if (!invitation) {
        throw new Error('Invalid invitation code');
      }

      if (!invitation.isActive) {
        throw new Error('This invitation has been deactivated');
      }

      if (invitation.expiresAt < new Date()) {
        throw new Error('This invitation has expired');
      }

      if (invitation.currentUses >= invitation.maxUses) {
        throw new Error('This invitation has reached its maximum number of uses');
      }

      // If invitation is email-specific, verify the user's email
      if (invitation.email) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { email: true }
        });

        if (!user || user.email !== invitation.email) {
          throw new Error('This invitation is for a specific email address');
        }
      }

      // Check if user is already a member
      const existingMembership = await tx.businessMember.findUnique({
        where: {
          userId_businessId: {
            userId,
            businessId: invitation.businessId
          }
        }
      });

      if (existingMembership) {
        throw new Error('You are already a member of this business');
      }

      // Create membership
      await tx.businessMember.create({
        data: {
          userId,
          businessId: invitation.businessId,
          role: invitation.role
        }
      });

      // Update invitation usage
      await tx.businessInvitation.update({
        where: { id: invitation.id },
        data: {
          currentUses: invitation.currentUses + 1,
          usedBy: userId,
          usedAt: new Date()
        }
      });

      return {
        businessId: invitation.businessId,
        role: invitation.role
      };
    });
  }
}
