import { prisma } from '../prisma/client';
import {
  MarketPrice,
  GetMarketPricesQuery,
  CommodityType
} from '@business-app/shared';
import axios from 'axios';

export class MarketPriceService {
  // API Configuration
  private readonly ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || '';
  private readonly ALPHA_VANTAGE_API_URL = 'https://www.alphavantage.co/query';

  // Fetch live prices from external API
  async fetchLivePrices(): Promise<void> {
    try {
      console.log('Fetching live commodity prices...');

      // Fetch corn price
      const cornPrice = await this.fetchCommodityPrice('CORN');
      if (cornPrice) {
        await this.saveMarketPrice({
          commodityType: 'CORN',
          price: cornPrice,
          source: 'ALPHA_VANTAGE',
          marketType: 'SPOT',
          priceDate: new Date()
        });
      }

      // Fetch soybean price (note: Alpha Vantage may not have soybeans, will use corn as proxy or skip)
      const soybeanPrice = await this.fetchCommodityPrice('SOYBEANS');
      if (soybeanPrice) {
        await this.saveMarketPrice({
          commodityType: 'SOYBEANS',
          price: soybeanPrice,
          source: 'ALPHA_VANTAGE',
          marketType: 'SPOT',
          priceDate: new Date()
        });
      }

      // Fetch wheat price
      const wheatPrice = await this.fetchCommodityPrice('WHEAT');
      if (wheatPrice) {
        await this.saveMarketPrice({
          commodityType: 'WHEAT',
          price: wheatPrice,
          source: 'ALPHA_VANTAGE',
          marketType: 'SPOT',
          priceDate: new Date()
        });
      }

      console.log('Live prices fetched successfully');
    } catch (error) {
      console.error('Error fetching live prices:', error);
      throw error;
    }
  }

  // Fetch price for specific commodity from external API
  private async fetchCommodityPrice(commodity: string): Promise<number | null> {
    try {
      // NOTE: Alpha Vantage does not support agricultural commodity prices
      // For now, this will return null and prices can be entered manually via POST /api/market-prices/fetch
      // Alternative: Use CME Group API, Barchart, or other commodity data providers

      console.log(`⚠️  Automatic price fetching not available for ${commodity}`);
      console.log(`   Use POST /api/market-prices/manual endpoint to enter prices manually`);
      return null;
    } catch (error) {
      console.error(`Error fetching ${commodity} price:`, error);
      return null;
    }
  }

  // Save market price to database
  async saveMarketPrice(data: {
    commodityType: string;
    price: number;
    source: string;
    marketType: string;
    priceDate: Date;
    contractMonth?: string;
  }): Promise<MarketPrice> {
    const price = await prisma.marketPrice.create({
      data: {
        commodityType: data.commodityType as any,
        price: data.price,
        source: data.source,
        marketType: data.marketType,
        priceDate: data.priceDate,
        contractMonth: data.contractMonth
      }
    });

    return this.mapPriceToResponse(price);
  }

  // Get market prices with filters
  async getMarketPrices(query: GetMarketPricesQuery): Promise<MarketPrice[]> {
    const whereClause: any = {};

    if (query.commodityType) {
      whereClause.commodityType = query.commodityType;
    }
    if (query.startDate || query.endDate) {
      whereClause.priceDate = {};
      if (query.startDate) {
        whereClause.priceDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        whereClause.priceDate.lte = new Date(query.endDate);
      }
    }
    if (query.source) {
      whereClause.source = query.source;
    }

    const prices = await prisma.marketPrice.findMany({
      where: whereClause,
      orderBy: { priceDate: 'desc' },
      take: 100 // Limit to recent 100 prices
    });

    return prices.map(this.mapPriceToResponse);
  }

  // Get latest price for each commodity
  async getLatestPrices(): Promise<{ [key in CommodityType]?: number }> {
    const latestPrices: { [key in CommodityType]?: number } = {};

    for (const commodity of ['CORN', 'SOYBEANS', 'WHEAT']) {
      const price = await prisma.marketPrice.findFirst({
        where: { commodityType: commodity as any },
        orderBy: { priceDate: 'desc' }
      });

      if (price) {
        latestPrices[commodity as CommodityType] = Number(price.price);
      }
    }

    return latestPrices;
  }

  // Check price alerts and trigger notifications
  async checkPriceAlerts(): Promise<void> {
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { isActive: true },
      include: { user: true }
    });

    for (const alert of activeAlerts) {
      const latestPrice = await prisma.marketPrice.findFirst({
        where: { commodityType: alert.commodityType },
        orderBy: { priceDate: 'desc' }
      });

      if (!latestPrice) continue;

      const shouldTrigger =
        (alert.alertType === 'ABOVE' && Number(latestPrice.price) >= Number(alert.targetPrice)) ||
        (alert.alertType === 'BELOW' && Number(latestPrice.price) <= Number(alert.targetPrice));

      if (shouldTrigger) {
        // Update alert
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { lastTriggered: new Date() }
        });

        // TODO: Send notification (integrate with push-notification.service.ts)
        console.log(
          `Price alert triggered for user ${alert.userId}: ${alert.commodityType} ${alert.alertType} $${alert.targetPrice}`
        );
      }
    }
  }

  private mapPriceToResponse(price: any): MarketPrice {
    return {
      id: price.id,
      commodityType: price.commodityType as CommodityType,
      price: Number(price.price),
      priceDate: price.priceDate,
      source: price.source,
      marketType: price.marketType,
      contractMonth: price.contractMonth || undefined,
      createdAt: price.createdAt
    };
  }
}
