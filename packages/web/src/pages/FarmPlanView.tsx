import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { breakevenApi } from '../api/breakeven.api';
import {
  FarmPlanView,
  TrialStatus,
  CommodityType,
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
                      onClick={() => setExpandedFarm(expandedFarm === plan.farmId ? null : plan.farmId)}
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
                        {plan.seedPlan.length > 0 ? (
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
                        {plan.fertilizerPlan.length > 0 ? (
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
                          <span className="w-2 h-2 bg-teal-500 rounded-full mr-2"></span>
                          In-Furrow Plan
                        </h3>
                        {plan.inFurrowPlan.length > 0 ? (
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
                        {plan.chemicalPlan.length > 0 ? (
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
                        {plan.fungicidePlan.length > 0 ? (
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
    </div>
  );
}
