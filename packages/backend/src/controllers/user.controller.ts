import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';

/**
 * Delete user account
 * DELETE /api/user/account
 */
export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;

    await prisma.$transaction(async (tx) => {
      // Get all businesses where user is the only owner
      const memberships = await tx.businessMember.findMany({
        where: { userId },
        include: {
          business: {
            include: {
              members: true
            }
          }
        }
      });

      // Check if user is the only owner of any non-temp businesses
      const soloOwnedBusinesses = memberships.filter(m => {
        if (m.role !== 'OWNER') return false;
        if (m.business.name.startsWith('Temp-')) return false;
        
        const ownerCount = m.business.members.filter(mem => mem.role === 'OWNER').length;
        return ownerCount === 1;
      });

      if (soloOwnedBusinesses.length > 0) {
        const businessNames = soloOwnedBusinesses.map(m => m.business.name).join(', ');
        throw new Error(
          `Cannot delete account. You are the only owner of: ${businessNames}. ` +
          `Please transfer ownership or delete these businesses first.`
        );
      }

      // Delete user's business memberships
      await tx.businessMember.deleteMany({
        where: { userId }
      });

      // Delete any temp businesses the user owns
      const tempBusinessIds = memberships
        .filter(m => m.role === 'OWNER' && m.business.name.startsWith('Temp-'))
        .map(m => m.businessId);

      if (tempBusinessIds.length > 0) {
        await tx.business.deleteMany({
          where: {
            id: { in: tempBusinessIds }
          }
        });
      }

      // Delete the user
      await tx.user.delete({
        where: { id: userId }
      });
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('Delete account error:', error);

    if (error.message.includes('Cannot delete account')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to delete account' });
  }
}
