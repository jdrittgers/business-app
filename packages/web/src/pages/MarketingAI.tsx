import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { marketingAiApi } from '../api/marketing-ai.api';
import {
  MarketingSignal,
  SignalStrength,
  SignalStatus,
  MarketingSignalType,
  CommodityType,
  StrategyRecommendation
} from '@business-app/shared';
import TakeActionModal from '../components/marketing/TakeActionModal';

// Signal strength colors
const strengthColors: Record<SignalStrength, { bg: string; text: string; border: string }> = {
  STRONG_BUY: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
  BUY: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
  HOLD: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500' },
  SELL: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-500' },
  STRONG_SELL: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' }
};

const strengthLabels: Record<SignalStrength, string> = {
  STRONG_BUY: 'Strong Opportunity',
  BUY: 'Opportunity',
  HOLD: 'Hold',
  SELL: 'Caution',
  STRONG_SELL: 'Warning'
};

const signalTypeLabels: Record<MarketingSignalType, string> = {
  CASH_SALE: 'Cash Sale',
  BASIS_CONTRACT: 'Basis Contract',
  HTA_RECOMMENDATION: 'HTA',
  ACCUMULATOR_STRATEGY: 'Accumulator',
  ACCUMULATOR_INQUIRY: 'Check Accumulator',
  PUT_OPTION: 'Put Option',
  CALL_OPTION: 'Call Option',
  COLLAR_STRATEGY: 'Collar',
  TRADE_POLICY: 'Trade Policy',
  WEATHER_ALERT: 'Weather Alert',
  BREAKING_NEWS: 'Breaking News'
};

const commodityColors: Record<CommodityType, string> = {
  CORN: 'bg-yellow-500',
  SOYBEANS: 'bg-green-500',
  WHEAT: 'bg-amber-600'
};

function SignalCard({ signal, onDismiss, onTakeAction }: {
  signal: MarketingSignal;
  onDismiss: (id: string) => void;
  onTakeAction: (signal: MarketingSignal) => void;
}) {
  const colors = strengthColors[signal.strength];
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden border-l-4 ${colors.border}`}>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${commodityColors[signal.commodityType]}`}></span>
            <span className="font-medium text-gray-900">{signal.commodityType}</span>
            <span className="text-sm text-gray-500">{signalTypeLabels[signal.signalType]}</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
            {strengthLabels[signal.strength]}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">{signal.title}</h3>
        <p className="text-gray-600 text-sm mb-3">{signal.summary}</p>

        <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
          <div>
            <span className="text-gray-500">Current</span>
            <p className="font-semibold">${signal.currentPrice.toFixed(2)}/bu</p>
          </div>
          <div>
            <span className="text-gray-500">Break-Even</span>
            <p className="font-semibold">${signal.breakEvenPrice.toFixed(2)}/bu</p>
          </div>
          <div>
            <span className="text-gray-500">Margin</span>
            <p className={`font-semibold ${signal.priceAboveBreakeven >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${signal.priceAboveBreakeven.toFixed(2)}/bu
            </p>
          </div>
        </div>

        {signal.recommendedAction && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <p className="text-sm font-medium text-gray-700">Recommended:</p>
            <p className="text-sm text-gray-600">{signal.recommendedAction}</p>
            {signal.recommendedBushels && (
              <p className="text-sm font-semibold text-green-600 mt-1">
                {signal.recommendedBushels.toLocaleString()} bushels
              </p>
            )}
          </div>
        )}

        {showDetails && signal.aiAnalysis && (
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <p className="text-sm font-medium text-blue-800 mb-1">AI Analysis:</p>
            <p className="text-sm text-blue-700">{signal.aiAnalysis}</p>
          </div>
        )}

        <div className="flex justify-between items-center mt-3 pt-3 border-t">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onDismiss(signal.id)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            >
              Dismiss
            </button>
            {(signal.strength === SignalStrength.STRONG_BUY || signal.strength === SignalStrength.BUY) && (
              <button
                onClick={() => onTakeAction(signal)}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                Take Action
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StrategyCard({ recommendation }: { recommendation: StrategyRecommendation }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Strategy Recommendation</h3>
      <p className="text-gray-600 mb-4">{recommendation.summary}</p>

      {recommendation.recommendations.length > 0 && (
        <div className="space-y-3 mb-4">
          <h4 className="font-medium text-gray-800">Action Items:</h4>
          {recommendation.recommendations.map((rec, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
              <span className={`w-3 h-3 mt-1 rounded-full ${commodityColors[rec.commodityType]}`}></span>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{rec.action}</p>
                <p className="text-sm text-gray-600">{rec.reasoning}</p>
                {rec.bushels > 0 && (
                  <p className="text-sm font-semibold text-green-600 mt-1">
                    {rec.bushels.toLocaleString()} bushels
                  </p>
                )}
              </div>
              <span className={`px-2 py-1 text-xs rounded ${
                rec.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                rec.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {rec.priority}
              </span>
            </div>
          ))}
        </div>
      )}

      {recommendation.riskAssessment && (
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-gray-800 mb-2">Risk Assessment:</h4>
          <p className="text-sm text-gray-600">{recommendation.riskAssessment}</p>
        </div>
      )}
    </div>
  );
}

export default function MarketingAI() {
  const { user } = useAuthStore();
  const [signals, setSignals] = useState<MarketingSignal[]>([]);
  const [strategy, setStrategy] = useState<StrategyRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SignalStatus | 'ALL'>(SignalStatus.ACTIVE);
  const [commodityFilter, setCommodityFilter] = useState<CommodityType | 'ALL'>('ALL');
  const [actionSignal, setActionSignal] = useState<MarketingSignal | null>(null);

  const businessId = user?.businessMemberships?.[0]?.businessId;

  const loadSignals = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      const query: any = {};
      if (statusFilter !== 'ALL') query.status = statusFilter;
      if (commodityFilter !== 'ALL') query.commodityType = commodityFilter;

      const data = await marketingAiApi.getSignals(businessId, query);
      setSignals(data);
    } catch (err) {
      console.error('Failed to load signals:', err);
      setError('Failed to load signals');
    } finally {
      setLoading(false);
    }
  };

  const loadStrategy = async () => {
    if (!businessId) return;

    try {
      const data = await marketingAiApi.getStrategyRecommendation(businessId);
      setStrategy(data);
    } catch (err) {
      console.error('Failed to load strategy:', err);
    }
  };

  useEffect(() => {
    loadSignals();
    loadStrategy();
  }, [businessId, statusFilter, commodityFilter]);

  const handleGenerateSignals = async () => {
    if (!businessId) return;

    try {
      setGenerating(true);
      const newSignals = await marketingAiApi.generateSignals(businessId);
      setSignals(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const uniqueNew = newSignals.filter(s => !existingIds.has(s.id));
        return [...uniqueNew, ...prev];
      });
    } catch (err) {
      console.error('Failed to generate signals:', err);
      setError('Failed to generate signals');
    } finally {
      setGenerating(false);
    }
  };

  const handleDismiss = async (signalId: string) => {
    if (!businessId) return;

    try {
      await marketingAiApi.dismissSignal(businessId, signalId);
      setSignals(prev => prev.filter(s => s.id !== signalId));
    } catch (err) {
      console.error('Failed to dismiss signal:', err);
    }
  };

  const handleTakeAction = (signal: MarketingSignal) => {
    setActionSignal(signal);
  };

  const handleActionSuccess = async () => {
    if (!businessId || !actionSignal) return;

    try {
      // Mark the signal as triggered
      await marketingAiApi.recordAction(businessId, actionSignal.id, 'Created contract from signal');
      setSignals(prev => prev.map(s =>
        s.id === actionSignal.id ? { ...s, status: SignalStatus.TRIGGERED, actionTaken: 'Created contract from signal' } : s
      ));
      setActionSignal(null);
    } catch (err) {
      console.error('Failed to record action:', err);
    }
  };

  const activeSignals = signals.filter(s => s.status === SignalStatus.ACTIVE);
  const strongSignals = activeSignals.filter(s =>
    s.strength === SignalStrength.STRONG_BUY || s.strength === SignalStrength.BUY
  );

  if (!businessId) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please select a business to view Marketing AI signals.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing AI</h1>
          <p className="text-gray-600">Intelligent grain marketing signals and recommendations</p>
        </div>
        <button
          onClick={handleGenerateSignals}
          disabled={generating}
          className="px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-400 flex items-center justify-center gap-2 font-medium transition-colors"
        >
          {generating ? (
            <>
              <span className="animate-spin">&#9696;</span>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Generate Signals
            </>
          )}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Active Signals</p>
          <p className="text-2xl font-bold text-gray-900">{activeSignals.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Opportunities</p>
          <p className="text-2xl font-bold text-green-600">{strongSignals.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Corn Signals</p>
          <p className="text-2xl font-bold text-yellow-600">
            {activeSignals.filter(s => s.commodityType === CommodityType.CORN).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Soybean Signals</p>
          <p className="text-2xl font-bold text-green-600">
            {activeSignals.filter(s => s.commodityType === CommodityType.SOYBEANS).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as SignalStatus | 'ALL')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-teal-500 focus:ring-teal-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="TRIGGERED">Acted On</option>
          <option value="DISMISSED">Dismissed</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <select
          value={commodityFilter}
          onChange={e => setCommodityFilter(e.target.value as CommodityType | 'ALL')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-teal-500 focus:ring-teal-500"
        >
          <option value="ALL">All Commodities</option>
          <option value="CORN">Corn</option>
          <option value="SOYBEANS">Soybeans</option>
          <option value="WHEAT">Wheat</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signals List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Marketing Signals</h2>

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
              Loading signals...
            </div>
          ) : signals.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-gray-600 mb-2">No signals found.</p>
              <p className="text-sm text-gray-400">
                Click "Generate Signals" to analyze market conditions and generate recommendations.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {signals.map(signal => (
                <SignalCard
                  key={signal.id}
                  signal={signal}
                  onDismiss={handleDismiss}
                  onTakeAction={handleTakeAction}
                />
              ))}
            </div>
          )}
        </div>

        {/* Strategy Sidebar */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">AI Strategy</h2>

          {strategy ? (
            <StrategyCard recommendation={strategy} />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mx-auto mb-2"></div>
              <p>Loading strategy...</p>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Quick Links</h3>
            <div className="space-y-2">
              <a
                href="/grain-contracts/dashboard"
                className="block text-sm text-teal-600 hover:text-teal-800"
              >
                View Grain Dashboard
              </a>
              <a
                href="/breakeven"
                className="block text-sm text-teal-600 hover:text-teal-800"
              >
                Break-Even Calculator
              </a>
              <a
                href="/grain-contracts"
                className="block text-sm text-teal-600 hover:text-teal-800"
              >
                Manage Contracts
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Take Action Modal */}
      {actionSignal && businessId && (
        <TakeActionModal
          signal={actionSignal}
          businessId={businessId}
          onClose={() => setActionSignal(null)}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
}
