import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MarketPriceService } from '../services/market-price.service';
import { GetMarketPricesQuery } from '@business-app/shared';

const marketPriceService = new MarketPriceService();

export class MarketPriceController {
  // Get market prices with filters
  async getMarketPrices(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const query: GetMarketPricesQuery = {
        commodityType: req.query.commodityType as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        source: req.query.source as string
      };

      const prices = await marketPriceService.getMarketPrices(query);
      res.json(prices);
    } catch (error) {
      console.error('Get market prices error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get latest prices for all commodities
  async getLatestPrices(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const prices = await marketPriceService.getLatestPrices();
      res.json(prices);
    } catch (error) {
      console.error('Get latest prices error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Manual trigger for fetching live prices
  async fetchLivePrices(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      await marketPriceService.fetchLivePrices();
      res.json({ message: 'Live prices fetched successfully' });
    } catch (error) {
      console.error('Fetch live prices error:', error);
      res.status(500).json({ error: 'Failed to fetch live prices' });
    }
  }

  // Manual price entry
  async saveManualPrice(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { commodityType, price } = req.body;

      if (!commodityType || !price) {
        res.status(400).json({ error: 'Missing commodityType or price' });
        return;
      }

      const savedPrice = await marketPriceService.saveMarketPrice({
        commodityType,
        price: parseFloat(price),
        source: 'MANUAL_ENTRY',
        marketType: 'SPOT',
        priceDate: new Date()
      });

      res.json(savedPrice);
    } catch (error) {
      console.error('Save manual price error:', error);
      res.status(500).json({ error: 'Failed to save price' });
    }
  }
}
