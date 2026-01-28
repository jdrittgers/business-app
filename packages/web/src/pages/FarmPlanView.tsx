import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { breakevenApi } from '../api/breakeven.api';
import {
  FarmPlanView,
  Farm,
  Chemical,
  TrialStatus,
  CommodityType,
  ChemicalCategory,
  UserRole
} from '@business-app/shared';

export default function FarmPlansPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [farmPlans, setFarmPlans] = useState<FarmPlanView[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFarm, setExpandedFarm] = useState<string | null>(null);
  const [approvingFarm, setApprovingFarm] = useState<string | null>(null);

  // Farm details for completion tracking
  const [farmDetails, setFarmDetails] = useState<Record<string, Farm>>({});
  const [loadingFarmDetails, setLoadingFarmDetails] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState<{
    type: 'seed' | 'fertilizer' | 'chemical';
    id: string;
    productName: string;
    farmId: string;
  } | null>(null);
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  // Bulk assign chemical state
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [bulkAssignData, setBulkAssignData] = useState({
    chemicalId: '',
    category: '' as string,
    ratePerAcre: '',
    targetCommodity: 'ALL' as 'ALL' | 'CORN' | 'SOYBEANS' | 'WHEAT',
    selectedFarmIds: [] as string[]
  });
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkAssignResult, setBulkAssignResult] = useState<{ totalAdded: number; totalErrors: number } | null>(null);

  // Check if user is manager or owner
  const userRole = user?.businessMemberships.find(m => m.businessId === selectedBusinessId)?.role;
  const canApprove = userRole === UserRole.OWNER || userRole === UserRole.MANAGER;

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
      loadFarmPlans();
    }
  }, [selectedBusinessId, selectedYear]);

  const loadFarmPlans = async () => {
    if (!selectedBusinessId) return;

    setIsLoading(true);
    setError(null);

    try {
      const plans = await breakevenApi.getAllFarmPlans(selectedBusinessId, selectedYear);
      setFarmPlans(plans);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load farm plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Load farm details when expanded (for completion tracking)
  const loadFarmDetails = async (farmId: string) => {
    if (!selectedBusinessId || farmDetails[farmId]) return;
    setLoadingFarmDetails(farmId);
    try {
      const farm = await breakevenApi.getFarm(selectedBusinessId, farmId);
      setFarmDetails(prev => ({ ...prev, [farmId]: farm }));
    } catch (err) {
      console.error('Failed to load farm details:', err);
    } finally {
      setLoadingFarmDetails(null);
    }
  };

  const handleExpandFarm = (farmId: string) => {
    if (expandedFarm === farmId) {
      setExpandedFarm(null);
    } else {
      setExpandedFarm(farmId);
      loadFarmDetails(farmId);
    }
  };

  const handleMarkComplete = async () => {
    if (!selectedBusinessId || !showCompletionModal) return;
    setSaving(true);

    try {
      const date = new Date(completionDate);
      const { type, id, farmId } = showCompletionModal;

      if (type === 'seed') {
        await breakevenApi.markSeedUsageComplete(selectedBusinessId, id, date);
      } else if (type === 'fertilizer') {
        await breakevenApi.markFertilizerUsageComplete(selectedBusinessId, id, date);
      } else if (type === 'chemical') {
        await breakevenApi.markChemicalUsageComplete(selectedBusinessId, id, date);
      }

      // Reload farm details
      const farm = await breakevenApi.getFarm(selectedBusinessId, farmId);
      setFarmDetails(prev => ({ ...prev, [farmId]: farm }));

      setShowCompletionModal(null);
      setCompletionDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to mark complete');
    } finally {
      setSaving(false);
    }
  };

  const handleUndoComplete = async (type: 'seed' | 'fertilizer' | 'chemical', id: string, farmId: string) => {
    if (!selectedBusinessId) return;
    setSaving(true);

    try {
      if (type === 'seed') {
        await breakevenApi.undoSeedUsageComplete(selectedBusinessId, id);
      } else if (type === 'fertilizer') {
        await breakevenApi.undoFertilizerUsageComplete(selectedBusinessId, id);
      } else if (type === 'chemical') {
        await breakevenApi.undoChemicalUsageComplete(selectedBusinessId, id);
      }

      // Reload farm details
      const farm = await breakevenApi.getFarm(selectedBusinessId, farmId);
      setFarmDetails(prev => ({ ...prev, [farmId]: farm }));
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

  const handleApprovePlan = async (farmId: string) => {
    if (!selectedBusinessId) return;
    setApprovingFarm(farmId);
    try {
      await breakevenApi.approveFarmPlan(selectedBusinessId, farmId);
      setFarmPlans(prev => prev.map(p =>
        p.farmId === farmId
          ? { ...p, planApproved: true, planApprovedAt: new Date() }
          : p
      ));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve plan');
    } finally {
      setApprovingFarm(null);
    }
  };

  const handleUnapprovePlan = async (farmId: string) => {
    if (!selectedBusinessId) return;
    setApprovingFarm(farmId);
    try {
      await breakevenApi.unapproveFarmPlan(selectedBusinessId, farmId);
      setFarmPlans(prev => prev.map(p =>
        p.farmId === farmId
          ? { ...p, planApproved: false, planApprovedAt: undefined }
          : p
      ));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to unapprove plan');
    } finally {
      setApprovingFarm(null);
    }
  };

  const openBulkAssignModal = async () => {
    if (!selectedBusinessId) return;
    try {
      const chemicalsData = await breakevenApi.getChemicals(selectedBusinessId);
      setChemicals(chemicalsData);
    } catch (err) {
      console.error('Failed to load chemicals:', err);
    }
    // Pre-select all farms matching current filter
    const matchingFarmIds = farmPlans.map(p => p.farmId);
    setBulkAssignData({
      chemicalId: '',
      category: '',
      ratePerAcre: '',
      targetCommodity: 'ALL',
      selectedFarmIds: matchingFarmIds
    });
    setBulkAssignResult(null);
    setShowBulkAssignModal(true);
  };

  const handleBulkAssignCommodityChange = (commodity: 'ALL' | 'CORN' | 'SOYBEANS' | 'WHEAT') => {
    const matchingFarmIds = farmPlans
      .filter(p => commodity === 'ALL' || p.commodityType === commodity)
      .map(p => p.farmId);
    setBulkAssignData(prev => ({ ...prev, targetCommodity: commodity, selectedFarmIds: matchingFarmIds }));
  };

  const handleBulkAssignSubmit = async () => {
    if (!selectedBusinessId || !bulkAssignData.chemicalId || !bulkAssignData.ratePerAcre || bulkAssignData.selectedFarmIds.length === 0) return;
    setBulkAssigning(true);
    try {
      const result = await breakevenApi.bulkAddChemicalUsage(selectedBusinessId, {
        farmIds: bulkAssignData.selectedFarmIds,
        chemicalId: bulkAssignData.chemicalId,
        ratePerAcre: parseFloat(bulkAssignData.ratePerAcre)
      });
      setBulkAssignResult({ totalAdded: result.totalAdded, totalErrors: result.totalErrors });
      // Refresh farm plans
      await loadFarmPlans();
      // Clear farm details cache so re-expanding shows updated data
      setFarmDetails({});
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to bulk assign chemical');
    } finally {
      setBulkAssigning(false);
    }
  };

  const getFilteredChemicals = () => {
    if (!bulkAssignData.category) return chemicals.filter(c => c.isActive !== false);
    return chemicals.filter(c => c.category === bulkAssignData.category && c.isActive !== false);
  };

  const getCommodityColor = (type: CommodityType) => {
    switch (type) {
      case CommodityType.CORN: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case CommodityType.SOYBEANS: return 'bg-green-100 text-green-800 border-green-300';
      case CommodityType.WHEAT: return 'bg-amber-100 text-amber-800 border-amber-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Farm Plans</h1>
              <p className="text-sm text-gray-600">
                Growing season plans for {selectedYear}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {canApprove && (
                <button
                  onClick={openBulkAssignModal}
                  className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                >
                  Bulk Assign Chemical
                </button>
              )}
              <button
                onClick={() => navigate('/dashboard')}
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
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading farm plans...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-md">
            {error}
          </div>
        ) : farmPlans.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No farm plans found for {selectedYear}.</p>
            <p className="text-sm text-gray-500 mt-1">Create farms and add inputs in Farm Management.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {farmPlans.map(plan => (
              <div key={plan.farmId} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Farm Header */}
                <div
                  className={`px-6 py-4 border-l-4 ${
                    plan.commodityType === CommodityType.CORN ? 'border-yellow-500' :
                    plan.commodityType === CommodityType.SOYBEANS ? 'border-green-500' :
                    'border-amber-500'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div
                      className="flex-1 cursor-pointer hover:bg-gray-50 -ml-2 pl-2 py-1 rounded"
                      onClick={() => handleExpandFarm(plan.farmId)}
                    >
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">{plan.farmName}</h2>
                        {/* Plan Approval Badge */}
                        {plan.planApproved ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Pending Approval
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getCommodityColor(plan.commodityType)}`}>
                          {plan.commodityType}
                        </span>
                        <span className="text-sm text-gray-600">{plan.acres.toLocaleString()} acres</span>
                        {plan.grainEntityName && (
                          <span className="text-sm text-gray-500">| {plan.grainEntityName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-blue-600">{plan.projectedYield} bu/acre</p>
                        <p className="text-xs text-gray-500">Projected Yield</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Edit Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/farm-plans/${plan.farmId}/edit`);
                          }}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Plan"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Approve/Unapprove Button (only for managers/owners) */}
                        {canApprove && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (plan.planApproved) {
                                handleUnapprovePlan(plan.farmId);
                              } else {
                                handleApprovePlan(plan.farmId);
                              }
                            }}
                            disabled={approvingFarm === plan.farmId}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              plan.planApproved
                                ? 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                                : 'text-green-700 bg-green-100 hover:bg-green-200'
                            } disabled:opacity-50`}
                          >
                            {approvingFarm === plan.farmId ? (
                              <span className="flex items-center">
                                <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                ...
                              </span>
                            ) : plan.planApproved ? (
                              'Unapprove'
                            ) : (
                              'Approve'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedFarm === plan.farmId && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Seed Plan */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                          Seed Plan
                        </h3>
                        {loadingFarmDetails === plan.farmId ? (
                          <div className="text-sm text-gray-500">Loading...</div>
                        ) : farmDetails[plan.farmId]?.seedUsage && farmDetails[plan.farmId].seedUsage!.length > 0 ? (
                          <div className="space-y-2">
                            {farmDetails[plan.farmId].seedUsage!.map((usage) => (
                              <div key={usage.id} className={`text-sm flex items-start p-2 rounded ${usage.completedAt ? 'bg-purple-50' : ''}`}>
                                <button
                                  onClick={() => {
                                    if (usage.completedAt) {
                                      handleUndoComplete('seed', usage.id, plan.farmId);
                                    } else {
                                      setShowCompletionModal({ type: 'seed', id: usage.id, productName: usage.seedHybrid?.name || 'Seed', farmId: plan.farmId });
                                    }
                                  }}
                                  disabled={saving}
                                  className={`mt-0.5 mr-2 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                                    usage.completedAt
                                      ? 'bg-purple-500 border-purple-500 text-white'
                                      : 'border-gray-300 hover:border-purple-500'
                                  }`}
                                >
                                  {usage.completedAt && (
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{usage.seedHybrid?.name}</p>
                                  <div className="text-gray-600">
                                    {usage.isVRT ? (
                                      <span className="text-purple-600">
                                        VRT: {usage.vrtMinRate?.toLocaleString()} - {usage.vrtMaxRate?.toLocaleString()} seeds/acre
                                      </span>
                                    ) : (
                                      <span>{usage.ratePerAcre?.toLocaleString()} seeds/acre</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500">{usage.acresApplied} acres</p>
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
                        ) : plan.seedPlan.length > 0 ? (
                          <div className="space-y-2">
                            {plan.seedPlan.map((seed, idx) => (
                              <div key={idx} className="text-sm">
                                <p className="font-medium text-gray-900">{seed.hybridName}</p>
                                <div className="text-gray-600">
                                  {seed.isVRT ? (
                                    <span className="text-purple-600">
                                      VRT: {seed.vrtMinRate?.toLocaleString()} - {seed.vrtMaxRate?.toLocaleString()} seeds/acre
                                    </span>
                                  ) : (
                                    <span>{seed.population.toLocaleString()} seeds/acre</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{seed.acresApplied} acres</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No seed plan set</p>
                        )}
                      </div>

                      {/* Fertilizer Plan */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          Fertilizer Plan
                        </h3>
                        {loadingFarmDetails === plan.farmId ? (
                          <div className="text-sm text-gray-500">Loading...</div>
                        ) : farmDetails[plan.farmId]?.fertilizerUsage && farmDetails[plan.farmId].fertilizerUsage!.length > 0 ? (
                          <div className="space-y-2">
                            {farmDetails[plan.farmId].fertilizerUsage!.map((usage) => (
                              <div key={usage.id} className={`text-sm flex items-start p-2 rounded ${usage.completedAt ? 'bg-blue-50' : ''}`}>
                                <button
                                  onClick={() => {
                                    if (usage.completedAt) {
                                      handleUndoComplete('fertilizer', usage.id, plan.farmId);
                                    } else {
                                      setShowCompletionModal({ type: 'fertilizer', id: usage.id, productName: usage.fertilizer?.name || 'Fertilizer', farmId: plan.farmId });
                                    }
                                  }}
                                  disabled={saving}
                                  className={`mt-0.5 mr-2 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                                    usage.completedAt
                                      ? 'bg-blue-500 border-blue-500 text-white'
                                      : 'border-gray-300 hover:border-blue-500'
                                  }`}
                                >
                                  {usage.completedAt && (
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{usage.fertilizer?.name}</p>
                                  <p className="text-gray-600">
                                    {usage.ratePerAcre} {usage.fertilizer?.unit}/acre
                                  </p>
                                  <p className="text-xs text-gray-500">{usage.acresApplied} acres</p>
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
                        ) : plan.fertilizerPlan.length > 0 ? (
                          <div className="space-y-2">
                            {plan.fertilizerPlan.map((fert, idx) => (
                              <div key={idx} className="text-sm">
                                <p className="font-medium text-gray-900">{fert.productName}</p>
                                <p className="text-gray-600">
                                  {fert.ratePerAcre} {fert.unit}/acre
                                </p>
                                <p className="text-xs text-gray-500">{fert.acresApplied} acres</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No fertilizer plan set</p>
                        )}
                      </div>

                      {/* In-Furrow Plan */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-gray-900 rounded-full mr-2"></span>
                          In-Furrow Plan
                        </h3>
                        {loadingFarmDetails === plan.farmId ? (
                          <div className="text-sm text-gray-500">Loading...</div>
                        ) : farmDetails[plan.farmId]?.chemicalUsage && farmDetails[plan.farmId].chemicalUsage!.filter(u => u.chemical?.category === ChemicalCategory.IN_FURROW).length > 0 ? (
                          <div className="space-y-2">
                            {farmDetails[plan.farmId].chemicalUsage!.filter(u => u.chemical?.category === ChemicalCategory.IN_FURROW).map((usage) => (
                              <div key={usage.id} className={`text-sm flex items-start p-2 rounded ${usage.completedAt ? 'bg-gray-50' : ''}`}>
                                <button
                                  onClick={() => {
                                    if (usage.completedAt) {
                                      handleUndoComplete('chemical', usage.id, plan.farmId);
                                    } else {
                                      setShowCompletionModal({ type: 'chemical', id: usage.id, productName: usage.chemical?.name || 'In-Furrow', farmId: plan.farmId });
                                    }
                                  }}
                                  disabled={saving}
                                  className={`mt-0.5 mr-2 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                                    usage.completedAt
                                      ? 'bg-gray-900 border-gray-900 text-white'
                                      : 'border-gray-300 hover:border-gray-900'
                                  }`}
                                >
                                  {usage.completedAt && (
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{usage.chemical?.name}</p>
                                  <p className="text-gray-600">
                                    {usage.ratePerAcre} {usage.chemical?.unit}/acre
                                  </p>
                                  <p className="text-xs text-gray-500">{usage.acresApplied} acres</p>
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
                        ) : plan.inFurrowPlan.length > 0 ? (
                          <div className="space-y-2">
                            {plan.inFurrowPlan.map((item, idx) => (
                              <div key={idx} className="text-sm">
                                <p className="font-medium text-gray-900">{item.productName}</p>
                                <p className="text-gray-600">
                                  {item.ratePerAcre} {item.unit}/acre
                                </p>
                                <p className="text-xs text-gray-500">{item.acresApplied} acres</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No in-furrow plan set</p>
                        )}
                      </div>

                      {/* Chemical/Herbicide Plan */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Herbicide Plan
                        </h3>
                        {loadingFarmDetails === plan.farmId ? (
                          <div className="text-sm text-gray-500">Loading...</div>
                        ) : farmDetails[plan.farmId]?.chemicalUsage && farmDetails[plan.farmId].chemicalUsage!.filter(u => u.chemical?.category === ChemicalCategory.HERBICIDE).length > 0 ? (
                          <div className="space-y-2">
                            {farmDetails[plan.farmId].chemicalUsage!.filter(u => u.chemical?.category === ChemicalCategory.HERBICIDE).map((usage) => (
                              <div key={usage.id} className={`text-sm flex items-start p-2 rounded ${usage.completedAt ? 'bg-green-50' : ''}`}>
                                <button
                                  onClick={() => {
                                    if (usage.completedAt) {
                                      handleUndoComplete('chemical', usage.id, plan.farmId);
                                    } else {
                                      setShowCompletionModal({ type: 'chemical', id: usage.id, productName: usage.chemical?.name || 'Herbicide', farmId: plan.farmId });
                                    }
                                  }}
                                  disabled={saving}
                                  className={`mt-0.5 mr-2 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                                    usage.completedAt
                                      ? 'bg-green-500 border-green-500 text-white'
                                      : 'border-gray-300 hover:border-green-500'
                                  }`}
                                >
                                  {usage.completedAt && (
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{usage.chemical?.name}</p>
                                  <p className="text-gray-600">
                                    {usage.ratePerAcre} {usage.chemical?.unit}/acre
                                  </p>
                                  <p className="text-xs text-gray-500">{usage.acresApplied} acres</p>
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
                        ) : plan.chemicalPlan.length > 0 ? (
                          <div className="space-y-2">
                            {plan.chemicalPlan.map((chem, idx) => (
                              <div key={idx} className="text-sm">
                                <p className="font-medium text-gray-900">{chem.productName}</p>
                                <p className="text-gray-600">
                                  {chem.ratePerAcre} {chem.unit}/acre
                                </p>
                                <p className="text-xs text-gray-500">{chem.acresApplied} acres</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No herbicide plan set</p>
                        )}
                      </div>

                      {/* Fungicide Plan */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
                          Fungicide Plan
                        </h3>
                        {loadingFarmDetails === plan.farmId ? (
                          <div className="text-sm text-gray-500">Loading...</div>
                        ) : farmDetails[plan.farmId]?.chemicalUsage && farmDetails[plan.farmId].chemicalUsage!.filter(u => u.chemical?.category === ChemicalCategory.FUNGICIDE).length > 0 ? (
                          <div className="space-y-2">
                            {farmDetails[plan.farmId].chemicalUsage!.filter(u => u.chemical?.category === ChemicalCategory.FUNGICIDE).map((usage) => (
                              <div key={usage.id} className={`text-sm flex items-start p-2 rounded ${usage.completedAt ? 'bg-indigo-50' : ''}`}>
                                <button
                                  onClick={() => {
                                    if (usage.completedAt) {
                                      handleUndoComplete('chemical', usage.id, plan.farmId);
                                    } else {
                                      setShowCompletionModal({ type: 'chemical', id: usage.id, productName: usage.chemical?.name || 'Fungicide', farmId: plan.farmId });
                                    }
                                  }}
                                  disabled={saving}
                                  className={`mt-0.5 mr-2 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                                    usage.completedAt
                                      ? 'bg-indigo-500 border-indigo-500 text-white'
                                      : 'border-gray-300 hover:border-indigo-500'
                                  }`}
                                >
                                  {usage.completedAt && (
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{usage.chemical?.name}</p>
                                  <p className="text-gray-600">
                                    {usage.ratePerAcre} {usage.chemical?.unit}/acre
                                  </p>
                                  <p className="text-xs text-gray-500">{usage.acresApplied} acres</p>
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
                        ) : plan.fungicidePlan.length > 0 ? (
                          <div className="space-y-2">
                            {plan.fungicidePlan.map((fung, idx) => (
                              <div key={idx} className="text-sm">
                                <p className="font-medium text-gray-900">{fung.productName}</p>
                                <p className="text-gray-600">
                                  {fung.ratePerAcre} {fung.unit}/acre
                                </p>
                                <p className="text-xs text-gray-500">{fung.acresApplied} acres</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No fungicide plan set</p>
                        )}
                      </div>

                      {/* Insecticide Plan */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                          Insecticide Plan
                        </h3>
                        {loadingFarmDetails === plan.farmId ? (
                          <div className="text-sm text-gray-500">Loading...</div>
                        ) : farmDetails[plan.farmId]?.chemicalUsage && farmDetails[plan.farmId].chemicalUsage!.filter(u => u.chemical?.category === ChemicalCategory.INSECTICIDE).length > 0 ? (
                          <div className="space-y-2">
                            {farmDetails[plan.farmId].chemicalUsage!.filter(u => u.chemical?.category === ChemicalCategory.INSECTICIDE).map((usage) => (
                              <div key={usage.id} className={`text-sm flex items-start p-2 rounded ${usage.completedAt ? 'bg-red-50' : ''}`}>
                                <button
                                  onClick={() => {
                                    if (usage.completedAt) {
                                      handleUndoComplete('chemical', usage.id, plan.farmId);
                                    } else {
                                      setShowCompletionModal({ type: 'chemical', id: usage.id, productName: usage.chemical?.name || 'Insecticide', farmId: plan.farmId });
                                    }
                                  }}
                                  disabled={saving}
                                  className={`mt-0.5 mr-2 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                                    usage.completedAt
                                      ? 'bg-red-500 border-red-500 text-white'
                                      : 'border-gray-300 hover:border-red-500'
                                  }`}
                                >
                                  {usage.completedAt && (
                                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{usage.chemical?.name}</p>
                                  <p className="text-gray-600">
                                    {usage.ratePerAcre} {usage.chemical?.unit}/acre
                                  </p>
                                  <p className="text-xs text-gray-500">{usage.acresApplied} acres</p>
                                  {usage.completedAt && (
                                    <p className="text-xs text-red-600 mt-1">
                                      Sprayed {formatCompletionDate(usage.completedAt)}
                                      {usage.completedByName && ` by ${usage.completedByName}`}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No insecticide plan set</p>
                        )}
                      </div>

                      {/* Active Trials */}
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                          <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                          Active Trials
                        </h3>
                        {plan.activeTrials.length > 0 ? (
                          <div className="space-y-2">
                            {plan.activeTrials.map((trial) => (
                              <div key={trial.id} className="text-sm border-l-2 border-orange-300 pl-2">
                                <p className="font-medium text-gray-900">{trial.name}</p>
                                <p className="text-gray-600">
                                  Type: {trial.trialType}
                                </p>
                                {trial.plotLocation && (
                                  <p className="text-xs text-gray-500">Location: {trial.plotLocation}</p>
                                )}
                                {trial.targetMetric && (
                                  <p className="text-xs text-gray-500">Target: {trial.targetMetric}</p>
                                )}
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
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
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bulk Assign Chemical Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Assign Chemical to Fields</h3>

            {bulkAssignResult ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-md ${bulkAssignResult.totalErrors > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                  <p className="font-medium text-gray-900">
                    Added chemical to {bulkAssignResult.totalAdded} field{bulkAssignResult.totalAdded !== 1 ? 's' : ''}
                  </p>
                  {bulkAssignResult.totalErrors > 0 && (
                    <p className="text-sm text-amber-700 mt-1">
                      {bulkAssignResult.totalErrors} field{bulkAssignResult.totalErrors !== 1 ? 's' : ''} had errors
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowBulkAssignModal(false)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Target Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apply to Fields</label>
                  <div className="flex space-x-2">
                    {(['ALL', 'CORN', 'SOYBEANS', 'WHEAT'] as const).map(commodity => (
                      <button
                        key={commodity}
                        onClick={() => handleBulkAssignCommodityChange(commodity)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md border ${
                          bulkAssignData.targetCommodity === commodity
                            ? commodity === 'CORN' ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                            : commodity === 'SOYBEANS' ? 'bg-green-100 border-green-400 text-green-800'
                            : commodity === 'WHEAT' ? 'bg-amber-100 border-amber-400 text-amber-800'
                            : 'bg-blue-100 border-blue-400 text-blue-800'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {commodity === 'ALL' ? 'All Fields' : commodity === 'SOYBEANS' ? 'Soybeans' : commodity.charAt(0) + commodity.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {bulkAssignData.selectedFarmIds.length} field{bulkAssignData.selectedFarmIds.length !== 1 ? 's' : ''} selected
                  </p>
                </div>

                {/* Individual field checkboxes */}
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {farmPlans
                    .filter(p => bulkAssignData.targetCommodity === 'ALL' || p.commodityType === bulkAssignData.targetCommodity)
                    .map(plan => (
                    <label key={plan.farmId} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={bulkAssignData.selectedFarmIds.includes(plan.farmId)}
                        onChange={(e) => {
                          setBulkAssignData(prev => ({
                            ...prev,
                            selectedFarmIds: e.target.checked
                              ? [...prev.selectedFarmIds, plan.farmId]
                              : prev.selectedFarmIds.filter(id => id !== plan.farmId)
                          }));
                        }}
                        className="mr-2 rounded text-blue-600"
                      />
                      <span className="text-gray-900">{plan.farmName}</span>
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                        plan.commodityType === CommodityType.CORN ? 'bg-yellow-100 text-yellow-800' :
                        plan.commodityType === CommodityType.SOYBEANS ? 'bg-green-100 text-green-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {plan.commodityType}
                      </span>
                      <span className="ml-auto text-gray-500">{plan.acres} ac</span>
                    </label>
                  ))}
                </div>

                {/* Chemical Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chemical Category</label>
                  <select
                    value={bulkAssignData.category}
                    onChange={(e) => setBulkAssignData(prev => ({ ...prev, category: e.target.value, chemicalId: '' }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">All Categories</option>
                    <option value="HERBICIDE">Herbicide</option>
                    <option value="FUNGICIDE">Fungicide</option>
                    <option value="INSECTICIDE">Insecticide</option>
                    <option value="IN_FURROW">In-Furrow</option>
                  </select>
                </div>

                {/* Chemical Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chemical Product</label>
                  <select
                    value={bulkAssignData.chemicalId}
                    onChange={(e) => setBulkAssignData(prev => ({ ...prev, chemicalId: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Chemical</option>
                    {getFilteredChemicals().map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.category}) — ${c.pricePerUnit.toFixed(2)}/{c.unit}
                      </option>
                    ))}
                  </select>
                  {getFilteredChemicals().length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No chemicals found. Add them in Product Setup.</p>
                  )}
                </div>

                {/* Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate per Acre</label>
                  <input
                    type="number"
                    step="0.01"
                    value={bulkAssignData.ratePerAcre}
                    onChange={(e) => setBulkAssignData(prev => ({ ...prev, ratePerAcre: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g. 0.5"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Each field will use its own acreage for the total amount calculation
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setShowBulkAssignModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkAssignSubmit}
                    disabled={bulkAssigning || !bulkAssignData.chemicalId || !bulkAssignData.ratePerAcre || bulkAssignData.selectedFarmIds.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
                  >
                    {bulkAssigning ? 'Assigning...' : `Assign to ${bulkAssignData.selectedFarmIds.length} Field${bulkAssignData.selectedFarmIds.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completion Date Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Mark "{showCompletionModal.productName}" Complete
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Completion Date
              </label>
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCompletionModal(null);
                  setCompletionDate(new Date().toISOString().split('T')[0]);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkComplete}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
