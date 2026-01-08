import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { breakevenApi } from '../api/breakeven.api';
import { grainContractsApi } from '../api/grain-contracts.api';
import {
  Farm,
  GrainEntity,
  CommodityType
} from '@business-app/shared';

export default function FarmManagement() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [entities, setEntities] = useState<GrainEntity[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterEntity, setFilterEntity] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<number>(2026);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [formData, setFormData] = useState({
    grainEntityId: '',
    name: '',
    acres: '',
    commodityType: 'CORN' as CommodityType,
    year: 2026,
    projectedYield: '200',
    aph: '200',
    notes: ''
  });

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
      loadData();
    }
  }, [selectedBusinessId, filterEntity, filterYear]);

  const loadData = async () => {
    if (!selectedBusinessId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load entities
      const entitiesData = await grainContractsApi.getGrainEntities(selectedBusinessId);
      setEntities(entitiesData);

      // Load farms with filters
      const farmsData = await breakevenApi.getFarms(selectedBusinessId, {
        grainEntityId: filterEntity === 'ALL' ? undefined : filterEntity,
        year: filterYear
      });
      setFarms(farmsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load farms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getYieldDefaults = (commodityType: CommodityType) => {
    switch (commodityType) {
      case 'CORN':
        return { projectedYield: '200', aph: '200' };
      case 'SOYBEANS':
        return { projectedYield: '65', aph: '65' };
      case 'WHEAT':
        return { projectedYield: '80', aph: '80' };
      default:
        return { projectedYield: '0', aph: '0' };
    }
  };

  const handleCommodityChange = (commodityType: CommodityType) => {
    const defaults = getYieldDefaults(commodityType);
    setFormData({
      ...formData,
      commodityType,
      projectedYield: defaults.projectedYield,
      aph: defaults.aph
    });
  };

  const handleAdd = () => {
    setEditingFarm(null);
    setFormData({
      grainEntityId: entities.length > 0 ? entities[0].id : '',
      name: '',
      acres: '',
      commodityType: 'CORN' as any,
      year: filterYear,
      projectedYield: '200',
      aph: '200',
      notes: ''
    });
    setShowModal(true);
  };

  const handleEdit = (farm: Farm) => {
    setEditingFarm(farm);
    setFormData({
      grainEntityId: farm.grainEntityId,
      name: farm.name,
      acres: farm.acres.toString(),
      commodityType: farm.commodityType,
      year: farm.year,
      projectedYield: farm.projectedYield.toString(),
      aph: farm.aph.toString(),
      notes: farm.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!selectedBusinessId) return;
    if (!confirm('Are you sure you want to delete this farm? This will also delete all associated costs.')) return;

    try {
      await breakevenApi.deleteFarm(selectedBusinessId, id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete farm');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId) return;

    try {
      const data = {
        grainEntityId: formData.grainEntityId,
        name: formData.name,
        acres: parseFloat(formData.acres),
        commodityType: formData.commodityType,
        year: formData.year,
        projectedYield: parseFloat(formData.projectedYield),
        aph: parseFloat(formData.aph),
        notes: formData.notes || undefined
      };

      if (editingFarm) {
        await breakevenApi.updateFarm(selectedBusinessId, editingFarm.id, data);
      } else {
        await breakevenApi.createFarm(selectedBusinessId, data);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save farm');
    }
  };

  const handleViewCosts = (farmId: string) => {
    navigate(`/breakeven/farms/${farmId}/costs`);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Farm Management</h1>
              <p className="text-sm text-gray-600">Manage farms and track costs</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/breakeven')}
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
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity</label>
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ALL">All Entities</option>
                {entities.map(entity => (
                  <option key={entity.id} value={entity.id}>{entity.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
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
            </div>

            <div className="ml-auto">
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Add Farm
              </button>
            </div>
          </div>
        </div>

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
            <p className="mt-2 text-gray-600">Loading farms...</p>
          </div>
        )}

        {/* Farms Table */}
        {!isLoading && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Farm Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commodity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acres
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {farms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No farms found. Click "Add Farm" to create one.
                    </td>
                  </tr>
                ) : (
                  farms.map((farm) => (
                    <tr key={farm.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewCosts(farm.id)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          {farm.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farm.grainEntity?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farm.commodityType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farm.acres.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {farm.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewCosts(farm.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Costs
                        </button>
                        <button
                          onClick={() => handleEdit(farm)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(farm.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingFarm ? 'Edit Farm' : 'Add Farm'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entity *
                  </label>
                  <select
                    value={formData.grainEntityId}
                    onChange={(e) => setFormData({ ...formData, grainEntityId: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Entity</option>
                    {entities.map(entity => (
                      <option key={entity.id} value={entity.id}>{entity.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Farm Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g., North 40"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Acres *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.acres}
                    onChange={(e) => setFormData({ ...formData, acres: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="120.5"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commodity *
                  </label>
                  <select
                    value={formData.commodityType}
                    onChange={(e) => handleCommodityChange(e.target.value as CommodityType)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="CORN">Corn</option>
                    <option value="SOYBEANS">Soybeans</option>
                    <option value="WHEAT">Wheat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Projected Yield (bu/acre) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.projectedYield}
                    onChange={(e) => setFormData({ ...formData, projectedYield: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    APH (bu/acre) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.aph}
                    onChange={(e) => setFormData({ ...formData, aph: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    placeholder="Optional notes about this farm"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingFarm ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
