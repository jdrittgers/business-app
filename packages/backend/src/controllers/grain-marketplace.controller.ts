import { Router, Response } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { GrainMarketplaceService } from '../services/grain-marketplace.service';
import { CommodityType, GrainPurchaseOfferStatus } from '@prisma/client';

const router = Router();
const marketplaceService = new GrainMarketplaceService();

// Apply auth middleware to all routes
router.use(authenticate);

// ===== Retailer Routes =====

/**
 * Get grain bins within radius
 * Query params: latitude, longitude, radiusMiles, commodityType (optional)
 */
router.get('/bins/search', async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude, radiusMiles, commodityType } = req.query;

    if (!latitude || !longitude || !radiusMiles) {
      res.status(400).json({ error: 'latitude, longitude, and radiusMiles are required' });
      return;
    }

    const bins = await marketplaceService.getBinsWithinRadius({
      latitude: parseFloat(latitude as string),
      longitude: parseFloat(longitude as string),
      radiusMiles: parseInt(radiusMiles as string),
      commodityType: commodityType as CommodityType | undefined
    });

    res.json(bins);
  } catch (error: any) {
    console.error('Error searching bins:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a grain purchase offer
 */
router.post('/offers', async (req: AuthRequest, res: Response) => {
  try {
    const offer = await marketplaceService.createOffer(req.body);
    res.status(201).json(offer);
  } catch (error: any) {
    console.error('Error creating offer:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all offers for a retailer
 * Query params: status (optional)
 */
router.get('/retailers/:retailerId/offers', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const offers = await marketplaceService.getRetailerOffers(
      req.params.retailerId,
      status as GrainPurchaseOfferStatus | undefined
    );
    res.json(offers);
  } catch (error: any) {
    console.error('Error getting retailer offers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel an offer (retailer only)
 */
router.delete('/retailers/:retailerId/offers/:offerId', async (req: AuthRequest, res: Response) => {
  try {
    await marketplaceService.cancelOffer(req.params.offerId, req.params.retailerId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error cancelling offer:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== Farmer Routes =====

/**
 * Get all offers for a farmer's business
 * Query params: status (optional)
 */
router.get('/businesses/:businessId/offers', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const offers = await marketplaceService.getFarmerOffers(
      req.params.businessId,
      status as GrainPurchaseOfferStatus | undefined
    );
    res.json(offers);
  } catch (error: any) {
    console.error('Error getting farmer offers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get a single offer by ID
 */
router.get('/offers/:offerId', async (req: AuthRequest, res: Response) => {
  try {
    const offer = await marketplaceService.getOfferById(req.params.offerId);
    res.json(offer);
  } catch (error: any) {
    console.error('Error getting offer:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * Accept an offer
 */
router.post('/offers/:offerId/accept', async (req: AuthRequest, res: Response) => {
  try {
    const offer = await marketplaceService.acceptOffer(req.params.offerId, req.user!.userId);
    res.json(offer);
  } catch (error: any) {
    console.error('Error accepting offer:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reject an offer
 */
router.post('/offers/:offerId/reject', async (req: AuthRequest, res: Response) => {
  try {
    const offer = await marketplaceService.rejectOffer(req.params.offerId);
    res.json(offer);
  } catch (error: any) {
    console.error('Error rejecting offer:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Complete an offer (mark as delivered)
 */
router.post('/offers/:offerId/complete', async (req: AuthRequest, res: Response) => {
  try {
    const offer = await marketplaceService.completeOffer(req.params.offerId);
    res.json(offer);
  } catch (error: any) {
    console.error('Error completing offer:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
