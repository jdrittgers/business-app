import { CommodityType } from './grain';

// ===== Enums =====

export enum MarketingSignalType {
  CASH_SALE = 'CASH_SALE',
  BASIS_CONTRACT = 'BASIS_CONTRACT',
  HTA_RECOMMENDATION = 'HTA_RECOMMENDATION',
  ACCUMULATOR_STRATEGY = 'ACCUMULATOR_STRATEGY',
  PUT_OPTION = 'PUT_OPTION',
  CALL_OPTION = 'CALL_OPTION',
  COLLAR_STRATEGY = 'COLLAR_STRATEGY'
}

export enum SignalStrength {
  STRONG_BUY = 'STRONG_BUY',
  BUY = 'BUY',
  HOLD = 'HOLD',
  SELL = 'SELL',
  STRONG_SELL = 'STRONG_SELL'
}

export enum SignalStatus {
  ACTIVE = 'ACTIVE',
  TRIGGERED = 'TRIGGERED',
  EXPIRED = 'EXPIRED',
  DISMISSED = 'DISMISSED'
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  IN_APP = 'IN_APP'
}

export enum RiskTolerance {
  CONSERVATIVE = 'CONSERVATIVE',
  MODERATE = 'MODERATE',
  AGGRESSIVE = 'AGGRESSIVE'
}

// ===== Marketing Signal =====

export interface MarketingSignal {
  id: string;
  businessId: string;
  grainEntityId?: string;
  signalType: MarketingSignalType;
  commodityType: CommodityType;
  strength: SignalStrength;
  status: SignalStatus;
  currentPrice: number;
  breakEvenPrice: number;
  targetPrice?: number;
  priceAboveBreakeven: number;
  percentAboveBreakeven: number;
  title: string;
  summary: string;
  rationale?: string;
  aiAnalysis?: string;
  aiAnalyzedAt?: Date;
  marketContext?: MarketContext;
  recommendedBushels?: number;
  recommendedAction?: string;
  expiresAt?: Date;
  viewedAt?: Date;
  actionTaken?: string;
  actionTakenAt?: Date;
  dismissedAt?: Date;
  dismissReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketContext {
  futuresPrice?: number;
  futuresMonth?: string;
  futuresTrend?: 'UP' | 'DOWN' | 'NEUTRAL';
  basisLevel?: number;
  basisVsHistorical?: 'STRONG' | 'AVERAGE' | 'WEAK';
  basisPercentile?: number;
  rsiValue?: number;
  movingAverage20?: number;
  movingAverage50?: number;
  volatility?: number;
  seasonalPattern?: string;
}

// ===== Marketing Preferences =====

export interface MarketingPreferences {
  id: string;
  businessId: string;
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  enableInAppNotifications: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  cornEnabled: boolean;
  soybeansEnabled: boolean;
  wheatEnabled: boolean;
  cashSaleSignals: boolean;
  basisContractSignals: boolean;
  htaSignals: boolean;
  accumulatorSignals: boolean;
  optionsSignals: boolean;
  riskTolerance: RiskTolerance;
  targetProfitMargin: number;
  minAboveBreakeven: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateMarketingPreferencesRequest {
  enablePushNotifications?: boolean;
  enableEmailNotifications?: boolean;
  enableInAppNotifications?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  cornEnabled?: boolean;
  soybeansEnabled?: boolean;
  wheatEnabled?: boolean;
  cashSaleSignals?: boolean;
  basisContractSignals?: boolean;
  htaSignals?: boolean;
  accumulatorSignals?: boolean;
  optionsSignals?: boolean;
  riskTolerance?: RiskTolerance;
  targetProfitMargin?: number;
  minAboveBreakeven?: number;
}

// ===== Signal Notification =====

export interface SignalNotification {
  id: string;
  signalId: string;
  userId: string;
  channel: NotificationChannel;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

// ===== Futures Quote =====

export interface FuturesQuote {
  id: string;
  commodityType: CommodityType;
  contractMonth: string;
  contractYear: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  closePrice: number;
  settlementPrice?: number;
  volume?: number;
  openInterest?: number;
  priceChange?: number;
  quoteDate: Date;
  source: string;
  createdAt: Date;
}

// ===== Basis Data =====

export interface BasisData {
  id: string;
  commodityType: CommodityType;
  location: string;
  latitude?: number;
  longitude?: number;
  cashPrice: number;
  futuresMonth: string;
  futuresPrice: number;
  basis: number;
  priceDate: Date;
  source: string;
  createdAt: Date;
}

// ===== Options Position =====

export interface OptionsPosition {
  id: string;
  businessId: string;
  grainEntityId?: string;
  commodityType: CommodityType;
  optionType: 'PUT' | 'CALL';
  strikePrice: number;
  futuresMonth: string;
  expirationDate: Date;
  contracts: number;
  bushelsPerContract: number;
  premium: number;
  totalCost: number;
  currentValue?: number;
  lastPriceUpdate?: Date;
  isOpen: boolean;
  closedAt?: Date;
  closedPrice?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOptionsPositionRequest {
  grainEntityId?: string;
  commodityType: CommodityType;
  optionType: 'PUT' | 'CALL';
  strikePrice: number;
  futuresMonth: string;
  expirationDate: string;
  contracts: number;
  bushelsPerContract?: number;
  premium: number;
  notes?: string;
}

export interface UpdateOptionsPositionRequest {
  currentValue?: number;
  isOpen?: boolean;
  closedAt?: string;
  closedPrice?: number;
  notes?: string;
}

// ===== AI Analysis =====

export interface AIAnalysisLog {
  id: string;
  businessId: string;
  analysisType: AIAnalysisType;
  prompt: string;
  response: string;
  modelUsed: string;
  tokensUsed: number;
  latencyMs: number;
  successful: boolean;
  errorMessage?: string;
  createdAt: Date;
}

export type AIAnalysisType = 'SIGNAL_EXPLANATION' | 'STRATEGY_RECOMMENDATION' | 'MARKET_OUTLOOK';

// ===== Strategy Recommendation =====

export interface StrategyRecommendation {
  summary: string;
  recommendations: StrategyRecommendationItem[];
  riskAssessment: string;
  timelineNotes: string;
  generatedAt: Date;
}

export interface StrategyRecommendationItem {
  action: string;
  commodityType: CommodityType;
  bushels: number;
  toolType: MarketingSignalType;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
}

// ===== Market Outlook =====

export interface MarketOutlook {
  commodityType: CommodityType;
  shortTermOutlook: string;
  mediumTermOutlook: string;
  keyFactors: string[];
  priceTargets: {
    support: number;
    resistance: number;
    fairValue: number;
  };
  technicalIndicators: {
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    rsi: number;
    movingAverages: {
      ma20: number;
      ma50: number;
      ma200: number;
    };
  };
  generatedAt: Date;
}

// ===== Request/Response Types =====

export interface GetSignalsQuery {
  status?: SignalStatus;
  signalType?: MarketingSignalType;
  commodityType?: CommodityType;
  grainEntityId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface DismissSignalRequest {
  reason?: string;
}

export interface RecordSignalActionRequest {
  action: string;
}

export interface RequestAIAnalysisRequest {
  analysisType: AIAnalysisType;
  signalId?: string;
  commodityType?: CommodityType;
}

// ===== Price Trend Analysis =====

export interface PriceTrendAnalysis {
  trend: 'UP' | 'DOWN' | 'NEUTRAL';
  strength: number; // 0-100
  movingAverage20: number;
  movingAverage50: number;
  rsi: number;
  volatility: number;
  recentHigh: number;
  recentLow: number;
}

// ===== Accumulator Analysis =====

export interface AccumulatorAnalysis {
  contractId: string;
  health: 'EXCELLENT' | 'GOOD' | 'AT_RISK' | 'CRITICAL';
  knockoutRisk: number; // Percentage 0-100
  daysUntilKnockout?: number;
  averageAccumulatedPrice: number;
  targetVsActual: number; // Difference in $/bushel
  recommendedAction: string;
  doubleUpOpportunity: boolean;
  explanation: string;
}

// ===== Signal Generation Context =====

export interface SignalGenerationContext {
  businessId: string;
  breakEvens: {
    commodityType: CommodityType;
    breakEvenPrice: number;
    totalBushels: number;
    soldBushels: number;
    remainingBushels: number;
  }[];
  marketData: {
    commodityType: CommodityType;
    currentFuturesPrice: number;
    currentBasis: number;
    currentCashPrice: number;
  }[];
  preferences: MarketingPreferences;
  existingContracts: {
    id: string;
    commodityType: CommodityType;
    contractType: string;
    bushels: number;
  }[];
}

// ===== Notification Payload =====

export interface SignalNotificationPayload {
  signalId: string;
  title: string;
  body: string;
  strength: SignalStrength;
  commodityType: CommodityType;
  priceAboveBreakeven: number;
  url?: string;
}
