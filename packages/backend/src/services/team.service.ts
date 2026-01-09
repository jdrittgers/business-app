import { prisma } from '../prisma/client';
import { UserRole } from '@prisma/client';

export interface TeamMember {
  id: string;
  userId: string;
  role: UserRole;
  joinedAt: Date;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export class TeamService {
  /**
   * Get all team members for a business (Owner only)
   */
  async getTeamMembers(userId: string, businessId: string): Promise<TeamMember[]> {
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
      throw new Error('Only business owners can view team members');
    }

    const members = await prisma.businessMember.findMany({
      where: { businessId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return members.map(member => ({
      id: member.id,
      userId: member.userId,
      role: member.role,
      joinedAt: member.createdAt,
      user: member.user
    }));
  }

  /**
   * Remove a team member from a business (Owner only)
   */
  async removeMember(userId: string, membershipId: string): Promise<void> {
    // Get the membership to remove
    const membershipToRemove = await prisma.businessMember.findUnique({
      where: { id: membershipId },
      include: { business: true }
    });

    if (!membershipToRemove) {
      throw new Error('Team member not found');
    }

    // Verify requesting user is an owner of this business
    const requestingUserMembership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId: membershipToRemove.businessId
        }
      }
    });

    if (!requestingUserMembership || requestingUserMembership.role !== 'OWNER') {
      throw new Error('Only business owners can remove team members');
    }

    // Can't remove owners
    if (membershipToRemove.role === 'OWNER') {
      throw new Error('Cannot remove business owners');
    }

    // Remove the membership
    await prisma.businessMember.delete({
      where: { id: membershipId }
    });
  }

  /**
   * Update a team member's role (Owner only)
   */
  async updateMemberRole(
    userId: string,
    membershipId: string,
    newRole: UserRole
  ): Promise<TeamMember> {
    // Get the membership to update
    const membershipToUpdate = await prisma.businessMember.findUnique({
      where: { id: membershipId },
      include: {
        business: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!membershipToUpdate) {
      throw new Error('Team member not found');
    }

    // Verify requesting user is an owner of this business
    const requestingUserMembership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId: membershipToUpdate.businessId
        }
      }
    });

    if (!requestingUserMembership || requestingUserMembership.role !== 'OWNER') {
      throw new Error('Only business owners can update team member roles');
    }

    // Can't change owner roles
    if (membershipToUpdate.role === 'OWNER' || newRole === 'OWNER') {
      throw new Error('Cannot change owner roles');
    }

    // Can only set MANAGER or EMPLOYEE roles
    if (newRole !== 'MANAGER' && newRole !== 'EMPLOYEE') {
      throw new Error('Can only set MANAGER or EMPLOYEE roles');
    }

    // Update the role
    const updatedMembership = await prisma.businessMember.update({
      where: { id: membershipId },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return {
      id: updatedMembership.id,
      userId: updatedMembership.userId,
      role: updatedMembership.role,
      joinedAt: updatedMembership.createdAt,
      user: updatedMembership.user
    };
  }
}
