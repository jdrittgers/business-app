import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../prisma/client';

export async function requireBusinessAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { businessId } = req.params;

    if (!businessId) {
      res.status(400).json({ error: 'Business ID is required' });
      return;
    }

    // Check if user is a member of the business
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId: req.user.userId,
        businessId
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied. You are not a member of this business.' });
      return;
    }

    // User has access, proceed
    next();
  } catch (error) {
    console.error('Business access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
