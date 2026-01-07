import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { breakevenApi } from '../api/breakeven.api';
import { Fertilizer, Chemical, SeedHybrid, UnitType, CommodityType } from '@business-app/shared';

type TabType = 'fertilizers' | 'chemicals' | 'seedHybrids';

export default function ProductCatalog() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('fertilizers');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Product lists
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [seedHybrids, setSeedHybrids] = useState<SeedHybrid[]>([]);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user && user.businessMemberships.length > 0 && !selectedBusinessId) {
      const rittgersFarm = user.businessMemberships.find(m => m.business.name === 'Rittgers Farm' || m.business.name === 'Rittgers Farms');
      if (rittgersFarm) {
        setSelectedBusinessId(rittgersFarm.businessId);
      } else {
        setSelectedBusinessId(user.businessMemberships[0].businessId);
      }
    }
  }, [user, selectedBusinessId]);

  useEffect(() => {
    if (selectedBusinessId) {
      loadProducts();
    }
  }, [selectedBusinessId, activeTab]);

  const loadProducts = async () => {
    if (!selectedBusinessId) return;

    setIsLoading(true);
    setError(null);

    try {
      if (activeTab === 'fertilizers') {
        const data = await breakevenApi.getFertilizers(selectedBusinessId);
        setFertilizers(data);
      } else if (activeTab === 'chemicals') {
        const data = await breakevenApi.getChemicals(selectedBusinessId);
        setChemicals(data);
      } else if (activeTab === 'seedHybrids') {
        const data = await breakevenApi.getSeedHybrids(selectedBusinessId);
        setSeedHybrids(data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    if (activeTab === 'fertilizers' || activeTab === 'chemicals') {
      setFormData({ name: '', pricePerUnit: '', unit: 'LB' });
    } else {
      setFormData({ name: '', commodityType: 'CORN', pricePerBag: '', seedsPerBag: '' });
    }
    setShowModal(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!selectedBusinessId) return;
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      if (activeTab === 'fertilizers') {
        await breakevenApi.deleteFertilizer(selectedBusinessId, id);
      } else if (activeTab === 'chemicals') {
        await breakevenApi.deleteChemical(selectedBusinessId, id);
      } else {
        await breakevenApi.deleteSeedHybrid(selectedBusinessId, id);
      }
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete item');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId) return;

    try {
      if (activeTab === 'fertilizers') {
        const data = {
          name: formData.name,
          pricePerUnit: parseFloat(formData.pricePerUnit),
          unit: formData.unit as UnitType
        };
        if (editingItem) {
          await breakevenApi.updateFertilizer(selectedBusinessId, editingItem.id, data);
        } else {
          await breakevenApi.createFertilizer(selectedBusinessId, data);
        }
      } else if (activeTab === 'chemicals') {
        const data = {
          name: formData.name,
          pricePerUnit: parseFloat(formData.pricePerUnit),
          unit: formData.unit as UnitType
        };
        if (editingItem) {
          await breakevenApi.updateChemical(selectedBusinessId, editingItem.id, data);
        } else {
          await breakevenApi.createChemical(selectedBusinessId, data);
        }
      } else {
        const data = {
          name: formData.name,
          commodityType: formData.commodityType as CommodityType,
          pricePerBag: parseFloat(formData.pricePerBag),
          seedsPerBag: parseInt(formData.seedsPerBag)
        };
        if (editingItem) {
          await breakevenApi.updateSeedHybrid(selectedBusinessId, editingItem.id, data);
        } else {
          await breakevenApi.createSeedHybrid(selectedBusinessId, data);
        }
      }

      setShowModal(false);
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save item');
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
              <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
              <p className="text-sm text-gray-600">Manage fertilizers, chemicals, and seed hybrids</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/breakeven')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Break-Even Dashboard
              </button>
              <button
                onClick={() => navigate('/breakeven/farms')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Farms
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

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('fertilizers')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'fertilizers'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Fertilizers
              </button>
              <button
                onClick={() => setActiveTab('chemicals')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'chemicals'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Chemicals
              </button>
              <button
                onClick={() => setActiveTab('seedHybrids')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'seedHybrids'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Seed Hybrids
              </button>
            </nav>
          </div>

          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTab === 'fertilizers' && 'Fertilizers'}
                {activeTab === 'chemicals' && 'Chemicals'}
                {activeTab === 'seedHybrids' && 'Seed Hybrids'}
              </h2>
              <button
                onClick={handleAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add {activeTab === 'fertilizers' ? 'Fertilizer' : activeTab === 'chemicals' ? 'Chemical' : 'Seed Hybrid'}
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      {activeTab === 'seedHybrids' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Commodity
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {activeTab === 'seedHybrids' ? 'Price/Bag' : 'Price/Unit'}
                      </th>
                      {activeTab !== 'seedHybrids' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit
                        </th>
                      )}
                      {activeTab === 'seedHybrids' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Seeds/Bag
                        </th>
                      )}
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeTab === 'fertilizers' && fertilizers.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.pricePerUnit.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">Edit</button>
                          <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'chemicals' && chemicals.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.pricePerUnit.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">Edit</button>
                          <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))}
                    {activeTab === 'seedHybrids' && seedHybrids.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.commodityType}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.pricePerBag.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.seedsPerBag.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-900">Edit</button>
                          <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {((activeTab === 'fertilizers' && fertilizers.length === 0) ||
                  (activeTab === 'chemicals' && chemicals.length === 0) ||
                  (activeTab === 'seedHybrids' && seedHybrids.length === 0)) && (
                  <div className="text-center py-8 text-gray-500">
                    No items yet. Click "Add" to create your first item.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit' : 'Add'} {activeTab === 'fertilizers' ? 'Fertilizer' : activeTab === 'chemicals' ? 'Chemical' : 'Seed Hybrid'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                {activeTab === 'seedHybrids' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commodity Type</label>
                    <select
                      value={formData.commodityType || 'CORN'}
                      onChange={(e) => setFormData({ ...formData, commodityType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="CORN">Corn</option>
                      <option value="SOYBEANS">Soybeans</option>
                      <option value="WHEAT">Wheat</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {activeTab === 'seedHybrids' ? 'Price per Bag' : 'Price per Unit'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={activeTab === 'seedHybrids' ? (formData.pricePerBag || '') : (formData.pricePerUnit || '')}
                    onChange={(e) => setFormData({
                      ...formData,
                      [activeTab === 'seedHybrids' ? 'pricePerBag' : 'pricePerUnit']: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                {activeTab !== 'seedHybrids' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      value={formData.unit || 'LB'}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="LB">LB (Pounds)</option>
                      <option value="GAL">GAL (Gallons)</option>
                    </select>
                  </div>
                )}

                {activeTab === 'seedHybrids' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seeds per Bag</label>
                    <input
                      type="number"
                      value={formData.seedsPerBag || ''}
                      onChange={(e) => setFormData({ ...formData, seedsPerBag: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                )}
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
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
