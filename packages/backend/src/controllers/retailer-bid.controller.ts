import { Response } from 'express';
import { RetailerAuthRequest } from '../middleware/retailer-auth';
import { RetailerBidService } from '../services/retailer-bid.service';

const retailerBidService = new RetailerBidService();

export async function createBid(req: RetailerAuthRequest, res: Response): Promise<void> {
  try {
    if (!req.retailer) {
      res.status(401).json({ error: 'Not authenticated as retailer' });
      return;
    }

    const bid = await retailerBidService.create(req.retailer.id, req.body);
    res.status(201).json(bid);
  } catch (error) {
    console.error('Create bid error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create bid';
    res.status(400).json({ error: message });
  }
}

export async function updateBid(req: RetailerAuthRequest, res: Response): Promise<void> {
  try {
    if (!req.retailer) {
      res.status(401).json({ error: 'Not authenticated as retailer' });
      return;
    }

    const { id } = req.params;
    const bid = await retailerBidService.update(id, req.retailer.id, req.body);
    res.json(bid);
  } catch (error) {
    console.error('Update bid error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update bid';
    res.status(400).json({ error: message });
  }
}

export async function getMyBids(req: RetailerAuthRequest, res: Response): Promise<void> {
  try {
    if (!req.retailer) {
      res.status(401).json({ error: 'Not authenticated as retailer' });
      return;
    }

    const bids = await retailerBidService.getByRetailer(req.retailer.id);
    res.json(bids);
  } catch (error) {
    console.error('Get my bids error:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
}

export async function deleteBid(req: RetailerAuthRequest, res: Response): Promise<void> {
  try {
    if (!req.retailer) {
      res.status(401).json({ error: 'Not authenticated as retailer' });
      return;
    }

    const { id } = req.params;
    await retailerBidService.delete(id, req.retailer.id);
    res.status(204).send();
  } catch (error) {
    console.error('Delete bid error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete bid';
    res.status(400).json({ error: message });
  }
}
