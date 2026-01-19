import { USDADataService } from './usda-data.service';
import { FundamentalDataService } from './fundamental-data.service';
import { NewsSentimentService } from './news-sentiment.service';
import { prisma } from '../prisma/client';
import { CommodityType } from '@business-app/shared';

/**
 * Fundamental Data Job Service
 *
 * Manages scheduled updates for fundamental market data:
 * - WASDE data (monthly, around 10th-12th)
 * - Crop progress (weekly Mondays, during growing season)
 * - Export sales (weekly Thursdays)
 * - Market news sentiment (hourly)
 */

interface JobConfig {
  enabled: boolean;
  intervalMs: number;
}

interface JobStatus {
  lastRun: Date | null;
  lastSuccess: boolean;
  nextRun: Date | null;
  errorCount: number;
  lastError?: string;
}

export class FundamentalJobService {
  private usdaService: USDADataService;
  private fundamentalService: FundamentalDataService;
  private newsService: NewsSentimentService;

  private jobStatus: Record<string, JobStatus> = {};
  private intervals: Record<string, NodeJS.Timeout> = {};

  // Default job configurations
  private config: Record<string, JobConfig> = {
    wasde: {
      enabled: true,
      intervalMs: 24 * 60 * 60 * 1000 // Check daily (actual update is monthly)
    },
    cropProgress: {
      enabled: true,
      intervalMs: 6 * 60 * 60 * 1000 // Check every 6 hours (weekly updates)
    },
    exportSales: {
      enabled: true,
      intervalMs: 6 * 60 * 60 * 1000 // Check every 6 hours (weekly updates)
    },
    reportSchedule: {
      enabled: true,
      intervalMs: 24 * 60 * 60 * 1000 // Daily
    }
  };

  constructor() {
    this.usdaService = new USDADataService();
    this.fundamentalService = new FundamentalDataService();
    this.newsService = new NewsSentimentService();

    // Initialize job status
    for (const jobName of Object.keys(this.config)) {
      this.jobStatus[jobName] = {
        lastRun: null,
        lastSuccess: false,
        nextRun: null,
        errorCount: 0
      };
    }
  }

  // ===== Start/Stop All Jobs =====

  startAllJobs(): void {
    console.log('🚀 Starting fundamental data jobs...');

    for (const [jobName, config] of Object.entries(this.config)) {
      if (config.enabled) {
        this.startJob(jobName);
      }
    }

    console.log('✅ All fundamental data jobs started');
  }

  stopAllJobs(): void {
    console.log('⏹️ Stopping fundamental data jobs...');

    for (const jobName of Object.keys(this.intervals)) {
      this.stopJob(jobName);
    }

    console.log('✅ All jobs stopped');
  }

  // ===== Individual Job Management =====

  private startJob(jobName: string): void {
    const config = this.config[jobName];
    if (!config) return;

    // Run immediately on start
    this.runJob(jobName);

    // Schedule recurring runs
    this.intervals[jobName] = setInterval(() => {
      this.runJob(jobName);
    }, config.intervalMs);

    console.log(`  - Started ${jobName} job (interval: ${this.formatInterval(config.intervalMs)})`);
  }

  private stopJob(jobName: string): void {
    if (this.intervals[jobName]) {
      clearInterval(this.intervals[jobName]);
      delete this.intervals[jobName];
    }
  }

  private async runJob(jobName: string): Promise<void> {
    const status = this.jobStatus[jobName];
    status.lastRun = new Date();

    try {
      switch (jobName) {
        case 'wasde':
          await this.runWASDEJob();
          break;
        case 'cropProgress':
          await this.runCropProgressJob();
          break;
        case 'exportSales':
          await this.runExportSalesJob();
          break;
        case 'reportSchedule':
          await this.runReportScheduleJob();
          break;
      }

      status.lastSuccess = true;
      status.errorCount = 0;
      status.lastError = undefined;
    } catch (error: any) {
      status.lastSuccess = false;
      status.errorCount++;
      status.lastError = error.message;
      console.error(`❌ ${jobName} job failed:`, error.message);
    }

    status.nextRun = new Date(Date.now() + this.config[jobName].intervalMs);
  }

  // ===== WASDE Job =====

  private async runWASDEJob(): Promise<void> {
    // Check if we're near a WASDE release date (10th-12th of month)
    const now = new Date();
    const dayOfMonth = now.getDate();

    // Only actively check around release dates
    if (dayOfMonth >= 8 && dayOfMonth <= 14) {
      console.log('📊 Checking for new WASDE data...');

      const commodities = [CommodityType.CORN, CommodityType.SOYBEANS, CommodityType.WHEAT];
      const marketingYear = this.getCurrentMarketingYear();

      for (const commodity of commodities) {
        await this.usdaService.fetchWASDE(commodity, marketingYear);
      }
    }
  }

  // ===== Crop Progress Job =====

  private async runCropProgressJob(): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;

    // Crop progress is only relevant during growing season (April - November)
    if (month < 4 || month > 11) {
      return;
    }

    // Check if it's Monday (crop progress released Monday afternoon)
    const isMonday = now.getDay() === 1;
    const hour = now.getHours();

    if (isMonday && hour >= 16) {
      console.log('🌱 Checking for new crop progress data...');

      const year = now.getFullYear();
      await this.usdaService.fetchCropProgress(CommodityType.CORN, year);
      await this.usdaService.fetchCropProgress(CommodityType.SOYBEANS, year);

      // Wheat during spring
      if (month >= 4 && month <= 7) {
        await this.usdaService.fetchCropProgress(CommodityType.WHEAT, year);
      }
    }
  }

  // ===== Export Sales Job =====

  private async runExportSalesJob(): Promise<void> {
    const now = new Date();

    // Export sales released Thursday at 8:30 AM ET
    const isThursday = now.getDay() === 4;
    const hour = now.getHours();

    if (isThursday && hour >= 9) {
      console.log('🚢 Checking for new export sales data...');
      // In production, this would fetch from USDA FAS API
      // For now, we log that we would check
    }
  }

  // ===== Report Schedule Job =====

  private async runReportScheduleJob(): Promise<void> {
    console.log('📅 Updating USDA report schedule...');
    await this.usdaService.updateReportSchedule();
  }

  // ===== Get Upcoming Reports (for notifications) =====

  async getUpcomingReports(days: number = 7): Promise<{
    reportType: string;
    reportName: string;
    releaseDate: Date;
    commodities: CommodityType[];
    importance: string;
    daysUntil: number;
  }[]> {
    const reports = await this.fundamentalService.getUpcomingReports(days);

    return reports.map(r => ({
      ...r,
      daysUntil: Math.ceil((r.releaseDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    }));
  }

  // ===== Check for Market-Moving Conditions =====

  async checkForAlerts(): Promise<{
    type: 'REPORT_TOMORROW' | 'STOCKS_TIGHT' | 'EXPORT_PACE_CHANGE' | 'CONDITION_DROP';
    commodity: CommodityType;
    message: string;
    importance: 'HIGH' | 'MEDIUM';
  }[]> {
    const alerts: {
      type: 'REPORT_TOMORROW' | 'STOCKS_TIGHT' | 'EXPORT_PACE_CHANGE' | 'CONDITION_DROP';
      commodity: CommodityType;
      message: string;
      importance: 'HIGH' | 'MEDIUM';
    }[] = [];

    // Check for reports tomorrow
    const upcomingReports = await this.getUpcomingReports(2);
    for (const report of upcomingReports) {
      if (report.daysUntil <= 1 && report.importance === 'HIGH') {
        for (const commodity of report.commodities) {
          alerts.push({
            type: 'REPORT_TOMORROW',
            commodity,
            message: `${report.reportName} releases tomorrow at ${report.releaseDate.toLocaleTimeString()}. Markets may be volatile.`,
            importance: 'HIGH'
          });
        }
      }
    }

    // Check for tight stocks situations
    const commodities = [CommodityType.CORN, CommodityType.SOYBEANS, CommodityType.WHEAT];
    for (const commodity of commodities) {
      const context = await this.fundamentalService.getFundamentalContext(commodity);

      if (context.supplyDemand) {
        const su = context.supplyDemand.stocksToUseRatio;

        // Tight stocks thresholds
        const tightThreshold = commodity === CommodityType.CORN ? 0.10
          : commodity === CommodityType.SOYBEANS ? 0.06
          : 0.25;

        if (su < tightThreshold) {
          alerts.push({
            type: 'STOCKS_TIGHT',
            commodity,
            message: `${commodity} stocks-to-use at ${(su * 100).toFixed(1)}% - historically tight. Prices have upside potential.`,
            importance: 'HIGH'
          });
        }
      }

      // Check for significant export pace changes
      if (context.exportPace) {
        if (Math.abs(context.exportPace.paceVsUSDA) > 0.10) {
          const direction = context.exportPace.paceVsUSDA > 0 ? 'ahead of' : 'behind';
          alerts.push({
            type: 'EXPORT_PACE_CHANGE',
            commodity,
            message: `${commodity} exports significantly ${direction} USDA pace (${(context.exportPace.paceVsUSDA * 100).toFixed(0)}%). Watch for WASDE adjustments.`,
            importance: 'MEDIUM'
          });
        }
      }

      // Check for significant crop condition changes (during growing season)
      if (context.cropConditions) {
        if (context.cropConditions.conditionTrend === 'DECLINING' && context.cropConditions.goodExcellentPct < 55) {
          alerts.push({
            type: 'CONDITION_DROP',
            commodity,
            message: `${commodity} crop conditions declining. Good/Excellent at ${context.cropConditions.goodExcellentPct.toFixed(0)}%. Yield at risk.`,
            importance: 'HIGH'
          });
        }
      }
    }

    return alerts;
  }

  // ===== Status Methods =====

  getJobStatus(): Record<string, JobStatus> {
    return { ...this.jobStatus };
  }

  // ===== Helper Methods =====

  private getCurrentMarketingYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Corn/Soybeans MY starts September
    if (month >= 9) {
      return `${year}/${(year + 1).toString().slice(-2)}`;
    }
    return `${year - 1}/${year.toString().slice(-2)}`;
  }

  private formatInterval(ms: number): string {
    const hours = ms / (60 * 60 * 1000);
    if (hours >= 24) {
      return `${hours / 24} day(s)`;
    }
    return `${hours} hour(s)`;
  }
}

// Singleton instance for server use
let jobServiceInstance: FundamentalJobService | null = null;

export function getFundamentalJobService(): FundamentalJobService {
  if (!jobServiceInstance) {
    jobServiceInstance = new FundamentalJobService();
  }
  return jobServiceInstance;
}
