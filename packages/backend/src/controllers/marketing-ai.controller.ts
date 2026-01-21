import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { SignalGenerationService } from '../services/signal-generation.service';
import { AIAnalysisService } from '../services/ai-analysis.service';
import { MarketDataService } from '../services/market-data.service';
import { SignalNotificationService } from '../services/signal-notification.service';
import { BreakEvenAnalyticsService } from '../services/breakeven-analytics.service';
import { MarketingLearningService } from '../services/marketing-learning.service';
import {
  SignalStatus,
  MarketingSignalType,
  CommodityType,
  RiskTolerance,
  UpdateMarketingPreferencesRequest,
  RecordDecisionRequest,
  RecordInteractionRequest
} from '@business-app/shared';

const signalService = new SignalGenerationService();
const aiService = new AIAnalysisService();
const marketDataService = new MarketDataService();
const notificationService = new SignalNotificationService();
const breakEvenService = new BreakEvenAnalyticsService();
const learningService = new MarketingLearningService();

export class MarketingAIController {
  // ===== Signals =====

  async getSignals(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const { status, signalType, commodityType, limit, offset } = req.query;

      const signals = await signalService.getSignalsForBusiness(businessId, {
        status: status as SignalStatus,
        signalType: signalType as MarketingSignalType,
        commodityType: commodityType as CommodityType,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      });

      res.json(signals);
    } catch (error) {
      console.error('Get signals error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSignal(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { signalId } = req.params;

      const signal = await signalService.getSignalById(signalId);

      if (!signal) {
        res.status(404).json({ error: 'Signal not found' });
        return;
      }

      // Mark as viewed
      await signalService.markSignalViewed(signalId);

      res.json(signal);
    } catch (error) {
      console.error('Get signal error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async dismissSignal(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { signalId } = req.params;
      const { reason } = req.body;

      const signal = await signalService.dismissSignal(signalId, reason);

      res.json(signal);
    } catch (error) {
      console.error('Dismiss signal error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async recordAction(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { signalId } = req.params;
      const { action } = req.body;

      if (!action) {
        res.status(400).json({ error: 'Action is required' });
        return;
      }

      const signal = await signalService.recordSignalAction(signalId, action);

      res.json(signal);
    } catch (error) {
      console.error('Record action error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async generateSignals(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;

      const signals = await signalService.generateSignalsForBusiness(businessId);

      // Notify about new signals
      await notificationService.notifyMultipleSignals(signals);

      res.json(signals);
    } catch (error) {
      console.error('Generate signals error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ===== Preferences =====

  async getPreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;

      let preferences = await prisma.marketingPreferences.findUnique({
        where: { businessId }
      });

      if (!preferences) {
        // Create default preferences
        preferences = await prisma.marketingPreferences.create({
          data: { businessId }
        });
      }

      res.json({
        id: preferences.id,
        businessId: preferences.businessId,
        enablePushNotifications: preferences.enablePushNotifications,
        enableEmailNotifications: preferences.enableEmailNotifications,
        enableInAppNotifications: preferences.enableInAppNotifications,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        cornEnabled: preferences.cornEnabled,
        soybeansEnabled: preferences.soybeansEnabled,
        wheatEnabled: preferences.wheatEnabled,
        cashSaleSignals: preferences.cashSaleSignals,
        basisContractSignals: preferences.basisContractSignals,
        htaSignals: preferences.htaSignals,
        accumulatorSignals: preferences.accumulatorSignals,
        optionsSignals: preferences.optionsSignals,
        riskTolerance: preferences.riskTolerance,
        targetProfitMargin: Number(preferences.targetProfitMargin),
        minAboveBreakeven: Number(preferences.minAboveBreakeven),
        createdAt: preferences.createdAt,
        updatedAt: preferences.updatedAt
      });
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updatePreferences(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const data: UpdateMarketingPreferencesRequest = req.body;

      const preferences = await prisma.marketingPreferences.upsert({
        where: { businessId },
        update: {
          enablePushNotifications: data.enablePushNotifications,
          enableEmailNotifications: data.enableEmailNotifications,
          enableInAppNotifications: data.enableInAppNotifications,
          quietHoursStart: data.quietHoursStart,
          quietHoursEnd: data.quietHoursEnd,
          cornEnabled: data.cornEnabled,
          soybeansEnabled: data.soybeansEnabled,
          wheatEnabled: data.wheatEnabled,
          cashSaleSignals: data.cashSaleSignals,
          basisContractSignals: data.basisContractSignals,
          htaSignals: data.htaSignals,
          accumulatorSignals: data.accumulatorSignals,
          optionsSignals: data.optionsSignals,
          riskTolerance: data.riskTolerance as RiskTolerance,
          targetProfitMargin: data.targetProfitMargin,
          minAboveBreakeven: data.minAboveBreakeven
        },
        create: {
          businessId,
          enablePushNotifications: data.enablePushNotifications ?? true,
          enableEmailNotifications: data.enableEmailNotifications ?? true,
          enableInAppNotifications: data.enableInAppNotifications ?? true,
          quietHoursStart: data.quietHoursStart,
          quietHoursEnd: data.quietHoursEnd,
          cornEnabled: data.cornEnabled ?? true,
          soybeansEnabled: data.soybeansEnabled ?? true,
          wheatEnabled: data.wheatEnabled ?? true,
          cashSaleSignals: data.cashSaleSignals ?? true,
          basisContractSignals: data.basisContractSignals ?? true,
          htaSignals: data.htaSignals ?? true,
          accumulatorSignals: data.accumulatorSignals ?? true,
          optionsSignals: data.optionsSignals ?? false,
          riskTolerance: (data.riskTolerance as RiskTolerance) ?? 'MODERATE',
          targetProfitMargin: data.targetProfitMargin ?? 0.50,
          minAboveBreakeven: data.minAboveBreakeven ?? 0.05
        }
      });

      res.json({
        id: preferences.id,
        businessId: preferences.businessId,
        enablePushNotifications: preferences.enablePushNotifications,
        enableEmailNotifications: preferences.enableEmailNotifications,
        enableInAppNotifications: preferences.enableInAppNotifications,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        cornEnabled: preferences.cornEnabled,
        soybeansEnabled: preferences.soybeansEnabled,
        wheatEnabled: preferences.wheatEnabled,
        cashSaleSignals: preferences.cashSaleSignals,
        basisContractSignals: preferences.basisContractSignals,
        htaSignals: preferences.htaSignals,
        accumulatorSignals: preferences.accumulatorSignals,
        optionsSignals: preferences.optionsSignals,
        riskTolerance: preferences.riskTolerance,
        targetProfitMargin: Number(preferences.targetProfitMargin),
        minAboveBreakeven: Number(preferences.minAboveBreakeven),
        createdAt: preferences.createdAt,
        updatedAt: preferences.updatedAt
      });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ===== AI Analysis =====

  async requestAnalysis(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const { analysisType, signalId, commodityType } = req.body;

      if (analysisType === 'SIGNAL_EXPLANATION' && signalId) {
        const signal = await signalService.getSignalById(signalId);
        if (!signal) {
          res.status(404).json({ error: 'Signal not found' });
          return;
        }

        const analysis = await aiService.generateSignalExplanation(signal);
        res.json({ analysis });
      } else if (analysisType === 'MARKET_OUTLOOK' && commodityType) {
        const outlook = await aiService.generateMarketOutlook(commodityType as CommodityType);
        res.json(outlook);
      } else {
        res.status(400).json({ error: 'Invalid analysis request' });
      }
    } catch (error) {
      console.error('Request analysis error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getStrategyRecommendation(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const currentYear = new Date().getFullYear();

      // Get break-even data
      const breakEvens = await breakEvenService.getOperationBreakEven(businessId, { year: currentYear });

      // Get current positions (contracts)
      const contracts = await prisma.grainContract.findMany({
        where: {
          grainEntity: { businessId },
          isActive: true,
          year: currentYear
        }
      });

      // Get preferences
      const preferences = await prisma.marketingPreferences.findUnique({
        where: { businessId }
      });

      const breakEvenSummaries = breakEvens.byCommodity.map(c => ({
        commodityType: c.commodityType as CommodityType,
        breakEvenPrice: c.breakEvenPrice,
        totalBushels: c.expectedBushels,
        soldBushels: 0, // Would need to calculate from contracts
        remainingBushels: c.expectedBushels
      }));

      const positionSummaries = contracts.map(c => ({
        contractType: c.contractType,
        commodityType: c.commodityType as CommodityType,
        bushels: Number(c.totalBushels),
        price: c.cashPrice ? Number(c.cashPrice) : undefined
      }));

      const recommendation = await aiService.generateStrategyRecommendation(
        businessId,
        breakEvenSummaries,
        positionSummaries,
        preferences?.riskTolerance || 'MODERATE'
      );

      res.json(recommendation);
    } catch (error) {
      console.error('Get strategy recommendation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMarketOutlook(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { commodityType } = req.params;

      if (!['CORN', 'SOYBEANS', 'WHEAT'].includes(commodityType)) {
        res.status(400).json({ error: 'Invalid commodity type' });
        return;
      }

      const outlook = await aiService.generateMarketOutlook(commodityType as CommodityType);

      res.json(outlook);
    } catch (error) {
      console.error('Get market outlook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ===== Market Data =====

  async getFuturesQuotes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { commodityType } = req.params;

      if (!['CORN', 'SOYBEANS', 'WHEAT'].includes(commodityType)) {
        res.status(400).json({ error: 'Invalid commodity type' });
        return;
      }

      const quotes = await marketDataService.getHistoricalFutures(
        commodityType as CommodityType,
        30
      );

      res.json(quotes);
    } catch (error) {
      console.error('Get futures quotes error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getBasisData(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { commodityType } = req.params;
      const { location } = req.query;

      if (!['CORN', 'SOYBEANS', 'WHEAT'].includes(commodityType)) {
        res.status(400).json({ error: 'Invalid commodity type' });
        return;
      }

      const basisData = await marketDataService.getBasisHistory(
        commodityType as CommodityType,
        location as string,
        30
      );

      res.json(basisData);
    } catch (error) {
      console.error('Get basis data error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPriceTrend(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { commodityType } = req.params;

      if (!['CORN', 'SOYBEANS', 'WHEAT'].includes(commodityType)) {
        res.status(400).json({ error: 'Invalid commodity type' });
        return;
      }

      const trend = await marketDataService.analyzePriceTrend(commodityType as CommodityType);

      res.json(trend);
    } catch (error) {
      console.error('Get price trend error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getHarvestContracts(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { year } = req.params;
      const harvestYear = parseInt(year);

      if (isNaN(harvestYear) || harvestYear < 2020 || harvestYear > 2030) {
        res.status(400).json({ error: 'Invalid harvest year' });
        return;
      }

      const result = await marketDataService.fetchHarvestContractQuotes(harvestYear);

      res.json({
        harvestYear,
        corn: result.corn ? {
          contractMonth: result.corn.contractMonth,
          closePrice: result.corn.closePrice,
          priceChange: result.corn.priceChange,
          quoteDate: result.corn.quoteDate,
          source: result.corn.source
        } : null,
        soybeans: result.soybeans ? {
          contractMonth: result.soybeans.contractMonth,
          closePrice: result.soybeans.closePrice,
          priceChange: result.soybeans.priceChange,
          quoteDate: result.soybeans.quoteDate,
          source: result.soybeans.source
        } : null,
        source: result.source
      });
    } catch (error) {
      console.error('Get harvest contracts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ===== Options Positions =====

  async getOptionsPositions(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;

      const positions = await prisma.optionsPosition.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' }
      });

      res.json(positions.map(p => ({
        id: p.id,
        businessId: p.businessId,
        grainEntityId: p.grainEntityId,
        commodityType: p.commodityType,
        optionType: p.optionType,
        strikePrice: Number(p.strikePrice),
        futuresMonth: p.futuresMonth,
        expirationDate: p.expirationDate,
        contracts: p.contracts,
        bushelsPerContract: p.bushelsPerContract,
        premium: Number(p.premium),
        totalCost: Number(p.totalCost),
        currentValue: p.currentValue ? Number(p.currentValue) : undefined,
        lastPriceUpdate: p.lastPriceUpdate,
        isOpen: p.isOpen,
        closedAt: p.closedAt,
        closedPrice: p.closedPrice ? Number(p.closedPrice) : undefined,
        notes: p.notes,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      })));
    } catch (error) {
      console.error('Get options positions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createOptionsPosition(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const data = req.body;

      const bushelsPerContract = data.bushelsPerContract || 5000;
      const totalCost = data.premium * data.contracts * bushelsPerContract;

      const position = await prisma.optionsPosition.create({
        data: {
          businessId,
          grainEntityId: data.grainEntityId,
          commodityType: data.commodityType,
          optionType: data.optionType,
          strikePrice: data.strikePrice,
          futuresMonth: data.futuresMonth,
          expirationDate: new Date(data.expirationDate),
          contracts: data.contracts,
          bushelsPerContract,
          premium: data.premium,
          totalCost,
          notes: data.notes
        }
      });

      res.status(201).json({
        id: position.id,
        businessId: position.businessId,
        commodityType: position.commodityType,
        optionType: position.optionType,
        strikePrice: Number(position.strikePrice),
        futuresMonth: position.futuresMonth,
        expirationDate: position.expirationDate,
        contracts: position.contracts,
        bushelsPerContract: position.bushelsPerContract,
        premium: Number(position.premium),
        totalCost: Number(position.totalCost),
        isOpen: position.isOpen,
        createdAt: position.createdAt
      });
    } catch (error) {
      console.error('Create options position error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateOptionsPosition(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { positionId } = req.params;
      const data = req.body;

      const updateData: any = {};

      if (data.currentValue !== undefined) {
        updateData.currentValue = data.currentValue;
        updateData.lastPriceUpdate = new Date();
      }

      if (data.isOpen === false) {
        updateData.isOpen = false;
        updateData.closedAt = new Date();
        if (data.closedPrice !== undefined) {
          updateData.closedPrice = data.closedPrice;
        }
      }

      if (data.notes !== undefined) {
        updateData.notes = data.notes;
      }

      const position = await prisma.optionsPosition.update({
        where: { id: positionId },
        data: updateData
      });

      res.json({
        id: position.id,
        businessId: position.businessId,
        commodityType: position.commodityType,
        optionType: position.optionType,
        strikePrice: Number(position.strikePrice),
        isOpen: position.isOpen,
        closedAt: position.closedAt,
        closedPrice: position.closedPrice ? Number(position.closedPrice) : undefined,
        updatedAt: position.updatedAt
      });
    } catch (error) {
      console.error('Update options position error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteOptionsPosition(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { positionId } = req.params;

      await prisma.optionsPosition.delete({
        where: { id: positionId }
      });

      res.status(204).send();
    } catch (error) {
      console.error('Delete options position error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ===== Learning & Personalization =====

  async getLearningProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const profile = await learningService.getOrCreateProfile(req.user.userId);
      res.json(profile);
    } catch (error) {
      console.error('Get learning profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getLearningInsights(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const insights = await learningService.getLearningInsights(req.user.userId);
      res.json(insights);
    } catch (error) {
      console.error('Get learning insights error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async recordSignalInteraction(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const request: RecordInteractionRequest = req.body;

      if (!request.signalId || !request.interactionType) {
        res.status(400).json({ error: 'signalId and interactionType are required' });
        return;
      }

      const interaction = await learningService.recordSignalInteraction(req.user.userId, request);
      res.json(interaction);
    } catch (error) {
      console.error('Record signal interaction error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async recordMarketingDecision(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const request: RecordDecisionRequest = req.body;

      if (!request.commodityType || !request.contractType || !request.bushels || !request.pricePerBushel) {
        res.status(400).json({ error: 'commodityType, contractType, bushels, and pricePerBushel are required' });
        return;
      }

      const decision = await learningService.recordMarketingDecision(req.user.userId, businessId, request);
      res.json(decision);
    } catch (error) {
      console.error('Record marketing decision error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getMarketingHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const { limit, offset } = req.query;

      const profile = await learningService.getProfile(req.user.userId);

      if (!profile) {
        res.json([]);
        return;
      }

      const decisions = await prisma.marketingDecision.findMany({
        where: {
          profileId: profile.id,
          businessId
        },
        orderBy: { decisionDate: 'desc' },
        take: limit ? parseInt(limit as string) : 50,
        skip: offset ? parseInt(offset as string) : 0
      });

      res.json(decisions);
    } catch (error) {
      console.error('Get marketing history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getSignalInteractionHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { limit, offset } = req.query;

      const profile = await learningService.getProfile(req.user.userId);

      if (!profile) {
        res.json([]);
        return;
      }

      const interactions = await prisma.signalInteraction.findMany({
        where: { profileId: profile.id },
        orderBy: { interactionAt: 'desc' },
        take: limit ? parseInt(limit as string) : 50,
        skip: offset ? parseInt(offset as string) : 0,
        include: {
          signal: {
            select: {
              title: true,
              summary: true,
              commodityType: true,
              signalType: true
            }
          }
        }
      });

      res.json(interactions);
    } catch (error) {
      console.error('Get signal interaction history error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Generate signals with personalized thresholds
  async generatePersonalizedSignals(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;

      // Generate signals with user's personalized thresholds
      const signals = await signalService.generateSignalsForBusiness(businessId, req.user.userId);

      // Notify about new signals
      if (signals.length > 0) {
        await notificationService.notifyMultipleSignals(signals);
      }

      res.json(signals);
    } catch (error) {
      console.error('Generate personalized signals error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
