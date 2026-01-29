import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { breakevenApi } from '../api/breakeven.api';
import { insuranceApi } from '../api/insurance.api';
import {
  InsurancePlanType,
  ProfitMatrixResponse,
  ProfitMatrixCell,
  Farm
} from '@business-app/shared';

const PLAN_TYPE_LABELS: Record<InsurancePlanType, string> = {
  RP: 'Revenue Protection (RP)',
  YP: 'Yield Protection (YP)',
  RP_HPE: 'RP - Harvest Price Exclusion'
};

const DEFAULT_PRICES: Record<string, number> = {
  CORN: 4.66,
  SOYBEANS: 11.20,
  WHEAT: 5.50
};

// Average county yields (Iowa baseline for defaults)
const DEFAULT_COUNTY_YIELDS: Record<string, number> = {
  CORN: 200,
  SOYBEANS: 58,
  WHEAT: 55
};

function getCellColor(netProfit: number): string {
  if (netProfit > 100) return 'bg-green-100 text-green-800';
  if (netProfit > 50) return 'bg-green-50 text-green-700';
  if (netProfit > 0) return 'bg-emerald-50 text-emerald-700';
  if (netProfit > -25) return 'bg-yellow-50 text-yellow-800';
  if (netProfit > -75) return 'bg-orange-50 text-orange-700';
  if (netProfit > -150) return 'bg-red-50 text-red-700';
  return 'bg-red-100 text-red-800';
}

function formatCurrency(value: number, decimals = 2): string {
  const sign = value >= 0 ? '' : '-';
  return `${sign}$${Math.abs(value).toFixed(decimals)}`;
}

export default function ProfitMatrix() {
  const { user } = useAuthStore();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [matrixData, setMatrixData] = useState<ProfitMatrixResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Insurance policy editing state
  const [showPolicyEditor, setShowPolicyEditor] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    planType: 'RP' as InsurancePlanType,
    coverageLevel: 80,
    projectedPrice: 4.66,
    premiumPerAcre: 15,
    volatilityFactor: 0.20,
    hasSco: false,
    hasEco: false,
    ecoLevel: 90 as number | null,
    scoPremiumPerAcre: 0,
    ecoPremiumPerAcre: 0
  });
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // County yield simulation (for ECO/SCO area-based endorsements)
  const [expectedCountyYield, setExpectedCountyYield] = useState<number | null>(null);
  const [simulatedCountyYield, setSimulatedCountyYield] = useState<number | null>(null);
  const [countyYieldEnabled, setCountyYieldEnabled] = useState(false);

  // Cell detail tooltip
  const [hoveredCell, setHoveredCell] = useState<ProfitMatrixCell | null>(null);
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);

  // Set default business
  useEffect(() => {
    if (user && user.businessMemberships.length > 0 && !selectedBusinessId) {
      const defaultBiz = user.businessMemberships.find(m =>
        m.business.name === 'Demo Farm' ||
        m.business.name === 'Rittgers Farm' ||
        m.business.name === 'Rittgers Farms'
      );
      setSelectedBusinessId(defaultBiz?.businessId || user.businessMemberships[0].businessId);
    }
  }, [user, selectedBusinessId]);

  // Load farms when business/year changes
  useEffect(() => {
    if (!selectedBusinessId) return;
    const loadFarms = async () => {
      try {
        const farmsData = await breakevenApi.getFarms(selectedBusinessId, { year: filterYear });
        setFarms(farmsData);
        if (farmsData.length > 0 && !selectedFarmId) {
          setSelectedFarmId(farmsData[0].id);
        } else if (farmsData.length > 0 && !farmsData.find(f => f.id === selectedFarmId)) {
          setSelectedFarmId(farmsData[0].id);
        }
      } catch (err: any) {
        console.error('Error loading farms:', err);
      }
    };
    loadFarms();
  }, [selectedBusinessId, filterYear]);

  // Load matrix data when farm changes
  const loadMatrix = async (countyOverrides?: { expectedCountyYield?: number; simulatedCountyYield?: number }) => {
    if (!selectedBusinessId || !selectedFarmId) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = countyOverrides?.expectedCountyYield && countyOverrides?.simulatedCountyYield
        ? countyOverrides
        : undefined;
      const data = await insuranceApi.getProfitMatrix(selectedBusinessId, selectedFarmId, params);
      setMatrixData(data);
      // Update policy form from loaded policy
      if (data.policy) {
        setPolicyForm({
          planType: data.policy.planType,
          coverageLevel: data.policy.coverageLevel,
          projectedPrice: data.policy.projectedPrice,
          premiumPerAcre: data.policy.premiumPerAcre,
          volatilityFactor: data.policy.volatilityFactor,
          hasSco: data.policy.hasSco,
          hasEco: data.policy.hasEco,
          ecoLevel: data.policy.ecoLevel,
          scoPremiumPerAcre: data.policy.scoPremiumPerAcre,
          ecoPremiumPerAcre: data.policy.ecoPremiumPerAcre
        });
        // Set default county yields if ECO/SCO is on and not yet set
        if ((data.policy.hasEco || data.policy.hasSco) && !countyYieldEnabled) {
          const commodity = data.commodityType || 'CORN';
          const defaultYield = DEFAULT_COUNTY_YIELDS[commodity] || 180;
          setExpectedCountyYield(defaultYield);
          setSimulatedCountyYield(defaultYield);
          setCountyYieldEnabled(true);
        }
      } else {
        // Set defaults based on commodity
        const selectedFarm = farms.find(f => f.id === selectedFarmId);
        const commodity = selectedFarm?.commodityType || 'CORN';
        setPolicyForm(prev => ({
          ...prev,
          projectedPrice: DEFAULT_PRICES[commodity] || 4.66,
          premiumPerAcre: commodity === 'CORN' ? 15 : commodity === 'SOYBEANS' ? 8 : 10
        }));
      }
    } catch (err: any) {
      console.error('Error loading profit matrix:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedBusinessId || !selectedFarmId) return;
    loadMatrix();
  }, [selectedBusinessId, selectedFarmId]);

  const getCountyYieldParams = () => {
    if (countyYieldEnabled && expectedCountyYield && simulatedCountyYield) {
      return { expectedCountyYield, simulatedCountyYield };
    }
    return undefined;
  };

  const handleSavePolicy = async () => {
    if (!selectedBusinessId || !selectedFarmId) return;
    setIsSavingPolicy(true);
    try {
      await insuranceApi.upsertPolicy(selectedBusinessId, selectedFarmId, policyForm);
      // Reload matrix with new policy + county yield
      await loadMatrix(getCountyYieldParams());
      setShowPolicyEditor(false);
    } catch (err: any) {
      console.error('Error saving policy:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleDeletePolicy = async () => {
    if (!selectedBusinessId || !selectedFarmId) return;
    setIsSavingPolicy(true);
    try {
      await insuranceApi.deletePolicy(selectedBusinessId, selectedFarmId);
      await loadMatrix();
      setShowPolicyEditor(false);
      setCountyYieldEnabled(false);
    } catch (err: any) {
      console.error('Error deleting policy:', err);
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleSimulateCountyYield = () => {
    loadMatrix(getCountyYieldParams());
  };

  const selectedFarm = farms.find(f => f.id === selectedFarmId);

  // Summary calculations
  const summary = useMemo(() => {
    if (!matrixData) return null;
    const policy = matrixData.policy;
    const guaranteePerAcre = policy
      ? matrixData.aph * (policy.coverageLevel / 100) * policy.projectedPrice
      : 0;
    const pctMarketed = matrixData.projectedYield > 0
      ? (matrixData.marketedBushelsPerAcre / matrixData.projectedYield) * 100
      : 0;
    const totalPremium = policy
      ? policy.premiumPerAcre + (policy.hasSco ? policy.scoPremiumPerAcre : 0) + (policy.hasEco ? policy.ecoPremiumPerAcre : 0)
      : 0;

    // Find the projected scenario cell (closest to projected yield and projected price)
    let projectedCell: ProfitMatrixCell | null = null;
    if (matrixData.matrix.length > 0) {
      const targetYield = matrixData.projectedYield;
      const targetPrice = policy?.projectedPrice || DEFAULT_PRICES[matrixData.commodityType] || 5;
      let minDist = Infinity;
      for (const row of matrixData.matrix) {
        for (const cell of row) {
          const dist = Math.abs(cell.yieldBuAcre - targetYield) + Math.abs(cell.priceBu - targetPrice) * 30;
          if (dist < minDist) {
            minDist = dist;
            projectedCell = cell;
          }
        }
      }
    }

    return {
      guaranteePerAcre,
      pctMarketed,
      totalPremium,
      projectedNetProfit: projectedCell ? projectedCell.netProfitPerAcre * matrixData.acres : 0
    };
  }, [matrixData]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crop Insurance Profit Matrix</h1>
          <p className="text-sm text-gray-600 mt-1">
            See how insurance protects your revenue across yield and price scenarios
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {user.businessMemberships.length > 1 && (
            <select
              value={selectedBusinessId || ''}
              onChange={(e) => { setSelectedBusinessId(e.target.value); setSelectedFarmId(null); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            >
              {user.businessMemberships.map(m => (
                <option key={m.businessId} value={m.businessId}>{m.business.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Farm Selector */}
      {farms.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Select Farm:</label>
            <select
              value={selectedFarmId || ''}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
            >
              {farms.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} — {f.commodityType} ({f.acres} ac)
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowPolicyEditor(!showPolicyEditor)}
              className="ml-auto px-4 py-2 text-sm font-medium rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              {matrixData?.policy ? 'Edit Insurance Policy' : 'Add Insurance Policy'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3"></div>
          <p className="text-gray-500">Loading profit matrix...</p>
        </div>
      )}

      {/* Insurance Policy Editor */}
      {showPolicyEditor && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Insurance Policy Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
              <select
                value={policyForm.planType}
                onChange={(e) => setPolicyForm({ ...policyForm, planType: e.target.value as InsurancePlanType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="RP">Revenue Protection (RP)</option>
                <option value="YP">Yield Protection (YP)</option>
                <option value="RP_HPE">RP - Harvest Price Exclusion</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coverage Level: {policyForm.coverageLevel}%
              </label>
              <input
                type="range"
                min="50"
                max="85"
                step="5"
                value={policyForm.coverageLevel}
                onChange={(e) => setPolicyForm({ ...policyForm, coverageLevel: parseInt(e.target.value) })}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>50%</span><span>85%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Projected Price ($/bu)</label>
              <input
                type="number"
                step="0.01"
                value={policyForm.projectedPrice}
                onChange={(e) => setPolicyForm({ ...policyForm, projectedPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Premium ($/acre)</label>
              <input
                type="number"
                step="0.50"
                value={policyForm.premiumPerAcre}
                onChange={(e) => setPolicyForm({ ...policyForm, premiumPerAcre: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policyForm.hasSco}
                  onChange={(e) => setPolicyForm({ ...policyForm, hasSco: e.target.checked })}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-gray-700">SCO Endorsement</span>
              </label>
              {policyForm.hasSco && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Premium:</span>
                  <input
                    type="number"
                    step="0.50"
                    value={policyForm.scoPremiumPerAcre}
                    onChange={(e) => setPolicyForm({ ...policyForm, scoPremiumPerAcre: parseFloat(e.target.value) || 0 })}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-sm text-gray-500">$/ac</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policyForm.hasEco}
                  onChange={(e) => setPolicyForm({ ...policyForm, hasEco: e.target.checked })}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-gray-700">ECO Endorsement</span>
              </label>
              {policyForm.hasEco && (
                <>
                  <select
                    value={policyForm.ecoLevel || 90}
                    onChange={(e) => setPolicyForm({ ...policyForm, ecoLevel: parseInt(e.target.value) })}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={90}>90%</option>
                    <option value={95}>95%</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Premium:</span>
                    <input
                      type="number"
                      step="0.50"
                      value={policyForm.ecoPremiumPerAcre}
                      onChange={(e) => setPolicyForm({ ...policyForm, ecoPremiumPerAcre: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-sm text-gray-500">$/ac</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
            <div>
              {matrixData?.policy && (
                <button
                  onClick={handleDeletePolicy}
                  disabled={isSavingPolicy}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Remove Policy
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPolicyEditor(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePolicy}
                disabled={isSavingPolicy}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSavingPolicy ? 'Saving...' : 'Save & Recalculate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && matrixData && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Break-Even</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(matrixData.breakEvenPrice)}/bu</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">% Marketed</div>
              <div className="text-xl font-bold text-gray-900">{summary?.pctMarketed.toFixed(0)}%</div>
              <div className="text-xs text-gray-500">{matrixData.marketedBushelsPerAcre.toFixed(1)} bu/ac @ {formatCurrency(matrixData.marketedAvgPrice)}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Insurance</div>
              <div className="text-xl font-bold text-gray-900">
                {matrixData.policy ? PLAN_TYPE_LABELS[matrixData.policy.planType].split(' (')[0] : 'None'}
              </div>
              {matrixData.policy && (
                <div className="text-xs text-gray-500">{matrixData.policy.coverageLevel}% coverage</div>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Guarantee</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(summary?.guaranteePerAcre || 0)}/ac</div>
              {summary && summary.totalPremium > 0 && (
                <div className="text-xs text-gray-500">Premium: {formatCurrency(summary.totalPremium)}/ac</div>
              )}
            </div>
            <div className={`rounded-xl shadow-sm border p-4 ${
              (summary?.projectedNetProfit || 0) >= 0
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Projected Net</div>
              <div className={`text-xl font-bold ${
                (summary?.projectedNetProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(summary?.projectedNetProfit || 0, 0)}
              </div>
              <div className="text-xs text-gray-500">{matrixData.acres} acres</div>
            </div>
          </div>

          {/* Cost Breakdown */}
          {matrixData.costBreakdown && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowCostBreakdown(!showCostBreakdown)}
                className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-semibold text-gray-900">
                  Cost Breakdown — {formatCurrency(matrixData.totalCostPerAcre)}/ac
                </span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showCostBreakdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showCostBreakdown && (
                <div className="px-6 pb-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {[
                      { label: 'Fertilizer', value: matrixData.costBreakdown.fertilizerCostPerAcre, color: 'text-amber-700' },
                      { label: 'Chemical', value: matrixData.costBreakdown.chemicalCostPerAcre, color: 'text-purple-700' },
                      { label: 'Seed', value: matrixData.costBreakdown.seedCostPerAcre, color: 'text-green-700' },
                      { label: 'Land Rent', value: matrixData.costBreakdown.landRentPerAcre, color: 'text-blue-700' },
                      { label: 'Other Costs', value: matrixData.costBreakdown.otherCostsPerAcre, color: 'text-gray-700' },
                      { label: 'Equipment Loans', value: matrixData.costBreakdown.equipmentLoanCostPerAcre, color: 'text-indigo-700' },
                      { label: 'Land Loans', value: matrixData.costBreakdown.landLoanCostPerAcre, color: 'text-teal-700' },
                      { label: 'Operating Loans', value: matrixData.costBreakdown.operatingLoanCostPerAcre, color: 'text-orange-700' },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between items-center text-sm py-1">
                        <span className="text-gray-600">{item.label}</span>
                        <span className={`font-medium ${item.value > 0 ? item.color : 'text-gray-400'}`}>
                          {item.value > 0 ? formatCurrency(item.value) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {matrixData.costBreakdown.equipmentLoanCostPerAcre === 0 && matrixData.costBreakdown.landLoanCostPerAcre === 0 && (
                    <p className="text-xs text-gray-400 mt-2 italic">
                      No loan costs showing? Make sure equipment loans have "Include in Break-Even" enabled, and farms are linked to land parcels.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* County Yield Simulation (ECO/SCO) */}
          {matrixData.policy && (matrixData.policy.hasEco || matrixData.policy.hasSco) && (
            <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">County Yield Simulation</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    ECO/SCO are area-based — they pay when <em>county</em> revenue falls below trigger levels, not individual farm yield.
                    Simulate different county outcomes to see how your ECO/SCO endorsements respond.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer ml-4 shrink-0">
                  <input
                    type="checkbox"
                    checked={countyYieldEnabled}
                    onChange={(e) => {
                      setCountyYieldEnabled(e.target.checked);
                      if (e.target.checked && !expectedCountyYield) {
                        const commodity = matrixData.commodityType || 'CORN';
                        const defaultYield = DEFAULT_COUNTY_YIELDS[commodity] || 180;
                        setExpectedCountyYield(defaultYield);
                        setSimulatedCountyYield(defaultYield);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable</span>
                </label>
              </div>
              {countyYieldEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expected County Yield (bu/ac)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={expectedCountyYield || ''}
                        onChange={(e) => setExpectedCountyYield(parseFloat(e.target.value) || null)}
                        placeholder={`e.g. ${DEFAULT_COUNTY_YIELDS[matrixData.commodityType] || 180}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">RMA published expected yield for your county</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Simulated County Yield (bu/ac)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={simulatedCountyYield || ''}
                        onChange={(e) => setSimulatedCountyYield(parseFloat(e.target.value) || null)}
                        placeholder={`e.g. ${Math.round((DEFAULT_COUNTY_YIELDS[matrixData.commodityType] || 180) * 0.85)}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">What you think the county will actually produce</p>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleSimulateCountyYield}
                        disabled={!expectedCountyYield || !simulatedCountyYield || isLoading}
                        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isLoading ? 'Simulating...' : 'Run Simulation'}
                      </button>
                    </div>
                  </div>
                  {expectedCountyYield && simulatedCountyYield && expectedCountyYield > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-blue-600 font-medium">County Revenue Ratio: </span>
                          <span className="font-bold text-blue-800">
                            {((simulatedCountyYield / expectedCountyYield) * 100).toFixed(1)}%
                          </span>
                        </div>
                        {matrixData.policy.hasEco && (
                          <div>
                            <span className="text-blue-600 font-medium">ECO Trigger: </span>
                            <span className={`font-bold ${
                              (simulatedCountyYield / expectedCountyYield) < (matrixData.policy.ecoLevel || 90) / 100
                                ? 'text-green-700' : 'text-gray-500'
                            }`}>
                              {(simulatedCountyYield / expectedCountyYield) < (matrixData.policy.ecoLevel || 90) / 100
                                ? 'TRIGGERED' : 'Not triggered'}
                            </span>
                          </div>
                        )}
                        {matrixData.policy.hasSco && (
                          <div>
                            <span className="text-blue-600 font-medium">SCO Trigger: </span>
                            <span className={`font-bold ${
                              (simulatedCountyYield / expectedCountyYield) < 0.86
                                ? 'text-green-700' : 'text-gray-500'
                            }`}>
                              {(simulatedCountyYield / expectedCountyYield) < 0.86
                                ? 'TRIGGERED' : 'Not triggered'}
                            </span>
                          </div>
                        )}
                        <div className="text-blue-500 text-xs">
                          Price scenarios in the matrix are used as harvest price
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Matrix Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Price x Yield Matrix — {selectedFarm?.name}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({matrixData.commodityType}, {matrixData.acres} ac, APH: {matrixData.aph} bu/ac)
                </span>
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Each cell shows net profit per acre {matrixData.policy ? 'including insurance' : '(no insurance policy set)'}.
                {matrixData.marketedBushelsPerAcre > 0 && (
                  <> Marketed grain ({matrixData.marketedBushelsPerAcre.toFixed(1)} bu/ac @ {formatCurrency(matrixData.marketedAvgPrice)}) is locked in.</>
                )}
                {matrixData.countyYield && (
                  <> County yield simulation active: {matrixData.countyYield.simulatedCountyYield} bu/ac of {matrixData.countyYield.expectedCountyYield} expected ({((matrixData.countyYield.simulatedCountyYield / matrixData.countyYield.expectedCountyYield) * 100).toFixed(0)}%).</>
                )}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 z-10 bg-gray-50 px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Yield<br />(bu/ac)
                    </th>
                    {matrixData.priceScenarios.map((price, i) => (
                      <th key={i} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[80px]">
                        {formatCurrency(price)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.matrix.map((row, yi) => {
                    const yieldVal = matrixData.yieldScenarios[yi];
                    const aphPct = matrixData.aph > 0 ? Math.round((yieldVal / matrixData.aph) * 100) : 0;
                    const isProjectedYield = Math.abs(yieldVal - matrixData.projectedYield) <= (matrixData.aph * 0.06);
                    return (
                      <tr key={yi} className={isProjectedYield ? 'ring-2 ring-inset ring-emerald-400' : ''}>
                        <td className={`sticky left-0 z-10 px-3 py-2 text-sm font-medium border-r border-gray-200 whitespace-nowrap ${
                          isProjectedYield ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-50 text-gray-700'
                        }`}>
                          {yieldVal}
                          <span className="text-xs text-gray-400 ml-1">({aphPct}%)</span>
                        </td>
                        {row.map((cell, pi) => {
                          const isProjectedPrice = matrixData.policy
                            ? Math.abs(cell.priceBu - matrixData.policy.projectedPrice) < 0.15
                            : false;
                          return (
                            <td
                              key={pi}
                              className={`px-2 py-2 text-center text-sm cursor-pointer transition-all hover:ring-2 hover:ring-inset hover:ring-gray-400 ${getCellColor(cell.netProfitPerAcre)} ${
                                isProjectedPrice ? 'ring-1 ring-inset ring-emerald-300' : ''
                              }`}
                              onMouseEnter={() => setHoveredCell(cell)}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              <div className="font-semibold">
                                {cell.netProfitPerAcre >= 0 ? '+' : ''}{formatCurrency(cell.netProfitPerAcre, 0)}
                              </div>
                              {cell.totalInsurancePayout > 0 && (
                                <div className="text-xs text-blue-600 font-medium">
                                  +{formatCurrency(cell.totalInsurancePayout, 0)} ins
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cell Detail Tooltip */}
          {hoveredCell && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Scenario: {hoveredCell.yieldBuAcre} bu/ac @ {formatCurrency(hoveredCell.priceBu)}/bu
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Gross Revenue:</span>
                  <span className="ml-2 font-medium">{formatCurrency(hoveredCell.grossRevenuePerAcre)}/ac</span>
                </div>
                <div>
                  <span className="text-gray-500">Total Cost:</span>
                  <span className="ml-2 font-medium">{formatCurrency(hoveredCell.totalCostPerAcre)}/ac</span>
                </div>
                <div>
                  <span className="text-gray-500">Profit (no ins):</span>
                  <span className={`ml-2 font-medium ${hoveredCell.profitWithoutInsurance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(hoveredCell.profitWithoutInsurance)}/ac
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Net Profit:</span>
                  <span className={`ml-2 font-bold ${hoveredCell.netProfitPerAcre >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(hoveredCell.netProfitPerAcre)}/ac
                  </span>
                </div>
                {hoveredCell.insuranceIndemnity > 0 && (
                  <div>
                    <span className="text-gray-500">Base Indemnity:</span>
                    <span className="ml-2 font-medium text-blue-600">{formatCurrency(hoveredCell.insuranceIndemnity)}/ac</span>
                  </div>
                )}
                {hoveredCell.scoIndemnity > 0 && (
                  <div>
                    <span className="text-gray-500">SCO Payout:</span>
                    <span className="ml-2 font-medium text-blue-600">{formatCurrency(hoveredCell.scoIndemnity)}/ac</span>
                  </div>
                )}
                {hoveredCell.ecoIndemnity > 0 && (
                  <div>
                    <span className="text-gray-500">ECO Payout:</span>
                    <span className="ml-2 font-medium text-blue-600">{formatCurrency(hoveredCell.ecoIndemnity)}/ac</span>
                  </div>
                )}
                {hoveredCell.insurancePremiumCost > 0 && (
                  <div>
                    <span className="text-gray-500">Premium Cost:</span>
                    <span className="ml-2 font-medium text-orange-600">-{formatCurrency(hoveredCell.insurancePremiumCost)}/ac</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Understanding the Matrix</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <p className="font-medium text-gray-700 mb-1">Color Scale</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium">Profitable (&gt;$100)</span>
                  <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-medium">Near Break-Even</span>
                  <span className="inline-flex items-center px-2 py-1 rounded bg-yellow-50 text-yellow-800 text-xs font-medium">Small Loss</span>
                  <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-medium">Significant Loss</span>
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">Insurance Types</p>
                <ul className="space-y-1">
                  <li><strong>RP:</strong> Protects revenue — guarantee increases if harvest price rises above projected price</li>
                  <li><strong>YP:</strong> Protects yield only — pays if yield falls below APH x coverage %</li>
                  <li><strong>RP-HPE:</strong> Like RP but guarantee fixed at projected price (lower premium)</li>
                  <li><strong>SCO:</strong> Area-based — covers 86% down to your base coverage level. Triggered by county revenue loss (RP/RP-HPE) or county yield loss (YP).</li>
                  <li><strong>ECO:</strong> Area-based — covers 90% or 95% down to 86%. Triggered by county revenue loss (RP/RP-HPE) or county yield loss (YP). Price drops alone can trigger under RP.</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && farms.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 font-medium">No farms found for {filterYear}</p>
          <p className="text-gray-400 text-sm mt-1">Add farms in the Break-Even section first</p>
        </div>
      )}
    </div>
  );
}
