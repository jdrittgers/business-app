import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../prisma/client';
import { UserRole, PartnerModule, PartnerPermissionLevel } from '@business-app/shared';
import { partnerAccessService } from '../services/partner-access.service';

// Map PartnerPermissionLevel string to Prisma enum
const PERMISSION_LEVEL_MAP: Record<string, PartnerPermissionLevel> = {
  'NONE': PartnerPermissionLevel.NONE,
  'VIEW': PartnerPermissionLevel.VIEW,
  'ADD': PartnerPermissionLevel.ADD,
  'EDIT': PartnerPermissionLevel.EDIT
};

/**
 * Factory function to create middleware that checks partner access for a specific module
 *
 * This middleware:
 * 1. Allows business owners/members full access to their own business data
 * 2. For retailers, checks if they have the required permission level for the module
 * 3. Returns 403 if access is denied
 *
 * @param module - The module to check access for
 * @param requiredLevel - The minimum permission level required (VIEW, ADD, or EDIT)
 */
export function requirePartnerAccess(
  module: PartnerModule,
  requiredLevel: PartnerPermissionLevel
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        console.error('[Partner Access] No user in request');
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Extract businessId from request (could be in params, body, or query)
      const businessId = req.params.businessId || req.body?.businessId || req.query?.businessId as string;

      if (!businessId) {
        console.error('[Partner Access] No businessId in request');
        res.status(400).json({ error: 'Business ID is required' });
        return;
      }

      console.log(`[Partner Access] Checking ${module} access (level: ${requiredLevel}) for user:`,
        req.user.userId, 'role:', req.user.role, 'business:', businessId);

      // If user is a business member, grant full access
      if (req.user.role !== UserRole.RETAILER) {
        const membership = await prisma.businessMember.findFirst({
          where: {
            userId: req.user.userId,
            businessId: businessId
          }
        });

        if (membership) {
          console.log(`[Partner Access] Access granted - User is business member`);
          next();
          return;
        }

        // User is not a member of this business and not a retailer
        console.error('[Partner Access] User is not a member of this business');
        res.status(403).json({
          error: 'Access denied. You do not have permission to access this business data.'
        });
        return;
      }

      // User is a retailer - check partner permissions
      const retailer = await prisma.retailer.findUnique({
        where: { userId: req.user.userId }
      });

      if (!retailer) {
        console.error('[Partner Access] Retailer not found for user:', req.user.userId);
        res.status(403).json({
          error: 'Retailer account not found.'
        });
        return;
      }

      // Check if retailer has required access level for this module
      const hasAccess = await partnerAccessService.checkAccess(
        retailer.id,
        businessId,
        module,
        PERMISSION_LEVEL_MAP[requiredLevel] || requiredLevel
      );

      if (!hasAccess) {
        console.log(`[Partner Access] Access denied - Retailer lacks ${requiredLevel} permission for ${module}`);
        res.status(403).json({
          error: `Access denied. You do not have ${requiredLevel.toLowerCase()} permission for this module.`,
          requiredModule: module,
          requiredLevel: requiredLevel
        });
        return;
      }

      // Attach retailer info to request for downstream use
      (req as any).retailer = retailer;
      (req as any).partnerAccess = {
        module,
        level: requiredLevel,
        businessId
      };

      console.log(`[Partner Access] Access granted - Retailer has ${requiredLevel} permission for ${module}`);
      next();
    } catch (error) {
      console.error('[Partner Access] Error checking access:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware to check if user has ANY access to a business (at least VIEW on any module)
 * Useful for general business data endpoints
 */
export async function requireAnyPartnerAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const businessId = req.params.businessId || req.body?.businessId || req.query?.businessId as string;

    if (!businessId) {
      res.status(400).json({ error: 'Business ID is required' });
      return;
    }

    // Business members always have access
    if (req.user.role !== UserRole.RETAILER) {
      const membership = await prisma.businessMember.findFirst({
        where: {
          userId: req.user.userId,
          businessId: businessId
        }
      });

      if (membership) {
        next();
        return;
      }

      res.status(403).json({
        error: 'Access denied. You do not have permission to access this business data.'
      });
      return;
    }

    // Check if retailer has any access
    const retailer = await prisma.retailer.findUnique({
      where: { userId: req.user.userId }
    });

    if (!retailer) {
      res.status(403).json({ error: 'Retailer account not found.' });
      return;
    }

    const hasAnyAccess = await partnerAccessService.hasAnyAccess(retailer.id, businessId);

    if (!hasAnyAccess) {
      res.status(403).json({
        error: 'Access denied. You do not have permission to access this farmer\'s data.'
      });
      return;
    }

    (req as any).retailer = retailer;
    next();
  } catch (error) {
    console.error('[Partner Access] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Helper middleware to attach partner permissions to request
 * Use this after authentication to make permissions available throughout the request
 */
export async function attachPartnerPermissions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.role !== UserRole.RETAILER) {
      next();
      return;
    }

    const businessId = req.params.businessId || req.body?.businessId || req.query?.businessId as string;

    if (!businessId) {
      next();
      return;
    }

    const retailer = await prisma.retailer.findUnique({
      where: { userId: req.user.userId }
    });

    if (!retailer) {
      next();
      return;
    }

    const permissions = await partnerAccessService.getPermissions(retailer.id, businessId);

    (req as any).retailer = retailer;
    (req as any).partnerPermissions = permissions;

    next();
  } catch (error) {
    console.error('[Partner Access] Error attaching permissions:', error);
    next();
  }
}
