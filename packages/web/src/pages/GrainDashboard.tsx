import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { analyticsApi } from '../api/analytics.api';
import { DashboardSummary } from '@business-app/shared';
import DashboardCard from '../components/grain/DashboardCard';
import ProgressBar from '../components/grain/ProgressBar';
import PieChart from '../components/grain/PieChart';
import MarketPriceWidget from '../components/grain/MarketPriceWidget';

export default function GrainDashboard() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number>(2026);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user && user.businessMemberships.length > 0 && !selectedBusinessId) {
      const rittgersFarm = user.businessMemberships.find(m => m.business.name === 'Rittgers Farm');
      if (rittgersFarm) {
        setSelectedBusinessId(rittgersFarm.businessId);
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
      const dashboardData = await analyticsApi.getDashboardSummary(selectedBusinessId, {
        year: filterYear
      });
      setSummary(dashboardData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Grain Marketing Dashboard</h1>
              <p className="text-sm text-gray-600">Overview of production and sales for {filterYear}</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
              <button
                onClick={() => navigate('/grain-contracts/production')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Production
              </button>
              <button
                onClick={() => navigate('/grain-contracts')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Contracts
              </button>
              <button
                onClick={() => navigate('/breakeven')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Breakeven
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardCard
                title="Total Projected"
                value={summary.totalProjected.toLocaleString()}
                subtitle="bushels"
                color="blue"
                icon={<span className="text-2xl">🌾</span>}
              />
              <DashboardCard
                title="Total Sold"
                value={summary.totalSold.toLocaleString()}
                subtitle="bushels"
                color="green"
                icon={<span className="text-2xl">✅</span>}
              />
              <DashboardCard
                title="Remaining"
                value={summary.totalRemaining.toLocaleString()}
                subtitle="bushels"
                color="yellow"
                icon={<span className="text-2xl">📦</span>}
              />
              <DashboardCard
                title="Percentage Sold"
                value={`${summary.percentageSold.toFixed(1)}%`}
                subtitle="of total"
                color={summary.percentageSold >= 75 ? 'green' : summary.percentageSold >= 50 ? 'yellow' : 'red'}
                icon={<span className="text-2xl">📊</span>}
              />
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
      </main>
    </div>
  );
}
