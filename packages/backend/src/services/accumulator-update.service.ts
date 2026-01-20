import { prisma } from '../prisma/client';
import { AccumulatorType } from '@prisma/client';
import { CommodityType } from '@business-app/shared';
import { MarketDataService } from './market-data.service';

const marketDataService = new MarketDataService();

/**
 * Service to handle daily accumulator updates
 *
 * Accumulator Types:
 * - EURO: On expiration, if price > double-up, entire contract doubles
 * - WEEKLY: If Friday close > double-up, that week's bushels double
 * - DAILY: Each day, if close > double-up, that day's bushels double
 */
export class AccumulatorUpdateService {

  /**
   * Process all active accumulators for daily updates
   * Should be run at end of each trading day (after market close)
   */
  async processAllAccumulators(): Promise<void> {
    console.log('[AccumulatorUpdate] Starting daily accumulator processing...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active accumulators that haven't been processed today
    const accumulators = await prisma.accumulatorDetails.findMany({
      where: {
        knockoutReached: false,
        contract: {
          isActive: true,
          deletedAt: null
        },
        OR: [
          { lastProcessedDate: null },
          { lastProcessedDate: { lt: today } }
        ]
      },
      include: {
        contract: {
          include: {
            grainEntity: true
          }
        }
      }
    });

    console.log(`[AccumulatorUpdate] Found ${accumulators.length} accumulators to process`);

    for (const accumulator of accumulators) {
      try {
        await this.processAccumulator(accumulator);
      } catch (error) {
        console.error(`[AccumulatorUpdate] Error processing accumulator ${accumulator.id}:`, error);
      }
    }

    console.log('[AccumulatorUpdate] Daily processing complete');
  }

  /**
   * Process a single accumulator for daily update
   */
  private async processAccumulator(accumulator: any): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const commodityType = accumulator.contract.commodityType as CommodityType;
    const accumulatorType = accumulator.accumulatorType as AccumulatorType;

    // Check if contract is still within its date range
    const startDate = new Date(accumulator.startDate);
    const endDate = accumulator.endDate ? new Date(accumulator.endDate) : null;

    if (today < startDate) {
      console.log(`[AccumulatorUpdate] Accumulator ${accumulator.id} hasn't started yet`);
      return;
    }

    if (endDate && today > endDate) {
      console.log(`[AccumulatorUpdate] Accumulator ${accumulator.id} has ended`);
      return;
    }

    // Get current futures price
    const futuresQuote = await marketDataService.getNearestFuturesQuote(commodityType);
    if (!futuresQuote) {
      console.log(`[AccumulatorUpdate] No futures quote available for ${commodityType}`);
      return;
    }

    const currentPrice = futuresQuote.closePrice;
    const knockoutPrice = Number(accumulator.knockoutPrice);
    const doubleUpPrice = Number(accumulator.doubleUpPrice);
    const dailyBushels = Number(accumulator.dailyBushels);
    const weeklyBushels = accumulator.weeklyBushels ? Number(accumulator.weeklyBushels) : dailyBushels * 5;

    // Check for knockout
    if (currentPrice <= knockoutPrice) {
      console.log(`[AccumulatorUpdate] Accumulator ${accumulator.id} KNOCKED OUT at ${currentPrice}`);
      await prisma.accumulatorDetails.update({
        where: { id: accumulator.id },
        data: {
          knockoutReached: true,
          knockoutDate: today,
          lastProcessedDate: today
        }
      });
      return;
    }

    // Determine if in double-up mode (price below double-up trigger)
    // Note: Double-up triggers when price DROPS BELOW the double-up level
    const isDoubledUp = currentPrice <= doubleUpPrice;

    // Calculate bushels to add based on accumulator type
    let bushelsToAdd = 0;
    let wasDoubled = false;

    switch (accumulatorType) {
      case 'DAILY':
        // Daily accumulator: Add bushels each trading day
        // Double if price is below double-up trigger
        bushelsToAdd = dailyBushels;
        if (isDoubledUp) {
          bushelsToAdd *= 2;
          wasDoubled = true;
        }
        break;

      case 'WEEKLY':
        // Weekly accumulator: Only process on Friday (day 5) or count trading days
        const dayOfWeek = today.getDay();
        if (dayOfWeek === 5) { // Friday
          bushelsToAdd = weeklyBushels;
          if (isDoubledUp) {
            bushelsToAdd *= 2;
            wasDoubled = true;
          }
        }
        break;

      case 'EURO':
        // Euro accumulator: Add bushels daily, but doubling only happens at expiration
        bushelsToAdd = dailyBushels;
        // We'll handle the euro double-up check separately at contract end
        break;

      default:
        // Default to daily behavior
        bushelsToAdd = dailyBushels;
        if (isDoubledUp) {
          bushelsToAdd *= 2;
          wasDoubled = true;
        }
    }

    // Only create entry and update if there are bushels to add
    if (bushelsToAdd > 0) {
      // Create daily entry
      await prisma.accumulatorDailyEntry.upsert({
        where: {
          accumulatorId_date: {
            accumulatorId: accumulator.id,
            date: today
          }
        },
        create: {
          accumulatorId: accumulator.id,
          date: today,
          bushelsMarketed: bushelsToAdd,
          marketPrice: currentPrice,
          wasDoubledUp: wasDoubled,
          notes: isDoubledUp ? 'Price below double-up trigger' : null
        },
        update: {
          bushelsMarketed: bushelsToAdd,
          marketPrice: currentPrice,
          wasDoubledUp: wasDoubled,
          notes: isDoubledUp ? 'Price below double-up trigger' : null
        }
      });

      // Update totals
      const newTotalMarketed = Number(accumulator.totalBushelsMarketed) + bushelsToAdd;
      const newTotalDoubled = wasDoubled
        ? Number(accumulator.totalDoubledBushels) + (bushelsToAdd / 2) // Original bushels that got doubled
        : Number(accumulator.totalDoubledBushels);

      await prisma.accumulatorDetails.update({
        where: { id: accumulator.id },
        data: {
          totalBushelsMarketed: newTotalMarketed,
          totalDoubledBushels: newTotalDoubled,
          isCurrentlyDoubled: isDoubledUp,
          lastProcessedDate: today
        }
      });

      console.log(`[AccumulatorUpdate] Processed ${accumulator.id}: +${bushelsToAdd} bu (doubled: ${wasDoubled}), total: ${newTotalMarketed} bu`);
    } else {
      // Just update the last processed date
      await prisma.accumulatorDetails.update({
        where: { id: accumulator.id },
        data: {
          isCurrentlyDoubled: isDoubledUp,
          lastProcessedDate: today
        }
      });
    }
  }

  /**
   * Process Euro accumulator at contract expiration
   * For Euro type: If price > double-up at expiration, ENTIRE contract doubles
   */
  async processEuroExpiration(accumulatorId: string): Promise<void> {
    const accumulator = await prisma.accumulatorDetails.findUnique({
      where: { id: accumulatorId },
      include: {
        contract: true
      }
    });

    if (!accumulator || accumulator.accumulatorType !== 'EURO') {
      return;
    }

    const commodityType = accumulator.contract.commodityType as CommodityType;
    const futuresQuote = await marketDataService.getNearestFuturesQuote(commodityType);

    if (!futuresQuote) {
      console.log(`[AccumulatorUpdate] No futures quote for Euro expiration check`);
      return;
    }

    const currentPrice = futuresQuote.closePrice;
    const doubleUpPrice = Number(accumulator.doubleUpPrice);

    // Euro double-up: If price is BELOW double-up at expiration, entire contract doubles
    if (currentPrice <= doubleUpPrice) {
      const currentTotal = Number(accumulator.totalBushelsMarketed);
      const newTotal = currentTotal * 2;

      await prisma.accumulatorDetails.update({
        where: { id: accumulatorId },
        data: {
          totalBushelsMarketed: newTotal,
          totalDoubledBushels: currentTotal, // Track that original amount was doubled
          isCurrentlyDoubled: true
        }
      });

      console.log(`[AccumulatorUpdate] Euro accumulator ${accumulatorId} DOUBLED at expiration: ${currentTotal} -> ${newTotal} bu`);
    }
  }

  /**
   * Get accumulator performance summary
   */
  async getAccumulatorPerformance(accumulatorId: string): Promise<any> {
    const accumulator = await prisma.accumulatorDetails.findUnique({
      where: { id: accumulatorId },
      include: {
        dailyEntries: {
          orderBy: { date: 'asc' }
        },
        contract: true
      }
    });

    if (!accumulator) {
      return null;
    }

    const entries = accumulator.dailyEntries;
    const totalDays = entries.length;
    const daysDoubled = entries.filter(e => e.wasDoubledUp).length;
    const totalBushels = Number(accumulator.totalBushelsMarketed);
    const totalDoubledBushels = Number(accumulator.totalDoubledBushels);

    // Calculate average daily rate and market price
    const totalMarketedFromEntries = entries.reduce((sum, e) => sum + Number(e.bushelsMarketed), 0);
    const averageDailyRate = totalDays > 0 ? totalMarketedFromEntries / totalDays : 0;
    const averageMarketPrice = entries.length > 0
      ? entries.reduce((sum, e) => sum + Number(e.marketPrice), 0) / entries.length
      : 0;

    return {
      accumulatorId,
      accumulatorType: accumulator.accumulatorType,
      totalDays,
      daysDoubled,
      doubleUpPercentage: totalDays > 0 ? (daysDoubled / totalDays) * 100 : 0,
      totalBushelsMarketed: totalBushels,
      totalDoubledBushels,
      averageDailyRate,
      averageMarketPrice,
      isCurrentlyDoubled: accumulator.isCurrentlyDoubled,
      knockoutReached: accumulator.knockoutReached,
      knockoutDate: accumulator.knockoutDate,
      startDate: accumulator.startDate,
      endDate: accumulator.endDate
    };
  }
}

export const accumulatorUpdateService = new AccumulatorUpdateService();
