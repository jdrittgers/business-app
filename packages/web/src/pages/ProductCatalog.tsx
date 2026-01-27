import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { breakevenApi } from '../api/breakeven.api';
import { Fertilizer, Chemical, SeedHybrid, UnitType, CommodityType, ChemicalCategory } from '@business-app/shared';

type TabType = 'fertilizers' | 'chemicals' | 'seedHybrids';
type FilterType = 'all' | 'needsPricing';

interface AreaAverage {
  name: string;
  unit?: string;
  commodityType?: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  farmerCount: number;
}

interface AreaAverages {
  fertilizers: AreaAverage[];
  chemicals: AreaAverage[];
  seedHybrids: AreaAverage[];
}

export default function ProductCatalog() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('fertilizers');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Product lists
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [seedHybrids, setSeedHybrids] = useState<SeedHybrid[]>([]);

  // Count items needing pricing
  const needsPricingCount = {
    fertilizers: fertilizers.filter(f => f.needsPricing).length,
    chemicals: chemicals.filter(c => c.needsPricing).length,
    seedHybrids: seedHybrids.filter(s => s.needsPricing).length
  };
  const totalNeedsPricing = needsPricingCount.fertilizers + needsPricingCount.chemicals + needsPricingCount.seedHybrids;

  // Area averages for price comparison
  const [areaAverages, setAreaAverages] = useState<AreaAverages | null>(null);

  // Selection state for bid request creation
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Scan bill modal state
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    invoice: any;
    addedProducts: any[];
    updatedProducts: any[];
  } | null>(null);

  // Seed discount state (for scan modal)
  const [seedDiscounts, setSeedDiscounts] = useState({ corn: 0, soybeans: 0, wheat: 0 });

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
      loadProducts();
    }
  }, [selectedBusinessId, activeTab]);

  // Fetch area averages for price comparison
  useEffect(() => {
    if (selectedBusinessId) {
      loadAreaAverages();
    }
  }, [selectedBusinessId]);

  const loadAreaAverages = async () => {
    if (!selectedBusinessId) return;
    try {
      const data = await breakevenApi.getAreaAverages(selectedBusinessId);
      setAreaAverages(data);
    } catch (err) {
      console.error('Failed to load area averages:', err);
    }
  };

  // Helper function to get price comparison color and info
  const getPriceComparison = (
    productName: string,
    price: number,
    type: 'fertilizer' | 'chemical' | 'seedHybrid',
    unit?: string,
    commodityType?: string
  ): { color: string; tooltip: string; avgPrice: number | null } => {
    if (!areaAverages) return { color: 'text-gray-500', tooltip: '', avgPrice: null };

    let averages: AreaAverage[] = [];
    if (type === 'fertilizer') averages = areaAverages.fertilizers;
    else if (type === 'chemical') averages = areaAverages.chemicals;
    else averages = areaAverages.seedHybrids;

    // Find matching product by normalized name (and unit/commodityType if applicable)
    const normalizedName = productName.trim().toUpperCase();
    const match = averages.find(a => {
      const nameMatch = a.name === normalizedName;
      if (type === 'seedHybrid') {
        return nameMatch && a.commodityType === commodityType;
      }
      return nameMatch && a.unit === unit;
    });

    if (!match || match.farmerCount < 2) {
      return { color: 'text-gray-500', tooltip: 'Not enough data for comparison', avgPrice: null };
    }

    const diff = price - match.avgPrice;
    const percentDiff = ((diff / match.avgPrice) * 100).toFixed(1);

    if (price < match.avgPrice) {
      // Better price (lower than average) - GREEN
      return {
        color: 'text-green-600 font-semibold',
        tooltip: `$${Math.abs(diff).toFixed(2)} below avg ($${match.avgPrice.toFixed(2)}) - ${Math.abs(Number(percentDiff))}% savings`,
        avgPrice: match.avgPrice
      };
    } else if (price > match.avgPrice) {
      // Higher price (above average) - RED
      return {
        color: 'text-red-600 font-semibold',
        tooltip: `$${diff.toFixed(2)} above avg ($${match.avgPrice.toFixed(2)}) - ${percentDiff}% higher`,
        avgPrice: match.avgPrice
      };
    } else {
      // Equal to average
      return {
        color: 'text-gray-500',
        tooltip: `At area average ($${match.avgPrice.toFixed(2)})`,
        avgPrice: match.avgPrice
      };
    }
  };

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
    if (activeTab === 'fertilizers') {
      setFormData({ name: '', pricePerUnit: '', unit: 'LB' });
    } else if (activeTab === 'chemicals') {
      setFormData({ name: '', pricePerUnit: '', unit: 'GAL', category: 'HERBICIDE' });
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
          unit: formData.unit as UnitType,
          category: formData.category as ChemicalCategory
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
    navigate('/');
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  // Get current filtered items based on active tab
  const getCurrentItems = () => {
    if (activeTab === 'fertilizers') {
      return fertilizers.filter(item => filter === 'all' || item.needsPricing);
    } else if (activeTab === 'chemicals') {
      return chemicals.filter(item => filter === 'all' || item.needsPricing);
    } else {
      return seedHybrids.filter(item => filter === 'all' || item.needsPricing);
    }
  };

  const handleSelectAll = () => {
    const currentItems = getCurrentItems();
    const currentIds = currentItems.map(item => item.id);
    const allSelected = currentIds.length > 0 && currentIds.every(id => selectedProducts.has(id));

    if (allSelected) {
      // Deselect all current items
      const newSelection = new Set(selectedProducts);
      currentIds.forEach(id => newSelection.delete(id));
      setSelectedProducts(newSelection);
    } else {
      // Select all current items
      const newSelection = new Set(selectedProducts);
      currentIds.forEach(id => newSelection.add(id));
      setSelectedProducts(newSelection);
    }
  };

  const isAllSelected = () => {
    const currentItems = getCurrentItems();
    const currentIds = currentItems.map(item => item.id);
    return currentIds.length > 0 && currentIds.every(id => selectedProducts.has(id));
  };

  const handleBulkDeleteSeedHybrids = async () => {
    if (selectedProducts.size === 0) return;
    if (!selectedBusinessId) return;

    const count = selectedProducts.size;
    if (!confirm(`Are you sure you want to delete ${count} seed hybrid${count !== 1 ? 's' : ''}?`)) return;

    try {
      // Delete all selected seed hybrids
      await Promise.all(
        Array.from(selectedProducts).map(id =>
          breakevenApi.deleteSeedHybrid(selectedBusinessId, id)
        )
      );

      // Clear selection and reload
      setSelectedProducts(new Set());
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete some items');
    }
  };

  const handleCreateBidRequestWithSelected = () => {
    if (selectedProducts.size === 0) {
      alert('Please select at least one product');
      return;
    }

    // Gather selected product details
    const selectedItems: any[] = [];

    selectedProducts.forEach(productId => {
      const fertilizer = fertilizers.find(f => f.id === productId);
      const chemical = chemicals.find(c => c.id === productId);

      if (fertilizer) {
        selectedItems.push({
          productType: 'FERTILIZER',
          productName: fertilizer.name,
          currentPrice: fertilizer.pricePerUnit,
          unit: fertilizer.unit,
          quantity: 0 // User will fill this in
        });
      } else if (chemical) {
        selectedItems.push({
          productType: 'CHEMICAL',
          productName: chemical.name,
          currentPrice: chemical.pricePerUnit,
          unit: chemical.unit,
          quantity: 0 // User will fill this in
        });
      }
    });

    // Store in localStorage for InputBids page to read
    localStorage.setItem('preselectedBidProducts', JSON.stringify(selectedItems));

    // Navigate to Input Bids page
    navigate('/input-bids');
  };

  // Scan bill handlers
  const handleScanBill = async () => {
    if (!selectedBusinessId || !scanFile) return;

    setIsScanning(true);
    try {
      let result;
      if (activeTab === 'seedHybrids') {
        // Pass discounts for seed bill scanning
        const discountsToApply = (seedDiscounts.corn > 0 || seedDiscounts.soybeans > 0 || seedDiscounts.wheat > 0)
          ? seedDiscounts
          : undefined;
        result = await breakevenApi.scanSeedBillToCatalog(selectedBusinessId, scanFile, discountsToApply);
      } else if (activeTab === 'fertilizers') {
        result = await breakevenApi.scanFertilizerBillToCatalog(selectedBusinessId, scanFile);
      } else if (activeTab === 'chemicals') {
        result = await breakevenApi.scanChemicalBillToCatalog(selectedBusinessId, scanFile);
      } else {
        throw new Error('Scan not supported for this product type');
      }
      setScanResult(result);
      // Reload products
      await loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to scan bill');
      setScanResult(null);
    } finally {
      setIsScanning(false);
    }
  };

  const closeScanModal = () => {
    setShowScanModal(false);
    setScanFile(null);
    setScanResult(null);
    setSeedDiscounts({ corn: 0, soybeans: 0, wheat: 0 });
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
                onClick={() => navigate('/dashboard')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Dashboard
              </button>
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
            {/* Needs Pricing Alert Banner */}
            {totalNeedsPricing > 0 && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-amber-800 font-medium">
                    {totalNeedsPricing} product{totalNeedsPricing !== 1 ? 's' : ''} need pricing
                  </span>
                  <span className="text-amber-600 ml-2 text-sm">
                    ({needsPricingCount.fertilizers} fertilizers, {needsPricingCount.chemicals} chemicals, {needsPricingCount.seedHybrids} seeds)
                  </span>
                </div>
                <button
                  onClick={() => setFilter(filter === 'needsPricing' ? 'all' : 'needsPricing')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    filter === 'needsPricing'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                  }`}
                >
                  {filter === 'needsPricing' ? 'Show All' : 'Show Only Needs Pricing'}
                </button>
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTab === 'fertilizers' && 'Fertilizers'}
                {activeTab === 'chemicals' && 'Chemicals'}
                {activeTab === 'seedHybrids' && 'Seed Hybrids'}
                {filter === 'needsPricing' && ' (Needs Pricing)'}
              </h2>
              <div className="flex gap-3">
                {selectedProducts.size > 0 && activeTab !== 'seedHybrids' && (
                  <button
                    onClick={handleCreateBidRequestWithSelected}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Create Bid Request ({selectedProducts.size} selected)
                  </button>
                )}
                {selectedProducts.size > 0 && activeTab === 'seedHybrids' && (
                  <button
                    onClick={handleBulkDeleteSeedHybrids}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete Selected ({selectedProducts.size})
                  </button>
                )}
                <button
                  onClick={() => setShowScanModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Scan Bill
                </button>
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add {activeTab === 'fertilizers' ? 'Fertilizer' : activeTab === 'chemicals' ? 'Chemical' : 'Seed Hybrid'}
                </button>
              </div>
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
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={isAllSelected()}
                          onChange={handleSelectAll}
                          title={activeTab === 'seedHybrids' ? 'Select all for bulk delete' : 'Select all for bid request'}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      {activeTab === 'seedHybrids' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Commodity
                        </th>
                      )}
                      {activeTab === 'chemicals' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
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
                    {activeTab === 'fertilizers' && fertilizers
                      .filter(item => filter === 'all' || item.needsPricing)
                      .map((item) => {
                      const priceInfo = getPriceComparison(item.name, item.pricePerUnit, 'fertilizer', item.unit);
                      return (
                        <tr key={item.id} className={item.needsPricing ? 'bg-amber-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selectedProducts.has(item.id)}
                              onChange={() => toggleProductSelection(item.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {item.name}
                              {item.needsPricing && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                  Needs Pricing
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item.needsPricing ? (
                              <span className="text-amber-600">$0.00 (set price)</span>
                            ) : (
                              <span className={priceInfo.color} title={priceInfo.tooltip}>
                                ${item.pricePerUnit.toFixed(2)}
                                {priceInfo.avgPrice !== null && (
                                  <span className="ml-1 text-xs">
                                    {item.pricePerUnit < priceInfo.avgPrice ? '↓' : item.pricePerUnit > priceInfo.avgPrice ? '↑' : ''}
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button onClick={() => handleEdit(item)} className={item.needsPricing ? "text-amber-600 hover:text-amber-900 font-semibold" : "text-blue-600 hover:text-blue-900"}>
                              {item.needsPricing ? 'Set Price' : 'Edit'}
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                    {activeTab === 'chemicals' && chemicals
                      .filter(item => filter === 'all' || item.needsPricing)
                      .map((item) => {
                      const priceInfo = getPriceComparison(item.name, item.pricePerUnit, 'chemical', item.unit);
                      const categoryLabels: Record<string, string> = {
                        HERBICIDE: 'Herbicide',
                        IN_FURROW: 'In-Furrow',
                        FUNGICIDE: 'Fungicide'
                      };
                      return (
                        <tr key={item.id} className={item.needsPricing ? 'bg-amber-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selectedProducts.has(item.id)}
                              onChange={() => toggleProductSelection(item.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {item.name}
                              {item.needsPricing && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                  Needs Pricing
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              item.category === 'HERBICIDE' ? 'bg-green-100 text-green-800' :
                              item.category === 'IN_FURROW' ? 'bg-purple-100 text-purple-800' :
                              item.category === 'FUNGICIDE' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {categoryLabels[item.category] || item.category || 'Herbicide'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item.needsPricing ? (
                              <span className="text-amber-600">$0.00 (set price)</span>
                            ) : (
                              <span className={priceInfo.color} title={priceInfo.tooltip}>
                                ${item.pricePerUnit.toFixed(2)}
                                {priceInfo.avgPrice !== null && (
                                  <span className="ml-1 text-xs">
                                    {item.pricePerUnit < priceInfo.avgPrice ? '↓' : item.pricePerUnit > priceInfo.avgPrice ? '↑' : ''}
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button onClick={() => handleEdit(item)} className={item.needsPricing ? "text-amber-600 hover:text-amber-900 font-semibold" : "text-blue-600 hover:text-blue-900"}>
                              {item.needsPricing ? 'Set Price' : 'Edit'}
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                    {activeTab === 'seedHybrids' && seedHybrids
                      .filter(item => filter === 'all' || item.needsPricing)
                      .map((item) => {
                      const priceInfo = getPriceComparison(item.name, item.pricePerBag, 'seedHybrid', undefined, item.commodityType);
                      return (
                        <tr key={item.id} className={item.needsPricing ? 'bg-amber-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={selectedProducts.has(item.id)}
                              onChange={() => toggleProductSelection(item.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {item.name}
                              {item.needsPricing && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                  Needs Pricing
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.commodityType}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item.needsPricing ? (
                              <span className="text-amber-600">$0.00 (set price)</span>
                            ) : (
                              <span className={priceInfo.color} title={priceInfo.tooltip}>
                                ${item.pricePerBag.toFixed(2)}
                                {priceInfo.avgPrice !== null && (
                                  <span className="ml-1 text-xs">
                                    {item.pricePerBag < priceInfo.avgPrice ? '↓' : item.pricePerBag > priceInfo.avgPrice ? '↑' : ''}
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.seedsPerBag.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                            <button onClick={() => handleEdit(item)} className={item.needsPricing ? "text-amber-600 hover:text-amber-900 font-semibold" : "text-blue-600 hover:text-blue-900"}>
                              {item.needsPricing ? 'Set Price' : 'Edit'}
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
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
                      value={formData.unit || 'TON'}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="TON">TON (Tons)</option>
                      <option value="LB">LB (Pounds)</option>
                      <option value="GAL">GAL (Gallons)</option>
                    </select>
                  </div>
                )}

                {activeTab === 'chemicals' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category || 'HERBICIDE'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="HERBICIDE">Herbicide</option>
                      <option value="IN_FURROW">In-Furrow</option>
                      <option value="FUNGICIDE">Fungicide</option>
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

      {/* Scan Bill Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Scan {activeTab === 'seedHybrids' ? 'Seed' : activeTab === 'chemicals' ? 'Chemical' : 'Fertilizer'} Bill
                </h3>
                <button
                  onClick={closeScanModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!scanResult ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a {activeTab === 'seedHybrids' ? 'seed' : activeTab === 'chemicals' ? 'chemical' : 'fertilizer'} bill to automatically extract products and add them to your catalog.
                  </p>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
                    <input
                      type="file"
                      id="scanFile"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setScanFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label htmlFor="scanFile" className="cursor-pointer">
                      {scanFile ? (
                        <div>
                          <svg className="w-12 h-12 mx-auto text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm font-medium text-gray-900">{scanFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">Click to change file</p>
                        </div>
                      ) : (
                        <div>
                          <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG</p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Seed Discounts - only show for seed hybrids tab */}
                  {activeTab === 'seedHybrids' && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-800 mb-3">Apply Discounts ($/bag)</h4>
                      <p className="text-xs text-blue-600 mb-3">Enter discount amounts to subtract from scanned prices</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Corn</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={seedDiscounts.corn || ''}
                              onChange={(e) => setSeedDiscounts({ ...seedDiscounts, corn: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Soybeans</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={seedDiscounts.soybeans || ''}
                              onChange={(e) => setSeedDiscounts({ ...seedDiscounts, soybeans: parseFloat(e.target.value) || 0 })}
                              className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={closeScanModal}
                      className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleScanBill}
                      disabled={!scanFile || isScanning}
                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isScanning ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Scanning...
                        </>
                      ) : (
                        'Scan & Import'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold text-green-800">Bill Processed Successfully!</span>
                    </div>
                    {scanResult.invoice.vendorName && (
                      <p className="text-sm text-gray-700">Vendor: {scanResult.invoice.vendorName}</p>
                    )}
                  </div>

                  {scanResult.addedProducts.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">New Products Added:</h4>
                      <div className="space-y-2">
                        {scanResult.addedProducts.map((item: any, idx: number) => (
                          <div key={idx} className="bg-blue-50 rounded p-3 text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">{item.name}</span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">New</span>
                            </div>
                            <div className="text-gray-600 text-xs mt-1">
                              {activeTab === 'seedHybrids'
                                ? `$${item.pricePerBag?.toFixed(2)}/bag • ${item.commodityType}`
                                : `$${item.pricePerUnit?.toFixed(2)}/${item.unit}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanResult.updatedProducts.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Existing Products Updated:</h4>
                      <div className="space-y-2">
                        {scanResult.updatedProducts.map((item: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 rounded p-3 text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">{item.name}</span>
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">Updated</span>
                            </div>
                            <div className="text-gray-600 text-xs mt-1">
                              {activeTab === 'seedHybrids'
                                ? `$${item.pricePerBag?.toFixed(2)}/bag • ${item.commodityType}`
                                : `$${item.pricePerUnit?.toFixed(2)}/${item.unit}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanResult.addedProducts.length === 0 && scanResult.updatedProducts.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        No {activeTab === 'seedHybrids' ? 'seed' : activeTab === 'chemicals' ? 'chemical' : 'fertilizer'} products were found in this bill.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={closeScanModal}
                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
