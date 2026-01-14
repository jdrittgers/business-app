import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { GeocodingService } from '../services/geocoding.service';

/**
 * Update business location
 * PUT /api/user/businesses/:businessId/location
 */
export async function updateBusinessLocation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { businessId } = req.params;
    const { zipCode } = req.body;

    // Check if user has permission (must be OWNER or MANAGER)
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId,
        businessId,
        role: { in: ['OWNER', 'MANAGER'] }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'You do not have permission to update this business' });
      return;
    }

    let latitude: number | null = null;
    let longitude: number | null = null;

    // Geocode ZIP code if provided
    if (zipCode) {
      const geocodingService = new GeocodingService();
      try {
        const geocodeResult = await geocodingService.geocodeZipCode(zipCode);
        latitude = geocodeResult.latitude;
        longitude = geocodeResult.longitude;
        console.log(`✅ Geocoded business ZIP ${zipCode}: ${latitude}, ${longitude}`);
      } catch (geocodeError) {
        console.error('Geocoding error:', geocodeError);
        // Continue without coordinates if geocoding fails
      }
    }

    // Update business
    const updatedBusiness = await prisma.business.update({
      where: { id: businessId },
      data: {
        zipCode,
        latitude,
        longitude
      }
    });

    res.json(updatedBusiness);
  } catch (error: any) {
    console.error('Update business location error:', error);
    res.status(500).json({ error: 'Failed to update business location' });
  }
}

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
