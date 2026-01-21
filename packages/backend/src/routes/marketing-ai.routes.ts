import { Router } from 'express';
import { MarketingAIController } from '../controllers/marketing-ai.controller';
import { authenticate } from '../middleware/auth';
import { requireBusinessAccess } from '../middleware/business-access';

const router = Router();
const controller = new MarketingAIController();

// All routes require authentication
router.use(authenticate);

// ===== Signals =====

// Get all signals for a business
router.get(
  '/businesses/:businessId/marketing-ai/signals',
  requireBusinessAccess,
  (req, res) => controller.getSignals(req, res)
);

// Generate signals manually
router.post(
  '/businesses/:businessId/marketing-ai/signals/generate',
  requireBusinessAccess,
  (req, res) => controller.generateSignals(req, res)
);

// Get a specific signal
router.get(
  '/businesses/:businessId/marketing-ai/signals/:signalId',
  requireBusinessAccess,
  (req, res) => controller.getSignal(req, res)
);

// Dismiss a signal
router.post(
  '/businesses/:businessId/marketing-ai/signals/:signalId/dismiss',
  requireBusinessAccess,
  (req, res) => controller.dismissSignal(req, res)
);

// Record action taken on a signal
router.post(
  '/businesses/:businessId/marketing-ai/signals/:signalId/action',
  requireBusinessAccess,
  (req, res) => controller.recordAction(req, res)
);

// ===== Preferences =====

// Get marketing preferences
router.get(
  '/businesses/:businessId/marketing-ai/preferences',
  requireBusinessAccess,
  (req, res) => controller.getPreferences(req, res)
);

// Update marketing preferences
router.put(
  '/businesses/:businessId/marketing-ai/preferences',
  requireBusinessAccess,
  (req, res) => controller.updatePreferences(req, res)
);

// ===== AI Analysis =====

// Request AI analysis
router.post(
  '/businesses/:businessId/marketing-ai/analyze',
  requireBusinessAccess,
  (req, res) => controller.requestAnalysis(req, res)
);

// Get strategy recommendation
router.get(
  '/businesses/:businessId/marketing-ai/strategy-recommendation',
  requireBusinessAccess,
  (req, res) => controller.getStrategyRecommendation(req, res)
);

// Get market outlook for a commodity
router.get(
  '/businesses/:businessId/marketing-ai/market-outlook/:commodityType',
  requireBusinessAccess,
  (req, res) => controller.getMarketOutlook(req, res)
);

// ===== Market Data =====

// Get futures quotes for a commodity
router.get(
  '/market-data/futures/:commodityType',
  (req, res) => controller.getFuturesQuotes(req, res)
);

// Get basis data for a commodity
router.get(
  '/market-data/basis/:commodityType',
  (req, res) => controller.getBasisData(req, res)
);

// Get price trend analysis for a commodity
router.get(
  '/market-data/trend/:commodityType',
  (req, res) => controller.getPriceTrend(req, res)
);

// Get harvest contract prices for a specific crop year (Dec corn, Nov soybeans)
router.get(
  '/market-data/harvest/:year',
  (req, res) => controller.getHarvestContracts(req, res)
);

// ===== Options Positions =====

// Get all options positions
router.get(
  '/businesses/:businessId/options-positions',
  requireBusinessAccess,
  (req, res) => controller.getOptionsPositions(req, res)
);

// Create an options position
router.post(
  '/businesses/:businessId/options-positions',
  requireBusinessAccess,
  (req, res) => controller.createOptionsPosition(req, res)
);

// Update an options position
router.put(
  '/businesses/:businessId/options-positions/:positionId',
  requireBusinessAccess,
  (req, res) => controller.updateOptionsPosition(req, res)
);

// Delete an options position
router.delete(
  '/businesses/:businessId/options-positions/:positionId',
  requireBusinessAccess,
  (req, res) => controller.deleteOptionsPosition(req, res)
);

// ===== Learning & Personalization =====

// Get user's learning profile (preferences learned from behavior)
router.get(
  '/marketing-ai/learning/profile',
  (req, res) => controller.getLearningProfile(req, res)
);

// Get personalized insights based on user's marketing history
router.get(
  '/marketing-ai/learning/insights',
  (req, res) => controller.getLearningInsights(req, res)
);

// Record a signal interaction (viewed, dismissed, acted)
router.post(
  '/marketing-ai/learning/interactions',
  (req, res) => controller.recordSignalInteraction(req, res)
);

// Get signal interaction history
router.get(
  '/marketing-ai/learning/interactions',
  (req, res) => controller.getSignalInteractionHistory(req, res)
);

// Record a marketing decision (sale made)
router.post(
  '/businesses/:businessId/marketing-ai/learning/decisions',
  requireBusinessAccess,
  (req, res) => controller.recordMarketingDecision(req, res)
);

// Get marketing decision history
router.get(
  '/businesses/:businessId/marketing-ai/learning/decisions',
  requireBusinessAccess,
  (req, res) => controller.getMarketingHistory(req, res)
);

// Generate signals with personalized thresholds
router.post(
  '/businesses/:businessId/marketing-ai/signals/generate-personalized',
  requireBusinessAccess,
  (req, res) => controller.generatePersonalizedSignals(req, res)
);

export default router;
