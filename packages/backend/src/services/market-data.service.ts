import { prisma } from '../prisma/client';
import {
  CommodityType,
  FuturesQuote,
  BasisData,
  PriceTrendAnalysis
} from '@business-app/shared';

interface TwelveDataQuote {
  symbol: string;
  name: string;
  exchange: string;
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
}

interface TwelveDataBatchResponse {
  [symbol: string]: TwelveDataQuote | { status: string; message?: string };
}

// TwelveData commodity futures symbols
// Using continuous front-month contracts for efficiency
const COMMODITY_SYMBOLS: Record<CommodityType, string[]> = {
  // Corn futures - only track 2 nearest months to save calls
  CORN: ['ZC1!', 'ZC2!'],  // Front month and second month
  // Soybean futures - only track 2 nearest months
  SOYBEANS: ['ZS1!', 'ZS2!'],
  // Wheat disabled to save API calls (can enable if needed)
  WHEAT: []
};

// Contract month mapping
const CONTRACT_MONTHS = ['MAR', 'MAY', 'JUL', 'SEP', 'DEC'];

/**
 * MarketDataService - Optimized for TwelveData Free Tier (800 calls/day)
 *
 * Optimization Strategy:
 * - Use batch requests (up to 8 symbols per call)
 * - Only fetch CORN and SOYBEANS (4 symbols total = 1 batch call)
 * - Fetch every 30 minutes during market hours only
 * - ~48 calls/day during weekdays = ~240 calls/week
 * - Leaves ~500+ calls for on-demand requests
 */
export class MarketDataService {
  private twelveDataApiKey: string | undefined;
  private lastFetchTime: Map<string, Date> = new Map();
  private cachedQuotes: Map<string, FuturesQuote[]> = new Map();
  private readonly CACHE_DURATION_MS = 4 * 60 * 1000; // 4 min cache (fetches every 5 min)
  private readonly API_BASE = 'https://api.twelvedata.com';

  constructor() {
    this.twelveDataApiKey = process.env.TWELVEDATA_API_KEY;

    if (!this.twelveDataApiKey) {
      console.warn('⚠️  TWELVEDATA_API_KEY not set. Using mock data.');
    }
  }

  // ===== Futures Quote Methods =====

  /**
   * Fetch quotes for all tracked commodities in a single batch request
   * This is the most efficient way to use TwelveData's free tier
   */
  async fetchAllCommodityQuotes(): Promise<Map<CommodityType, FuturesQuote[]>> {
    const result = new Map<CommodityType, FuturesQuote[]>();

    // Build all symbols for batch request
    const allSymbols: { symbol: string; commodity: CommodityType }[] = [];

    for (const [commodity, symbols] of Object.entries(COMMODITY_SYMBOLS)) {
      if (symbols.length > 0) {
        for (const symbol of symbols) {
          allSymbols.push({ symbol, commodity: commodity as CommodityType });
        }
      }
    }

    if (allSymbols.length === 0) {
      return result;
    }

    // Single batch API call for all symbols
    const quotes = await this.fetchBatchQuotes(allSymbols.map(s => s.symbol));

    // Group quotes by commodity
    for (const item of allSymbols) {
      const quote = quotes.get(item.symbol);
      if (quote) {
        const existing = result.get(item.commodity) || [];
        existing.push(quote);
        result.set(item.commodity, existing);
      }
    }

    // Store in database
    for (const [commodity, commodityQuotes] of result) {
      for (const quote of commodityQuotes) {
        await this.storeQuote(quote);
      }
    }

    return result;
  }

  async fetchAndStoreFuturesQuotes(commodityType: CommodityType): Promise<FuturesQuote[]> {
    // Check cache first to avoid unnecessary API calls
    const cacheKey = `futures_${commodityType}`;
    const lastFetch = this.lastFetchTime.get(cacheKey);

    if (lastFetch && Date.now() - lastFetch.getTime() < this.CACHE_DURATION_MS) {
      const cached = this.cachedQuotes.get(cacheKey);
      if (cached && cached.length > 0) {
        return cached;
      }
    }

    const symbols = COMMODITY_SYMBOLS[commodityType];

    if (symbols.length === 0) {
      // Wheat is disabled, return from database only
      return this.getQuotesFromDatabase(commodityType);
    }

    const quotes = await this.fetchFromTwelveData(symbols, commodityType);

    // Update cache
    this.lastFetchTime.set(cacheKey, new Date());
    this.cachedQuotes.set(cacheKey, quotes);

    // Store quotes in database
    for (const quote of quotes) {
      await this.storeQuote(quote);
    }

    return quotes;
  }

  private async storeQuote(quote: FuturesQuote): Promise<void> {
    await prisma.futuresQuote.upsert({
      where: {
        commodityType_contractMonth_contractYear_quoteDate: {
          commodityType: quote.commodityType,
          contractMonth: quote.contractMonth,
          contractYear: quote.contractYear,
          quoteDate: quote.quoteDate
        }
      },
      update: {
        openPrice: quote.openPrice,
        highPrice: quote.highPrice,
        lowPrice: quote.lowPrice,
        closePrice: quote.closePrice,
        settlementPrice: quote.settlementPrice,
        volume: quote.volume,
        openInterest: quote.openInterest,
        priceChange: quote.priceChange
      },
      create: {
        commodityType: quote.commodityType,
        contractMonth: quote.contractMonth,
        contractYear: quote.contractYear,
        openPrice: quote.openPrice,
        highPrice: quote.highPrice,
        lowPrice: quote.lowPrice,
        closePrice: quote.closePrice,
        settlementPrice: quote.settlementPrice,
        volume: quote.volume,
        openInterest: quote.openInterest,
        priceChange: quote.priceChange,
        quoteDate: quote.quoteDate,
        source: 'TWELVEDATA'
      }
    });
  }

  private async getQuotesFromDatabase(commodityType: CommodityType): Promise<FuturesQuote[]> {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const quotes = await prisma.futuresQuote.findMany({
      where: {
        commodityType,
        quoteDate: { gte: oneDayAgo }
      },
      orderBy: { quoteDate: 'desc' },
      take: 4
    });

    return quotes.map(q => this.mapDbQuoteToFuturesQuote(q));
  }

  /**
   * Batch fetch multiple symbols in one API call
   * TwelveData allows up to 8 symbols per batch request
   */
  private async fetchBatchQuotes(symbols: string[]): Promise<Map<string, FuturesQuote>> {
    const result = new Map<string, FuturesQuote>();

    if (!this.twelveDataApiKey || symbols.length === 0) {
      return result;
    }

    try {
      // TwelveData batch quote endpoint
      const symbolList = symbols.join(',');
      const url = `${this.API_BASE}/quote?symbol=${symbolList}&apikey=${this.twelveDataApiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error('TwelveData API error:', response.status);
        return result;
      }

      const data = await response.json();

      // Handle single vs batch response format
      if (symbols.length === 1) {
        // Single symbol returns object directly
        const quote = this.parseTwelveDataQuote(data as TwelveDataQuote, symbols[0]);
        if (quote) {
          result.set(symbols[0], quote);
        }
      } else {
        // Multiple symbols returns object with symbol keys
        const batchData = data as TwelveDataBatchResponse;
        for (const symbol of symbols) {
          const quoteData = batchData[symbol];
          if (quoteData && !('status' in quoteData && quoteData.status === 'error')) {
            const quote = this.parseTwelveDataQuote(quoteData as TwelveDataQuote, symbol);
            if (quote) {
              result.set(symbol, quote);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching from TwelveData:', error);
    }

    return result;
  }

  private async fetchFromTwelveData(symbols: string[], commodityType: CommodityType): Promise<FuturesQuote[]> {
    if (!this.twelveDataApiKey) {
      return this.getMockFuturesQuotes(commodityType);
    }

    try {
      const batchQuotes = await this.fetchBatchQuotes(symbols);
      const quotes: FuturesQuote[] = [];

      for (const symbol of symbols) {
        const quote = batchQuotes.get(symbol);
        if (quote) {
          quote.commodityType = commodityType;
          quotes.push(quote);
        }
      }

      if (quotes.length === 0) {
        return this.getMockFuturesQuotes(commodityType);
      }

      return quotes;
    } catch (error) {
      console.error('Error fetching from TwelveData:', error);
      return this.getMockFuturesQuotes(commodityType);
    }
  }

  private parseTwelveDataQuote(quote: TwelveDataQuote, symbol: string): FuturesQuote | null {
    if (!quote || !quote.close) {
      return null;
    }

    // Determine commodity type and contract info from symbol
    const commodityType = this.getCommodityFromSymbol(symbol);
    const { contractMonth, contractYear } = this.getContractInfo(symbol);

    const closePrice = parseFloat(quote.close);
    const openPrice = parseFloat(quote.open) || closePrice;
    const highPrice = parseFloat(quote.high) || closePrice;
    const lowPrice = parseFloat(quote.low) || closePrice;
    const volume = parseInt(quote.volume) || 0;
    const priceChange = parseFloat(quote.change) || 0;

    return {
      id: '',
      commodityType,
      contractMonth,
      contractYear,
      openPrice,
      highPrice,
      lowPrice,
      closePrice,
      settlementPrice: closePrice,
      volume,
      openInterest: undefined,
      priceChange,
      quoteDate: new Date(),
      source: 'TWELVEDATA',
      createdAt: new Date()
    };
  }

  private getCommodityFromSymbol(symbol: string): CommodityType {
    if (symbol.startsWith('ZC')) return CommodityType.CORN;
    if (symbol.startsWith('ZS')) return CommodityType.SOYBEANS;
    if (symbol.startsWith('ZW')) return CommodityType.WHEAT;
    return CommodityType.CORN; // Default
  }

  private getContractInfo(symbol: string): { contractMonth: string; contractYear: number } {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // For continuous contracts like ZC1!, ZC2!
    if (symbol.includes('!')) {
      const contractNum = parseInt(symbol.match(/(\d)!/)?.[1] || '1');
      const nearestMonth = this.getNearestContractMonth(currentMonth);
      const monthIndex = CONTRACT_MONTHS.indexOf(nearestMonth);

      // Calculate actual contract month based on offset
      let targetMonthIndex = (monthIndex + contractNum - 1) % CONTRACT_MONTHS.length;
      let yearOffset = Math.floor((monthIndex + contractNum - 1) / CONTRACT_MONTHS.length);

      const contractMonth = CONTRACT_MONTHS[targetMonthIndex];
      const contractYear = currentYear + yearOffset;

      return {
        contractMonth: `${contractMonth}${String(contractYear).slice(-2)}`,
        contractYear
      };
    }

    // For specific contracts like ZCH25
    const monthCode = symbol.slice(-3, -2);
    const yearCode = symbol.slice(-2);
    const contractMonth = this.getMonthFromCode(monthCode) + yearCode;
    const contractYear = 2000 + parseInt(yearCode);

    return { contractMonth, contractYear };
  }

  private getMonthCode(month: string): string {
    const codes: Record<string, string> = {
      'MAR': 'H', 'MAY': 'K', 'JUL': 'N', 'SEP': 'U', 'DEC': 'Z'
    };
    return codes[month] || 'Z';
  }

  private getMonthFromCode(code: string): string {
    const months: Record<string, string> = {
      'H': 'MAR', 'K': 'MAY', 'N': 'JUL', 'U': 'SEP', 'Z': 'DEC'
    };
    return months[code] || 'DEC';
  }

  private getMockFuturesQuotes(commodityType: CommodityType): FuturesQuote[] {
    const basePrices: Record<CommodityType, number> = {
      CORN: 4.50,
      SOYBEANS: 12.00,
      WHEAT: 6.00
    };

    const basePrice = basePrices[commodityType];
    const currentYear = new Date().getFullYear();
    const quotes: FuturesQuote[] = [];

    for (let i = 0; i < 2; i++) {
      const monthIndex = i % CONTRACT_MONTHS.length;
      const yearOffset = Math.floor(i / CONTRACT_MONTHS.length);
      const year = currentYear + yearOffset;
      const month = CONTRACT_MONTHS[monthIndex];

      const variation = (Math.random() - 0.5) * 0.50;
      const carryCharge = i * 0.05;
      const price = basePrice + variation + carryCharge;

      quotes.push({
        id: '',
        commodityType,
        contractMonth: `${month}${String(year).slice(-2)}`,
        contractYear: year,
        openPrice: price - 0.02,
        highPrice: price + 0.08,
        lowPrice: price - 0.06,
        closePrice: price,
        settlementPrice: price,
        volume: Math.floor(Math.random() * 50000) + 10000,
        openInterest: Math.floor(Math.random() * 200000) + 100000,
        priceChange: (Math.random() - 0.5) * 0.10,
        quoteDate: new Date(),
        source: 'MOCK',
        createdAt: new Date()
      });
    }

    return quotes;
  }

  // ===== Price Retrieval Methods =====

  async getLatestFuturesPrice(commodityType: CommodityType, contractMonth?: string): Promise<number | null> {
    const where: any = { commodityType };

    if (contractMonth) {
      where.contractMonth = contractMonth;
    }

    const quote = await prisma.futuresQuote.findFirst({
      where,
      orderBy: [
        { quoteDate: 'desc' },
        { contractMonth: 'asc' }
      ]
    });

    return quote ? Number(quote.closePrice) : null;
  }

  async getNearestFuturesQuote(commodityType: CommodityType): Promise<FuturesQuote | null> {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const nearestMonth = this.getNearestContractMonth(currentMonth);
    const contractYear = nearestMonth === 'MAR' && currentMonth > 2 ? currentYear + 1 : currentYear;
    const contractMonth = `${nearestMonth}${String(contractYear).slice(-2)}`;

    const quote = await prisma.futuresQuote.findFirst({
      where: {
        commodityType,
        contractMonth
      },
      orderBy: { quoteDate: 'desc' }
    });

    if (quote) {
      return this.mapDbQuoteToFuturesQuote(quote);
    }

    // Fallback: get most recent quote for this commodity
    const fallbackQuote = await prisma.futuresQuote.findFirst({
      where: { commodityType },
      orderBy: { quoteDate: 'desc' }
    });

    if (fallbackQuote) {
      return this.mapDbQuoteToFuturesQuote(fallbackQuote);
    }

    return null;
  }

  private mapDbQuoteToFuturesQuote(q: any): FuturesQuote {
    return {
      id: q.id,
      commodityType: q.commodityType as CommodityType,
      contractMonth: q.contractMonth,
      contractYear: q.contractYear,
      openPrice: q.openPrice ? Number(q.openPrice) : undefined,
      highPrice: q.highPrice ? Number(q.highPrice) : undefined,
      lowPrice: q.lowPrice ? Number(q.lowPrice) : undefined,
      closePrice: Number(q.closePrice),
      settlementPrice: q.settlementPrice ? Number(q.settlementPrice) : undefined,
      volume: q.volume || undefined,
      openInterest: q.openInterest || undefined,
      priceChange: q.priceChange ? Number(q.priceChange) : undefined,
      quoteDate: q.quoteDate,
      source: q.source,
      createdAt: q.createdAt
    };
  }

  private getNearestContractMonth(currentMonth: number): string {
    const contractMonths = [
      { month: 2, name: 'MAR' },
      { month: 4, name: 'MAY' },
      { month: 6, name: 'JUL' },
      { month: 8, name: 'SEP' },
      { month: 11, name: 'DEC' }
    ];

    for (const cm of contractMonths) {
      if (cm.month > currentMonth) {
        return cm.name;
      }
    }

    return 'MAR';
  }

  async getHistoricalFutures(
    commodityType: CommodityType,
    days: number = 30
  ): Promise<FuturesQuote[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const quotes = await prisma.futuresQuote.findMany({
      where: {
        commodityType,
        quoteDate: { gte: startDate }
      },
      orderBy: { quoteDate: 'asc' }
    });

    return quotes.map(q => this.mapDbQuoteToFuturesQuote(q));
  }

  // ===== Basis Data Methods =====

  async fetchAndStoreBasisData(commodityType: CommodityType): Promise<BasisData[]> {
    // For basis data, we'll use mock data since TwelveData doesn't provide local cash prices
    // In production, you'd integrate with a basis data provider like DTN or AgMarket.Net
    const basisData = this.getMockBasisData(commodityType);

    for (const basis of basisData) {
      await prisma.basisData.create({
        data: {
          commodityType: basis.commodityType,
          location: basis.location,
          latitude: basis.latitude,
          longitude: basis.longitude,
          cashPrice: basis.cashPrice,
          futuresMonth: basis.futuresMonth,
          futuresPrice: basis.futuresPrice,
          basis: basis.basis,
          priceDate: basis.priceDate,
          source: basis.source
        }
      });
    }

    return basisData;
  }

  private getMockBasisData(commodityType: CommodityType): BasisData[] {
    const basePrices: Record<CommodityType, number> = {
      CORN: 4.50,
      SOYBEANS: 12.00,
      WHEAT: 6.00
    };

    const locations = [
      { name: 'ADM Decatur', lat: 39.8403, lon: -88.9548 },
      { name: 'Cargill Blair', lat: 41.5447, lon: -96.1283 },
      { name: 'Bunge Channahon', lat: 41.4300, lon: -88.2285 }
    ];

    const futuresPrice = basePrices[commodityType];
    const currentYear = new Date().getFullYear();
    const nearestMonth = this.getNearestContractMonth(new Date().getMonth());
    const futuresMonth = `${nearestMonth}${String(currentYear).slice(-2)}`;

    return locations.map(loc => {
      const basisVariation = (Math.random() - 0.5) * 0.30 - 0.10;
      const cashPrice = futuresPrice + basisVariation;

      return {
        id: '',
        commodityType,
        location: loc.name,
        latitude: loc.lat,
        longitude: loc.lon,
        cashPrice,
        futuresMonth,
        futuresPrice,
        basis: basisVariation,
        priceDate: new Date(),
        source: 'MOCK',
        createdAt: new Date()
      };
    });
  }

  async getBasisHistory(
    commodityType: CommodityType,
    location?: string,
    days: number = 30
  ): Promise<BasisData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const where: any = {
      commodityType,
      priceDate: { gte: startDate }
    };

    if (location) {
      where.location = location;
    }

    const basisRecords = await prisma.basisData.findMany({
      where,
      orderBy: { priceDate: 'asc' }
    });

    return basisRecords.map(b => ({
      id: b.id,
      commodityType: b.commodityType as CommodityType,
      location: b.location,
      latitude: b.latitude ? Number(b.latitude) : undefined,
      longitude: b.longitude ? Number(b.longitude) : undefined,
      cashPrice: Number(b.cashPrice),
      futuresMonth: b.futuresMonth,
      futuresPrice: Number(b.futuresPrice),
      basis: Number(b.basis),
      priceDate: b.priceDate,
      source: b.source,
      createdAt: b.createdAt
    }));
  }

  async getAverageBasis(commodityType: CommodityType, days: number = 30): Promise<number> {
    const basisHistory = await this.getBasisHistory(commodityType, undefined, days);

    if (basisHistory.length === 0) {
      return -0.15;
    }

    const sum = basisHistory.reduce((acc, b) => acc + b.basis, 0);
    return sum / basisHistory.length;
  }

  async getBasisPercentile(commodityType: CommodityType, currentBasis: number): Promise<number> {
    const basisHistory = await this.getBasisHistory(commodityType, undefined, 365);

    if (basisHistory.length === 0) {
      return 50;
    }

    const sortedBasis = basisHistory.map(b => b.basis).sort((a, b) => a - b);
    const belowCount = sortedBasis.filter(b => b < currentBasis).length;

    return (belowCount / sortedBasis.length) * 100;
  }

  // ===== Price Calculations =====

  calculateCashPrice(futuresPrice: number, basis: number): number {
    return futuresPrice + basis;
  }

  calculateBasis(cashPrice: number, futuresPrice: number): number {
    return cashPrice - futuresPrice;
  }

  // ===== Trend Analysis =====

  async analyzePriceTrend(commodityType: CommodityType): Promise<PriceTrendAnalysis> {
    const quotes = await this.getHistoricalFutures(commodityType, 60);

    if (quotes.length < 20) {
      return this.getDefaultTrendAnalysis();
    }

    const prices = quotes.map(q => q.closePrice);

    const ma20 = this.calculateMovingAverage(prices, 20);
    const ma50 = this.calculateMovingAverage(prices, Math.min(50, prices.length));
    const rsi = this.calculateRSI(prices, 14);
    const volatility = this.calculateVolatility(prices, 20);

    const currentPrice = prices[prices.length - 1];
    const trend = this.determineTrend(currentPrice, ma20, ma50);
    const strength = this.calculateTrendStrength(currentPrice, ma20, ma50, rsi);

    return {
      trend,
      strength,
      movingAverage20: ma20,
      movingAverage50: ma50,
      rsi,
      volatility,
      recentHigh: Math.max(...prices.slice(-20)),
      recentLow: Math.min(...prices.slice(-20))
    };
  }

  private getDefaultTrendAnalysis(): PriceTrendAnalysis {
    return {
      trend: 'NEUTRAL',
      strength: 50,
      movingAverage20: 0,
      movingAverage50: 0,
      rsi: 50,
      volatility: 0.02,
      recentHigh: 0,
      recentLow: 0
    };
  }

  calculateMovingAverage(prices: number[], period: number): number {
    if (prices.length < period) {
      return prices.reduce((a, b) => a + b, 0) / prices.length;
    }

    const relevantPrices = prices.slice(-period);
    return relevantPrices.reduce((a, b) => a + b, 0) / period;
  }

  calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) {
      return 50;
    }

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateVolatility(prices: number[], period: number): number {
    const relevantPrices = prices.slice(-period);
    const mean = relevantPrices.reduce((a, b) => a + b, 0) / relevantPrices.length;

    const squaredDiffs = relevantPrices.map(p => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / relevantPrices.length;

    return Math.sqrt(variance) / mean;
  }

  private determineTrend(
    currentPrice: number,
    ma20: number,
    ma50: number
  ): 'UP' | 'DOWN' | 'NEUTRAL' {
    if (currentPrice > ma20 && ma20 > ma50) {
      return 'UP';
    } else if (currentPrice < ma20 && ma20 < ma50) {
      return 'DOWN';
    }
    return 'NEUTRAL';
  }

  private calculateTrendStrength(
    currentPrice: number,
    ma20: number,
    ma50: number,
    rsi: number
  ): number {
    let strength = 50;

    const priceMa20Diff = (currentPrice - ma20) / ma20;
    strength += priceMa20Diff * 100;

    const maDiff = (ma20 - ma50) / ma50;
    strength += maDiff * 50;

    if (rsi > 70) {
      strength += 10;
    } else if (rsi < 30) {
      strength -= 10;
    }

    return Math.max(0, Math.min(100, strength));
  }

  // ===== Harvest Contract Methods =====

  /**
   * Get harvest contract symbols for a given crop year
   * Corn: December contract (Z) - main harvest contract
   * Soybeans: November contract (X) - main harvest contract
   */
  getHarvestContractSymbols(harvestYear: number): { corn: string; soybeans: string } {
    const yearCode = String(harvestYear).slice(-2);
    return {
      corn: `ZCZ${yearCode}`,      // December corn (e.g., ZCZ26 for 2026)
      soybeans: `ZSX${yearCode}`   // November soybeans (e.g., ZSX26 for 2026)
    };
  }

  /**
   * Fetch harvest contract quotes for a specific crop year
   * Returns December corn and November soybeans for the given year
   */
  async fetchHarvestContractQuotes(harvestYear: number): Promise<{
    corn: FuturesQuote | null;
    soybeans: FuturesQuote | null;
    source: 'live' | 'mock';
  }> {
    const symbols = this.getHarvestContractSymbols(harvestYear);
    const yearCode = String(harvestYear).slice(-2);

    if (!this.twelveDataApiKey) {
      // Return mock data for harvest contracts
      return {
        corn: this.getMockHarvestQuote(CommodityType.CORN, harvestYear),
        soybeans: this.getMockHarvestQuote(CommodityType.SOYBEANS, harvestYear),
        source: 'mock'
      };
    }

    try {
      // Batch fetch both harvest contracts
      const batchQuotes = await this.fetchBatchQuotes([symbols.corn, symbols.soybeans]);

      let cornQuote = batchQuotes.get(symbols.corn) || null;
      let soyQuote = batchQuotes.get(symbols.soybeans) || null;

      // Set proper commodity type and contract info
      if (cornQuote) {
        cornQuote.commodityType = CommodityType.CORN;
        cornQuote.contractMonth = `DEC${yearCode}`;
        cornQuote.contractYear = harvestYear;
        await this.storeQuote(cornQuote);
      }

      if (soyQuote) {
        soyQuote.commodityType = CommodityType.SOYBEANS;
        soyQuote.contractMonth = `NOV${yearCode}`;
        soyQuote.contractYear = harvestYear;
        await this.storeQuote(soyQuote);
      }

      // Fallback to mock if API returned no data
      return {
        corn: cornQuote || this.getMockHarvestQuote(CommodityType.CORN, harvestYear),
        soybeans: soyQuote || this.getMockHarvestQuote(CommodityType.SOYBEANS, harvestYear),
        source: cornQuote || soyQuote ? 'live' : 'mock'
      };
    } catch (error) {
      console.error('Error fetching harvest contracts:', error);
      return {
        corn: this.getMockHarvestQuote(CommodityType.CORN, harvestYear),
        soybeans: this.getMockHarvestQuote(CommodityType.SOYBEANS, harvestYear),
        source: 'mock'
      };
    }
  }

  /**
   * Get harvest contract quote from database (if previously fetched)
   */
  async getStoredHarvestQuote(
    commodityType: CommodityType,
    harvestYear: number
  ): Promise<FuturesQuote | null> {
    const yearCode = String(harvestYear).slice(-2);
    const contractMonth = commodityType === CommodityType.CORN
      ? `DEC${yearCode}`
      : `NOV${yearCode}`;

    const quote = await prisma.futuresQuote.findFirst({
      where: {
        commodityType,
        contractMonth,
        contractYear: harvestYear
      },
      orderBy: { quoteDate: 'desc' }
    });

    return quote ? this.mapDbQuoteToFuturesQuote(quote) : null;
  }

  private getMockHarvestQuote(commodityType: CommodityType, harvestYear: number): FuturesQuote {
    const basePrices: Record<CommodityType, number> = {
      CORN: 4.50,
      SOYBEANS: 10.50,
      WHEAT: 5.80
    };

    const yearCode = String(harvestYear).slice(-2);
    const contractMonth = commodityType === CommodityType.CORN
      ? `DEC${yearCode}`
      : commodityType === CommodityType.SOYBEANS
        ? `NOV${yearCode}`
        : `DEC${yearCode}`;

    const basePrice = basePrices[commodityType];
    // Add some variation
    const variation = (Math.random() - 0.5) * 0.30;
    const price = basePrice + variation;

    return {
      id: '',
      commodityType,
      contractMonth,
      contractYear: harvestYear,
      openPrice: price - 0.02,
      highPrice: price + 0.08,
      lowPrice: price - 0.06,
      closePrice: price,
      settlementPrice: price,
      volume: Math.floor(Math.random() * 50000) + 10000,
      openInterest: Math.floor(Math.random() * 200000) + 100000,
      priceChange: (Math.random() - 0.5) * 0.10,
      quoteDate: new Date(),
      source: 'MOCK',
      createdAt: new Date()
    };
  }

  // ===== Market Hours Check =====

  isMarketOpen(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getUTCHours();

    // CME grain futures trade Sunday 7pm CT - Friday 1:20pm CT
    if (day === 6) return false;
    if (day === 0 && hour < 1) return false;
    if (day === 5 && hour >= 20) return false;

    return true;
  }

  // ===== API Usage Tracking =====

  /**
   * Get estimated daily API calls used
   * Helps monitor free tier usage
   */
  getEstimatedDailyUsage(): { used: number; remaining: number; limit: number } {
    // With current settings:
    // - 1 batch call every 5 min = ~216 calls/day (during market hours ~18hrs)
    // - Plus on-demand calls from user actions
    const estimatedScheduledCalls = 216;
    const limit = 800;

    return {
      used: estimatedScheduledCalls,
      remaining: limit - estimatedScheduledCalls,
      limit
    };
  }
}
