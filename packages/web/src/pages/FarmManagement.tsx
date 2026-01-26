import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { breakevenApi } from '../api/breakeven.api';
import { grainContractsApi } from '../api/grain-contracts.api';
import { marketingAiApi } from '../api/marketing-ai.api';
import { loansApi } from '../api/loans.api';
import {
  Farm,
  GrainEntity,
  CommodityType,
  FarmBreakEven,
  LandParcel,
  CreateEntitySplitRequest
} from '@business-app/shared';

// Default harvest prices (will be updated from Yahoo Finance)
const DEFAULT_PRICES: Record<string, number> = {
  CORN: 4.50,
  SOYBEANS: 10.50,
  WHEAT: 5.80
};

export default function FarmManagement() {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmBreakEvens, setFarmBreakEvens] = useState<Map<string, FarmBreakEven>>(new Map());
  const [entities, setEntities] = useState<GrainEntity[]>([]);
  const [landParcels, setLandParcels] = useState<LandParcel[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Market prices
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>(DEFAULT_PRICES);
  const [pricesLoading, setPricesLoading] = useState(false);

  // Filters
  const [filterEntity, setFilterEntity] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterCommodity, setFilterCommodity] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [showQuickEntityForm, setShowQuickEntityForm] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [formData, setFormData] = useState({
    grainEntityId: '',
    landParcelId: '' as string | null,
    name: '',
    acres: '',
    commodityType: 'CORN' as CommodityType,
    year: new Date().getFullYear(),
    projectedYield: '200',
    aph: '200',
    notes: '',
    entitySplits: [] as CreateEntitySplitRequest[]
  });
  const [useEntitySplits, setUseEntitySplits] = useState(false);

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
  }, [selectedBusinessId, filterEntity, filterYear, filterCommodity]);

  // Fetch market prices when year changes
  useEffect(() => {
    const loadPrices = async () => {
      setPricesLoading(true);
      try {
        const data = await marketingAiApi.getHarvestContracts(filterYear);
        const newPrices = { ...DEFAULT_PRICES };
        if (data.corn?.closePrice) newPrices.CORN = data.corn.closePrice;
        if (data.soybeans?.closePrice) newPrices.SOYBEANS = data.soybeans.closePrice;
        setMarketPrices(newPrices);
      } catch (err) {
        console.error('Failed to load prices:', err);
      } finally {
        setPricesLoading(false);
      }
    };
    loadPrices();
  }, [filterYear]);

  const loadData = async () => {
    if (!selectedBusinessId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load entities, farms, and land parcels in parallel
      const [entitiesData, farmsData, parcelsData] = await Promise.all([
        grainContractsApi.getGrainEntities(selectedBusinessId),
        breakevenApi.getFarms(selectedBusinessId, {
          grainEntityId: filterEntity === 'ALL' ? undefined : filterEntity,
          year: filterYear,
          commodityType: filterCommodity === 'ALL' ? undefined : filterCommodity as CommodityType
        }),
        loansApi.getLandParcels(selectedBusinessId, true)
      ]);

      setEntities(entitiesData);
      setFarms(farmsData);
      setLandParcels(parcelsData);

      // Load break-even data for each farm
      const breakEvenMap = new Map<string, FarmBreakEven>();
      await Promise.all(
        farmsData.map(async (farm) => {
          try {
            const beData = await breakevenApi.getFarmBreakEven(selectedBusinessId, farm.id);
            breakEvenMap.set(farm.id, beData);
          } catch (err) {
            // Farm might not have break-even data yet
          }
        })
      );
      setFarmBreakEvens(breakEvenMap);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load farms');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate P&L for each farm
  const farmsWithPL = useMemo(() => {
    return farms.map(farm => {
      const be = farmBreakEvens.get(farm.id);
      const price = marketPrices[farm.commodityType] || 0;

      const totalCost = be?.totalCost || 0;
      const costPerAcre = be?.costPerAcre || 0;
      const expectedBushels = farm.acres * farm.projectedYield;
      const projectedRevenue = expectedBushels * price;
      const profit = projectedRevenue - totalCost;
      const profitPerAcre = farm.acres > 0 ? profit / farm.acres : 0;
      const breakEvenPrice = expectedBushels > 0 ? totalCost / expectedBushels : 0;

      return {
        ...farm,
        breakEven: be,
        totalCost,
        costPerAcre,
        expectedBushels,
        projectedRevenue,
        profit,
        profitPerAcre,
        breakEvenPrice,
        marketPrice: price
      };
    });
  }, [farms, farmBreakEvens, marketPrices]);

  // Summary calculations
  const summary = useMemo(() => {
    const totalAcres = farmsWithPL.reduce((sum, f) => sum + f.acres, 0);
    const totalCost = farmsWithPL.reduce((sum, f) => sum + f.totalCost, 0);
    const totalRevenue = farmsWithPL.reduce((sum, f) => sum + f.projectedRevenue, 0);
    const totalProfit = farmsWithPL.reduce((sum, f) => sum + f.profit, 0);
    const avgCostPerAcre = totalAcres > 0 ? totalCost / totalAcres : 0;

    const byCommodity = {
      CORN: farmsWithPL.filter(f => f.commodityType === 'CORN'),
      SOYBEANS: farmsWithPL.filter(f => f.commodityType === 'SOYBEANS'),
      WHEAT: farmsWithPL.filter(f => f.commodityType === 'WHEAT')
    };

    return { totalAcres, totalCost, totalRevenue, totalProfit, avgCostPerAcre, byCommodity };
  }, [farmsWithPL]);

  const getYieldDefaults = (commodityType: CommodityType) => {
    switch (commodityType) {
      case 'CORN': return { projectedYield: '200', aph: '200' };
      case 'SOYBEANS': return { projectedYield: '60', aph: '60' };
      case 'WHEAT': return { projectedYield: '80', aph: '80' };
      default: return { projectedYield: '0', aph: '0' };
    }
  };

  const handleCommodityChange = (commodityType: CommodityType) => {
    const defaults = getYieldDefaults(commodityType);
    setFormData({ ...formData, commodityType, ...defaults });
  };

  const handleAdd = () => {
    setEditingFarm(null);
    setFormData({
      grainEntityId: entities.length > 0 ? entities[0].id : '',
      landParcelId: null,
      name: '',
      acres: '',
      commodityType: CommodityType.CORN,
      year: filterYear,
      projectedYield: '200',
      aph: '200',
      notes: '',
      entitySplits: []
    });
    setUseEntitySplits(false);
    setShowModal(true);
  };

  const handleEdit = (farm: Farm) => {
    setEditingFarm(farm);
    const hasEntitySplits = !!(farm.entitySplits && farm.entitySplits.length > 0);
    setFormData({
      grainEntityId: farm.grainEntityId,
      landParcelId: farm.landParcelId || null,
      name: farm.name,
      acres: farm.acres.toString(),
      commodityType: farm.commodityType,
      year: farm.year,
      projectedYield: farm.projectedYield.toString(),
      aph: farm.aph.toString(),
      notes: farm.notes || '',
      entitySplits: hasEntitySplits
        ? farm.entitySplits!.map(s => ({ grainEntityId: s.grainEntityId, percentage: s.percentage }))
        : []
    });
    setUseEntitySplits(hasEntitySplits);
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

    // Validate entity splits total to 100% if using splits
    if (useEntitySplits && formData.entitySplits.length > 0) {
      const total = formData.entitySplits.reduce((sum, s) => sum + s.percentage, 0);
      if (Math.abs(total - 100) > 0.01) {
        alert('Entity split percentages must total 100%');
        return;
      }
    }

    try {
      const data = {
        grainEntityId: formData.grainEntityId,
        landParcelId: formData.landParcelId || undefined,
        name: formData.name,
        acres: parseFloat(formData.acres),
        commodityType: formData.commodityType,
        year: formData.year,
        projectedYield: parseFloat(formData.projectedYield),
        aph: parseFloat(formData.aph),
        notes: formData.notes || undefined,
        entitySplits: useEntitySplits && formData.entitySplits.length > 0
          ? formData.entitySplits
          : undefined
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

  const getCommodityIcon = (type: string) => {
    switch (type) {
      case 'CORN': return '🌽';
      case 'SOYBEANS': return '🫘';
      case 'WHEAT': return '🌾';
      default: return '🌱';
    }
  };

  const handleQuickEntityCreate = async () => {
    if (!selectedBusinessId || !newEntityName.trim()) return;

    try {
      const newEntity = await grainContractsApi.createGrainEntity(selectedBusinessId, newEntityName.trim());
      setEntities([...entities, newEntity]);
      // Auto-select the new entity
      if (!useEntitySplits) {
        setFormData({ ...formData, grainEntityId: newEntity.id });
      }
      setNewEntityName('');
      setShowQuickEntityForm(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create entity');
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Farm Management</h1>
          <p className="text-sm text-gray-600">Track costs and profitability by field for {filterYear}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/breakeven')}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Dashboard
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            Add Farm
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Farms</div>
          <div className="text-2xl font-bold text-gray-900">{farms.length}</div>
          <div className="text-xs text-gray-400">{summary.totalAcres.toLocaleString()} acres</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Costs</div>
          <div className="text-2xl font-bold text-red-600">${summary.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-gray-400">${summary.avgCostPerAcre.toFixed(0)}/acre avg</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Proj. Revenue</div>
          <div className="text-2xl font-bold text-blue-600">${summary.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div className={`rounded-xl shadow-sm border p-4 ${summary.totalProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-sm text-gray-500">Proj. Profit</div>
          <div className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.totalProfit >= 0 ? '+' : ''}${summary.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Market Prices</div>
          <div className="text-sm font-medium text-gray-900">
            <div>🌽 ${marketPrices.CORN?.toFixed(2)}</div>
            <div>🫘 ${marketPrices.SOYBEANS?.toFixed(2)}</div>
          </div>
          {pricesLoading && <div className="text-xs text-gray-400">Updating...</div>}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-sm"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Entity</label>
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-sm"
            >
              <option value="ALL">All Entities</option>
              {entities.map(entity => (
                <option key={entity.id} value={entity.id}>{entity.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Commodity</label>
            <select
              value={filterCommodity}
              onChange={(e) => setFilterCommodity(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-sm"
            >
              <option value="ALL">All Commodities</option>
              <option value="CORN">Corn</option>
              <option value="SOYBEANS">Soybeans</option>
              <option value="WHEAT">Wheat</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">View:</label>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded ${viewMode === 'cards' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
              title="Card view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded ${viewMode === 'table' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
              title="Table view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading farms...</p>
        </div>
      )}

      {/* Farm Cards */}
      {!isLoading && viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {farmsWithPL.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-4">No farms found for {filterYear}</p>
              <button onClick={handleAdd} className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800">
                Add Your First Farm
              </button>
            </div>
          ) : (
            farmsWithPL.map((farm) => (
              <div
                key={farm.id}
                className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden ${
                  farm.profit >= 0 ? 'border-green-200' : 'border-red-200'
                }`}
              >
                {/* Card Header */}
                <div className={`px-4 py-3 ${farm.profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getCommodityIcon(farm.commodityType)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{farm.name}</h3>
                        {farm.entitySplits && farm.entitySplits.length > 0 ? (
                          <p className="text-xs text-gray-500">
                            {farm.entitySplits.map((s, i) => (
                              <span key={s.id}>
                                {i > 0 && ' / '}
                                {s.grainEntityName || entities.find(e => e.id === s.grainEntityId)?.name} ({s.percentage}%)
                              </span>
                            ))}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">{farm.grainEntity?.name || 'No Entity'}</p>
                        )}
                      </div>
                    </div>
                    <div className={`text-right ${farm.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <div className="text-lg font-bold">
                        {farm.profit >= 0 ? '+' : ''}${farm.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs">
                        {farm.profitPerAcre >= 0 ? '+' : ''}${farm.profitPerAcre.toFixed(0)}/ac
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Farm Details */}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-gray-500 text-xs">Acres</div>
                      <div className="font-semibold">{farm.acres.toLocaleString()}</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-gray-500 text-xs">Yield</div>
                      <div className="font-semibold">{farm.projectedYield} bu/ac</div>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-gray-500 text-xs">Bushels</div>
                      <div className="font-semibold">{farm.expectedBushels.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="space-y-2 text-sm border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="font-medium text-red-600">${farm.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cost/Acre:</span>
                      <span className="font-medium">${farm.costPerAcre.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Break-Even:</span>
                      <span className="font-bold text-purple-600">${farm.breakEvenPrice.toFixed(2)}/bu</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Revenue @ ${farm.marketPrice.toFixed(2)}:</span>
                      <span className="font-medium text-blue-600">${farm.projectedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      onClick={() => navigate(`/breakeven/farms/${farm.id}/costs`)}
                      className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      Manage Costs
                    </button>
                    <button
                      onClick={() => handleEdit(farm)}
                      className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(farm.id)}
                      className="px-3 py-2 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Table View */}
      {!isLoading && viewMode === 'table' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farm</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Crop</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acres</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost/Ac</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Break-Even</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {farmsWithPL.map((farm) => (
                  <tr key={farm.id} className={`hover:bg-gray-50 ${farm.profit >= 0 ? '' : 'bg-red-50'}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/breakeven/farms/${farm.id}/costs`)}
                        className="font-medium text-gray-900 hover:text-gray-700"
                      >
                        {farm.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {farm.entitySplits && farm.entitySplits.length > 0 ? (
                        <span>
                          {farm.entitySplits.map((s, i) => (
                            <span key={s.id}>
                              {i > 0 && ' / '}
                              {s.grainEntityName || entities.find(e => e.id === s.grainEntityId)?.name} ({s.percentage}%)
                            </span>
                          ))}
                        </span>
                      ) : (
                        farm.grainEntity?.name || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className="text-lg">{getCommodityIcon(farm.commodityType)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                      {farm.acres.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                      ${farm.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                      ${farm.costPerAcre.toFixed(0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-purple-600 font-bold">
                      ${farm.breakEvenPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-blue-600 font-medium">
                      ${farm.projectedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-bold ${farm.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {farm.profit >= 0 ? '+' : ''}${farm.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm space-x-2">
                      <button onClick={() => handleEdit(farm)} className="text-gray-900 hover:text-gray-700">Edit</button>
                      <button onClick={() => handleDelete(farm.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingFarm ? 'Edit Farm' : 'Add Farm'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Entity Selection - Single or Split */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Entity *</label>
                    <label className="flex items-center text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={useEntitySplits}
                        onChange={(e) => {
                          setUseEntitySplits(e.target.checked);
                          if (e.target.checked && formData.entitySplits.length === 0) {
                            // Initialize with current entity at 100%
                            setFormData({
                              ...formData,
                              entitySplits: formData.grainEntityId
                                ? [{ grainEntityId: formData.grainEntityId, percentage: 100 }]
                                : []
                            });
                          }
                        }}
                        className="mr-2 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                      />
                      Split between entities
                    </label>
                  </div>

                  {!useEntitySplits ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={formData.grainEntityId}
                          onChange={(e) => setFormData({ ...formData, grainEntityId: e.target.value })}
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900"
                          required
                        >
                          <option value="">Select Entity</option>
                          {entities.map(entity => (
                            <option key={entity.id} value={entity.id}>{entity.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowQuickEntityForm(!showQuickEntityForm)}
                          className="px-3 py-2 text-gray-900 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100"
                          title="Add new entity"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      {showQuickEntityForm && (
                        <div className="flex gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                          <input
                            type="text"
                            value={newEntityName}
                            onChange={(e) => setNewEntityName(e.target.value)}
                            placeholder="New entity name"
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleQuickEntityCreate();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleQuickEntityCreate}
                            className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowQuickEntityForm(false);
                              setNewEntityName('');
                            }}
                            className="px-2 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      {formData.entitySplits.map((split, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <select
                            value={split.grainEntityId}
                            onChange={(e) => {
                              const newSplits = [...formData.entitySplits];
                              newSplits[index].grainEntityId = e.target.value;
                              setFormData({ ...formData, entitySplits: newSplits });
                            }}
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-sm"
                            required
                          >
                            <option value="">Select Entity</option>
                            {entities.map(entity => (
                              <option key={entity.id} value={entity.id}>{entity.name}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={split.percentage}
                              onChange={(e) => {
                                const newSplits = [...formData.entitySplits];
                                newSplits[index].percentage = parseFloat(e.target.value) || 0;
                                setFormData({ ...formData, entitySplits: newSplits });
                              }}
                              className="w-20 rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 text-sm"
                              required
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                          {formData.entitySplits.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newSplits = formData.entitySplits.filter((_, i) => i !== index);
                                setFormData({ ...formData, entitySplits: newSplits });
                              }}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              entitySplits: [...formData.entitySplits, { grainEntityId: '', percentage: 0 }]
                            });
                          }}
                          className="text-sm text-gray-900 hover:text-gray-700 font-medium"
                        >
                          + Add Entity
                        </button>
                        <div className="text-sm">
                          <span className="text-gray-500">Total: </span>
                          <span className={`font-medium ${
                            Math.abs(formData.entitySplits.reduce((sum, s) => sum + s.percentage, 0) - 100) < 0.01
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {formData.entitySplits.reduce((sum, s) => sum + s.percentage, 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Land Parcel</label>
                  <select
                    value={formData.landParcelId || ''}
                    onChange={(e) => setFormData({ ...formData, landParcelId: e.target.value || null })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900"
                  >
                    <option value="">No Land Parcel</option>
                    {landParcels.map(parcel => (
                      <option key={parcel.id} value={parcel.id}>
                        {parcel.name} ({parcel.totalAcres.toLocaleString()} acres)
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Link to a land parcel to include land loan costs in break-even calculations.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Farm Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900"
                    placeholder="e.g., North 40"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Acres *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.acres}
                      onChange={(e) => setFormData({ ...formData, acres: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900"
                    >
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                      <option value={2027}>2027</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commodity *</label>
                  <select
                    value={formData.commodityType}
                    onChange={(e) => handleCommodityChange(e.target.value as CommodityType)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900"
                  >
                    <option value="CORN">🌽 Corn</option>
                    <option value="SOYBEANS">🫘 Soybeans</option>
                    <option value="WHEAT">🌾 Wheat</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Projected Yield (bu/ac) *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.projectedYield}
                      onChange={(e) => setFormData({ ...formData, projectedYield: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">APH (bu/ac) *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.aph}
                      onChange={(e) => setFormData({ ...formData, aph: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900"
                    rows={2}
                    placeholder="Optional notes"
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
                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800"
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
