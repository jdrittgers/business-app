import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { breakevenApi } from '../api/breakeven.api';
import {
  Farm,
  Fertilizer,
  Chemical,
  SeedHybrid,
  CostType,
  ChemicalCategory,
  FarmTrial,
  TrialType,
  TrialStatus
} from '@business-app/shared';
import { usePermissions } from '../hooks/usePermissions';
import ReadOnlyBanner from '../components/ReadOnlyBanner';

export default function FarmCostEntry() {
  const { farmId } = useParams<{ farmId: string }>();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { canEdit, isEmployee } = usePermissions();
  const navigate = useNavigate();

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [fertilizers, setFertilizers] = useState<Fertilizer[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [seedHybrids, setSeedHybrids] = useState<SeedHybrid[]>([]);
  const [breakEven, setBreakEven] = useState<any | null>(null);
  const [trials, setTrials] = useState<FarmTrial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chemical category tab
  const [chemicalTab, setChemicalTab] = useState<ChemicalCategory>(ChemicalCategory.HERBICIDE);

  // Cost view toggle (total vs per-acre)
  const [costView, setCostView] = useState<'total' | 'perAcre'>('total');

  // Form states
  const [fertilizerForm, setFertilizerForm] = useState({
    fertilizerId: '',
    ratePerAcre: '',
    rateInputUnit: '' as '' | 'GAL' | 'LB' | 'LBS_N',
    useAllAcres: true,
    acresApplied: '',
    amountUsed: ''
  });
  const [chemicalForm, setChemicalForm] = useState({
    chemicalId: '',
    ratePerAcre: '',
    useAllAcres: true,
    acresApplied: '',
    amountUsed: '',
    usageUnit: 'GAL' as 'GAL' | 'OZ' | 'QUART' | 'PINT'
  });
  const [seedForm, setSeedForm] = useState({
    seedHybridId: '',
    ratePerAcre: '',
    useAllAcres: true,
    acresApplied: '',
    bagsUsed: '',
    isVRT: false,
    vrtMinRate: '',
    vrtMaxRate: ''
  });
  const [otherCostForm, setOtherCostForm] = useState({
    costType: 'LAND_RENT' as CostType,
    amount: '',
    isPerAcre: true,
    description: ''
  });
  const [trialForm, setTrialForm] = useState({
    name: '',
    trialType: 'SEED' as TrialType,
    seedHybridId: '',
    fertilizerId: '',
    chemicalId: '',
    controlProduct: '',
    controlRate: '',
    testRate: '',
    plotLocation: '',
    plotAcres: '',
    targetMetric: '',
    notes: ''
  });

  // Edit states
  const [editingFertilizer, setEditingFertilizer] = useState<any | null>(null);
  const [editingChemical, setEditingChemical] = useState<any | null>(null);
  const [editingSeed, setEditingSeed] = useState<any | null>(null);
  const [editingOtherCost, setEditingOtherCost] = useState<any | null>(null);
  const [showTrialForm, setShowTrialForm] = useState(false);

  // Bulk selection states
  const [selectedFertilizerIds, setSelectedFertilizerIds] = useState<string[]>([]);
  const [selectedChemicalIds, setSelectedChemicalIds] = useState<string[]>([]);
  const [selectedSeedIds, setSelectedSeedIds] = useState<string[]>([]);
  const [selectedOtherCostIds, setSelectedOtherCostIds] = useState<string[]>([]);

  // Scan bill modal state
  const [showScanBillModal, setShowScanBillModal] = useState(false);
  const [scanBillFile, setScanBillFile] = useState<File | null>(null);
  const [isScanningBill, setIsScanningBill] = useState(false);
  const [scanBillResult, setScanBillResult] = useState<{
    invoice: any;
    appliedItems: any[];
    newProducts: any[];
  } | null>(null);

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

      // Load product catalogs, break-even data, and trials
      const [fertilizersData, chemicalsData, seedHybridsData, breakEvenData, trialsData] = await Promise.all([
        breakevenApi.getFertilizers(selectedBusinessId),
        breakevenApi.getChemicals(selectedBusinessId),
        breakevenApi.getSeedHybrids(selectedBusinessId, farmData.commodityType),
        breakevenApi.getFarmBreakEven(selectedBusinessId, farmId),
        breakevenApi.getTrials(selectedBusinessId, farmId)
      ]);

      setFertilizers(fertilizersData);
      setChemicals(chemicalsData);
      setSeedHybrids(seedHybridsData);
      setBreakEven(breakEvenData);
      setTrials(trialsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load farm data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleAddFertilizer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !farmId || !farm) return;

    try {
      const acresApplied = fertilizerForm.useAllAcres ? farm.acres : parseFloat(fertilizerForm.acresApplied);
      const ratePerAcre = parseFloat(fertilizerForm.ratePerAcre);
      const selectedFertilizer = fertilizers.find(f => f.id === fertilizerForm.fertilizerId);

      // Determine rate input unit (default to application unit if not specified)
      const rateInputUnit = fertilizerForm.rateInputUnit || (selectedFertilizer?.isLiquid ? 'GAL' : 'LB');

      await breakevenApi.addFertilizerUsage(selectedBusinessId, {
        farmId,
        fertilizerId: fertilizerForm.fertilizerId,
        ratePerAcre,
        rateInputUnit,
        acresApplied
      });
      setFertilizerForm({ fertilizerId: '', ratePerAcre: '', rateInputUnit: '', useAllAcres: true, acresApplied: '', amountUsed: '' });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add fertilizer usage');
    }
  };

  const handleAddChemical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !farmId || !farm) return;

    try {
      const acresApplied = chemicalForm.useAllAcres ? farm.acres : parseFloat(chemicalForm.acresApplied);
      let ratePerAcre = parseFloat(chemicalForm.ratePerAcre);

      // Convert rate to gallons based on unit
      if (chemicalForm.usageUnit === 'OZ') {
        ratePerAcre = ratePerAcre / 128; // 128 oz = 1 gallon
      } else if (chemicalForm.usageUnit === 'QUART') {
        ratePerAcre = ratePerAcre / 4; // 4 quarts = 1 gallon
      } else if (chemicalForm.usageUnit === 'PINT') {
        ratePerAcre = ratePerAcre / 8; // 8 pints = 1 gallon
      }

      await breakevenApi.addChemicalUsage(selectedBusinessId, {
        farmId,
        chemicalId: chemicalForm.chemicalId,
        ratePerAcre,
        acresApplied
      });
      setChemicalForm({ chemicalId: '', ratePerAcre: '', useAllAcres: true, acresApplied: '', amountUsed: '', usageUnit: 'GAL' });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add chemical usage');
    }
  };

  const handleAddSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !farmId || !farm) return;

    try {
      const acresApplied = seedForm.useAllAcres ? farm.acres : parseFloat(seedForm.acresApplied);
      const ratePerAcre = parseFloat(seedForm.ratePerAcre); // Population (seeds per acre)

      await breakevenApi.addSeedUsage(selectedBusinessId, {
        farmId,
        seedHybridId: seedForm.seedHybridId,
        ratePerAcre,
        acresApplied,
        isVRT: seedForm.isVRT,
        vrtMinRate: seedForm.isVRT && seedForm.vrtMinRate ? parseFloat(seedForm.vrtMinRate) : undefined,
        vrtMaxRate: seedForm.isVRT && seedForm.vrtMaxRate ? parseFloat(seedForm.vrtMaxRate) : undefined
      });
      setSeedForm({ seedHybridId: '', ratePerAcre: '', useAllAcres: true, acresApplied: '', bagsUsed: '', isVRT: false, vrtMinRate: '', vrtMaxRate: '' });
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
        { bagsUsed: parseFloat(editingSeed.bagsUsed) }
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

  // Trial handlers
  const handleAddTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId || !farmId) return;

    try {
      await breakevenApi.createTrial(selectedBusinessId, farmId, {
        farmId,
        name: trialForm.name,
        trialType: trialForm.trialType,
        seedHybridId: trialForm.trialType === TrialType.SEED && trialForm.seedHybridId ? trialForm.seedHybridId : undefined,
        fertilizerId: trialForm.trialType === TrialType.FERTILIZER && trialForm.fertilizerId ? trialForm.fertilizerId : undefined,
        chemicalId: (trialForm.trialType === TrialType.CHEMICAL || trialForm.trialType === TrialType.FUNGICIDE) && trialForm.chemicalId ? trialForm.chemicalId : undefined,
        controlProduct: trialForm.controlProduct || undefined,
        controlRate: trialForm.controlRate ? parseFloat(trialForm.controlRate) : undefined,
        testRate: trialForm.testRate ? parseFloat(trialForm.testRate) : undefined,
        plotLocation: trialForm.plotLocation || undefined,
        plotAcres: trialForm.plotAcres ? parseFloat(trialForm.plotAcres) : undefined,
        targetMetric: trialForm.targetMetric || undefined,
        notes: trialForm.notes || undefined
      });
      setTrialForm({
        name: '',
        trialType: 'SEED' as TrialType,
        seedHybridId: '',
        fertilizerId: '',
        chemicalId: '',
        controlProduct: '',
        controlRate: '',
        testRate: '',
        plotLocation: '',
        plotAcres: '',
        targetMetric: '',
        notes: ''
      });
      setShowTrialForm(false);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add trial');
    }
  };

  const handleUpdateTrialStatus = async (trialId: string, status: TrialStatus) => {
    if (!selectedBusinessId) return;

    try {
      await breakevenApi.updateTrial(selectedBusinessId, trialId, { status });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update trial status');
    }
  };

  const handleDeleteTrial = async (id: string) => {
    if (!selectedBusinessId) return;
    if (!confirm('Are you sure you want to delete this trial?')) return;

    try {
      await breakevenApi.deleteTrial(selectedBusinessId, id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete trial');
    }
  };

  // Bulk delete handlers
  const handleBulkDeleteFertilizers = async () => {
    if (!selectedBusinessId || selectedFertilizerIds.length === 0) return;
    if (!confirm(`Delete ${selectedFertilizerIds.length} fertilizer usage(s)?`)) return;

    try {
      for (const id of selectedFertilizerIds) {
        await breakevenApi.deleteFertilizerUsage(selectedBusinessId, id);
      }
      setSelectedFertilizerIds([]);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete fertilizer usages');
    }
  };

  const handleBulkDeleteChemicals = async () => {
    if (!selectedBusinessId || selectedChemicalIds.length === 0) return;
    if (!confirm(`Delete ${selectedChemicalIds.length} chemical usage(s)?`)) return;

    try {
      for (const id of selectedChemicalIds) {
        await breakevenApi.deleteChemicalUsage(selectedBusinessId, id);
      }
      setSelectedChemicalIds([]);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete chemical usages');
    }
  };

  const handleBulkDeleteSeeds = async () => {
    if (!selectedBusinessId || selectedSeedIds.length === 0) return;
    if (!confirm(`Delete ${selectedSeedIds.length} seed usage(s)?`)) return;

    try {
      for (const id of selectedSeedIds) {
        await breakevenApi.deleteSeedUsage(selectedBusinessId, id);
      }
      setSelectedSeedIds([]);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete seed usages');
    }
  };

  const handleBulkDeleteOtherCosts = async () => {
    if (!selectedBusinessId || selectedOtherCostIds.length === 0) return;
    if (!confirm(`Delete ${selectedOtherCostIds.length} cost(s)?`)) return;

    try {
      for (const id of selectedOtherCostIds) {
        await breakevenApi.deleteOtherCost(selectedBusinessId, id);
      }
      setSelectedOtherCostIds([]);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete costs');
    }
  };

  // Toggle selection helpers
  const toggleFertilizerSelection = (id: string) => {
    setSelectedFertilizerIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleChemicalSelection = (id: string) => {
    setSelectedChemicalIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSeedSelection = (id: string) => {
    setSelectedSeedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleOtherCostSelection = (id: string) => {
    setSelectedOtherCostIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Helper to filter chemicals by category
  const getChemicalsByCategory = (category: ChemicalCategory) => {
    return chemicals.filter(c => c.category === category);
  };

  // Scan bill handler
  const handleScanBill = async () => {
    if (!selectedBusinessId || !farmId || !scanBillFile) return;

    setIsScanningBill(true);
    try {
      const result = await breakevenApi.scanFertilizerBill(selectedBusinessId, farmId, scanBillFile);
      setScanBillResult(result);
      // Reload farm data to show new fertilizer usages
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to scan bill');
      setScanBillResult(null);
    } finally {
      setIsScanningBill(false);
    }
  };

  const closeScanBillModal = () => {
    setShowScanBillModal(false);
    setScanBillFile(null);
    setScanBillResult(null);
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
        {/* Read-only banner for employees */}
        {isEmployee && <ReadOnlyBanner />}

        {/* Cost View Toggle - applies to all sections */}
        <div className="flex justify-center mb-4">
          <div className="flex rounded-md overflow-hidden border border-gray-300 shadow-sm">
            <button
              onClick={() => setCostView('total')}
              className={`px-4 py-1.5 text-sm font-medium ${costView === 'total' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Total $
            </button>
            <button
              onClick={() => setCostView('perAcre')}
              className={`px-4 py-1.5 text-sm font-medium ${costView === 'perAcre' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              $/Acre
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fertilizer Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Fertilizer Usage</h2>
              {canEdit() && (
                <button
                  onClick={() => setShowScanBillModal(true)}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Scan Bill
                </button>
              )}
            </div>

            {/* N-P-K-S Summary Card - Always show */}
            <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-center">
                <div className="text-xl font-bold text-green-700">
                  {breakEven?.nutrientSummary?.nitrogenPerAcre?.toFixed(0) || '0'}
                </div>
                <div className="text-xs text-gray-600">lbs N/acre</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-700">
                  {breakEven?.nutrientSummary?.phosphorusPerAcre?.toFixed(0) || '0'}
                </div>
                <div className="text-xs text-gray-600">lbs P₂O₅/acre</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-700">
                  {breakEven?.nutrientSummary?.potassiumPerAcre?.toFixed(0) || '0'}
                </div>
                <div className="text-xs text-gray-600">lbs K₂O/acre</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-700">
                  {breakEven?.nutrientSummary?.sulfurPerAcre?.toFixed(0) || '0'}
                </div>
                <div className="text-xs text-gray-600">lbs S/acre</div>
              </div>
            </div>
            {canEdit() && (
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
                      {f.name}{f.isManure ? ' (Manure)' : ''} (${f.pricePerUnit.toFixed(2)}/{f.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate per Acre
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={fertilizerForm.ratePerAcre}
                    onChange={(e) => setFertilizerForm({ ...fertilizerForm, ratePerAcre: e.target.value })}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder={(() => {
                      const sel = fertilizers.find(f => f.id === fertilizerForm.fertilizerId);
                      if (fertilizerForm.rateInputUnit === 'LBS_N') return 'lbs N/acre';
                      if (sel?.isManure && sel?.isLiquid) return '1,000 gal/acre';
                      if (sel?.isManure) return 'tons/acre';
                      if (sel?.isLiquid) return 'gal/acre';
                      return 'lbs/acre';
                    })()}
                    required
                  />
                  {/* Rate unit selector for liquid fertilizers with nitrogen */}
                  {(() => {
                    const selectedFert = fertilizers.find(f => f.id === fertilizerForm.fertilizerId);
                    if (selectedFert?.isLiquid && selectedFert?.nitrogenPct && selectedFert.nitrogenPct > 0) {
                      return (
                        <select
                          value={fertilizerForm.rateInputUnit || 'GAL'}
                          onChange={(e) => setFertilizerForm({ ...fertilizerForm, rateInputUnit: e.target.value as any })}
                          className="w-28 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        >
                          <option value="GAL">gal/acre</option>
                          <option value="LBS_N">lbs N/acre</option>
                        </select>
                      );
                    }
                    return null;
                  })()}
                </div>
                {/* Show conversion hint when using lbs N/acre */}
                {fertilizerForm.rateInputUnit === 'LBS_N' && fertilizerForm.ratePerAcre && (() => {
                  const selectedFert = fertilizers.find(f => f.id === fertilizerForm.fertilizerId);
                  if (selectedFert?.lbsPerGallon && selectedFert?.nitrogenPct) {
                    const lbsN = parseFloat(fertilizerForm.ratePerAcre);
                    const gallons = lbsN / (selectedFert.lbsPerGallon * (selectedFert.nitrogenPct / 100));
                    return (
                      <p className="text-xs text-gray-500 mt-1">
                        = {gallons.toFixed(1)} gal/acre of {selectedFert.name}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="fertilizerAllAcres"
                    checked={fertilizerForm.useAllAcres}
                    onChange={(e) => setFertilizerForm({ ...fertilizerForm, useAllAcres: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label htmlFor="fertilizerAllAcres" className="ml-2 text-sm text-gray-700">
                    Apply to all {farm?.acres.toLocaleString()} acres
                  </label>
                </div>
                {!fertilizerForm.useAllAcres && (
                  <input
                    type="number"
                    step="0.01"
                    value={fertilizerForm.acresApplied}
                    onChange={(e) => setFertilizerForm({ ...fertilizerForm, acresApplied: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter acres applied"
                    required
                  />
                )}
              </div>

              {fertilizerForm.ratePerAcre && (fertilizerForm.useAllAcres || fertilizerForm.acresApplied) && farm && (() => {
                const selectedFert = fertilizers.find(f => f.id === fertilizerForm.fertilizerId);
                const ratePerAcre = parseFloat(fertilizerForm.ratePerAcre);
                const acres = fertilizerForm.useAllAcres ? farm.acres : parseFloat(fertilizerForm.acresApplied || '0');
                let totalAmount = ratePerAcre * acres;
                let displayUnit = selectedFert?.unit || 'units';
                let conversionNote = '';

                // Convert for liquid fertilizers sold by TON
                if (selectedFert?.isLiquid && String(selectedFert.unit) === 'TON' && selectedFert.lbsPerGallon) {
                  const totalGallons = totalAmount;
                  const totalLbs = totalGallons * selectedFert.lbsPerGallon;
                  totalAmount = totalLbs / 2000;
                  conversionNote = `(${totalGallons.toFixed(0)} gal × ${selectedFert.lbsPerGallon} lbs/gal ÷ 2000)`;
                } else if (selectedFert?.isLiquid && String(selectedFert.unit) === 'LB' && selectedFert.lbsPerGallon) {
                  const totalGallons = totalAmount;
                  totalAmount = totalGallons * selectedFert.lbsPerGallon;
                  conversionNote = `(${totalGallons.toFixed(0)} gal × ${selectedFert.lbsPerGallon} lbs/gal)`;
                } else if (!selectedFert?.isLiquid && String(selectedFert?.unit) === 'TON') {
                  totalAmount = totalAmount / 2000;
                  conversionNote = `(${(ratePerAcre * acres).toFixed(0)} lbs ÷ 2000)`;
                }

                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Total Amount:</span>{' '}
                      {totalAmount.toFixed(2)} {displayUnit}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {ratePerAcre.toFixed(2)} {selectedFert?.isLiquid ? 'gal' : 'lbs'}/acre × {acres} acres
                      {conversionNote && <span className="ml-1 text-gray-500">{conversionNote}</span>}
                    </p>
                  </div>
                );
              })()}

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Fertilizer
              </button>
            </form>
            )}

            {farm.fertilizerUsage && farm.fertilizerUsage.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Current Usage:</h3>
                  {canEdit() && (
                    <label className="flex items-center text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedFertilizerIds.length === (farm.fertilizerUsage?.length || 0) && (farm.fertilizerUsage?.length || 0) > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFertilizerIds(farm.fertilizerUsage?.map((u: any) => u.id) || []);
                          } else {
                            setSelectedFertilizerIds([]);
                          }
                        }}
                        className="mr-1 rounded text-blue-600"
                      />
                      Select All
                    </label>
                  )}
                </div>
                {selectedFertilizerIds.length > 0 && (
                  <div className="flex items-center gap-3 py-2 px-3 bg-blue-50 border border-blue-200 rounded mb-2">
                    <span className="text-sm text-blue-700">{selectedFertilizerIds.length} selected</span>
                    <button
                      onClick={handleBulkDeleteFertilizers}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete Selected
                    </button>
                    <button
                      onClick={() => setSelectedFertilizerIds([])}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  {farm.fertilizerUsage.map((usage: any) => (
                    <div key={usage.id} className={`text-sm p-2 rounded ${selectedFertilizerIds.includes(usage.id) ? 'bg-blue-50' : 'bg-gray-50'}`}>
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
                          <div className="flex items-center">
                            {canEdit() && (
                              <input
                                type="checkbox"
                                checked={selectedFertilizerIds.includes(usage.id)}
                                onChange={() => toggleFertilizerSelection(usage.id)}
                                className="mr-2 rounded text-blue-600"
                              />
                            )}
                            <div>
                              <span>
                                {usage.fertilizer.name}
                                {usage.fertilizer.isManure && <span className="text-amber-700 text-xs ml-1">(Manure)</span>}
                                : {usage.amountUsed} {usage.fertilizer.isManure ? (usage.fertilizer.isLiquid ? '1k gal' : 'tons') : usage.fertilizer.unit}
                              </span>
                              {usage.ratePerAcre && (
                                <span className="text-gray-500 text-xs ml-2">
                                  ({usage.ratePerAcre.toFixed(2)} {usage.fertilizer.isManure ? (usage.fertilizer.isLiquid ? '1k gal' : 'tons') : usage.fertilizer.isLiquid ? 'gal' : usage.fertilizer.unit}/ac)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {(() => {
                              const totalCost = usage.amountUsed * usage.fertilizer.pricePerUnit;
                              const acresApplied = usage.acresApplied || farm?.acres || 1;
                              const costPerAcre = totalCost / acresApplied;
                              return (
                                <span className="font-semibold">
                                  ${costView === 'total' ? totalCost.toFixed(2) : costPerAcre.toFixed(2)}
                                  {costView === 'perAcre' && <span className="text-xs font-normal">/ac</span>}
                                </span>
                              );
                            })()}
                            {canEdit() && (
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
                            )}
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
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Chemical Usage</h2>

            {/* Category Tabs */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-4">
                <button
                  onClick={() => setChemicalTab(ChemicalCategory.HERBICIDE)}
                  className={`py-2 px-3 border-b-2 text-sm font-medium ${
                    chemicalTab === ChemicalCategory.HERBICIDE
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Herbicides
                </button>
                <button
                  onClick={() => setChemicalTab(ChemicalCategory.IN_FURROW)}
                  className={`py-2 px-3 border-b-2 text-sm font-medium ${
                    chemicalTab === ChemicalCategory.IN_FURROW
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  In-Furrow
                </button>
                <button
                  onClick={() => setChemicalTab(ChemicalCategory.FUNGICIDE)}
                  className={`py-2 px-3 border-b-2 text-sm font-medium ${
                    chemicalTab === ChemicalCategory.FUNGICIDE
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Fungicides
                </button>
                <button
                  onClick={() => setChemicalTab(ChemicalCategory.INSECTICIDE)}
                  className={`py-2 px-3 border-b-2 text-sm font-medium ${
                    chemicalTab === ChemicalCategory.INSECTICIDE
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Insecticides
                </button>
              </nav>
            </div>

            {canEdit() && (
              <form onSubmit={handleAddChemical} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {chemicalTab === ChemicalCategory.HERBICIDE ? 'Herbicide' :
                   chemicalTab === ChemicalCategory.IN_FURROW ? 'In-Furrow Product' :
                   chemicalTab === ChemicalCategory.INSECTICIDE ? 'Insecticide' : 'Fungicide'}
                </label>
                <select
                  value={chemicalForm.chemicalId}
                  onChange={(e) => setChemicalForm({ ...chemicalForm, chemicalId: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select {chemicalTab === ChemicalCategory.HERBICIDE ? 'Herbicide' :
                   chemicalTab === ChemicalCategory.IN_FURROW ? 'In-Furrow Product' :
                   chemicalTab === ChemicalCategory.INSECTICIDE ? 'Insecticide' : 'Fungicide'}</option>
                  {getChemicalsByCategory(chemicalTab).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (${c.pricePerUnit.toFixed(2)}/{c.unit})
                    </option>
                  ))}
                </select>
                {getChemicalsByCategory(chemicalTab).length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No {chemicalTab.toLowerCase().replace('_', '-')} products found. Add them in Product Setup.
                  </p>
                )}
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
                  Rate per Acre ({
                    chemicalForm.usageUnit === 'GAL' ? 'gallons' :
                    chemicalForm.usageUnit === 'QUART' ? 'quarts' :
                    chemicalForm.usageUnit === 'PINT' ? 'pints' : 'ounces'
                  }/acre)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={chemicalForm.ratePerAcre}
                  onChange={(e) => setChemicalForm({ ...chemicalForm, ratePerAcre: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder={
                    chemicalForm.usageUnit === 'GAL' ? 'e.g., 2.5' :
                    chemicalForm.usageUnit === 'QUART' ? 'e.g., 1' :
                    chemicalForm.usageUnit === 'PINT' ? 'e.g., 2' : 'e.g., 4'
                  }
                  required
                />
                {chemicalForm.ratePerAcre && chemicalForm.usageUnit !== 'GAL' && (
                  <p className="mt-1 text-xs text-blue-600">
                    = {(
                      chemicalForm.usageUnit === 'OZ' ? parseFloat(chemicalForm.ratePerAcre) / 128 :
                      chemicalForm.usageUnit === 'QUART' ? parseFloat(chemicalForm.ratePerAcre) / 4 :
                      parseFloat(chemicalForm.ratePerAcre) / 8
                    ).toFixed(4)} gallons/acre
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="chemicalAllAcres"
                    checked={chemicalForm.useAllAcres}
                    onChange={(e) => setChemicalForm({ ...chemicalForm, useAllAcres: e.target.checked })}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4"
                  />
                  <label htmlFor="chemicalAllAcres" className="ml-2 text-sm text-gray-700">
                    Apply to all {farm?.acres.toLocaleString()} acres
                  </label>
                </div>
                {!chemicalForm.useAllAcres && (
                  <input
                    type="number"
                    step="0.01"
                    value={chemicalForm.acresApplied}
                    onChange={(e) => setChemicalForm({ ...chemicalForm, acresApplied: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
                    placeholder="Enter acres applied"
                    required
                  />
                )}
              </div>

              {chemicalForm.ratePerAcre && (chemicalForm.useAllAcres || chemicalForm.acresApplied) && farm && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Total Amount:</span>{' '}
                    {(parseFloat(chemicalForm.ratePerAcre) *
                      (chemicalForm.useAllAcres ? farm.acres : parseFloat(chemicalForm.acresApplied || '0'))
                    ).toFixed(2)}{' '}
                    {chemicalForm.usageUnit === 'GAL' ? 'gallons' :
                     chemicalForm.usageUnit === 'QUART' ? 'quarts' :
                     chemicalForm.usageUnit === 'PINT' ? 'pints' : 'ounces'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {parseFloat(chemicalForm.ratePerAcre).toFixed(2)} × {chemicalForm.useAllAcres ? farm.acres : chemicalForm.acresApplied} acres
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Add Chemical
              </button>
            </form>
            )}

            {farm.chemicalUsage && farm.chemicalUsage.filter((u: any) => u.chemical?.category === chemicalTab).length > 0 && (
              <div className="mt-6">
                {(() => {
                  const filteredChemicals = farm.chemicalUsage.filter((u: any) => u.chemical?.category === chemicalTab);
                  const filteredIds = filteredChemicals.map((u: any) => u.id);
                  const selectedInTab = selectedChemicalIds.filter((id: string) => filteredIds.includes(id));
                  return (
                    <>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-gray-700">
                          Current {chemicalTab === ChemicalCategory.HERBICIDE ? 'Herbicide' :
                           chemicalTab === ChemicalCategory.IN_FURROW ? 'In-Furrow' :
                           chemicalTab === ChemicalCategory.INSECTICIDE ? 'Insecticide' : 'Fungicide'} Usage:
                        </h3>
                        {canEdit() && (
                          <label className="flex items-center text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={selectedInTab.length === filteredChemicals.length && filteredChemicals.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedChemicalIds(prev => [...new Set([...prev, ...filteredIds])]);
                                } else {
                                  setSelectedChemicalIds(prev => prev.filter(id => !filteredIds.includes(id)));
                                }
                              }}
                              className="mr-1 rounded text-green-600"
                            />
                            Select All
                          </label>
                        )}
                      </div>
                      {selectedInTab.length > 0 && (
                        <div className="flex items-center gap-3 py-2 px-3 bg-green-50 border border-green-200 rounded mb-2">
                          <span className="text-sm text-green-700">{selectedInTab.length} selected</span>
                          <button
                            onClick={handleBulkDeleteChemicals}
                            className="text-sm text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete Selected
                          </button>
                          <button
                            onClick={() => setSelectedChemicalIds(prev => prev.filter(id => !filteredIds.includes(id)))}
                            className="text-sm text-gray-600 hover:text-gray-800"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="space-y-2">
                  {farm.chemicalUsage.filter((u: any) => u.chemical?.category === chemicalTab).map((usage: any) => (
                    <div key={usage.id} className={`text-sm p-2 rounded ${selectedChemicalIds.includes(usage.id) ? 'bg-green-50' : 'bg-gray-50'}`}>
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
                          <div className="flex items-center">
                            {canEdit() && (
                              <input
                                type="checkbox"
                                checked={selectedChemicalIds.includes(usage.id)}
                                onChange={() => toggleChemicalSelection(usage.id)}
                                className="mr-2 rounded text-green-600"
                              />
                            )}
                            <div>
                              <span>{usage.chemical.name}: {usage.amountUsed} {usage.chemical.unit}</span>
                              {usage.ratePerAcre && (
                                <span className="text-gray-500 text-xs ml-2">
                                  ({usage.ratePerAcre.toFixed(2)} {usage.chemical.unit}/ac)
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {(() => {
                              const totalCost = usage.amountUsed * usage.chemical.pricePerUnit;
                              const acresApplied = usage.acresApplied || farm?.acres || 1;
                              const costPerAcre = totalCost / acresApplied;
                              return (
                                <span className="font-semibold">
                                  ${costView === 'total' ? totalCost.toFixed(2) : costPerAcre.toFixed(2)}
                                  {costView === 'perAcre' && <span className="text-xs font-normal">/ac</span>}
                                </span>
                              );
                            })()}
                            {canEdit() && (
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
                            )}
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
            {canEdit() && (
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
                  Population (seeds per acre)
                </label>
                <input
                  type="number"
                  step="1"
                  value={seedForm.ratePerAcre}
                  onChange={(e) => setSeedForm({ ...seedForm, ratePerAcre: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder={seedForm.isVRT ? "Average rate (e.g., 32000)" : "e.g., 32000"}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  {seedForm.isVRT ? 'Enter the average seeding rate' : 'Enter the seeding rate (seeds per acre)'}
                </p>
              </div>

              {/* VRT Toggle */}
              <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isVRT"
                    checked={seedForm.isVRT}
                    onChange={(e) => setSeedForm({ ...seedForm, isVRT: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <label htmlFor="isVRT" className="ml-2 text-sm font-medium text-gray-700">
                    Variable Rate Technology (VRT)
                  </label>
                </div>
                {seedForm.isVRT && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Min Rate (seeds/acre)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={seedForm.vrtMinRate}
                        onChange={(e) => setSeedForm({ ...seedForm, vrtMinRate: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
                        placeholder="e.g., 28000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Max Rate (seeds/acre)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={seedForm.vrtMaxRate}
                        onChange={(e) => setSeedForm({ ...seedForm, vrtMaxRate: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 text-sm"
                        placeholder="e.g., 36000"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="seedAllAcres"
                    checked={seedForm.useAllAcres}
                    onChange={(e) => setSeedForm({ ...seedForm, useAllAcres: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <label htmlFor="seedAllAcres" className="ml-2 text-sm text-gray-700">
                    Apply to all {farm?.acres.toLocaleString()} acres
                  </label>
                </div>
                {!seedForm.useAllAcres && (
                  <input
                    type="number"
                    step="0.01"
                    value={seedForm.acresApplied}
                    onChange={(e) => setSeedForm({ ...seedForm, acresApplied: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                    placeholder="Enter acres planted"
                    required
                  />
                )}
              </div>

              {seedForm.ratePerAcre && (seedForm.useAllAcres || seedForm.acresApplied) && seedForm.seedHybridId && farm && (
                <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Total Bags:</span>{' '}
                    {(() => {
                      const selectedSeed = seedHybrids.find(s => s.id === seedForm.seedHybridId);
                      if (!selectedSeed) return '0';
                      const acres = seedForm.useAllAcres ? farm.acres : parseFloat(seedForm.acresApplied || '0');
                      const totalSeeds = parseFloat(seedForm.ratePerAcre) * acres;
                      const bags = totalSeeds / selectedSeed.seedsPerBag;
                      return bags.toFixed(2);
                    })()}{' '}
                    bags
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {parseFloat(seedForm.ratePerAcre).toLocaleString()} seeds/acre × {seedForm.useAllAcres ? farm.acres : seedForm.acresApplied} acres
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Add Seed
              </button>
            </form>
            )}

            {farm.seedUsage && farm.seedUsage.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Current Usage:</h3>
                  {canEdit() && (
                    <label className="flex items-center text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedSeedIds.length === (farm.seedUsage?.length || 0) && (farm.seedUsage?.length || 0) > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSeedIds(farm.seedUsage?.map((u: any) => u.id) || []);
                          } else {
                            setSelectedSeedIds([]);
                          }
                        }}
                        className="mr-1 rounded text-purple-600"
                      />
                      Select All
                    </label>
                  )}
                </div>
                {selectedSeedIds.length > 0 && (
                  <div className="flex items-center gap-3 py-2 px-3 bg-purple-50 border border-purple-200 rounded mb-2">
                    <span className="text-sm text-purple-700">{selectedSeedIds.length} selected</span>
                    <button
                      onClick={handleBulkDeleteSeeds}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete Selected
                    </button>
                    <button
                      onClick={() => setSelectedSeedIds([])}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  {farm.seedUsage.map((usage: any) => (
                    <div key={usage.id} className={`text-sm p-2 rounded ${selectedSeedIds.includes(usage.id) ? 'bg-purple-50' : 'bg-gray-50'}`}>
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
                        <div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              {canEdit() && (
                                <input
                                  type="checkbox"
                                  checked={selectedSeedIds.includes(usage.id)}
                                  onChange={() => toggleSeedSelection(usage.id)}
                                  className="mr-2 rounded text-purple-600"
                                />
                              )}
                              <div>
                                <span>{usage.seedHybrid.name}: {usage.bagsUsed} bags</span>
                                {usage.ratePerAcre && (
                                  <span className="text-gray-500 text-xs ml-2">
                                    ({Math.round(usage.ratePerAcre).toLocaleString()} seeds/ac)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {(() => {
                                const totalCost = usage.bagsUsed * usage.seedHybrid.pricePerBag;
                                const acresApplied = usage.acresApplied || farm?.acres || 1;
                                const costPerAcre = totalCost / acresApplied;
                                return (
                                  <span className="font-semibold">
                                    ${costView === 'total' ? totalCost.toFixed(2) : costPerAcre.toFixed(2)}
                                    {costView === 'perAcre' && <span className="text-xs font-normal">/ac</span>}
                                  </span>
                                );
                              })()}
                              {canEdit() && (
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
                              )}
                            </div>
                          </div>
                          {usage.isVRT && (
                            <div className="mt-1 text-xs text-purple-600 ml-6">
                              VRT: {usage.vrtMinRate?.toLocaleString()} - {usage.vrtMaxRate?.toLocaleString()} seeds/acre
                            </div>
                          )}
                          {usage.ratePerAcre && (
                            <div className="mt-1 text-xs text-gray-500 ml-6">
                              Population: {usage.ratePerAcre.toLocaleString()} seeds/acre
                            </div>
                          )}
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
            {canEdit() && (
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
            )}

            {farm.otherCosts && farm.otherCosts.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Current Costs:</h3>
                  {canEdit() && (
                    <label className="flex items-center text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedOtherCostIds.length === (farm.otherCosts?.length || 0) && (farm.otherCosts?.length || 0) > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOtherCostIds(farm.otherCosts?.map((c: any) => c.id) || []);
                          } else {
                            setSelectedOtherCostIds([]);
                          }
                        }}
                        className="mr-1 rounded text-orange-600"
                      />
                      Select All
                    </label>
                  )}
                </div>
                {selectedOtherCostIds.length > 0 && (
                  <div className="flex items-center gap-3 py-2 px-3 bg-orange-50 border border-orange-200 rounded mb-2">
                    <span className="text-sm text-orange-700">{selectedOtherCostIds.length} selected</span>
                    <button
                      onClick={handleBulkDeleteOtherCosts}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete Selected
                    </button>
                    <button
                      onClick={() => setSelectedOtherCostIds([])}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Clear
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  {farm.otherCosts.map((cost: any) => (
                    <div key={cost.id} className={`text-sm p-2 rounded ${selectedOtherCostIds.includes(cost.id) ? 'bg-orange-50' : 'bg-gray-50'}`}>
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
                            <div className="flex items-center">
                              {canEdit() && (
                                <input
                                  type="checkbox"
                                  checked={selectedOtherCostIds.includes(cost.id)}
                                  onChange={() => toggleOtherCostSelection(cost.id)}
                                  className="mr-2 rounded text-orange-600"
                                />
                              )}
                              <span className="font-medium">{cost.costType.replace('_', ' ')}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="font-semibold">
                                ${costView === 'total'
                                  ? (cost.isPerAcre ? cost.amount * farm.acres : cost.amount).toFixed(2)
                                  : (cost.isPerAcre ? cost.amount : farm.acres > 0 ? (cost.amount / farm.acres) : 0).toFixed(2)}
                                {costView === 'perAcre' && <span className="text-xs font-normal">/ac</span>}
                              </span>
                              {canEdit() && (
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
                              )}
                            </div>
                          </div>
                          {cost.description && (
                            <p className="text-xs text-gray-600 mt-1 ml-6">{cost.description}</p>
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

        {/* Trials Section - Full Width */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Field Trials</h2>
              <p className="text-xs text-gray-600">Track experiments comparing products or methods</p>
            </div>
            {canEdit() && (
              <button
                onClick={() => setShowTrialForm(!showTrialForm)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
              >
                {showTrialForm ? 'Cancel' : '+ Add Trial'}
              </button>
            )}
          </div>

          {/* Trial Form */}
          {showTrialForm && canEdit() && (
            <form onSubmit={handleAddTrial} className="mb-6 bg-indigo-50 border border-indigo-200 rounded-md p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trial Name *
                  </label>
                  <input
                    type="text"
                    value={trialForm.name}
                    onChange={(e) => setTrialForm({ ...trialForm, name: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., Seed Population Test - North 40"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Trial Type *
                  </label>
                  <select
                    value={trialForm.trialType}
                    onChange={(e) => setTrialForm({ ...trialForm, trialType: e.target.value as TrialType })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  >
                    <option value={TrialType.SEED}>Seed/Hybrid</option>
                    <option value={TrialType.FERTILIZER}>Fertilizer</option>
                    <option value={TrialType.CHEMICAL}>Chemical/Herbicide</option>
                    <option value={TrialType.FUNGICIDE}>Fungicide</option>
                  </select>
                </div>
              </div>

              {/* Product Selection based on trial type */}
              {trialForm.trialType === TrialType.SEED && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Hybrid (optional)
                  </label>
                  <select
                    value={trialForm.seedHybridId}
                    onChange={(e) => setTrialForm({ ...trialForm, seedHybridId: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select Hybrid</option>
                    {seedHybrids.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {trialForm.trialType === TrialType.FERTILIZER && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Fertilizer (optional)
                  </label>
                  <select
                    value={trialForm.fertilizerId}
                    onChange={(e) => setTrialForm({ ...trialForm, fertilizerId: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select Fertilizer</option>
                    {fertilizers.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {(trialForm.trialType === TrialType.CHEMICAL || trialForm.trialType === TrialType.FUNGICIDE) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test {trialForm.trialType === TrialType.FUNGICIDE ? 'Fungicide' : 'Chemical'} (optional)
                  </label>
                  <select
                    value={trialForm.chemicalId}
                    onChange={(e) => setTrialForm({ ...trialForm, chemicalId: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select {trialForm.trialType === TrialType.FUNGICIDE ? 'Fungicide' : 'Chemical'}</option>
                    {chemicals.filter(c =>
                      trialForm.trialType === TrialType.FUNGICIDE
                        ? c.category === ChemicalCategory.FUNGICIDE
                        : c.category === ChemicalCategory.HERBICIDE
                    ).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Control Product
                  </label>
                  <input
                    type="text"
                    value={trialForm.controlProduct}
                    onChange={(e) => setTrialForm({ ...trialForm, controlProduct: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Standard product/rate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Control Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={trialForm.controlRate}
                    onChange={(e) => setTrialForm({ ...trialForm, controlRate: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., 32000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={trialForm.testRate}
                    onChange={(e) => setTrialForm({ ...trialForm, testRate: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., 36000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plot Location
                  </label>
                  <input
                    type="text"
                    value={trialForm.plotLocation}
                    onChange={(e) => setTrialForm({ ...trialForm, plotLocation: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., North 40, rows 10-20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plot Acres
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={trialForm.plotAcres}
                    onChange={(e) => setTrialForm({ ...trialForm, plotAcres: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., 5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Metric
                  </label>
                  <input
                    type="text"
                    value={trialForm.targetMetric}
                    onChange={(e) => setTrialForm({ ...trialForm, targetMetric: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="e.g., Yield bu/acre"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={trialForm.notes}
                  onChange={(e) => setTrialForm({ ...trialForm, notes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Additional notes about the trial..."
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
              >
                Create Trial
              </button>
            </form>
          )}

          {/* Trials List */}
          {trials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trials.map(trial => (
                <div key={trial.id} className={`border rounded-lg p-4 ${
                  trial.status === TrialStatus.COMPLETED ? 'bg-green-50 border-green-200' :
                  trial.status === TrialStatus.ACTIVE ? 'bg-blue-50 border-blue-200' :
                  trial.status === TrialStatus.CANCELLED ? 'bg-gray-100 border-gray-300' :
                  'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{trial.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      trial.status === TrialStatus.COMPLETED ? 'bg-green-200 text-green-800' :
                      trial.status === TrialStatus.ACTIVE ? 'bg-blue-200 text-blue-800' :
                      trial.status === TrialStatus.CANCELLED ? 'bg-gray-300 text-gray-700' :
                      'bg-amber-200 text-amber-800'
                    }`}>
                      {trial.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Type: {trial.trialType}
                    {trial.plotLocation && ` | Location: ${trial.plotLocation}`}
                    {trial.plotAcres && ` | ${trial.plotAcres} acres`}
                  </p>
                  {trial.controlProduct && (
                    <p className="text-xs text-gray-600">
                      Control: {trial.controlProduct} @ {trial.controlRate}
                    </p>
                  )}
                  {trial.testRate && (
                    <p className="text-xs text-gray-600">
                      Test Rate: {trial.testRate}
                    </p>
                  )}
                  {trial.targetMetric && (
                    <p className="text-xs text-gray-600">
                      Target: {trial.targetMetric}
                    </p>
                  )}
                  {trial.notes && (
                    <p className="text-xs text-gray-500 mt-2 italic">{trial.notes}</p>
                  )}

                  {/* Results */}
                  {trial.status === TrialStatus.COMPLETED && (trial.controlResult || trial.testResult) && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700">Results:</p>
                      {trial.controlResult && <p className="text-xs text-gray-600">Control: {trial.controlResult}</p>}
                      {trial.testResult && <p className="text-xs text-gray-600">Test: {trial.testResult}</p>}
                      {trial.yieldDifference && (
                        <p className={`text-xs font-semibold ${trial.yieldDifference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Difference: {trial.yieldDifference > 0 ? '+' : ''}{trial.yieldDifference}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {canEdit() && (
                    <div className="mt-3 pt-2 border-t border-gray-200 flex flex-wrap gap-2">
                      {trial.status === TrialStatus.PLANNED && (
                        <button
                          onClick={() => handleUpdateTrialStatus(trial.id, TrialStatus.ACTIVE)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Start Trial
                        </button>
                      )}
                      {trial.status === TrialStatus.ACTIVE && (
                        <button
                          onClick={() => handleUpdateTrialStatus(trial.id, TrialStatus.COMPLETED)}
                          className="text-xs text-green-600 hover:text-green-800"
                        >
                          Mark Complete
                        </button>
                      )}
                      {trial.status !== TrialStatus.CANCELLED && trial.status !== TrialStatus.COMPLETED && (
                        <button
                          onClick={() => handleUpdateTrialStatus(trial.id, TrialStatus.CANCELLED)}
                          className="text-xs text-amber-600 hover:text-amber-800"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTrial(trial.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No trials set up for this farm yet.</p>
              {canEdit() && <p className="text-sm mt-1">Click "Add Trial" to track an experiment.</p>}
            </div>
          )}
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
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Cost Breakdown</h3>
                  <div className="flex rounded-md shadow-sm">
                    <button
                      onClick={() => setCostView('total')}
                      className={`px-3 py-1 text-xs font-medium rounded-l-md border ${
                        costView === 'total'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Total
                    </button>
                    <button
                      onClick={() => setCostView('perAcre')}
                      className={`px-3 py-1 text-xs font-medium rounded-r-md border-t border-r border-b ${
                        costView === 'perAcre'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Per Acre
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div>
                    <p className="text-xs text-gray-600">Fertilizer</p>
                    <p className="text-lg font-bold text-blue-600">
                      ${costView === 'total'
                        ? breakEven.costs.fertilizer.toLocaleString()
                        : (breakEven.costs.fertilizer / breakEven.acres).toFixed(2)}
                      {costView === 'perAcre' && <span className="text-xs font-normal">/ac</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Chemical</p>
                    <p className="text-lg font-bold text-green-600">
                      ${costView === 'total'
                        ? breakEven.costs.chemical.toLocaleString()
                        : (breakEven.costs.chemical / breakEven.acres).toFixed(2)}
                      {costView === 'perAcre' && <span className="text-xs font-normal">/ac</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Seed</p>
                    <p className="text-lg font-bold text-purple-600">
                      ${costView === 'total'
                        ? breakEven.costs.seed.toLocaleString()
                        : (breakEven.costs.seed / breakEven.acres).toFixed(2)}
                      {costView === 'perAcre' && <span className="text-xs font-normal">/ac</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Equipment</p>
                    <p className="text-lg font-bold text-indigo-600">
                      ${costView === 'total'
                        ? (breakEven.costs.equipment || 0).toLocaleString()
                        : ((breakEven.costs.equipment || 0) / breakEven.acres).toFixed(2)}
                      {costView === 'perAcre' && <span className="text-xs font-normal">/ac</span>}
                    </p>
                    {breakEven.costs.equipment > 0 && (
                      <p className="text-xs text-gray-400">
                        Int: ${(breakEven.costs.equipmentInterest || 0).toLocaleString()} | Prin: ${(breakEven.costs.equipmentPrincipal || 0).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Other</p>
                    <p className="text-lg font-bold text-orange-600">
                      ${costView === 'total'
                        ? breakEven.costs.other.toLocaleString()
                        : (breakEven.costs.other / breakEven.acres).toFixed(2)}
                      {costView === 'perAcre' && <span className="text-xs font-normal">/ac</span>}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-600 font-semibold">
                      {costView === 'total' ? 'Total Cost' : 'Cost/Acre'}
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      ${costView === 'total'
                        ? breakEven.costs.total.toLocaleString()
                        : (breakEven.costs.total / breakEven.acres).toFixed(2)}
                      {costView === 'perAcre' && <span className="text-xs font-normal">/ac</span>}
                    </p>
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

      {/* Scan Bill Modal */}
      {showScanBillModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Scan Fertilizer Bill</h3>
                <button
                  onClick={closeScanBillModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {!scanBillResult ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a fertilizer bill for <span className="font-semibold">{farm?.name}</span>.
                    The system will extract product information and automatically apply costs to this field.
                  </p>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
                    <input
                      type="file"
                      id="scanBillFile"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setScanBillFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label
                      htmlFor="scanBillFile"
                      className="cursor-pointer"
                    >
                      {scanBillFile ? (
                        <div>
                          <svg className="w-12 h-12 mx-auto text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm font-medium text-gray-900">{scanBillFile.name}</p>
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

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={closeScanBillModal}
                      className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleScanBill}
                      disabled={!scanBillFile || isScanningBill}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isScanningBill ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Scanning...
                        </>
                      ) : (
                        'Scan & Apply'
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
                    {scanBillResult.invoice.vendorName && (
                      <p className="text-sm text-gray-700">Vendor: {scanBillResult.invoice.vendorName}</p>
                    )}
                  </div>

                  {scanBillResult.appliedItems.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Applied Fertilizers:</h4>
                      <div className="space-y-2">
                        {scanBillResult.appliedItems.map((item: any, idx: number) => (
                          <div key={idx} className="bg-gray-50 rounded p-3 text-sm">
                            <div className="flex justify-between">
                              <span className="font-medium">{item.productName}</span>
                              {item.isNew && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">New Product</span>
                              )}
                            </div>
                            <div className="text-gray-600 text-xs mt-1">
                              {item.amountUsed.toFixed(2)} {item.unit} @ ${item.pricePerUnit.toFixed(2)}/{item.unit} = ${item.totalCost.toFixed(2)}
                            </div>
                            {item.ratePerAcre && (
                              <div className="text-gray-500 text-xs">
                                Rate: {item.ratePerAcre.toFixed(2)} {item.unit}/acre
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanBillResult.newProducts.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <span className="font-semibold">{scanBillResult.newProducts.length}</span> new product(s) added to your fertilizer catalog.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={closeScanBillModal}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
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
