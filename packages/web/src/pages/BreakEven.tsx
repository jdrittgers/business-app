import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { breakevenApi } from '../api/breakeven.api';
import { analyticsApi } from '../api/analytics.api';
import { marketingAiApi } from '../api/marketing-ai.api';
import { OperationBreakEven, DashboardSummary } from '@business-app/shared';

// Default futures prices (user can update)
const DEFAULT_FUTURES: Record<string, number> = {
  CORN: 4.85,
  SOYBEANS: 11.20,
  WHEAT: 6.10
};

// Default new crop basis estimates
const DEFAULT_BASIS: Record<string, number> = {
  CORN: -0.35,
  SOYBEANS: -0.70,
  WHEAT: -0.55
};

// Cost category colors for charts
const COST_COLORS = {
  fertilizer: '#22c55e', // green
  chemical: '#3b82f6',   // blue
  seed: '#f59e0b',       // amber
  landRent: '#8b5cf6',   // purple
  insurance: '#ec4899',  // pink
  other: '#6b7280',      // gray
  landLoan: '#dc2626',   // red
  operatingLoan: '#f97316', // orange
  equipmentLoan: '#0891b2'  // cyan
};

// Simple Pie Chart component
function PieChart({ data, size = 200 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  let currentAngle = 0;
  const center = size / 2;
  const radius = size / 2 - 10;

  const paths = data.filter(d => d.value > 0).map((d, i) => {
    const angle = (d.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    const pathD = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return (
      <path key={i} d={pathD} fill={d.color} stroke="white" strokeWidth="2" />
    );
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
    </svg>
  );
}

export default function BreakEven() {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<OperationBreakEven | null>(null);
  const [grainAnalytics, setGrainAnalytics] = useState<DashboardSummary | null>(null);
  const [historicalData, setHistoricalData] = useState<OperationBreakEven[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pricing state - Futures and Basis for unmarketed grain
  const [futuresPrices, setFuturesPrices] = useState<Record<string, number>>(DEFAULT_FUTURES);
  const [basisEstimates, setBasisEstimates] = useState<Record<string, number>>(DEFAULT_BASIS);
  const [useMarketedGrain, setUseMarketedGrain] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesSource, setPricesSource] = useState<'live' | 'default'>('default');
  const [pricesLastUpdated, setPricesLastUpdated] = useState<Date | null>(null);

  // Scenario state
  const [scenarioMode, setScenarioMode] = useState(false);
  const [yieldAdjustment, setYieldAdjustment] = useState(0); // percentage
  const [priceAdjustment, setPriceAdjustment] = useState(0); // percentage
  const [costAdjustment, setCostAdjustment] = useState(0); // percentage

  // Historical comparison
  const [showHistorical, setShowHistorical] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user && user.businessMemberships.length > 0 && !selectedBusinessId) {
      const defaultBusiness = user.businessMemberships.find(m =>
        m.business.name === 'Demo Farm' ||
        m.business.name === 'Rittgers Farm' ||
        m.business.name === 'Rittgers Farms'
      );
      if (defaultBusiness) {
        setSelectedBusinessId(defaultBusiness.businessId);
      } else {
        setSelectedBusinessId(user.businessMemberships[0].businessId);
      }
    }
  }, [user, selectedBusinessId]);

  // Fetch harvest contract prices from TwelveData based on selected year
  useEffect(() => {
    const loadHarvestPrices = async () => {
      setPricesLoading(true);
      try {
        // Fetch harvest contracts for the selected year (Dec corn, Nov soybeans)
        const harvestData = await marketingAiApi.getHarvestContracts(filterYear);

        const newPrices = { ...DEFAULT_FUTURES };
        let hasLiveData = false;

        if (harvestData.corn?.closePrice) {
          newPrices.CORN = harvestData.corn.closePrice;
          hasLiveData = true;
        }

        if (harvestData.soybeans?.closePrice) {
          newPrices.SOYBEANS = harvestData.soybeans.closePrice;
          hasLiveData = true;
        }

        setFuturesPrices(newPrices);
        setPricesSource(harvestData.source === 'live' ? 'live' : 'default');
        if (hasLiveData) {
          setPricesLastUpdated(new Date());
        }
      } catch (err) {
        console.error('Failed to fetch harvest prices:', err);
        // Keep default prices on error
        setPricesSource('default');
      } finally {
        setPricesLoading(false);
      }
    };

    loadHarvestPrices();
  }, [filterYear]);

  useEffect(() => {
    if (selectedBusinessId) {
      loadBreakEven();
    }
  }, [selectedBusinessId, filterYear]);

  useEffect(() => {
    if (selectedBusinessId && showHistorical) {
      loadHistoricalData();
    }
  }, [selectedBusinessId, showHistorical]);

  const loadBreakEven = async () => {
    if (!selectedBusinessId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load both break-even data and grain analytics in parallel
      const [breakEvenData, analyticsData] = await Promise.all([
        breakevenApi.getBreakEvenSummary(selectedBusinessId, { year: filterYear }),
        analyticsApi.getDashboardSummary(selectedBusinessId, { year: filterYear }).catch(() => null)
      ]);

      setSummary(breakEvenData);
      setGrainAnalytics(analyticsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load break-even data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistoricalData = async () => {
    if (!selectedBusinessId) return;

    try {
      const years = [2023, 2024, 2025, 2026];
      const results = await Promise.all(
        years.map(year =>
          breakevenApi.getBreakEvenSummary(selectedBusinessId, { year }).catch(() => null)
        )
      );
      setHistoricalData(results.filter(Boolean) as OperationBreakEven[]);
    } catch (err) {
      console.error('Failed to load historical data:', err);
    }
  };

  // Calculate cash price from futures and basis
  const cashPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    Object.keys(futuresPrices).forEach(commodity => {
      prices[commodity] = futuresPrices[commodity] + basisEstimates[commodity];
    });
    return prices;
  }, [futuresPrices, basisEstimates]);

  // Calculate revenue and profit for each commodity with marketed grain integration
  const profitAnalysis = useMemo(() => {
    if (!summary) return [];

    return summary.byCommodity.map(commodity => {
      const futures = futuresPrices[commodity.commodityType] || 0;
      const basis = basisEstimates[commodity.commodityType] || 0;
      const cashPrice = futures + basis;

      // Apply scenario adjustments
      const adjustedYield = commodity.expectedYield * (1 + yieldAdjustment / 100);
      const adjustedCashPrice = cashPrice * (1 + priceAdjustment / 100);
      const adjustedCost = commodity.totalCost * (1 + costAdjustment / 100);

      const adjustedBushels = commodity.acres * adjustedYield;

      // Get marketed grain data if available
      const marketedData = grainAnalytics?.byCommodity.find(
        c => c.commodityType === commodity.commodityType
      );

      let marketedBushels = 0;
      let marketedRevenue = 0;
      let marketedAvgPrice = 0;
      let unmarketedBushels = adjustedBushels;
      let unmarketedRevenue = adjustedBushels * adjustedCashPrice;
      let totalRevenue = unmarketedRevenue;

      if (useMarketedGrain && marketedData && marketedData.sold > 0) {
        marketedBushels = marketedData.sold;
        marketedAvgPrice = marketedData.averagePrice;
        marketedRevenue = marketedBushels * marketedAvgPrice;

        // Unmarketed is remaining from production or from break-even expected bushels
        // Use the smaller of: production remaining OR break-even expected bushels - marketed
        unmarketedBushels = Math.max(0, adjustedBushels - marketedBushels);
        unmarketedRevenue = unmarketedBushels * adjustedCashPrice;

        totalRevenue = marketedRevenue + unmarketedRevenue;
      }

      const profit = totalRevenue - adjustedCost;
      const profitPerAcre = commodity.acres > 0 ? profit / commodity.acres : 0;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
      const adjustedBreakEven = adjustedBushels > 0 ? adjustedCost / adjustedBushels : 0;

      // Calculate blended price
      const blendedPrice = adjustedBushels > 0 ? totalRevenue / adjustedBushels : 0;

      return {
        ...commodity,
        // Price info
        futuresPrice: futures,
        basis,
        cashPrice: adjustedCashPrice,
        blendedPrice,
        // Marketed grain
        marketedBushels,
        marketedAvgPrice,
        marketedRevenue,
        // Unmarketed grain
        unmarketedBushels,
        unmarketedRevenue,
        // Totals
        revenue: totalRevenue,
        profit,
        profitPerAcre,
        profitMargin,
        adjustedBreakEven,
        adjustedBushels,
        adjustedCost
      };
    });
  }, [summary, grainAnalytics, futuresPrices, basisEstimates, useMarketedGrain, yieldAdjustment, priceAdjustment, costAdjustment]);

  // Calculate total operation profit
  const totalProfit = useMemo(() => {
    return profitAnalysis.reduce((sum, c) => sum + c.profit, 0);
  }, [profitAnalysis]);

  const totalRevenue = useMemo(() => {
    return profitAnalysis.reduce((sum, c) => sum + c.revenue, 0);
  }, [profitAnalysis]);

  // Cost breakdown for pie chart (aggregate from all entities)
  const costBreakdown = useMemo(() => {
    if (!summary || summary.byEntity.length === 0) return [];

    let fertilizer = 0, chemical = 0, seed = 0, landRent = 0, insurance = 0, other = 0;
    let landLoan = 0, operatingLoan = 0, equipmentLoan = 0;

    summary.byEntity.forEach(entity => {
      entity.farms.forEach(farm => {
        fertilizer += farm.fertilizerCost || 0;
        chemical += farm.chemicalCost || 0;
        seed += farm.seedCost || 0;
        landRent += farm.landRent || 0;
        insurance += farm.insurance || 0;
        other += farm.otherCosts || 0;
        // Loan costs (interest + principal)
        landLoan += (farm.landLoanInterest || 0) + (farm.landLoanPrincipal || 0);
        operatingLoan += farm.operatingLoanInterest || 0;
        equipmentLoan += (farm.equipmentLoanInterest || 0) + (farm.equipmentLoanPrincipal || 0);
      });
    });

    return [
      { label: 'Fertilizer', value: fertilizer, color: COST_COLORS.fertilizer },
      { label: 'Chemical', value: chemical, color: COST_COLORS.chemical },
      { label: 'Seed', value: seed, color: COST_COLORS.seed },
      { label: 'Land Rent', value: landRent, color: COST_COLORS.landRent },
      { label: 'Insurance', value: insurance, color: COST_COLORS.insurance },
      { label: 'Other', value: other, color: COST_COLORS.other },
      { label: 'Land Loans', value: landLoan, color: COST_COLORS.landLoan },
      { label: 'Operating Loans', value: operatingLoan, color: COST_COLORS.operatingLoan },
      { label: 'Equipment Loans', value: equipmentLoan, color: COST_COLORS.equipmentLoan }
    ].filter(item => item.value > 0);
  }, [summary]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Break-Even Analysis</h1>
          <p className="text-sm text-gray-600">Cost analysis, profitability, and scenario planning for {filterYear}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900"
          >
            <option value={2023}>2023</option>
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
          <button
            onClick={() => navigate('/breakeven/farms')}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            Manage Farms
          </button>
          <button
            onClick={() => navigate('/breakeven/products')}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Products
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading break-even analysis...</p>
        </div>
      )}

      {/* Dashboard Content */}
      {!isLoading && summary && (
        <div className="space-y-6">
          {/* Pricing Section with Futures, Basis, and Marketed Grain */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Price Projections</h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500">
                  Harvest {filterYear} contracts: Dec Corn, Nov Soybeans
                </p>
                  {pricesLoading ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading prices...
                    </span>
                  ) : pricesSource === 'live' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full" title={pricesLastUpdated ? `Last updated: ${pricesLastUpdated.toLocaleString()}` : ''}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Live from TwelveData
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Default estimates
                    </span>
                  )}
                </div>
              </div>
              {grainAnalytics && grainAnalytics.totalSold > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useMarketedGrain}
                    onChange={(e) => setUseMarketedGrain(e.target.checked)}
                    className="w-4 h-4 text-gray-900 rounded focus:ring-gray-900"
                  />
                  <span className="text-sm text-gray-700">Include contracted grain</span>
                </label>
              )}
            </div>

            {/* Marketed Grain Summary */}
            {useMarketedGrain && grainAnalytics && grainAnalytics.totalSold > 0 && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-green-800">Contracted Grain from Marketing Dashboard</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {grainAnalytics.byCommodity.filter(c => c.sold > 0).map(c => (
                    <div key={c.commodityType} className="bg-white rounded-lg p-3 border border-green-100">
                      <div className="flex items-center gap-1 text-gray-600 mb-1">
                        <span>{c.commodityType === 'CORN' ? '🌽' : c.commodityType === 'SOYBEANS' ? '🫘' : '🌾'}</span>
                        <span>{c.commodityType}</span>
                      </div>
                      <div className="font-semibold text-gray-900">{c.sold.toLocaleString()} bu</div>
                      <div className="text-green-600 font-medium">${c.averagePrice.toFixed(2)}/bu avg</div>
                    </div>
                  ))}
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <div className="text-gray-600 mb-1">Total Marketed</div>
                    <div className="font-semibold text-gray-900">{grainAnalytics.totalSold.toLocaleString()} bu</div>
                    <div className="text-green-600 text-xs">{grainAnalytics.percentageSold.toFixed(0)}% of production</div>
                  </div>
                </div>
              </div>
            )}

            {/* Futures and Basis Inputs */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700">Unmarketed Grain Pricing (Futures - Basis = Cash)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-4 font-medium text-gray-600">Commodity</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-600">Futures Price</th>
                      <th className="text-left py-2 px-4 font-medium text-gray-600">Est. Basis</th>
                      <th className="text-left py-2 pl-4 font-medium text-gray-600">Cash Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['CORN', 'SOYBEANS', 'WHEAT'].map(commodity => {
                      const yearCode = String(filterYear).slice(-2);
                      const contractLabel = commodity === 'CORN'
                        ? `Dec '${yearCode}`
                        : commodity === 'SOYBEANS'
                          ? `Nov '${yearCode}`
                          : `Dec '${yearCode}`;
                      return (
                      <tr key={commodity} className="border-b border-gray-100">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {commodity === 'CORN' ? '🌽' : commodity === 'SOYBEANS' ? '🫘' : '🌾'}
                            </span>
                            <div>
                              <span className="font-medium">{commodity}</span>
                              <span className="text-xs text-gray-500 ml-1">({contractLabel})</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative w-32">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={futuresPrices[commodity]}
                              onChange={(e) => setFuturesPrices(prev => ({
                                ...prev,
                                [commodity]: parseFloat(e.target.value) || 0
                              }))}
                              className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded-md focus:ring-gray-900 focus:border-gray-900 text-sm"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative w-28">
                            <input
                              type="number"
                              step="0.01"
                              value={basisEstimates[commodity]}
                              onChange={(e) => setBasisEstimates(prev => ({
                                ...prev,
                                [commodity]: parseFloat(e.target.value) || 0
                              }))}
                              className="w-full pl-3 pr-2 py-1.5 border border-gray-300 rounded-md focus:ring-gray-900 focus:border-gray-900 text-sm"
                            />
                          </div>
                        </td>
                        <td className="py-3 pl-4">
                          <span className="font-bold text-gray-900">
                            ${cashPrices[commodity]?.toFixed(2)}/bu
                          </span>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500">
                Enter new crop futures prices and your estimated local basis. Cash price = Futures + Basis (negative basis reduces price).
              </p>
            </div>
          </div>

          {/* Operation Summary with Profit */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="text-sm text-gray-500 mb-1">Total Acres</div>
              <div className="text-2xl font-bold text-gray-900">{summary.totalAcres.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="text-sm text-gray-500 mb-1">Total Cost</div>
              <div className="text-2xl font-bold text-red-600">
                ${(summary.totalCost * (1 + costAdjustment / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="text-sm text-gray-500 mb-1">Projected Revenue</div>
              <div className="text-2xl font-bold text-blue-600">
                ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className={`rounded-xl shadow-sm border p-5 ${totalProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="text-sm text-gray-500 mb-1">Projected Profit</div>
              <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Loan Costs Summary */}
          {summary.totalLoanCost > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Loan Costs Included</h3>
                  <p className="text-sm text-gray-500">
                    Total: ${summary.totalLoanCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    ({((summary.totalLoanCost / summary.totalCost) * 100).toFixed(1)}% of total costs)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                  <div className="text-xs text-gray-500 mb-1">Land Loan Interest</div>
                  <div className="font-semibold text-red-700">
                    ${(summary.loanCostBreakdown?.landLoanInterest || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                  <div className="text-xs text-gray-500 mb-1">Land Loan Principal</div>
                  <div className="font-semibold text-red-700">
                    ${(summary.loanCostBreakdown?.landLoanPrincipal || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <div className="text-xs text-gray-500 mb-1">Operating Loan Interest</div>
                  <div className="font-semibold text-orange-700">
                    ${(summary.loanCostBreakdown?.operatingLoanInterest || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-100">
                  <div className="text-xs text-gray-500 mb-1">Equipment Loan Interest</div>
                  <div className="font-semibold text-cyan-700">
                    ${(summary.loanCostBreakdown?.equipmentLoanInterest || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-100">
                  <div className="text-xs text-gray-500 mb-1">Equipment Loan Principal</div>
                  <div className="font-semibold text-cyan-700">
                    ${(summary.loanCostBreakdown?.equipmentLoanPrincipal || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Interest Expense:</span>
                  <span className="font-semibold text-gray-900">
                    ${summary.totalInterestExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Principal Expense:</span>
                  <span className="font-semibold text-gray-900">
                    ${summary.totalPrincipalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Scenario Analysis Toggle */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-sm border border-purple-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">What-If Scenario Analysis</h3>
                  <p className="text-sm text-gray-600">Adjust yield, price, or costs to see impact on profitability</p>
                </div>
              </div>
              <button
                onClick={() => setScenarioMode(!scenarioMode)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  scenarioMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-purple-300 text-purple-700 hover:bg-purple-50'
                }`}
              >
                {scenarioMode ? 'Scenario Mode ON' : 'Enable Scenarios'}
              </button>
            </div>

            {scenarioMode && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4 pt-4 border-t border-purple-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yield Adjustment: {yieldAdjustment > 0 ? '+' : ''}{yieldAdjustment}%
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={yieldAdjustment}
                    onChange={(e) => setYieldAdjustment(parseInt(e.target.value))}
                    className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>-50%</span>
                    <span>0%</span>
                    <span>+50%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Adjustment: {priceAdjustment > 0 ? '+' : ''}{priceAdjustment}%
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={priceAdjustment}
                    onChange={(e) => setPriceAdjustment(parseInt(e.target.value))}
                    className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>-50%</span>
                    <span>0%</span>
                    <span>+50%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cost Adjustment: {costAdjustment > 0 ? '+' : ''}{costAdjustment}%
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={costAdjustment}
                    onChange={(e) => setCostAdjustment(parseInt(e.target.value))}
                    className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>-50%</span>
                    <span>0%</span>
                    <span>+50%</span>
                  </div>
                </div>
                <div className="sm:col-span-3 flex justify-end">
                  <button
                    onClick={() => {
                      setYieldAdjustment(0);
                      setPriceAdjustment(0);
                      setCostAdjustment(0);
                    }}
                    className="text-sm text-purple-600 hover:text-purple-700"
                  >
                    Reset to baseline
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profitability by Commodity */}
          {profitAnalysis.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Profitability by Commodity</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {profitAnalysis.map((commodity) => (
                  <div key={commodity.commodityType} className="border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {commodity.commodityType === 'CORN' ? '🌽' : commodity.commodityType === 'SOYBEANS' ? '🫘' : '🌾'}
                        </span>
                        <h4 className="font-semibold text-gray-900">{commodity.commodityType}</h4>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        commodity.profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {commodity.profitMargin.toFixed(1)}% margin
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Acres:</span>
                        <span className="font-medium">{commodity.acres.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expected Bushels:</span>
                        <span className="font-medium">{commodity.adjustedBushels.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>

                      {/* Marketing Breakdown */}
                      {useMarketedGrain && commodity.marketedBushels > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <div className="text-xs font-medium text-gray-500 uppercase">Marketing Breakdown</div>
                          <div className="flex justify-between">
                            <span className="text-green-600">Contracted:</span>
                            <span className="font-medium text-green-600">
                              {commodity.marketedBushels.toLocaleString()} bu @ ${commodity.marketedAvgPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-amber-600">Unmarketed:</span>
                            <span className="font-medium text-amber-600">
                              {commodity.unmarketedBushels.toLocaleString(undefined, { maximumFractionDigits: 0 })} bu @ ${commodity.cashPrice.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-gray-200 pt-2">
                            <span className="text-gray-700 font-medium">Blended Price:</span>
                            <span className="font-bold text-gray-900">${commodity.blendedPrice.toFixed(2)}/bu</span>
                          </div>
                        </div>
                      )}

                      {/* Simple price display when not using marketed grain */}
                      {(!useMarketedGrain || commodity.marketedBushels === 0) && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Est. Cash Price:</span>
                          <span className="font-medium">${commodity.cashPrice.toFixed(2)}/bu</span>
                        </div>
                      )}

                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Cost:</span>
                          <span className="font-medium text-red-600">
                            ${commodity.adjustedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        {useMarketedGrain && commodity.marketedBushels > 0 ? (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Contracted Revenue:</span>
                              <span className="text-green-600">
                                ${commodity.marketedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Projected Revenue:</span>
                              <span className="text-amber-600">
                                ${commodity.unmarketedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </>
                        ) : null}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Revenue:</span>
                          <span className="font-medium text-blue-600">
                            ${commodity.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Break-Even:</span>
                          <span className="font-bold text-purple-600">${commodity.adjustedBreakEven.toFixed(2)}/bu</span>
                        </div>
                      </div>

                      <div className={`border-t pt-3 ${commodity.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <div className="flex justify-between">
                          <span className="font-medium">Projected Profit:</span>
                          <span className="text-lg font-bold">
                            {commodity.profit >= 0 ? '+' : ''}${commodity.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Per Acre:</span>
                          <span className="font-medium">
                            {commodity.profitPerAcre >= 0 ? '+' : ''}${commodity.profitPerAcre.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost Visualization */}
          {costBreakdown.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Cost Breakdown</h3>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-shrink-0">
                  <PieChart data={costBreakdown} size={220} />
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  {costBreakdown.map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.label}</div>
                        <div className="text-sm text-gray-600">
                          ${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          <span className="text-gray-400 ml-1">
                            ({((item.value / (summary.totalCost || 1)) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Historical Comparison */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Historical Comparison</h3>
              <button
                onClick={() => setShowHistorical(!showHistorical)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  showHistorical
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showHistorical ? 'Hide Comparison' : 'Compare Years'}
              </button>
            </div>

            {showHistorical && historicalData.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Acres</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/Acre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Corn B/E</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Soybean B/E</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {historicalData.map((yearData) => {
                      const cornBE = yearData.byCommodity.find(c => c.commodityType === 'CORN');
                      const soyBE = yearData.byCommodity.find(c => c.commodityType === 'SOYBEANS');
                      const costPerAcre = yearData.totalAcres > 0 ? yearData.totalCost / yearData.totalAcres : 0;

                      return (
                        <tr key={yearData.year} className={yearData.year === filterYear ? 'bg-gray-50' : ''}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {yearData.year}
                            {yearData.year === filterYear && (
                              <span className="ml-2 text-xs text-gray-900">(current)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {yearData.totalAcres.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            ${yearData.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            ${costPerAcre.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-purple-600 font-medium">
                            {cornBE ? `$${cornBE.breakEvenPrice.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-purple-600 font-medium">
                            {soyBE ? `$${soyBE.breakEvenPrice.toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {showHistorical && historicalData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Loading historical data...</p>
              </div>
            )}
          </div>

          {/* By Entity */}
          {summary.byEntity.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Break-Even by Entity</h3>
              <div className="space-y-4">
                {summary.byEntity.map((entity) => {
                  const price = cashPrices[entity.commodityType] || 0;
                  const revenue = entity.expectedBushels * price;
                  const profit = revenue - entity.totalCost;

                  return (
                    <div key={`${entity.grainEntityId}-${entity.commodityType}`} className="border rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {entity.commodityType === 'CORN' ? '🌽' : entity.commodityType === 'SOYBEANS' ? '🫘' : '🌾'}
                          </span>
                          <h4 className="font-medium text-gray-900">{entity.grainEntityName}</h4>
                          <span className="text-sm text-gray-500">• {entity.commodityType}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-purple-600">${entity.breakEvenPrice.toFixed(2)}/bu</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            profit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {profit >= 0 ? '+' : ''}${profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Acres:</span>
                          <p className="font-semibold">{entity.totalAcres.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Cost:</span>
                          <p className="font-semibold text-red-600">${entity.totalCost?.toLocaleString() || '0'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Cost/Acre:</span>
                          <p className="font-semibold">${entity.costPerAcre.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Exp. Bushels:</span>
                          <p className="font-semibold">{entity.expectedBushels.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Farms:</span>
                          <p className="font-semibold">{entity.farms.length}</p>
                        </div>
                      </div>
                      {entity.totalLoanCost > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs">Land Loans:</span>
                            <p className="font-medium text-red-600">
                              ${((entity.landLoanInterest || 0) + (entity.landLoanPrincipal || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Operating Loan:</span>
                            <p className="font-medium text-orange-600">
                              ${(entity.operatingLoanInterest || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Equipment Loans:</span>
                            <p className="font-medium text-cyan-600">
                              ${((entity.equipmentLoanInterest || 0) + (entity.equipmentLoanPrincipal || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Total Loan Cost:</span>
                            <p className="font-medium text-gray-900">
                              ${entity.totalLoanCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !summary && !error && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">No break-even data available for {filterYear}</p>
          <p className="text-sm text-gray-400 mb-6">Set up your product catalog and add farms to track break-even costs</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate('/breakeven/products')}
              className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
            >
              Set Up Products
            </button>
            <button
              onClick={() => navigate('/breakeven/farms')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Add Farms
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
