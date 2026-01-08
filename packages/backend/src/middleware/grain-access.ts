import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../prisma/client';

// Middleware to check if user has access to grain contracts (Demo Farm)
export async function requireGrainAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      console.error('[Grain Access] No user in request');
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    console.log('[Grain Access] Checking access for user:', req.user.userId);

    // Check if user is a member of Demo Farm (or legacy Rittgers Farm names)
    const demoFarm = await prisma.business.findFirst({
      where: {
        OR: [
          { name: 'Demo Farm' },
          { name: 'Rittgers Farm' },
          { name: 'Rittgers Farms' }
        ]
      }
    });

    console.log('[Grain Access] Found business:', demoFarm?.name || 'NONE');

    if (!demoFarm) {
      console.error('[Grain Access] No Demo Farm business found in database');
      res.status(403).json({ error: 'Grain contracts feature not available' });
      return;
    }

    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: req.user.userId,
          businessId: demoFarm.id
        }
      }
    });

    console.log('[Grain Access] Membership found:', membership ? 'YES' : 'NO');

    if (!membership) {
      console.error('[Grain Access] User not a member of Demo Farm');
      res.status(403).json({ error: 'Access denied. Grain contracts are only available to Demo Farm members.' });
      return;
    }

    console.log('[Grain Access] Access granted');
    // User has access, proceed
    next();
  } catch (error) {
    console.error('Grain access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
