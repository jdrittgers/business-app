import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../prisma/client';

/**
 * Middleware to check if user has access to grain features
 *
 * This middleware ensures the user is a member of at least one business.
 * Business-specific authorization (checking if user can access a specific business's data)
 * happens in the service layer.
 */
export async function requireGrainAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      console.error('[Grain Access] No user in request');
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    console.log('[Grain Access] Checking access for user:', req.user.userId);

    // Check if user is a member of at least one business
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId: req.user.userId
      },
      include: {
        business: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!membership) {
      console.error('[Grain Access] User is not a member of any business');
      res.status(403).json({
        error: 'Access denied. You must be a member of a farming operation to access grain features.'
      });
      return;
    }

    console.log('[Grain Access] Access granted - User is member of:', membership.business.name);

    // User has access to grain features, proceed
    next();
  } catch (error) {
    console.error('Grain access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
