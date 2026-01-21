import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { breakevenApi } from '../api/breakeven.api';
import { OperationBreakEven } from '@business-app/shared';

// Default market prices (can be updated by user)
const DEFAULT_PRICES: Record<string, number> = {
  CORN: 4.50,
  SOYBEANS: 10.50,
  WHEAT: 5.75
};

// Cost category colors for charts
const COST_COLORS = {
  fertilizer: '#22c55e', // green
  chemical: '#3b82f6',   // blue
  seed: '#f59e0b',       // amber
  landRent: '#8b5cf6',   // purple
  insurance: '#ec4899',  // pink
  other: '#6b7280'       // gray
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
  const [historicalData, setHistoricalData] = useState<OperationBreakEven[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Market prices state
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>(DEFAULT_PRICES);

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
      const data = await breakevenApi.getBreakEvenSummary(selectedBusinessId, {
        year: filterYear
      });
      setSummary(data);
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

  // Calculate revenue and profit for each commodity
  const profitAnalysis = useMemo(() => {
    if (!summary) return [];

    return summary.byCommodity.map(commodity => {
      const price = marketPrices[commodity.commodityType] || 0;

      // Apply scenario adjustments
      const adjustedYield = commodity.expectedYield * (1 + yieldAdjustment / 100);
      const adjustedPrice = price * (1 + priceAdjustment / 100);
      const adjustedCost = commodity.totalCost * (1 + costAdjustment / 100);

      const adjustedBushels = commodity.acres * adjustedYield;
      const revenue = adjustedBushels * adjustedPrice;
      const profit = revenue - adjustedCost;
      const profitPerAcre = commodity.acres > 0 ? profit / commodity.acres : 0;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const adjustedBreakEven = adjustedBushels > 0 ? adjustedCost / adjustedBushels : 0;

      return {
        ...commodity,
        marketPrice: adjustedPrice,
        revenue,
        profit,
        profitPerAcre,
        profitMargin,
        adjustedBreakEven,
        adjustedBushels,
        adjustedCost
      };
    });
  }, [summary, marketPrices, yieldAdjustment, priceAdjustment, costAdjustment]);

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

    summary.byEntity.forEach(entity => {
      entity.farms.forEach(farm => {
        fertilizer += farm.fertilizerCost || 0;
        chemical += farm.chemicalCost || 0;
        seed += farm.seedCost || 0;
        landRent += farm.landRent || 0;
        insurance += farm.insurance || 0;
        other += farm.otherCosts || 0;
      });
    });

    return [
      { label: 'Fertilizer', value: fertilizer, color: COST_COLORS.fertilizer },
      { label: 'Chemical', value: chemical, color: COST_COLORS.chemical },
      { label: 'Seed', value: seed, color: COST_COLORS.seed },
      { label: 'Land Rent', value: landRent, color: COST_COLORS.landRent },
      { label: 'Insurance', value: insurance, color: COST_COLORS.insurance },
      { label: 'Other', value: other, color: COST_COLORS.other }
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
            className="rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
          >
            <option value={2023}>2023</option>
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
          <button
            onClick={() => navigate('/breakeven/farms')}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700"
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-2 text-gray-600">Loading break-even analysis...</p>
        </div>
      )}

      {/* Dashboard Content */}
      {!isLoading && summary && (
        <div className="space-y-6">
          {/* Market Prices Input */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Market Prices</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(marketPrices).map(([commodity, price]) => (
                <div key={commodity} className="flex items-center gap-3">
                  <span className="text-2xl">
                    {commodity === 'CORN' ? '🌽' : commodity === 'SOYBEANS' ? '🫘' : '🌾'}
                  </span>
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600">{commodity}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setMarketPrices(prev => ({
                          ...prev,
                          [commodity]: parseFloat(e.target.value) || 0
                        }))}
                        className="w-full pl-7 pr-12 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">/bu</span>
                    </div>
                  </div>
                </div>
              ))}
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
                      <div className="flex justify-between">
                        <span className="text-gray-600">Market Price:</span>
                        <span className="font-medium">${commodity.marketPrice.toFixed(2)}/bu</span>
                      </div>

                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Cost:</span>
                          <span className="font-medium text-red-600">
                            ${commodity.adjustedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Revenue:</span>
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
                          <span className="font-medium">Profit:</span>
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
                    ? 'bg-teal-600 text-white'
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
                        <tr key={yearData.year} className={yearData.year === filterYear ? 'bg-teal-50' : ''}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {yearData.year}
                            {yearData.year === filterYear && (
                              <span className="ml-2 text-xs text-teal-600">(current)</span>
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
                  const price = marketPrices[entity.commodityType] || 0;
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
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
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
