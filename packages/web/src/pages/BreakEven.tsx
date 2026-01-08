import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { breakevenApi } from '../api/breakeven.api';
import { OperationBreakEven } from '@business-app/shared';

export default function BreakEven() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<OperationBreakEven | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number>(2026);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

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
      loadBreakEven();
    }
  }, [selectedBusinessId, filterYear]);

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
              <h1 className="text-2xl font-bold text-gray-900">Break-Even Calculator</h1>
              <p className="text-sm text-gray-600">Operation-wide cost analysis for {filterYear}</p>
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
                onClick={() => navigate('/dashboard')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/breakeven/products')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Products
              </button>
              <button
                onClick={() => navigate('/breakeven/farms')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Farms
              </button>
              <button
                onClick={() => navigate('/grain-contracts/dashboard')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Grain Dashboard
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
            <p className="mt-2 text-gray-600">Loading break-even analysis...</p>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && summary && (
          <div className="space-y-8">
            {/* Operation Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Operation</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Acres:</span>
                    <span className="text-2xl font-bold text-blue-600">{summary.totalAcres.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Cost:</span>
                    <span className="text-2xl font-bold text-red-600">${summary.totalCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* By Commodity */}
            {summary.byCommodity.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Break-Even by Commodity</h3>
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
                          <span className="text-gray-600">Acres:</span>
                          <span className="font-semibold">{commodity.acres.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Cost:</span>
                          <span className="font-semibold text-red-600">${commodity.totalCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cost/Acre:</span>
                          <span className="font-semibold">${commodity.costPerAcre.toFixed(2)}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Break-Even:</span>
                            <span className="text-lg font-bold text-purple-600">${commodity.breakEvenPrice.toFixed(2)}/bu</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By Entity */}
            {summary.byEntity.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Break-Even by Entity</h3>
                <div className="space-y-6">
                  {summary.byEntity.map((entity) => (
                    <div key={`${entity.grainEntityId}-${entity.commodityType}`} className="border-b pb-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium text-gray-900">{entity.grainEntityName} - {entity.commodityType}</h4>
                        <span className="text-lg font-bold text-purple-600">${entity.breakEvenPrice.toFixed(2)}/bu</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Acres:</span>
                          <p className="font-semibold">{entity.totalAcres.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Cost:</span>
                          <p className="font-semibold text-red-600">${entity.totalCost.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Cost/Acre:</span>
                          <p className="font-semibold">${entity.costPerAcre.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Farms:</span>
                          <p className="font-semibold">{entity.farms.length}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !summary && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No break-even data available</p>
            <div className="space-x-2">
              <button
                onClick={() => navigate('/breakeven/products')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Set Up Products
              </button>
              <button
                onClick={() => navigate('/breakeven/farms')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Farms
              </button>
            </div>
          </div>
        )}

        {/* Empty State with Data but No Farms */}
        {!isLoading && summary && summary.byCommodity.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <p className="text-gray-500 mb-4">No farms or cost data for {filterYear}</p>
            <p className="text-sm text-gray-400 mb-4">Set up your product catalog and add farms to track break-even costs</p>
            <div className="space-x-2">
              <button
                onClick={() => navigate('/breakeven/products')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Manage Products
              </button>
              <button
                onClick={() => navigate('/breakeven/farms')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Manage Farms
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
