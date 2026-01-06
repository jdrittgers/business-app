import { MarketPriceService } from './market-price.service';

export class GrainPriceJobService {
  private marketPriceService: MarketPriceService;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.marketPriceService = new MarketPriceService();
  }

  // Start price fetching job (run every hour)
  start() {
    if (this.intervalId) {
      console.log('⚠️  Grain price job already running');
      return;
    }

    // Run immediately on start
    this.runJob();

    // Then run every hour (3600000 ms)
    const intervalMs = parseInt(process.env.MARKET_PRICE_FETCH_INTERVAL || '3600000');
    this.intervalId = setInterval(() => {
      this.runJob();
    }, intervalMs);

    console.log(`✅ Grain price job started - running every ${intervalMs / 1000 / 60} minutes`);
  }

  // Stop the job
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Grain price job stopped');
    }
  }

  // Execute the job
  private async runJob() {
    try {
      console.log(`[${new Date().toISOString()}] 📊 Running grain price job...`);

      // Fetch live prices
      await this.marketPriceService.fetchLivePrices();

      // Check price alerts
      await this.marketPriceService.checkPriceAlerts();

      console.log(`[${new Date().toISOString()}] ✅ Price job completed successfully`);
    } catch (error) {
      console.error('❌ Error running price job:', error);
    }
  }
}
