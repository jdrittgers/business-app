import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../prisma/client';
import { UserRole } from '@business-app/shared';

export interface RetailerAuthRequest extends AuthRequest {
  retailer?: {
    id: string;
    userId: string;
    companyName: string;
    businessLicense?: string;
    phone?: string;
  };
}

export async function requireRetailerRole(
  req: RetailerAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check if user has RETAILER role
    if (req.user.role !== UserRole.RETAILER) {
      res.status(403).json({ error: 'Retailer access required' });
      return;
    }

    // Fetch retailer profile
    const retailer = await prisma.retailer.findUnique({
      where: { userId: req.user.userId }
    });

    if (!retailer) {
      res.status(403).json({ error: 'Retailer profile not found' });
      return;
    }

    // Attach retailer to request
    req.retailer = {
      id: retailer.id,
      userId: retailer.userId,
      companyName: retailer.companyName,
      businessLicense: retailer.businessLicense || undefined,
      phone: retailer.phone || undefined
    };

    next();
  } catch (error) {
    console.error('Retailer auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
