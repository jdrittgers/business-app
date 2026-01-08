import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { BidRequestService } from '../services/bid-request.service';

const bidRequestService = new BidRequestService();

export async function createBidRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { businessId } = req.params;

    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const bidRequest = await bidRequestService.create(businessId, req.user.userId, req.body);
    res.status(201).json(bidRequest);
  } catch (error) {
    console.error('Create bid request error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create bid request';
    res.status(400).json({ error: message });
  }
}

export async function getBidRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { businessId } = req.params;
    const { status } = req.query;

    const bidRequests = await bidRequestService.getAll(businessId, {
      status: status as any
    });

    res.json(bidRequests);
  } catch (error) {
    console.error('Get bid requests error:', error);
    res.status(500).json({ error: 'Failed to fetch bid requests' });
  }
}

export async function getBidRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { businessId, id } = req.params;

    const bidRequest = await bidRequestService.getById(id, businessId);

    if (!bidRequest) {
      res.status(404).json({ error: 'Bid request not found' });
      return;
    }

    res.json(bidRequest);
  } catch (error) {
    console.error('Get bid request error:', error);
    res.status(500).json({ error: 'Failed to fetch bid request' });
  }
}

export async function updateBidRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { businessId, id } = req.params;

    const bidRequest = await bidRequestService.update(id, businessId, req.body);
    res.json(bidRequest);
  } catch (error) {
    console.error('Update bid request error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update bid request';
    res.status(400).json({ error: message });
  }
}

export async function closeBidRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { businessId, id } = req.params;

    const bidRequest = await bidRequestService.close(id, businessId);
    res.json(bidRequest);
  } catch (error) {
    console.error('Close bid request error:', error);
    const message = error instanceof Error ? error.message : 'Failed to close bid request';
    res.status(400).json({ error: message });
  }
}

export async function deleteBidRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { businessId, id } = req.params;

    await bidRequestService.delete(id, businessId);
    res.status(204).send();
  } catch (error) {
    console.error('Delete bid request error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete bid request';
    res.status(400).json({ error: message });
  }
}

export async function deleteRetailerBid(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { businessId, bidRequestId, bidId } = req.params;

    await bidRequestService.deleteRetailerBid(bidId, bidRequestId, businessId);
    res.status(204).send();
  } catch (error) {
    console.error('Delete retailer bid error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete bid';
    res.status(400).json({ error: message });
  }
}

export async function getOpenBidRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { radiusMiles, latitude, longitude } = req.query;

    // Parse query parameters
    const query = {
      radiusMiles: radiusMiles ? Number(radiusMiles) : undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined
    };

    // Validate coordinates
    if (query.latitude !== undefined && query.longitude !== undefined) {
      if (isNaN(query.latitude) || isNaN(query.longitude)) {
        res.status(400).json({ error: 'Invalid latitude or longitude' });
        return;
      }

      if (query.latitude < -90 || query.latitude > 90) {
        res.status(400).json({ error: 'Latitude must be between -90 and 90' });
        return;
      }

      if (query.longitude < -180 || query.longitude > 180) {
        res.status(400).json({ error: 'Longitude must be between -180 and 180' });
        return;
      }
    }

    // Validate radius
    if (query.radiusMiles !== undefined) {
      if (isNaN(query.radiusMiles) || query.radiusMiles <= 0) {
        res.status(400).json({ error: 'Invalid radius value' });
        return;
      }
    }

    const bidRequests = await bidRequestService.getOpenBidRequests(query);
    res.json(bidRequests);
  } catch (error) {
    console.error('Get open bid requests error:', error);
    res.status(500).json({ error: 'Failed to fetch open bid requests' });
  }
}
