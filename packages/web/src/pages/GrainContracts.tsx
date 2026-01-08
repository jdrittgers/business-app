import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { grainContractsApi } from '../api/grain-contracts.api';
import {
  GrainContract,
  GrainEntity,
  CropYear,
  ContractType,
  CommodityType
} from '@business-app/shared';

export default function GrainContracts() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const [contracts, setContracts] = useState<GrainContract[]>([]);
  const [entities, setEntities] = useState<GrainEntity[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterEntity, setFilterEntity] = useState<string>('ALL');
  const [filterCropYear, setFilterCropYear] = useState<CropYear | 'ALL'>('ALL');
  const [filterContractType, setFilterContractType] = useState<ContractType | 'ALL'>('ALL');
  const [filterCommodity, setFilterCommodity] = useState<CommodityType | 'ALL'>('ALL');
  const [filterActive, setFilterActive] = useState<string>('true');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<GrainContract | null>(null);
  const [formData, setFormData] = useState({
    grainEntityId: '',
    contractType: 'CASH' as ContractType,
    cropYear: 'NEW_CROP' as CropYear,
    year: 2026,
    commodityType: 'CORN' as CommodityType,
    contractNumber: '',
    buyer: '',
    totalBushels: '',
    deliveryStartDate: '',
    deliveryEndDate: '',
    cashPrice: '',
    notes: '',
    // HTA/BASIS specific fields
    futuresPrice: '',
    futuresMonth: '',
    basisPrice: '',
    // Accumulator specific fields
    isDailyDouble: false,
    basisLocked: false,
    knockoutPrice: '',
    doubleUpPrice: '',
    dailyBushels: ''
  });

  // Entity creation modal
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user && user.businessMemberships.length > 0 && !selectedBusinessId) {
      // Default to Rittgers Farm
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
  }, [selectedBusinessId, filterEntity, filterCropYear, filterContractType, filterCommodity, filterActive]);

  const loadData = async () => {
    if (!selectedBusinessId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load entities
      const entitiesData = await grainContractsApi.getGrainEntities(selectedBusinessId);
      setEntities(entitiesData);

      // Load contracts with filters
      const contractsData = await grainContractsApi.getContracts(selectedBusinessId, {
        grainEntityId: filterEntity === 'ALL' ? undefined : filterEntity,
        cropYear: filterCropYear === 'ALL' ? undefined : filterCropYear,
        contractType: filterContractType === 'ALL' ? undefined : filterContractType,
        commodityType: filterCommodity === 'ALL' ? undefined : filterCommodity,
        isActive: filterActive
      });
      setContracts(contractsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load contracts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Calculate number of days between dates
  const calculateDays = () => {
    if (!formData.deliveryStartDate) {
      return 0;
    }

    const startDate = new Date(formData.deliveryStartDate);
    const endDate = formData.deliveryEndDate ? new Date(formData.deliveryEndDate) : new Date();

    if (endDate < startDate) {
      return 0;
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1;

    return daysDiff;
  };

  // Calculate daily bushels from total bushels and date range
  const calculateDailyBushels = () => {
    if (!formData.deliveryStartDate || !formData.totalBushels) {
      return 0;
    }

    const days = calculateDays();
    const totalBushels = parseFloat(formData.totalBushels);

    if (isNaN(totalBushels) || days === 0) {
      return 0;
    }

    return totalBushels / days;
  };

  // Auto-calculate daily bushels for accumulators when dates or total bushels change
  const handleAccumulatorFieldChange = (field: string, value: any) => {
    const updatedFormData = { ...formData, [field]: value };
    setFormData(updatedFormData);

    // Auto-calculate daily bushels if accumulator
    if (formData.contractType === 'ACCUMULATOR') {
      const startDate = field === 'deliveryStartDate' ? value : formData.deliveryStartDate;
      const endDate = field === 'deliveryEndDate' ? value : formData.deliveryEndDate;
      const totalBushels = field === 'totalBushels' ? value : formData.totalBushels;

      if (startDate && totalBushels) {
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();
        const total = parseFloat(totalBushels);

        if (!isNaN(total) && end >= start) {
          const millisecondsPerDay = 1000 * 60 * 60 * 24;
          const daysDiff = Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;
          const calculatedDaily = total / daysDiff;

          // Update daily bushels automatically
          setFormData(prev => ({
            ...prev,
            [field]: value,
            dailyBushels: calculatedDaily.toFixed(2)
          }));
          return;
        }
      }
    }
  };

  const handleOpenModal = () => {
    setEditingContract(null);
    setFormData({
      grainEntityId: entities[0]?.id || '',
      contractType: ContractType.CASH,
      cropYear: CropYear.NEW_CROP,
      year: 2026,
      commodityType: CommodityType.CORN,
      contractNumber: '',
      buyer: '',
      totalBushels: '',
      deliveryStartDate: '',
      deliveryEndDate: '',
      cashPrice: '',
      notes: '',
      futuresPrice: '',
      futuresMonth: '',
      basisPrice: '',
      isDailyDouble: false,
      basisLocked: false,
      knockoutPrice: '',
      doubleUpPrice: '',
      dailyBushels: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (contract: GrainContract) => {
    setEditingContract(contract);
    setFormData({
      grainEntityId: contract.grainEntityId,
      contractType: contract.contractType,
      cropYear: contract.cropYear,
      year: contract.year,
      commodityType: contract.commodityType,
      contractNumber: contract.contractNumber || '',
      buyer: contract.buyer,
      totalBushels: contract.totalBushels.toString(),
      deliveryStartDate: contract.deliveryStartDate ? new Date(contract.deliveryStartDate).toISOString().split('T')[0] : '',
      deliveryEndDate: contract.deliveryEndDate ? new Date(contract.deliveryEndDate).toISOString().split('T')[0] : '',
      cashPrice: contract.cashPrice?.toString() || '',
      notes: contract.notes || '',
      futuresPrice: contract.futuresPrice?.toString() || '',
      futuresMonth: contract.futuresMonth || '',
      basisPrice: contract.basisPrice?.toString() || '',
      isDailyDouble: contract.accumulatorDetails?.isDailyDouble || false,
      basisLocked: contract.accumulatorDetails?.basisLocked || false,
      knockoutPrice: contract.accumulatorDetails?.knockoutPrice?.toString() || '',
      doubleUpPrice: contract.accumulatorDetails?.doubleUpPrice?.toString() || '',
      dailyBushels: contract.accumulatorDetails?.dailyBushels?.toString() || ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingContract(null);
  };

  const handleDelete = async (contractId: string) => {
    if (!confirm('Are you sure you want to delete this contract? This action cannot be undone.')) {
      return;
    }

    try {
      await grainContractsApi.deleteContract(contractId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete contract');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const contractData: any = {
        grainEntityId: formData.grainEntityId,
        contractType: formData.contractType,
        cropYear: formData.cropYear,
        year: formData.year,
        commodityType: formData.commodityType,
        contractNumber: formData.contractNumber || undefined,
        buyer: formData.buyer,
        totalBushels: parseFloat(formData.totalBushels),
        deliveryStartDate: formData.deliveryStartDate || undefined,
        deliveryEndDate: formData.deliveryEndDate || undefined,
        cashPrice: formData.cashPrice ? parseFloat(formData.cashPrice) : undefined,
        futuresPrice: formData.futuresPrice ? parseFloat(formData.futuresPrice) : undefined,
        futuresMonth: formData.futuresMonth || undefined,
        basisPrice: formData.basisPrice ? parseFloat(formData.basisPrice) : undefined,
        notes: formData.notes || undefined
      };

      // Add accumulator details if contract type is ACCUMULATOR
      if (formData.contractType === 'ACCUMULATOR') {
        contractData.accumulatorDetails = {
          knockoutPrice: parseFloat(formData.knockoutPrice),
          doubleUpPrice: parseFloat(formData.doubleUpPrice),
          dailyBushels: parseFloat(formData.dailyBushels),
          startDate: formData.deliveryStartDate,
          endDate: formData.deliveryEndDate || undefined,
          isDailyDouble: formData.isDailyDouble,
          basisLocked: formData.basisLocked
        };
      }

      if (editingContract) {
        // Update existing contract
        await grainContractsApi.updateContract(editingContract.id, contractData);
      } else {
        // Create new contract
        await grainContractsApi.createContract(contractData);
      }

      handleCloseModal();
      loadData(); // Reload contracts
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to ${editingContract ? 'update' : 'create'} contract`);
    }
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBusinessId || !newEntityName.trim()) {
      return;
    }

    try {
      await grainContractsApi.createGrainEntity(selectedBusinessId, newEntityName.trim());
      setNewEntityName('');
      setShowEntityModal(false);
      loadData(); // Reload entities
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create entity');
    }
  };

  const getContractTypeColor = (type: ContractType) => {
    switch (type) {
      case 'CASH': return 'bg-green-100 text-green-800';
      case 'BASIS': return 'bg-blue-100 text-blue-800';
      case 'HTA': return 'bg-purple-100 text-purple-800';
      case 'ACCUMULATOR': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCommodityIcon = (commodity: CommodityType) => {
    switch (commodity) {
      case 'CORN': return '🌽';
      case 'SOYBEANS': return '🫘';
      case 'WHEAT': return '🌾';
      default: return '🌾';
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">Business App</h1>
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/calendar')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Calendar
                </button>
                <button
                  onClick={() => navigate('/tasks')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Tasks
                </button>
                <button
                  onClick={() => navigate('/grain-contracts')}
                  className="text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Contracts
                </button>
                <button
                  onClick={() => navigate('/grain-contracts/dashboard')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/grain-contracts/production')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Production
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Grain Contracts</h2>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowEntityModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  + New Entity
                </button>

                <button
                  onClick={handleOpenModal}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                >
                  + New Contract
                </button>

                <select
                  value={selectedBusinessId || ''}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {user.businessMemberships.map((membership) => (
                    <option key={membership.businessId} value={membership.businessId}>
                      {membership.business.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Entities</option>
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>

              <select
                value={filterCropYear}
                onChange={(e) => setFilterCropYear(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Crop Years</option>
                <option value="NEW_CROP">New Crop</option>
                <option value="OLD_CROP">Old Crop</option>
              </select>

              <select
                value={filterContractType}
                onChange={(e) => setFilterContractType(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="CASH">Cash</option>
                <option value="BASIS">Basis</option>
                <option value="HTA">HTA</option>
                <option value="ACCUMULATOR">Accumulator</option>
              </select>

              <select
                value={filterCommodity}
                onChange={(e) => setFilterCommodity(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Commodities</option>
                <option value="CORN">🌽 Corn</option>
                <option value="SOYBEANS">🫘 Soybeans</option>
                <option value="WHEAT">🌾 Wheat</option>
              </select>

              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
                <option value="">All Contracts</option>
              </select>
            </div>

            {/* Contracts List */}
            <div className="space-y-4">
              {isLoading ? (
                <p className="text-center text-gray-500 py-8">Loading contracts...</p>
              ) : contracts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No contracts found</p>
              ) : (
                contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{getCommodityIcon(contract.commodityType)}</span>
                          <h3 className="text-lg font-medium text-gray-900">
                            {contract.grainEntity?.name}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${getContractTypeColor(contract.contractType)}`}>
                            {contract.contractType}
                          </span>
                          {/* Show HTA badge if accumulator with basis not locked */}
                          {contract.contractType === 'ACCUMULATOR' && contract.accumulatorDetails && !contract.accumulatorDetails.basisLocked && (
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                              HTA (Basis Not Locked)
                            </span>
                          )}
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            {contract.cropYear.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-2">
                          <div>
                            <span className="font-medium">Commodity:</span> {contract.commodityType}
                          </div>
                          <div>
                            <span className="font-medium">Buyer:</span> {contract.buyer}
                          </div>
                          <div>
                            <span className="font-medium">Total Bushels:</span> {contract.totalBushels.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Delivered:</span> {contract.bushelsDelivered.toLocaleString()} ({((contract.bushelsDelivered / contract.totalBushels) * 100).toFixed(1)}%)
                          </div>
                          {contract.contractNumber && (
                            <div>
                              <span className="font-medium">Contract #:</span> {contract.contractNumber}
                            </div>
                          )}
                          {contract.cashPrice && (
                            <div>
                              <span className="font-medium">Price:</span> ${contract.cashPrice.toFixed(4)}
                            </div>
                          )}
                          {contract.accumulatorDetails && (
                            <>
                              <div>
                                <span className="font-medium">Daily:</span> {contract.accumulatorDetails.dailyBushels.toLocaleString()} bu
                              </div>
                              <div>
                                <span className="font-medium">Knockout:</span> ${contract.accumulatorDetails.knockoutPrice.toFixed(4)}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        <div className={`px-3 py-1 rounded text-sm font-medium text-center ${contract.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {contract.isActive ? 'Active' : 'Inactive'}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(contract);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(contract.id);
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create Contract Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingContract ? 'Edit Contract' : 'Create New Contract'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entity *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type *</label>
                  <select
                    value={formData.contractType}
                    onChange={(e) => {
                      const newType = e.target.value as ContractType;
                      setFormData({ ...formData, contractType: newType });

                      // Trigger calculation if changing to ACCUMULATOR and fields are filled
                      if (newType === 'ACCUMULATOR' && formData.deliveryStartDate && formData.totalBushels) {
                        setTimeout(() => {
                          handleAccumulatorFieldChange('totalBushels', formData.totalBushels);
                        }, 0);
                      }
                    }}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="CASH">Cash</option>
                    <option value="BASIS">Basis</option>
                    <option value="HTA">HTA</option>
                    <option value="ACCUMULATOR">Accumulator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crop Year *</label>
                  <select
                    value={formData.cropYear}
                    onChange={(e) => setFormData({ ...formData, cropYear: e.target.value as CropYear })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="NEW_CROP">New Crop</option>
                    <option value="OLD_CROP">Old Crop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commodity *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Number</label>
                  <input
                    type="text"
                    value={formData.contractNumber}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buyer *</label>
                  <input
                    type="text"
                    value={formData.buyer}
                    onChange={(e) => setFormData({ ...formData, buyer: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    placeholder="e.g., ADM, Cargill"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Bushels *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.totalBushels}
                    onChange={(e) => handleAccumulatorFieldChange('totalBushels', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    placeholder="e.g., 5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cash Price ($/bu)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.cashPrice}
                    onChange={(e) => setFormData({ ...formData, cashPrice: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Start Date
                    {formData.contractType === 'ACCUMULATOR' && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    type="date"
                    value={formData.deliveryStartDate}
                    onChange={(e) => handleAccumulatorFieldChange('deliveryStartDate', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required={formData.contractType === 'ACCUMULATOR'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery End Date</label>
                  <input
                    type="date"
                    value={formData.deliveryEndDate}
                    onChange={(e) => handleAccumulatorFieldChange('deliveryEndDate', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {formData.contractType === 'ACCUMULATOR' && !formData.deliveryEndDate && (
                    <p className="text-xs text-gray-500 mt-1">Leave blank to use today's date</p>
                  )}
                </div>
              </div>

              {/* HTA and BASIS-specific fields */}
              {(formData.contractType === 'HTA' || formData.contractType === 'BASIS') && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {formData.contractType === 'HTA' ? 'HTA Contract Details' : 'BASIS Contract Details'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {formData.contractType === 'HTA' ? 'Board Price ($/bu) *' : 'Futures Price ($/bu)'}
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={formData.futuresPrice}
                        onChange={(e) => setFormData({ ...formData, futuresPrice: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required={formData.contractType === 'HTA'}
                        placeholder="e.g., 4.50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.contractType === 'HTA' ? 'Locked futures price' : 'Current futures price (update as needed)'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Futures Month *
                      </label>
                      <input
                        type="text"
                        value={formData.futuresMonth}
                        onChange={(e) => setFormData({ ...formData, futuresMonth: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required={formData.contractType === 'HTA' || formData.contractType === 'BASIS'}
                        placeholder="e.g., Dec 2026"
                      />
                      <p className="text-xs text-gray-500 mt-1">Month of futures contract</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Basis ($/bu) {formData.contractType === 'BASIS' && '*'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.basisPrice}
                        onChange={(e) => setFormData({ ...formData, basisPrice: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required={formData.contractType === 'BASIS'}
                        placeholder={formData.contractType === 'HTA' ? 'Leave blank for default' : 'e.g., -0.45'}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.contractType === 'HTA'
                          ? 'Optional - defaults will be used if not set'
                          : 'Locked basis for this contract'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      {formData.contractType === 'HTA' ? (
                        <>
                          <strong>Board Price:</strong> The locked futures price for your contract.<br/>
                          <strong>Basis:</strong> Leave blank to use default basis assumptions (Corn: -$0.45, Soybeans: -$0.75, Wheat: -$0.60).<br/>
                          <strong>Cash Price:</strong> Board Price + Basis = Final price per bushel.
                        </>
                      ) : (
                        <>
                          <strong>Futures Price:</strong> Current futures price (you can update this as the market changes).<br/>
                          <strong>Basis:</strong> Your locked basis value.<br/>
                          <strong>Cash Price:</strong> Futures Price + Basis = Current estimated price per bushel.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Accumulator-specific fields */}
              {formData.contractType === 'ACCUMULATOR' && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Accumulator Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Knockout Price ($/bu) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.knockoutPrice}
                        onChange={(e) => setFormData({ ...formData, knockoutPrice: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required={formData.contractType === 'ACCUMULATOR'}
                        placeholder="e.g., 5.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Double Up Price ($/bu) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.doubleUpPrice}
                        onChange={(e) => setFormData({ ...formData, doubleUpPrice: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required={formData.contractType === 'ACCUMULATOR'}
                        placeholder="e.g., 4.50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Daily Bushels *
                        <span className="text-xs text-gray-500 font-normal ml-2">(Auto-calculated)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.dailyBushels}
                        onChange={(e) => setFormData({ ...formData, dailyBushels: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50"
                        required={formData.contractType === 'ACCUMULATOR'}
                        placeholder="Auto-calculated"
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">Calculated from total bushels ÷ number of days</p>
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="isDailyDouble"
                          checked={formData.isDailyDouble}
                          onChange={(e) => setFormData({ ...formData, isDailyDouble: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isDailyDouble" className="ml-2 block text-sm font-medium text-gray-700">
                          Daily Double Accumulator
                        </label>
                      </div>
                      <div className="flex items-center mt-2">
                        <input
                          type="checkbox"
                          id="basisLocked"
                          checked={formData.basisLocked}
                          onChange={(e) => setFormData({ ...formData, basisLocked: e.target.checked })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="basisLocked" className="ml-2 block text-sm font-medium text-gray-700">
                          Basis Locked
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Daily Bushels Calculation Display */}
                  {formData.deliveryStartDate && formData.totalBushels && (
                    <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                      <p className="text-sm text-gray-900">
                        <strong>Calculated Daily Bushels:</strong> {calculateDailyBushels().toFixed(2)} bu/day
                        <span className="text-gray-600 ml-2">
                          ({parseFloat(formData.totalBushels).toLocaleString()} bu ÷ {calculateDays()} days)
                        </span>
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Date range: {formData.deliveryStartDate} to {formData.deliveryEndDate || 'today'}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-gray-700">
                      <strong>Knockout Price:</strong> Market price at which the contract stops accumulating.<br/>
                      <strong>Double Up Price:</strong> Trigger price for daily double (if enabled).<br/>
                      <strong>Daily Bushels:</strong> Auto-calculated from total bushels divided by number of days.<br/>
                      <strong>Basis Locked:</strong> Check if basis is locked. If unchecked, accumulator acts as HTA until basis is locked.
                    </p>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                >
                  {editingContract ? 'Update Contract' : 'Create Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entity Creation Modal */}
      {showEntityModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Grain Entity</h3>
              <form onSubmit={handleCreateEntity}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entity Name *
                  </label>
                  <input
                    type="text"
                    value={newEntityName}
                    onChange={(e) => setNewEntityName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., JKC Farms"
                    required
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    A grain entity represents a farm, field, or production unit
                  </p>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEntityModal(false);
                      setNewEntityName('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Entity
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
