import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { productionApi } from '../api/production.api';
import { grainContractsApi } from '../api/grain-contracts.api';
import {
  CropYearProduction,
  GrainEntity,
  CommodityType,
  CreateProductionRequest,
  UpdateProductionRequest
} from '@business-app/shared';

export default function GrainProduction() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const [productions, setProductions] = useState<CropYearProduction[]>([]);
  const [entities, setEntities] = useState<GrainEntity[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterEntity, setFilterEntity] = useState<string>('ALL');
  const [filterCommodity, setFilterCommodity] = useState<CommodityType | 'ALL'>('ALL');
  const [filterYear, setFilterYear] = useState<number>(2026);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingProduction, setEditingProduction] = useState<CropYearProduction | null>(null);
  const [formData, setFormData] = useState({
    grainEntityId: '',
    commodityType: 'CORN' as CommodityType,
    year: 2026,
    acres: '',
    bushelsPerAcre: '',
    notes: ''
  });

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
      loadData();
    }
  }, [selectedBusinessId, filterEntity, filterCommodity, filterYear]);

  const loadData = async () => {
    if (!selectedBusinessId) return;

    setIsLoading(true);
    setError(null);

    try {
      const entitiesData = await grainContractsApi.getGrainEntities(selectedBusinessId);
      setEntities(entitiesData);

      const productionsData = await productionApi.getProductions(selectedBusinessId, {
        grainEntityId: filterEntity === 'ALL' ? undefined : filterEntity,
        commodityType: filterCommodity === 'ALL' ? undefined : filterCommodity,
        year: filterYear
      });
      setProductions(productionsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load production data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForm = (production?: CropYearProduction) => {
    if (production) {
      setEditingProduction(production);
      setFormData({
        grainEntityId: production.grainEntityId,
        commodityType: production.commodityType,
        year: production.year,
        acres: production.acres.toString(),
        bushelsPerAcre: production.bushelsPerAcre.toString(),
        notes: production.notes || ''
      });
    } else {
      setEditingProduction(null);
      setFormData({
        grainEntityId: entities[0]?.id || '',
        commodityType: 'CORN' as CommodityType,
        year: filterYear,
        acres: '',
        bushelsPerAcre: '',
        notes: ''
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProduction(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data: CreateProductionRequest | UpdateProductionRequest = {
        grainEntityId: formData.grainEntityId,
        commodityType: formData.commodityType,
        year: formData.year,
        acres: parseFloat(formData.acres),
        bushelsPerAcre: parseFloat(formData.bushelsPerAcre),
        notes: formData.notes || undefined
      };

      if (editingProduction) {
        await productionApi.updateProduction(editingProduction.id, data);
      } else {
        await productionApi.createProduction(data as CreateProductionRequest);
      }

      handleCloseForm();
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save production data');
    }
  };

  const handleDelete = async (productionId: string) => {
    if (!confirm('Are you sure you want to delete this production record?')) return;

    try {
      await productionApi.deleteProduction(productionId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete production record');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getCommodityIcon = (commodity: CommodityType) => {
    switch (commodity) {
      case 'CORN': return '🌽';
      case 'SOYBEANS': return '🫘';
      case 'WHEAT': return '🌾';
    }
  };

  const calculateTotal = () => {
    const acres = parseFloat(formData.acres) || 0;
    const bushelsPerAcre = parseFloat(formData.bushelsPerAcre) || 0;
    return acres * bushelsPerAcre;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Grain Production</h1>
              <p className="text-sm text-gray-600">Manage acres and yield projections</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/grain-contracts')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View Contracts
              </button>
              <button
                onClick={() => navigate('/grain-contracts/dashboard')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Dashboard
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
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entity</label>
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ALL">All Entities</option>
                {entities.map(entity => (
                  <option key={entity.id} value={entity.id}>{entity.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Commodity</label>
              <select
                value={filterCommodity}
                onChange={(e) => setFilterCommodity(e.target.value as any)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ALL">All Commodities</option>
                <option value="CORN">Corn</option>
                <option value="SOYBEANS">Soybeans</option>
                <option value="WHEAT">Wheat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => handleOpenForm()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                + Add Production
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
            <p className="mt-2 text-gray-600">Loading production data...</p>
          </div>
        )}

        {/* Production List */}
        {!isLoading && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commodity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acres</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bu/Acre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Projected</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No production records found. Click "Add Production" to create one.
                    </td>
                  </tr>
                ) : (
                  productions.map((production) => (
                    <tr key={production.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {entities.find(e => e.id === production.grainEntityId)?.name || production.grainEntityId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="mr-2">{getCommodityIcon(production.commodityType)}</span>
                        {production.commodityType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{production.year}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{production.acres.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{production.bushelsPerAcre.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {production.totalProjected.toLocaleString()} bu
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleOpenForm(production)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(production.id)}
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingProduction ? 'Edit Production' : 'Add Production'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Commodity</label>
                <select
                  value={formData.commodityType}
                  onChange={(e) => setFormData({ ...formData, commodityType: e.target.value as CommodityType })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="CORN">Corn</option>
                  <option value="SOYBEANS">Soybeans</option>
                  <option value="WHEAT">Wheat</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acres</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.acres}
                  onChange={(e) => setFormData({ ...formData, acres: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bushels per Acre</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bushelsPerAcre}
                  onChange={(e) => setFormData({ ...formData, bushelsPerAcre: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-gray-700">
                  Total Projected: <span className="font-bold">{calculateTotal().toLocaleString()} bushels</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  {editingProduction ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
