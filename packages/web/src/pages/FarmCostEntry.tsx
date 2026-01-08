import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { breakevenApi } from '../api/breakeven.api';
import {
  Farm,
  Fertilizer,
  Chemical,
  SeedHybrid,
  CostType
} from '@business-app/shared';

export default function FarmCostEntry() {
  const { farmId } = useParams<{ farmId: string }>();
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [seedHybrids, setSeedHybrids] = useState<SeedHybrid[]>([]);
  const [breakEven, setBreakEven] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [fertilizerForm, setFertilizerForm] = useState({ fertilizerId: '', amountUsed: '' });
  const [chemicalForm, setChemicalForm] = useState({
    chemicalId: '',
    amountUsed: '',
    usageUnit: 'GAL' as 'GAL' | 'OZ' | 'QUART' | 'PINT'
  });
  const [seedForm, setSeedForm] = useState({ seedHybridId: '', bagsUsed: '' });
  const [otherCostForm, setOtherCostForm] = useState({
    costType: 'LAND_RENT' as CostType,
    amount: '',
    isPerAcre: true,
    description: ''
  });

  // Edit states
  const [editingFertilizer, setEditingFertilizer] = useState<any | null>(null);
  const [editingChemical, setEditingChemical] = useState<any | null>(null);
  const [editingSeed, setEditingSeed] = useState<any | null>(null);
  const [editingOtherCost, setEditingOtherCost] = useState<any | null>(null);

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
    if (selectedBusinessId && farmId) {
      loadData();
    }
  }, [selectedBusinessId, farmId]);

  const loadData = async () => {
    if (!selectedBusinessId || !farmId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load farm details
      const farmData = await breakevenApi.getFarm(selectedBusinessId, farmId);
      setFarm(farmData);

      // Load product catalogs and break-even data
      const [fertilizersData, chemicalsData, seedHybridsData, breakEvenData] = await Promise.all([
        breakevenApi.getFertilizers(selectedBusinessId),
        breakevenApi.getChemicals(selectedBusinessId),
        breakevenApi.getSeedHybrids(selectedBusinessId, farmData.commodityType),
        breakevenApi.getFarmBreakEven(selectedBusinessId, farmId)
      ]);

      setFertilizers(fertilizersData);
      setChemicals(chemicalsData);
      setSeedHybrids(seedHybridsData);
      setBreakEven(breakEvenData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load farm data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAddFertilizer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !farmId) return;

    try {
      await breakevenApi.addFertilizerUsage(selectedBusinessId, {
        farmId,
        fertilizerId: fertilizerForm.fertilizerId,
        amountUsed: parseFloat(fertilizerForm.amountUsed)
      });
      setFertilizerForm({ fertilizerId: '', amountUsed: '' });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add fertilizer usage');
    }
  };

  const handleAddChemical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !farmId) return;

    try {
      let amountInGallons = parseFloat(chemicalForm.amountUsed);

      // Convert to gallons based on unit
      if (chemicalForm.usageUnit === 'OZ') {
        amountInGallons = amountInGallons / 128; // 128 oz = 1 gallon
      } else if (chemicalForm.usageUnit === 'QUART') {
        amountInGallons = amountInGallons / 4; // 4 quarts = 1 gallon
      } else if (chemicalForm.usageUnit === 'PINT') {
        amountInGallons = amountInGallons / 8; // 8 pints = 1 gallon
      }

      await breakevenApi.addChemicalUsage(selectedBusinessId, {
        farmId,
        chemicalId: chemicalForm.chemicalId,
        amountUsed: amountInGallons
      });
      setChemicalForm({ chemicalId: '', amountUsed: '', usageUnit: 'GAL' });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add chemical usage');
    }
  };

  const handleAddSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !farmId) return;

    try {
      await breakevenApi.addSeedUsage(selectedBusinessId, {
        farmId,
        seedHybridId: seedForm.seedHybridId,
        bagsUsed: parseFloat(seedForm.bagsUsed)
      });
      setSeedForm({ seedHybridId: '', bagsUsed: '' });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add seed usage');
    }
  };

  const handleAddOtherCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !farmId) return;

    try {
      await breakevenApi.addOtherCost(selectedBusinessId, {
        farmId,
        costType: otherCostForm.costType,
        amount: parseFloat(otherCostForm.amount),
        isPerAcre: otherCostForm.isPerAcre,
        description: otherCostForm.description || undefined
      });
      setOtherCostForm({
        costType: 'LAND_RENT' as any,
        amount: '',
        isPerAcre: true,
        description: ''
      });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add other cost');
    }
  };

  // Edit handlers
  const handleUpdateFertilizer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !editingFertilizer) return;

    try {
      await breakevenApi.updateFertilizerUsage(
        selectedBusinessId,
        editingFertilizer.id,
        parseFloat(editingFertilizer.amountUsed)
      );
      setEditingFertilizer(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update fertilizer usage');
    }
  };

  const handleDeleteFertilizer = async (id: string) => {
    if (!selectedBusinessId) return;
    if (!confirm('Are you sure you want to delete this fertilizer usage?')) return;

    try {
      await breakevenApi.deleteFertilizerUsage(selectedBusinessId, id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete fertilizer usage');
    }
  };

  const handleUpdateChemical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !editingChemical) return;

    try {
      await breakevenApi.updateChemicalUsage(
        selectedBusinessId,
        editingChemical.id,
        parseFloat(editingChemical.amountUsed)
      );
      setEditingChemical(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update chemical usage');
    }
  };

  const handleDeleteChemical = async (id: string) => {
    if (!selectedBusinessId) return;
    if (!confirm('Are you sure you want to delete this chemical usage?')) return;

    try {
      await breakevenApi.deleteChemicalUsage(selectedBusinessId, id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete chemical usage');
    }
  };

  const handleUpdateSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !editingSeed) return;

    try {
      await breakevenApi.updateSeedUsage(
        selectedBusinessId,
        editingSeed.id,
        parseFloat(editingSeed.bagsUsed)
      );
      setEditingSeed(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update seed usage');
    }
  };

  const handleDeleteSeed = async (id: string) => {
    if (!selectedBusinessId) return;
    if (!confirm('Are you sure you want to delete this seed usage?')) return;

    try {
      await breakevenApi.deleteSeedUsage(selectedBusinessId, id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete seed usage');
    }
  };

  const handleUpdateOtherCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !editingOtherCost) return;

    try {
      await breakevenApi.updateOtherCost(selectedBusinessId, editingOtherCost.id, {
        amount: parseFloat(editingOtherCost.amount),
        isPerAcre: editingOtherCost.isPerAcre,
        description: editingOtherCost.description || undefined
      });
      setEditingOtherCost(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update other cost');
    }
  };

  const handleDeleteOtherCost = async (id: string) => {
    if (!selectedBusinessId) return;
    if (!confirm('Are you sure you want to delete this cost?')) return;

    try {
      await breakevenApi.deleteOtherCost(selectedBusinessId, id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete other cost');
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading farm data...</p>
        </div>
      </div>
    );
  }

  if (error || !farm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-md">
          {error || 'Farm not found'}
          <button
            onClick={() => navigate('/breakeven/farms')}
            className="ml-4 text-blue-600 hover:text-blue-800"
          >
            Back to Farms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={() => navigate('/breakeven/farms')}
                className="text-blue-600 hover:text-blue-800 text-sm mb-2"
              >
                ← Back to Farms
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{farm.name} - Cost Entry</h1>
              <p className="text-sm text-gray-600">
                {farm.grainEntity?.name} | {farm.commodityType} | {farm.acres.toLocaleString()} acres | {farm.year}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/breakeven')}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fertilizer Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Fertilizer Usage</h2>
            <form onSubmit={handleAddFertilizer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fertilizer
                </label>
                <select
                  value={fertilizerForm.fertilizerId}
                  onChange={(e) => setFertilizerForm({ ...fertilizerForm, fertilizerId: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Fertilizer</option>
                  {fertilizers.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} (${f.pricePerUnit.toFixed(2)}/{f.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Used
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fertilizerForm.amountUsed}
                  onChange={(e) => setFertilizerForm({ ...fertilizerForm, amountUsed: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter amount (lbs or gals)"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Fertilizer
              </button>
            </form>

            {farm.fertilizerUsage && farm.fertilizerUsage.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Current Usage:</h3>
                <div className="space-y-2">
                  {farm.fertilizerUsage.map((usage: any) => (
                    <div key={usage.id} className="text-sm p-2 bg-gray-50 rounded">
                      {editingFertilizer?.id === usage.id ? (
                        <form onSubmit={handleUpdateFertilizer} className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Amount ({usage.fertilizer.unit})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingFertilizer.amountUsed}
                              onChange={(e) => setEditingFertilizer({ ...editingFertilizer, amountUsed: e.target.value })}
                              className="w-full rounded border-gray-300 text-sm"
                              required
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="submit"
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingFertilizer(null)}
                              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex justify-between items-center">
                          <span>{usage.fertilizer.name}: {usage.amountUsed} {usage.fertilizer.unit}</span>
                          <div className="flex items-center space-x-3">
                            <span className="font-semibold">${(usage.amountUsed * usage.fertilizer.pricePerUnit).toFixed(2)}</span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => setEditingFertilizer(usage)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                Edit
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => handleDeleteFertilizer(usage.id)}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chemical Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Chemical Usage</h2>
            <form onSubmit={handleAddChemical} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chemical
                </label>
                <select
                  value={chemicalForm.chemicalId}
                  onChange={(e) => setChemicalForm({ ...chemicalForm, chemicalId: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Chemical</option>
                  {chemicals.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (${c.pricePerUnit.toFixed(2)}/{c.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usage Unit
                </label>
                <select
                  value={chemicalForm.usageUnit}
                  onChange={(e) => setChemicalForm({ ...chemicalForm, usageUnit: e.target.value as 'GAL' | 'OZ' | 'QUART' | 'PINT' })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="GAL">Gallons</option>
                  <option value="QUART">Quarts</option>
                  <option value="PINT">Pints</option>
                  <option value="OZ">Ounces (oz)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  1 gallon = 4 quarts = 8 pints = 128 oz
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Used ({
                    chemicalForm.usageUnit === 'GAL' ? 'gallons' :
                    chemicalForm.usageUnit === 'QUART' ? 'quarts' :
                    chemicalForm.usageUnit === 'PINT' ? 'pints' : 'ounces'
                  })
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={chemicalForm.amountUsed}
                  onChange={(e) => setChemicalForm({ ...chemicalForm, amountUsed: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder={
                    chemicalForm.usageUnit === 'GAL' ? 'e.g., 2.5' :
                    chemicalForm.usageUnit === 'QUART' ? 'e.g., 1' :
                    chemicalForm.usageUnit === 'PINT' ? 'e.g., 2' : 'e.g., 4'
                  }
                  required
                />
                {chemicalForm.amountUsed && chemicalForm.usageUnit !== 'GAL' && (
                  <p className="mt-1 text-xs text-blue-600">
                    = {(
                      chemicalForm.usageUnit === 'OZ' ? parseFloat(chemicalForm.amountUsed) / 128 :
                      chemicalForm.usageUnit === 'QUART' ? parseFloat(chemicalForm.amountUsed) / 4 :
                      parseFloat(chemicalForm.amountUsed) / 8
                    ).toFixed(4)} gallons
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Add Chemical
              </button>
            </form>

            {farm.chemicalUsage && farm.chemicalUsage.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Current Usage:</h3>
                <div className="space-y-2">
                  {farm.chemicalUsage.map((usage: any) => (
                    <div key={usage.id} className="text-sm p-2 bg-gray-50 rounded">
                      {editingChemical?.id === usage.id ? (
                        <form onSubmit={handleUpdateChemical} className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Amount (Gallons)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingChemical.amountUsed}
                              onChange={(e) => setEditingChemical({ ...editingChemical, amountUsed: e.target.value })}
                              className="w-full rounded border-gray-300 text-sm"
                              required
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="submit"
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingChemical(null)}
                              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex justify-between items-center">
                          <span>{usage.chemical.name}: {usage.amountUsed} {usage.chemical.unit}</span>
                          <div className="flex items-center space-x-3">
                            <span className="font-semibold">${(usage.amountUsed * usage.chemical.pricePerUnit).toFixed(2)}</span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => setEditingChemical(usage)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                Edit
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => handleDeleteChemical(usage.id)}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Seed Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seed Usage</h2>
            <form onSubmit={handleAddSeed} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seed Hybrid
                </label>
                <select
                  value={seedForm.seedHybridId}
                  onChange={(e) => setSeedForm({ ...seedForm, seedHybridId: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Seed Hybrid</option>
                  {seedHybrids.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} (${s.pricePerBag.toFixed(2)}/bag, {s.seedsPerBag.toLocaleString()} seeds)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Bags Used
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={seedForm.bagsUsed}
                  onChange={(e) => setSeedForm({ ...seedForm, bagsUsed: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., 10"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the total number of bags of this hybrid used on this field
                </p>
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Add Seed
              </button>
            </form>

            {farm.seedUsage && farm.seedUsage.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Current Usage:</h3>
                <div className="space-y-2">
                  {farm.seedUsage.map((usage: any) => (
                    <div key={usage.id} className="text-sm p-2 bg-gray-50 rounded">
                      {editingSeed?.id === usage.id ? (
                        <form onSubmit={handleUpdateSeed} className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Number of Bags
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              value={editingSeed.bagsUsed}
                              onChange={(e) => setEditingSeed({ ...editingSeed, bagsUsed: e.target.value })}
                              className="w-full rounded border-gray-300 text-sm"
                              required
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="submit"
                              className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSeed(null)}
                              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex justify-between items-center">
                          <span>{usage.seedHybrid.name}: {usage.bagsUsed} bags</span>
                          <div className="flex items-center space-x-3">
                            <span className="font-semibold">
                              ${(usage.bagsUsed * usage.seedHybrid.pricePerBag).toFixed(2)}
                            </span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => setEditingSeed(usage)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                Edit
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => handleDeleteSeed(usage.id)}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Miscellaneous Costs Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Miscellaneous Costs</h2>
              <p className="text-xs text-gray-600 mt-1">
                Add any additional costs like land rent, insurance, custom work, fuel, labor, etc.
              </p>
            </div>
            <form onSubmit={handleAddOtherCost} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Type *
                </label>
                <select
                  value={otherCostForm.costType}
                  onChange={(e) => setOtherCostForm({ ...otherCostForm, costType: e.target.value as CostType })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="LAND_RENT">Land Rent</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="CUSTOM_WORK">Custom Work (Planting, Harvesting, etc.)</option>
                  <option value="FUEL">Fuel & Energy</option>
                  <option value="LABOR">Labor</option>
                  <option value="OTHER">Other / Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={otherCostForm.amount}
                  onChange={(e) => setOtherCostForm({ ...otherCostForm, amount: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder={otherCostForm.isPerAcre ? "e.g., 250 (per acre)" : "e.g., 5000 (total)"}
                  required
                />
                {otherCostForm.isPerAcre && otherCostForm.amount && (
                  <p className="mt-1 text-xs text-blue-600">
                    Total: ${(parseFloat(otherCostForm.amount) * farm.acres).toFixed(2)} for {farm.acres} acres
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPerAcre"
                    checked={otherCostForm.isPerAcre}
                    onChange={(e) => setOtherCostForm({ ...otherCostForm, isPerAcre: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label htmlFor="isPerAcre" className="ml-2 text-sm font-medium text-gray-700">
                    Cost is per acre
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-600 ml-6">
                  {otherCostForm.isPerAcre
                    ? `Amount will be multiplied by ${farm.acres} acres`
                    : 'Amount will be used as total cost for this farm'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description / Notes
                </label>
                <textarea
                  value={otherCostForm.description}
                  onChange={(e) => setOtherCostForm({ ...otherCostForm, description: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={2}
                  placeholder="e.g., Cash rent paid to landlord, Crop insurance premium, etc."
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium"
              >
                Add Miscellaneous Cost
              </button>
            </form>

            {farm.otherCosts && farm.otherCosts.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Current Costs:</h3>
                <div className="space-y-2">
                  {farm.otherCosts.map((cost: any) => (
                    <div key={cost.id} className="text-sm p-2 bg-gray-50 rounded">
                      {editingOtherCost?.id === cost.id ? (
                        <form onSubmit={handleUpdateOtherCost} className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Amount ($)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingOtherCost.amount}
                              onChange={(e) => setEditingOtherCost({ ...editingOtherCost, amount: e.target.value })}
                              className="w-full rounded border-gray-300 text-sm"
                              required
                            />
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="editIsPerAcre"
                              checked={editingOtherCost.isPerAcre}
                              onChange={(e) => setEditingOtherCost({ ...editingOtherCost, isPerAcre: e.target.checked })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                            />
                            <label htmlFor="editIsPerAcre" className="ml-2 text-xs text-gray-700">
                              Cost is per acre
                            </label>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Description
                            </label>
                            <textarea
                              value={editingOtherCost.description || ''}
                              onChange={(e) => setEditingOtherCost({ ...editingOtherCost, description: e.target.value })}
                              className="w-full rounded border-gray-300 text-sm"
                              rows={2}
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="submit"
                              className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingOtherCost(null)}
                              className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{cost.costType.replace('_', ' ')}</span>
                            <div className="flex items-center space-x-3">
                              <span className="font-semibold">
                                ${(cost.isPerAcre ? cost.amount * farm.acres : cost.amount).toFixed(2)}
                              </span>
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => setEditingOtherCost(cost)}
                                  className="text-blue-600 hover:text-blue-800 text-xs"
                                >
                                  Edit
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleDeleteOtherCost(cost.id)}
                                  className="text-red-600 hover:text-red-800 text-xs"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                          {cost.description && (
                            <p className="text-xs text-gray-600 mt-1">{cost.description}</p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Card */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Break-Even Analysis</h2>

          {breakEven ? (
            <>
              {/* Top Row - Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-xs text-gray-600 mb-1">Total Acres</p>
                  <p className="text-2xl font-bold text-gray-900">{breakEven.acres.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-xs text-gray-600 mb-1">Expected Yield</p>
                  <p className="text-2xl font-bold text-blue-600">{breakEven.expectedYield.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">bu/acre</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-xs text-gray-600 mb-1">Total Bushels</p>
                  <p className="text-2xl font-bold text-indigo-600">{breakEven.expectedBushels.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">bushels</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow">
                  <p className="text-xs text-gray-600 mb-1">Cost Per Acre</p>
                  <p className="text-2xl font-bold text-purple-600">${breakEven.costPerAcre.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">/acre</p>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-white rounded-lg p-4 shadow mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Cost Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">Fertilizer</p>
                    <p className="text-lg font-bold text-blue-600">${breakEven.costs.fertilizer.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Chemical</p>
                    <p className="text-lg font-bold text-green-600">${breakEven.costs.chemical.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Seed</p>
                    <p className="text-lg font-bold text-purple-600">${breakEven.costs.seed.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Other</p>
                    <p className="text-lg font-bold text-orange-600">${breakEven.costs.other.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-600 font-semibold">Total Cost</p>
                    <p className="text-xl font-bold text-gray-900">${breakEven.costs.total.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Break-Even Price - Highlight */}
              <div className="bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 rounded-lg p-6 text-center shadow-lg">
                <p className="text-sm text-gray-700 font-semibold mb-2">BREAK-EVEN PRICE</p>
                <p className="text-5xl font-bold text-orange-600 mb-1">
                  ${breakEven.breakEvenPrice.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">per bushel</p>
                {breakEven.expectedBushels === 0 && (
                  <p className="text-xs text-red-600 mt-2">
                    ⚠️ No production data found for this farm. Add production records to see accurate break-even.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
              <p className="text-gray-600">Calculating break-even...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
