import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { breakevenApi } from '../api/breakeven.api';
import {
  Farm,
  FarmPlanView,
  Fertilizer,
  Chemical,
  SeedHybrid,
  CreateFarmTrialRequest,
  TrialType,
  TrialStatus,
  CommodityType,
  ChemicalCategory,
  UnitType,
  UserRole
} from '@business-app/shared';
import AppLayout from '../components/layout/AppLayout';

export default function FarmPlanEdit() {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [farmPlan, setFarmPlan] = useState<FarmPlanView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Product catalogs
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [seedHybrids, setSeedHybrids] = useState<SeedHybrid[]>([]);

  // Modal state
  const [showAddProductModal, setShowAddProductModal] = useState<'fertilizer' | 'chemical' | 'seed' | 'trial' | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductUnit, setNewProductUnit] = useState<UnitType>(UnitType.LB);
  const [newChemicalCategory, setNewChemicalCategory] = useState<ChemicalCategory>(ChemicalCategory.HERBICIDE);
  const [newProductRate, setNewProductRate] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');

  // Trial form
  const [trialName, setTrialName] = useState('');
  const [trialType, setTrialType] = useState<TrialType>(TrialType.SEED);
  const [trialPlotLocation, setTrialPlotLocation] = useState('');
  const [trialNotes, setTrialNotes] = useState('');

  // Completion modal
  const [showCompletionModal, setShowCompletionModal] = useState<{
    type: 'seed' | 'fertilizer' | 'chemical';
    id: string;
    productName: string;
  } | null>(null);
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);

  const userRole = user?.businessMemberships.find(m => m.businessId === selectedBusinessId)?.role;
  const canApprove = userRole === UserRole.OWNER || userRole === UserRole.MANAGER;

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
      loadFarmData();
      loadProductCatalogs();
    }
  }, [selectedBusinessId, farmId]);

  const loadFarmData = async () => {
    if (!selectedBusinessId || !farmId) return;
    setIsLoading(true);
    setError(null);

    try {
      const [farmData, planData] = await Promise.all([
        breakevenApi.getFarm(selectedBusinessId, farmId),
        breakevenApi.getFarmPlan(selectedBusinessId, farmId)
      ]);
      setFarm(farmData);
      setFarmPlan(planData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load farm data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductCatalogs = async () => {
    if (!selectedBusinessId) return;
    try {
      const [ferts, chems, seeds] = await Promise.all([
        breakevenApi.getFertilizers(selectedBusinessId),
        breakevenApi.getChemicals(selectedBusinessId),
        breakevenApi.getSeedHybrids(selectedBusinessId)
      ]);
      setFertilizers(ferts);
      setChemicals(chems);
      setSeedHybrids(seeds);
    } catch (err) {
      console.error('Error loading product catalogs:', err);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedBusinessId || !farmId) return;
    setSaving(true);

    try {
      let productId = selectedProductId;

      // If creating a new product
      if (!selectedProductId && newProductName) {
        if (showAddProductModal === 'fertilizer') {
          const newFert = await breakevenApi.createFertilizerAsWorker(selectedBusinessId, newProductName, newProductUnit);
          productId = newFert.id;
          setFertilizers(prev => [...prev, newFert]);
        } else if (showAddProductModal === 'chemical') {
          const newChem = await breakevenApi.createChemicalAsWorker(selectedBusinessId, newProductName, newProductUnit, newChemicalCategory);
          productId = newChem.id;
          setChemicals(prev => [...prev, newChem]);
        } else if (showAddProductModal === 'seed') {
          const newSeed = await breakevenApi.createSeedHybridAsWorker(selectedBusinessId, newProductName, farm?.commodityType || CommodityType.CORN);
          productId = newSeed.id;
          setSeedHybrids(prev => [...prev, newSeed]);
        }
      }

      // Add usage to farm
      if (productId && newProductRate) {
        const rate = parseFloat(newProductRate);
        const acres = farm?.acres || 0;

        if (showAddProductModal === 'fertilizer') {
          await breakevenApi.addFertilizerUsage(selectedBusinessId, {
            farmId,
            fertilizerId: productId,
            ratePerAcre: rate,
            acresApplied: acres
          });
        } else if (showAddProductModal === 'chemical') {
          await breakevenApi.addChemicalUsage(selectedBusinessId, {
            farmId,
            chemicalId: productId,
            ratePerAcre: rate,
            acresApplied: acres
          });
        } else if (showAddProductModal === 'seed') {
          await breakevenApi.addSeedUsage(selectedBusinessId, {
            farmId,
            seedHybridId: productId,
            ratePerAcre: rate,
            acresApplied: acres
          });
        }

        // Notify if plan was approved (worker is making a change)
        if (farmPlan?.planApproved && !canApprove) {
          // The backend will send notifications automatically
        }

        await loadFarmData();
      }

      resetModal();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add product');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTrial = async () => {
    if (!selectedBusinessId || !farmId || !trialName) return;
    setSaving(true);

    try {
      const trialData: CreateFarmTrialRequest = {
        farmId,
        name: trialName,
        trialType,
        plotLocation: trialPlotLocation || undefined,
        notes: trialNotes || undefined
      };

      await breakevenApi.createTrial(selectedBusinessId, farmId, trialData);
      await loadFarmData();
      resetModal();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add trial');
    } finally {
      setSaving(false);
    }
  };

  const resetModal = () => {
    setShowAddProductModal(null);
    setNewProductName('');
    setNewProductUnit(UnitType.LB);
    setNewChemicalCategory(ChemicalCategory.HERBICIDE);
    setNewProductRate('');
    setSelectedProductId('');
    setTrialName('');
    setTrialType(TrialType.SEED);
    setTrialPlotLocation('');
    setTrialNotes('');
  };

  const handleMarkComplete = async () => {
    if (!selectedBusinessId || !showCompletionModal) return;
    setSaving(true);
    setError(null);

    try {
      const date = new Date(completionDate);
      const { type, id } = showCompletionModal;

      if (type === 'seed') {
        await breakevenApi.markSeedUsageComplete(selectedBusinessId, id, date);
      } else if (type === 'fertilizer') {
        await breakevenApi.markFertilizerUsageComplete(selectedBusinessId, id, date);
      } else if (type === 'chemical') {
        await breakevenApi.markChemicalUsageComplete(selectedBusinessId, id, date);
      }

      await loadFarmData();
      setShowCompletionModal(null);
      setCompletionDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to mark complete');
    } finally {
      setSaving(false);
    }
  };

  const handleUndoComplete = async (type: 'seed' | 'fertilizer' | 'chemical', id: string) => {
    if (!selectedBusinessId) return;
    setSaving(true);
    setError(null);

    try {
      if (type === 'seed') {
        await breakevenApi.undoSeedUsageComplete(selectedBusinessId, id);
      } else if (type === 'fertilizer') {
        await breakevenApi.undoFertilizerUsageComplete(selectedBusinessId, id);
      } else if (type === 'chemical') {
        await breakevenApi.undoChemicalUsageComplete(selectedBusinessId, id);
      }

      await loadFarmData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to undo completion');
    } finally {
      setSaving(false);
    }
  };

  const formatCompletionDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getCommodityColor = (type: CommodityType) => {
    switch (type) {
      case CommodityType.CORN: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case CommodityType.SOYBEANS: return 'bg-green-100 text-green-800 border-green-300';
      case CommodityType.WHEAT: return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!user || isLoading) {
    return (
      <AppLayout title="Farm Plan">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !farmPlan) {
    return (
      <AppLayout title="Farm Plan">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-md">
          {error || 'Farm not found'}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`Edit Plan: ${farmPlan.farmName}`}
      subtitle={`${farmPlan.year} ${farmPlan.commodityType}`}
    >
      <div className="max-w-6xl mx-auto">
        {/* Plan Status Banner */}
        {farmPlan.planApproved && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-green-800 font-medium">Plan Approved</span>
              <span className="text-green-600 ml-2 text-sm">
                Changes will notify managers
              </span>
            </div>
          </div>
        )}

        {/* Farm Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{farmPlan.farmName}</h2>
              <div className="flex items-center space-x-3 mt-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getCommodityColor(farmPlan.commodityType)}`}>
                  {farmPlan.commodityType}
                </span>
                <span className="text-sm text-gray-600">{farmPlan.acres.toLocaleString()} acres</span>
                {farmPlan.grainEntityName && (
                  <span className="text-sm text-gray-500">| {farmPlan.grainEntityName}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{farmPlan.projectedYield}</p>
              <p className="text-sm text-gray-500">bu/acre yield goal</p>
            </div>
          </div>
        </div>

        {/* Plan Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seed Plan */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                Seed Plan
              </h3>
              <button
                onClick={() => setShowAddProductModal('seed')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add Seed
              </button>
            </div>
            {farm?.seedUsage && farm.seedUsage.length > 0 ? (
              <div className="space-y-3">
                {farm.seedUsage.map((usage) => (
                  <div key={usage.id} className={`p-3 rounded-lg flex items-start ${usage.completedAt ? 'bg-purple-100 border border-purple-300' : 'bg-purple-50'}`}>
                    <button
                      onClick={() => {
                        if (usage.completedAt) {
                          handleUndoComplete('seed', usage.id);
                        } else {
                          setShowCompletionModal({ type: 'seed', id: usage.id, productName: usage.seedHybrid?.name || 'Seed' });
                        }
                      }}
                      disabled={saving}
                      className={`mt-0.5 mr-3 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                        usage.completedAt
                          ? 'bg-purple-500 border-purple-500 text-white'
                          : 'border-gray-300 hover:border-purple-500'
                      }`}
                    >
                      {usage.completedAt && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{usage.seedHybrid?.name}</p>
                      <p className="text-sm text-gray-600">
                        {usage.isVRT ? (
                          <span className="text-purple-600">
                            VRT: {usage.vrtMinRate?.toLocaleString()} - {usage.vrtMaxRate?.toLocaleString()} seeds/acre
                          </span>
                        ) : (
                          <span>{usage.ratePerAcre?.toLocaleString()} seeds/acre</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{usage.acresApplied} acres</p>
                      {usage.completedAt && (
                        <p className="text-xs text-purple-600 mt-1">
                          Planted {formatCompletionDate(usage.completedAt)}
                          {usage.completedByName && ` by ${usage.completedByName}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No seed plan set</p>
            )}
          </div>

          {/* Fertilizer Plan */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Fertilizer Plan
              </h3>
              <button
                onClick={() => setShowAddProductModal('fertilizer')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add Fertilizer
              </button>
            </div>
            {farm?.fertilizerUsage && farm.fertilizerUsage.length > 0 ? (
              <div className="space-y-3">
                {farm.fertilizerUsage.map((usage) => (
                  <div key={usage.id} className={`p-3 rounded-lg flex items-start ${usage.completedAt ? 'bg-blue-100 border border-blue-300' : 'bg-blue-50'}`}>
                    <button
                      onClick={() => {
                        if (usage.completedAt) {
                          handleUndoComplete('fertilizer', usage.id);
                        } else {
                          setShowCompletionModal({ type: 'fertilizer', id: usage.id, productName: usage.fertilizer?.name || 'Fertilizer' });
                        }
                      }}
                      disabled={saving}
                      className={`mt-0.5 mr-3 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                        usage.completedAt
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 hover:border-blue-500'
                      }`}
                    >
                      {usage.completedAt && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{usage.fertilizer?.name}</p>
                      <p className="text-sm text-gray-600">{usage.ratePerAcre} {usage.fertilizer?.unit}/acre</p>
                      <p className="text-xs text-gray-500 mt-1">{usage.acresApplied} acres</p>
                      {usage.completedAt && (
                        <p className="text-xs text-blue-600 mt-1">
                          Applied {formatCompletionDate(usage.completedAt)}
                          {usage.completedByName && ` by ${usage.completedByName}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No fertilizer plan set</p>
            )}
          </div>

          {/* In-Furrow Plan */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="w-3 h-3 bg-gray-900 rounded-full mr-2"></span>
                In-Furrow Plan
              </h3>
              <button
                onClick={() => {
                  setNewChemicalCategory(ChemicalCategory.IN_FURROW);
                  setShowAddProductModal('chemical');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add In-Furrow
              </button>
            </div>
            {farm?.chemicalUsage && farm.chemicalUsage.filter(u => u.chemical?.category === ChemicalCategory.IN_FURROW).length > 0 ? (
              <div className="space-y-3">
                {farm.chemicalUsage
                  .filter(usage => usage.chemical?.category === ChemicalCategory.IN_FURROW)
                  .map((usage) => (
                  <div key={usage.id} className={`p-3 rounded-lg flex items-start ${usage.completedAt ? 'bg-gray-100 border border-gray-300' : 'bg-gray-50'}`}>
                    <button
                      onClick={() => {
                        if (usage.completedAt) {
                          handleUndoComplete('chemical', usage.id);
                        } else {
                          setShowCompletionModal({ type: 'chemical', id: usage.id, productName: usage.chemical?.name || 'In-Furrow' });
                        }
                      }}
                      disabled={saving}
                      className={`mt-0.5 mr-3 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                        usage.completedAt
                          ? 'bg-gray-900 border-gray-900 text-white'
                          : 'border-gray-300 hover:border-gray-900'
                      }`}
                    >
                      {usage.completedAt && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{usage.chemical?.name}</p>
                      <p className="text-sm text-gray-600">{usage.ratePerAcre} {usage.chemical?.unit}/acre</p>
                      <p className="text-xs text-gray-500 mt-1">{usage.acresApplied} acres</p>
                      {usage.completedAt && (
                        <p className="text-xs text-gray-700 mt-1">
                          Applied {formatCompletionDate(usage.completedAt)}
                          {usage.completedByName && ` by ${usage.completedByName}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No in-furrow plan set</p>
            )}
          </div>

          {/* Herbicide Plan */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Herbicide Plan
              </h3>
              <button
                onClick={() => {
                  setNewChemicalCategory(ChemicalCategory.HERBICIDE);
                  setShowAddProductModal('chemical');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add Herbicide
              </button>
            </div>
            {farm?.chemicalUsage && farm.chemicalUsage.filter(u => u.chemical?.category === ChemicalCategory.HERBICIDE || !u.chemical?.category).length > 0 ? (
              <div className="space-y-3">
                {farm.chemicalUsage
                  .filter(usage => usage.chemical?.category === ChemicalCategory.HERBICIDE || !usage.chemical?.category)
                  .map((usage) => (
                  <div key={usage.id} className={`p-3 rounded-lg flex items-start ${usage.completedAt ? 'bg-green-100 border border-green-300' : 'bg-green-50'}`}>
                    <button
                      onClick={() => {
                        if (usage.completedAt) {
                          handleUndoComplete('chemical', usage.id);
                        } else {
                          setShowCompletionModal({ type: 'chemical', id: usage.id, productName: usage.chemical?.name || 'Herbicide' });
                        }
                      }}
                      disabled={saving}
                      className={`mt-0.5 mr-3 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                        usage.completedAt
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {usage.completedAt && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{usage.chemical?.name}</p>
                      <p className="text-sm text-gray-600">{usage.ratePerAcre} {usage.chemical?.unit}/acre</p>
                      <p className="text-xs text-gray-500 mt-1">{usage.acresApplied} acres</p>
                      {usage.completedAt && (
                        <p className="text-xs text-green-600 mt-1">
                          Sprayed {formatCompletionDate(usage.completedAt)}
                          {usage.completedByName && ` by ${usage.completedByName}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No herbicide plan set</p>
            )}
          </div>

          {/* Fungicide Plan */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></span>
                Fungicide Plan
              </h3>
              <button
                onClick={() => {
                  setNewChemicalCategory(ChemicalCategory.FUNGICIDE);
                  setShowAddProductModal('chemical');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add Fungicide
              </button>
            </div>
            {farm?.chemicalUsage && farm.chemicalUsage.filter(u => u.chemical?.category === ChemicalCategory.FUNGICIDE).length > 0 ? (
              <div className="space-y-3">
                {farm.chemicalUsage
                  .filter(usage => usage.chemical?.category === ChemicalCategory.FUNGICIDE)
                  .map((usage) => (
                  <div key={usage.id} className={`p-3 rounded-lg flex items-start ${usage.completedAt ? 'bg-indigo-100 border border-indigo-300' : 'bg-indigo-50'}`}>
                    <button
                      onClick={() => {
                        if (usage.completedAt) {
                          handleUndoComplete('chemical', usage.id);
                        } else {
                          setShowCompletionModal({ type: 'chemical', id: usage.id, productName: usage.chemical?.name || 'Fungicide' });
                        }
                      }}
                      disabled={saving}
                      className={`mt-0.5 mr-3 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                        usage.completedAt
                          ? 'bg-indigo-500 border-indigo-500 text-white'
                          : 'border-gray-300 hover:border-indigo-500'
                      }`}
                    >
                      {usage.completedAt && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{usage.chemical?.name}</p>
                      <p className="text-sm text-gray-600">{usage.ratePerAcre} {usage.chemical?.unit}/acre</p>
                      <p className="text-xs text-gray-500 mt-1">{usage.acresApplied} acres</p>
                      {usage.completedAt && (
                        <p className="text-xs text-indigo-600 mt-1">
                          Sprayed {formatCompletionDate(usage.completedAt)}
                          {usage.completedByName && ` by ${usage.completedByName}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No fungicide plan set</p>
            )}
          </div>

          {/* Active Trials */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                Active Trials
              </h3>
              <button
                onClick={() => setShowAddProductModal('trial')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add Trial
              </button>
            </div>
            {farmPlan.activeTrials.length > 0 ? (
              <div className="space-y-3">
                {farmPlan.activeTrials.map((trial) => (
                  <div key={trial.id} className="p-3 bg-orange-50 rounded-lg border-l-2 border-orange-400">
                    <p className="font-medium text-gray-900">{trial.name}</p>
                    <p className="text-sm text-gray-600">Type: {trial.trialType}</p>
                    {trial.plotLocation && (
                      <p className="text-xs text-gray-500 mt-1">Location: {trial.plotLocation}</p>
                    )}
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                      trial.status === TrialStatus.ACTIVE ? 'bg-blue-100 text-blue-800' :
                      trial.status === TrialStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {trial.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No active trials</p>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/farm-plans')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            &larr; Back to Farm Plans
          </button>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddProductModal && showAddProductModal !== 'trial' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add {showAddProductModal === 'fertilizer' ? 'Fertilizer' :
                   showAddProductModal === 'seed' ? 'Seed' : 'Chemical'}
            </h3>

            <div className="space-y-4">
              {/* Select Existing Product */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Existing Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    setNewProductName('');
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">-- Or create new below --</option>
                  {showAddProductModal === 'fertilizer' && fertilizers.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                  {showAddProductModal === 'chemical' && chemicals
                    .filter(c => c.category === newChemicalCategory)
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  {showAddProductModal === 'seed' && seedHybrids
                    .filter(s => s.commodityType === farm?.commodityType)
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>

              {/* Or Create New */}
              {!selectedProductId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Product Name
                    </label>
                    <input
                      type="text"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Enter product name"
                    />
                    <p className="text-xs text-amber-600 mt-1">
                      New products will need pricing set by a manager
                    </p>
                  </div>

                  {(showAddProductModal === 'fertilizer' || showAddProductModal === 'chemical') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <select
                        value={newProductUnit}
                        onChange={(e) => setNewProductUnit(e.target.value as UnitType)}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value={UnitType.LB}>Pounds (LB)</option>
                        <option value={UnitType.GAL}>Gallons (GAL)</option>
                        <option value={UnitType.BAG}>Bags (BAG)</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {showAddProductModal === 'seed' ? 'Population (seeds/acre)' : 'Rate per Acre'}
                </label>
                <input
                  type="number"
                  value={newProductRate}
                  onChange={(e) => setNewProductRate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder={showAddProductModal === 'seed' ? '32000' : '0'}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={resetModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                disabled={saving || (!selectedProductId && !newProductName) || !newProductRate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Trial Modal */}
      {showAddProductModal === 'trial' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Trial</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trial Name
                </label>
                <input
                  type="text"
                  value={trialName}
                  onChange={(e) => setTrialName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., Hybrid A vs Hybrid B"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trial Type
                </label>
                <select
                  value={trialType}
                  onChange={(e) => setTrialType(e.target.value as TrialType)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value={TrialType.SEED}>Seed</option>
                  <option value={TrialType.FERTILIZER}>Fertilizer</option>
                  <option value={TrialType.CHEMICAL}>Chemical</option>
                  <option value={TrialType.FUNGICIDE}>Fungicide</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plot Location (optional)
                </label>
                <input
                  type="text"
                  value={trialPlotLocation}
                  onChange={(e) => setTrialPlotLocation(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., East field, rows 10-20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={trialNotes}
                  onChange={(e) => setTrialNotes(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={resetModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTrial}
                disabled={saving || !trialName}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Trial'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Date Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mark as Complete</h3>
            <p className="text-sm text-gray-600 mb-4">
              {showCompletionModal.productName}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completion Date
              </label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will create a calendar event
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-4">{error}</p>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCompletionModal(null);
                  setError(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkComplete}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
