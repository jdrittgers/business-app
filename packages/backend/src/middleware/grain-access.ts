import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../prisma/client';

// Middleware to check if user has access to grain contracts (Rittgers Farm only)
export async function requireGrainAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Check if user is a member of Rittgers Farm or Rittgers Farms
    const rittgersFarm = await prisma.business.findFirst({
      where: {
        OR: [
          { name: 'Rittgers Farm' },
          { name: 'Rittgers Farms' }
        ]
      }
    });

    if (!rittgersFarm) {
      res.status(403).json({ error: 'Grain contracts feature not available' });
      return;
    }

    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: req.user.userId,
          businessId: rittgersFarm.id
        }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'Access denied. Grain contracts are only available to Rittgers Farm members.' });
      return;
    }

    // User has access, proceed
    next();
  } catch (error) {
    console.error('Grain access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
