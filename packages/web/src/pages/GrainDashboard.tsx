import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { analyticsApi } from '../api/analytics.api';
import { grainBinsApi } from '../api/grain-bins.api';
import { oldCropInventoryApi } from '../api/old-crop-inventory.api';
import { DashboardSummary, GrainBin, OldCropInventory, CommodityType } from '@business-app/shared';
import DashboardCard from '../components/grain/DashboardCard';
import ProgressBar from '../components/grain/ProgressBar';
import PieChart from '../components/grain/PieChart';
import MarketPriceWidget from '../components/grain/MarketPriceWidget';
import { GrainBinVisual } from '../components/grain/GrainBinVisual';

export default function GrainDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [bins, setBins] = useState<GrainBin[]>([]);
  const [oldCropInventory, setOldCropInventory] = useState<OldCropInventory[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number>(2026);
  const [oldCropExpanded, setOldCropExpanded] = useState(false);
  const [editingOldCrop, setEditingOldCrop] = useState<{commodity: CommodityType, bushels: string} | null>(null);
  const [savingOldCrop, setSavingOldCrop] = useState(false);

  useEffect(() => {
    if (user && user.businessMemberships.length > 0 && !selectedBusinessId) {
      const demoFarm = user.businessMemberships.find(m =>
        m.business.name === 'Demo Farm' ||
        m.business.name === 'Rittgers Farm' ||
        m.business.name === 'Rittgers Farms'
      );
      if (demoFarm) {
        setSelectedBusinessId(demoFarm.businessId);
      } else {
        setSelectedBusinessId(user.businessMemberships[0].businessId);
      }
    }
  }, [user, selectedBusinessId]);

  useEffect(() => {
    if (selectedBusinessId) {
      loadDashboard();
    }
  }, [selectedBusinessId, filterYear]);

  const loadDashboard = async () => {
    if (!selectedBusinessId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [dashboardData, binsData, oldCropData] = await Promise.all([
        analyticsApi.getDashboardSummary(selectedBusinessId, {
          year: filterYear
        }),
        grainBinsApi.getBinsByBusiness(selectedBusinessId),
        oldCropInventoryApi.getInventory(selectedBusinessId)
      ]);
      setSummary(dashboardData);
      setBins(binsData);
      setOldCropInventory(oldCropData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOldCrop = async (commodity: CommodityType, bushels: number) => {
    if (!selectedBusinessId) return;

    setSavingOldCrop(true);
    try {
      // Use previous year as old crop year (e.g., 2025 for 2026 new crop year)
      const oldCropYear = filterYear - 1;
      await oldCropInventoryApi.updateInventory(selectedBusinessId, {
        commodityType: commodity,
        unpricedBushels: bushels,
        cropYear: oldCropYear
      });

      // Reload inventory
      const updatedInventory = await oldCropInventoryApi.getInventory(selectedBusinessId);
      setOldCropInventory(updatedInventory);
      setEditingOldCrop(null);
    } catch (err: any) {
      console.error('Failed to save old crop inventory:', err);
      alert('Failed to save old crop inventory');
    } finally {
      setSavingOldCrop(false);
    }
  };

  const getOldCropBushels = (commodity: CommodityType): number => {
    const oldCropYear = filterYear - 1;
    const entry = oldCropInventory.find(
      inv => inv.commodityType === commodity && inv.cropYear === oldCropYear
    );
    return entry?.unpricedBushels || 0;
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grain Marketing Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of production and sales for {filterYear}</p>
        </div>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(parseInt(e.target.value))}
          className="rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm px-4 py-2"
        >
          <option value={2024}>2024</option>
          <option value={2025}>2025</option>
          <option value={2026}>2026</option>
          <option value={2027}>2027</option>
        </select>
      </div>

      <div>
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading dashboard...</p>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && summary && (
          <div className="space-y-8">
            {/* Summary Cards - By Commodity */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {summary.byCommodity.flatMap((commodity) => [
                <DashboardCard
                  key={`${commodity.commodityType}-sold`}
                  title={`${commodity.commodityType} Sold`}
                  value={commodity.sold.toLocaleString()}
                  subtitle="bushels"
                  color="green"
                  icon={<span className="text-2xl">
                    {commodity.commodityType === 'CORN' ? '🌽' : commodity.commodityType === 'SOYBEANS' ? '🫘' : '🌾'}
                  </span>}
                />,
                <DashboardCard
                  key={`${commodity.commodityType}-remaining`}
                  title={`${commodity.commodityType} Remaining`}
                  value={commodity.remaining.toLocaleString()}
                  subtitle="bushels"
                  color="yellow"
                  icon={<span className="text-2xl">📦</span>}
                />
              ])}
            </div>

            {/* Average Price Cards - One per Commodity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {summary.byCommodity.map((commodity) => (
                <DashboardCard
                  key={`avg-price-${commodity.commodityType}`}
                  title={`Avg ${commodity.commodityType} Price`}
                  value={commodity.averagePrice > 0
                    ? `$${commodity.averagePrice.toFixed(2)}`
                    : 'N/A'}
                  subtitle="per bushel"
                  color="purple"
                  icon={<span className="text-2xl">
                    {commodity.commodityType === 'CORN' ? '🌽' :
                     commodity.commodityType === 'SOYBEANS' ? '🫘' : '🌾'}
                  </span>}
                />
              ))}
            </div>

            {/* Commodity Specific Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {summary.byCommodity.map((commodity) => {
                const percentageSold = commodity.projected > 0 ? (commodity.sold / commodity.projected) * 100 : 0;
                return (
                  <div key={commodity.commodityType} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{commodity.commodityType}</h3>
                      <span className="text-3xl">
                        {commodity.commodityType === 'CORN' ? '🌽' : commodity.commodityType === 'SOYBEANS' ? '🫘' : '🌾'}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Projected:</span>
                        <span className="text-lg font-bold text-blue-600">{commodity.projected.toLocaleString()} bu</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Sold:</span>
                        <span className="text-lg font-bold text-green-600">{commodity.sold.toLocaleString()} bu</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Remaining:</span>
                        <span className="text-lg font-bold text-yellow-600">{commodity.remaining.toLocaleString()} bu</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg Price:</span>
                        <span className="text-lg font-bold text-purple-600">
                          {commodity.averagePrice > 0
                            ? `$${commodity.averagePrice.toFixed(2)}/bu`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="pt-3 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Progress:</span>
                          <span className={`text-xl font-bold ${percentageSold >= 75 ? 'text-green-600' : percentageSold >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {percentageSold.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-full rounded-full transition-all ${percentageSold >= 75 ? 'bg-green-500' : percentageSold >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(percentageSold, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Old Crop Inventory Section */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => setOldCropExpanded(!oldCropExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📦</span>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">Old Crop Inventory ({filterYear - 1})</h3>
                    <p className="text-sm text-gray-500">Unpriced bushels from previous crop year</p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${oldCropExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {oldCropExpanded && (
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(['CORN', 'SOYBEANS', 'WHEAT'] as CommodityType[]).map((commodity) => {
                      const bushels = getOldCropBushels(commodity);
                      const isEditing = editingOldCrop?.commodity === commodity;

                      return (
                        <div
                          key={commodity}
                          className="border rounded-lg p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {commodity === 'CORN' ? '🌽' : commodity === 'SOYBEANS' ? '🫘' : '🌾'}
                            </span>
                            <div>
                              <p className="font-medium text-gray-900">{commodity}</p>
                              {isEditing ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    type="number"
                                    value={editingOldCrop.bushels}
                                    onChange={(e) => setEditingOldCrop({
                                      commodity,
                                      bushels: e.target.value
                                    })}
                                    className="w-28 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    placeholder="0"
                                    autoFocus
                                  />
                                  <span className="text-sm text-gray-500">bu</span>
                                </div>
                              ) : (
                                <p className="text-sm text-amber-600 font-semibold">
                                  {bushels > 0 ? `${bushels.toLocaleString()} bu unpriced` : 'No inventory'}
                                </p>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSaveOldCrop(commodity, parseFloat(editingOldCrop.bushels) || 0)}
                                disabled={savingOldCrop}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {savingOldCrop ? '...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingOldCrop(null)}
                                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingOldCrop({
                                commodity,
                                bushels: bushels.toString()
                              })}
                              className="px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-4 text-xs text-gray-500 text-center">
                    Old crop inventory is tracked separately and does not affect new crop break-even calculations.
                  </p>
                </div>
              )}
            </div>

            {/* Grain Bin Storage Visual */}
            {bins.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Grain Bin Storage</h3>
                    <p className="text-sm text-gray-500">Current inventory levels by bin</p>
                  </div>
                  <button
                    onClick={() => navigate('/grain-contracts/bins')}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Manage Bins
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                  {bins
                    .filter(bin => bin.isActive)
                    .sort((a, b) => {
                      // Sort by commodity type, then by fill percentage (most full first)
                      if (a.commodityType !== b.commodityType) {
                        return a.commodityType.localeCompare(b.commodityType);
                      }
                      const fillA = (a.currentBushels / a.capacity) * 100;
                      const fillB = (b.currentBushels / b.capacity) * 100;
                      return fillB - fillA;
                    })
                    .map(bin => (
                      <GrainBinVisual
                        key={bin.id}
                        bin={bin}
                        onClick={() => navigate('/grain-contracts/bins')}
                      />
                    ))}
                </div>

                {bins.filter(b => b.isActive).length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No active grain bins yet</p>
                    <button
                      onClick={() => navigate('/grain-contracts/bins')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Create Your First Bin
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Market Prices & Commodity Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Market Price Widget */}
              <MarketPriceWidget />

              {/* Commodity Breakdown Pie Chart */}
              <PieChart
                title="Bushels by Commodity"
                data={summary.byCommodity.map((item) => ({
                  label: item.commodityType,
                  value: item.sold,
                  color: item.commodityType === 'CORN' ? '#fbbf24' : item.commodityType === 'SOYBEANS' ? '#10b981' : '#f59e0b'
                }))}
              />
            </div>

            {/* Contract Type Breakdown */}
            {summary.byContractType.length > 0 && (
              <PieChart
                title="Bushels by Contract Type"
                data={summary.byContractType.map((item) => ({
                  label: item.contractType,
                  value: item.totalBushels,
                  color: item.contractType === 'CASH' ? '#10b981' : item.contractType === 'BASIS' ? '#3b82f6' : item.contractType === 'HTA' ? '#8b5cf6' : '#f97316'
                }))}
              />
            )}

            {/* Progress by Entity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Progress by Entity</h3>
              <div className="space-y-6">
                {summary.byEntity.map((entity) => (
                  <div key={`${entity.grainEntityId}-${entity.commodityType}`} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        {entity.grainEntityName} - {entity.commodityType}
                      </h4>
                      <div className="flex items-center gap-4">
                        {entity.averagePrice > 0 && (
                          <span className="text-sm font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                            Avg: ${entity.averagePrice.toFixed(2)}/bu
                          </span>
                        )}
                        <span className="text-sm text-gray-500">{entity.year}</span>
                      </div>
                    </div>
                    <ProgressBar
                      label={`${entity.commodityType}`}
                      current={entity.totalSold}
                      total={entity.totalProjected}
                      color={entity.percentageSold >= 75 ? 'green' : entity.percentageSold >= 50 ? 'yellow' : 'red'}
                    />
                    {entity.contracts.length > 0 && (
                      <div className="mt-2 pl-4 text-sm text-gray-600">
                        <p>{entity.contracts.length} contract{entity.contracts.length > 1 ? 's' : ''}</p>
                      </div>
                    )}
                  </div>
                ))}
                {summary.byEntity.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No production data available. Add production records to see entity progress.
                  </p>
                )}
              </div>
            </div>

            {/* Commodity Detailed Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Commodity Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {summary.byCommodity.map((commodity) => (
                  <div key={commodity.commodityType} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{commodity.commodityType}</h4>
                      <span className="text-2xl">
                        {commodity.commodityType === 'CORN' ? '🌽' : commodity.commodityType === 'SOYBEANS' ? '🫘' : '🌾'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Projected:</span>
                        <span className="font-semibold">{commodity.projected.toLocaleString()} bu</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sold:</span>
                        <span className="font-semibold text-green-600">{commodity.sold.toLocaleString()} bu</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Remaining:</span>
                        <span className="font-semibold text-yellow-600">{commodity.remaining.toLocaleString()} bu</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg Price:</span>
                        <span className="font-semibold text-purple-600">
                          {commodity.averagePrice > 0
                            ? `$${commodity.averagePrice.toFixed(2)}/bu`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sold %:</span>
                          <span className="font-bold">
                            {commodity.projected > 0 ? ((commodity.sold / commodity.projected) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !summary && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No dashboard data available</p>
            <button
              onClick={() => navigate('/grain-contracts/production')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Production Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
