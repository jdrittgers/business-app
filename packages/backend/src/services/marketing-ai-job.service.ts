import { prisma } from '../prisma/client';
import { MarketDataService } from './market-data.service';
import { SignalGenerationService } from './signal-generation.service';
import { SignalNotificationService } from './signal-notification.service';
import { AIAnalysisService } from './ai-analysis.service';
import { CommodityType } from '@business-app/shared';

interface JobInterval {
  name: string;
  interval: number;
  handler: () => Promise<void>;
  lastRun?: Date;
  timer?: NodeJS.Timeout;
}

export class MarketingAIJobService {
  private marketDataService: MarketDataService;
  private signalService: SignalGenerationService;
  private notificationService: SignalNotificationService;
  private aiService: AIAnalysisService;

  private jobs: JobInterval[] = [];
  private isRunning: boolean = false;

  // Default intervals - optimized for TwelveData free tier (800 calls/day)
  // With 5 min interval during ~18 market hours = ~216 calls/day
  // Still leaves ~580+ calls for on-demand requests
  private readonly MARKET_DATA_INTERVAL = parseInt(process.env.MARKETING_AI_MARKET_DATA_INTERVAL || '300000'); // 5 min
  private readonly SIGNAL_GENERATION_INTERVAL = parseInt(process.env.MARKETING_AI_SIGNAL_INTERVAL || '1800000'); // 30 min
  private readonly AI_ENRICHMENT_INTERVAL = parseInt(process.env.MARKETING_AI_AI_ENRICHMENT_INTERVAL || '3600000'); // 1 hour
  private readonly EXPIRATION_CHECK_INTERVAL = 3600000; // 1 hour

  constructor() {
    this.marketDataService = new MarketDataService();
    this.signalService = new SignalGenerationService();
    this.notificationService = new SignalNotificationService();
    this.aiService = new AIAnalysisService();

    // Initialize job definitions
    this.jobs = [
      {
        name: 'market-data-fetch',
        interval: this.MARKET_DATA_INTERVAL,
        handler: this.runMarketDataFetch.bind(this)
      },
      {
        name: 'signal-generation',
        interval: this.SIGNAL_GENERATION_INTERVAL,
        handler: this.runSignalGeneration.bind(this)
      },
      {
        name: 'ai-enrichment',
        interval: this.AI_ENRICHMENT_INTERVAL,
        handler: this.runAIEnrichment.bind(this)
      },
      {
        name: 'expiration-check',
        interval: this.EXPIRATION_CHECK_INTERVAL,
        handler: this.runExpirationCheck.bind(this)
      }
    ];
  }

  // ===== Lifecycle Methods =====

  start(): void {
    if (this.isRunning) {
      console.log('Marketing AI Job Service is already running');
      return;
    }

    console.log('Starting Marketing AI Job Service...');
    this.isRunning = true;

    // Start each job
    for (const job of this.jobs) {
      this.scheduleJob(job);
    }

    // Schedule daily digest at 6 AM
    this.scheduleDailyDigest();

    // Schedule weekly report on Monday at 7 AM
    this.scheduleWeeklyReport();

    // Run initial market data fetch
    this.runMarketDataFetch().catch(err => {
      console.error('Initial market data fetch failed:', err);
    });

    console.log('Marketing AI Job Service started');
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('Marketing AI Job Service is not running');
      return;
    }

    console.log('Stopping Marketing AI Job Service...');
    this.isRunning = false;

    // Clear all job timers
    for (const job of this.jobs) {
      if (job.timer) {
        clearInterval(job.timer);
        job.timer = undefined;
      }
    }

    console.log('Marketing AI Job Service stopped');
  }

  private scheduleJob(job: JobInterval): void {
    console.log(`Scheduling job '${job.name}' with interval ${job.interval}ms`);

    job.timer = setInterval(async () => {
      // Only run during market hours for market-related jobs
      if (job.name === 'market-data-fetch' || job.name === 'signal-generation') {
        if (!this.marketDataService.isMarketOpen()) {
          console.log(`Skipping job '${job.name}' - market is closed`);
          return;
        }
      }

      try {
        console.log(`Running job '${job.name}'...`);
        await job.handler();
        job.lastRun = new Date();
        console.log(`Job '${job.name}' completed`);
      } catch (error) {
        console.error(`Job '${job.name}' failed:`, error);
      }
    }, job.interval);
  }

  // ===== Job Handlers =====

  async runMarketDataFetch(): Promise<void> {
    // Use batch fetching to minimize API calls (optimized for TwelveData free tier)
    // This fetches CORN and SOYBEANS in a single batch request
    try {
      const results = await this.marketDataService.fetchAllCommodityQuotes();

      for (const [commodity, quotes] of results) {
        console.log(`Fetched ${quotes.length} quotes for ${commodity}`);
      }

      // Log API usage estimate
      const usage = this.marketDataService.getEstimatedDailyUsage();
      console.log(`TwelveData API usage: ~${usage.used}/${usage.limit} calls/day estimated`);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  }

  async runSignalGeneration(): Promise<void> {
    // Get all active businesses with marketing preferences
    const businesses = await prisma.business.findMany({
      where: {
        deletedAt: null,
        marketingPreferences: {
          isNot: null
        }
      },
      include: {
        marketingPreferences: true
      }
    });

    console.log(`Generating signals for ${businesses.length} businesses...`);

    for (const business of businesses) {
      try {
        const signals = await this.signalService.generateSignalsForBusiness(business.id);
        console.log(`Generated ${signals.length} signals for business ${business.name}`);

        // Notify new signals
        const newSignals = signals.filter(s => {
          const createdAt = new Date(s.createdAt);
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          return createdAt > oneHourAgo;
        });

        if (newSignals.length > 0) {
          await this.notificationService.notifyMultipleSignals(newSignals);
        }
      } catch (error) {
        console.error(`Failed to generate signals for business ${business.id}:`, error);
      }
    }
  }

  async runAIEnrichment(): Promise<void> {
    // Get signals without AI analysis from the last 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const signals = await prisma.marketingSignal.findMany({
      where: {
        status: 'ACTIVE',
        aiAnalysis: null,
        createdAt: { gte: cutoff }
      },
      take: 20, // Limit to avoid too many API calls
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Enriching ${signals.length} signals with AI analysis...`);

    for (const signal of signals) {
      try {
        const mappedSignal = {
          id: signal.id,
          businessId: signal.businessId,
          grainEntityId: signal.grainEntityId || undefined,
          signalType: signal.signalType as any,
          commodityType: signal.commodityType as any,
          strength: signal.strength as any,
          status: signal.status as any,
          currentPrice: Number(signal.currentPrice),
          breakEvenPrice: Number(signal.breakEvenPrice),
          targetPrice: signal.targetPrice ? Number(signal.targetPrice) : undefined,
          priceAboveBreakeven: Number(signal.priceAboveBreakeven),
          percentAboveBreakeven: Number(signal.percentAboveBreakeven),
          title: signal.title,
          summary: signal.summary,
          rationale: signal.rationale || undefined,
          aiAnalysis: signal.aiAnalysis || undefined,
          marketContext: signal.marketContext as any,
          recommendedAction: signal.recommendedAction || undefined,
          recommendedBushels: signal.recommendedBushels ? Number(signal.recommendedBushels) : undefined,
          createdAt: signal.createdAt,
          updatedAt: signal.updatedAt
        };

        await this.aiService.generateSignalExplanation(mappedSignal);
        console.log(`Enriched signal ${signal.id} with AI analysis`);

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to enrich signal ${signal.id}:`, error);
      }
    }
  }

  async runExpirationCheck(): Promise<void> {
    const expiredCount = await this.signalService.expireOldSignals();
    if (expiredCount > 0) {
      console.log(`Expired ${expiredCount} old signals`);
    }
  }

  // ===== Scheduled Reports =====

  private scheduleDailyDigest(): void {
    const runDigest = async () => {
      const hour = new Date().getHours();
      const targetHour = parseInt(process.env.MARKETING_AI_DIGEST_HOUR || '6');

      if (hour !== targetHour) return;

      console.log('Running daily digest...');

      const businesses = await prisma.business.findMany({
        where: {
          deletedAt: null,
          marketingPreferences: {
            enableEmailNotifications: true
          }
        }
      });

      for (const business of businesses) {
        try {
          await this.notificationService.sendDailyDigest(business.id);
        } catch (error) {
          console.error(`Failed to send digest for business ${business.id}:`, error);
        }
      }
    };

    // Check every hour if it's time for the daily digest
    setInterval(runDigest, 60 * 60 * 1000);
  }

  private scheduleWeeklyReport(): void {
    const runWeekly = async () => {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();

      // Monday at 7 AM
      if (day !== 1 || hour !== 7) return;

      console.log('Running weekly report...');

      // Implementation for weekly report would go here
      // This could include:
      // - Summary of all signals from the past week
      // - Performance metrics (signals acted upon vs ignored)
      // - Market trends summary
    };

    // Check every hour
    setInterval(runWeekly, 60 * 60 * 1000);
  }

  // ===== Manual Triggers =====

  async triggerMarketDataFetch(): Promise<void> {
    console.log('Manual trigger: market data fetch');
    await this.runMarketDataFetch();
  }

  async triggerSignalGeneration(businessId?: string): Promise<void> {
    console.log('Manual trigger: signal generation');

    if (businessId) {
      const signals = await this.signalService.generateSignalsForBusiness(businessId);
      console.log(`Generated ${signals.length} signals for business ${businessId}`);
      await this.notificationService.notifyMultipleSignals(signals);
    } else {
      await this.runSignalGeneration();
    }
  }

  async triggerAIEnrichment(): Promise<void> {
    console.log('Manual trigger: AI enrichment');
    await this.runAIEnrichment();
  }

  // ===== Status =====

  getStatus(): { isRunning: boolean; jobs: { name: string; lastRun?: Date }[] } {
    return {
      isRunning: this.isRunning,
      jobs: this.jobs.map(job => ({
        name: job.name,
        lastRun: job.lastRun
      }))
    };
  }
}

// Singleton instance
let jobServiceInstance: MarketingAIJobService | null = null;

export function getMarketingAIJobService(): MarketingAIJobService {
  if (!jobServiceInstance) {
    jobServiceInstance = new MarketingAIJobService();
  }
  return jobServiceInstance;
}

export function startMarketingAIJobs(): void {
  const service = getMarketingAIJobService();
  service.start();
}

export function stopMarketingAIJobs(): void {
  const service = getMarketingAIJobService();
  service.stop();
}
