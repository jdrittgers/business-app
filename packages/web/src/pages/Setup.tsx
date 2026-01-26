import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { grainContractsApi } from '../api/grain-contracts.api';
import { breakevenApi } from '../api/breakeven.api';
import { johnDeereApi } from '../api/john-deere.api';
import {
  GrainEntity,
  Farm,
  CommodityType,
  JohnDeereConnectionStatus,
  JohnDeereOrganization,
  CreateEntitySplitRequest
} from '@business-app/shared';

// Tab types
type SetupTab = 'entities' | 'farms' | 'john-deere';

// Entity Modal
interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  entity?: GrainEntity | null;
}

function EntityModal({ isOpen, onClose, onSave, entity }: EntityModalProps) {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(entity?.name || '');
    }
  }, [isOpen, entity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(name);
      onClose();
    } catch (error) {
      console.error('Failed to save entity:', error);
      alert(error instanceof Error ? error.message : 'Failed to save entity');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="glass-backdrop transition-opacity" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom glass-modal text-left overflow-hidden transform transition-all animate-slide-up sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              {entity ? 'Edit Entity' : 'Add Entity'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Entity Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm"
                  placeholder="e.g., JDR Ag LLC"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Entities are separate legal entities that own or operate farms (e.g., different LLCs, partnerships)
                </p>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-900 text-base font-medium text-white hover:bg-gray-800 sm:text-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple Farm Modal for quick creation
interface FarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; acres: number; grainEntityId: string; commodityType: CommodityType; year: number; projectedYield: number; aph: number }) => Promise<void>;
  entities: GrainEntity[];
  defaultYear: number;
}

function FarmModal({ isOpen, onClose, onSave, entities, defaultYear }: FarmModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    acres: 0,
    grainEntityId: '',
    commodityType: CommodityType.CORN,
    year: defaultYear,
    projectedYield: 200,
    aph: 200
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        acres: 0,
        grainEntityId: entities[0]?.id || '',
        commodityType: CommodityType.CORN,
        year: defaultYear,
        projectedYield: 200,
        aph: 200
      });
    }
  }, [isOpen, entities, defaultYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save farm:', error);
      alert(error instanceof Error ? error.message : 'Failed to save farm');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="glass-backdrop transition-opacity" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom glass-modal text-left overflow-hidden transform transition-all animate-slide-up sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Add Farm
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Farm/Field Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm"
                  placeholder="e.g., North 80"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Acres *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.acres || ''}
                    onChange={(e) => setFormData({ ...formData, acres: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Year *</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Entity *</label>
                  <select
                    value={formData.grainEntityId}
                    onChange={(e) => setFormData({ ...formData, grainEntityId: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm"
                    required
                  >
                    <option value="">Select Entity</option>
                    {entities.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Commodity *</label>
                  <select
                    value={formData.commodityType}
                    onChange={(e) => setFormData({ ...formData, commodityType: e.target.value as CommodityType })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gray-900 focus:ring-gray-900 sm:text-sm"
                    required
                  >
                    <option value="CORN">Corn</option>
                    <option value="SOYBEANS">Soybeans</option>
                    <option value="WHEAT">Wheat</option>
                  </select>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim() || !formData.grainEntityId}
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-gray-900 text-base font-medium text-white hover:bg-gray-800 sm:text-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Setup() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SetupTab>('entities');
  const [entities, setEntities] = useState<GrainEntity[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  // Entity modal
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<GrainEntity | null>(null);

  // Farm modal
  const [showFarmModal, setShowFarmModal] = useState(false);

  // Inline editing state - tracks changes to farms before saving
  const [pendingChanges, setPendingChanges] = useState<Record<string, { grainEntityId?: string; acres?: number; entitySplits?: CreateEntitySplitRequest[] }>>({});
  const [savingFarms, setSavingFarms] = useState<Set<string>>(new Set());
  // Track which farms have split mode expanded
  const [expandedSplits, setExpandedSplits] = useState<Set<string>>(new Set());

  // John Deere
  const [jdStatus, setJdStatus] = useState<JohnDeereConnectionStatus | null>(null);
  const [jdOrganizations, setJdOrganizations] = useState<JohnDeereOrganization[]>([]);
  const [jdLoading, setJdLoading] = useState(false);
  const [jdFields, setJdFields] = useState<Array<{ id: string; name: string; acres?: number; farmName?: string }>>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [importingFields, setImportingFields] = useState(false);

  const businessId = user?.businessMemberships?.[0]?.businessId;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (businessId) {
      loadData();
    }
  }, [businessId]);

  const loadData = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [entitiesData, farmsData] = await Promise.all([
        grainContractsApi.getGrainEntities(businessId),
        breakevenApi.getFarms(businessId)
      ]);
      setEntities(entitiesData);
      setFarms(farmsData);

      // Load JD status
      try {
        const status = await johnDeereApi.getStatus(businessId);
        setJdStatus(status);
        if (status.isConnected) {
          const orgs = await johnDeereApi.getOrganizations(businessId);
          setJdOrganizations(orgs);

          // If organization is selected, load fields
          if (status.connection?.organizationId) {
            loadFields();
          }
        }
      } catch (err) {
        console.error('Failed to load JD status:', err);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFields = async () => {
    if (!businessId) return;
    setLoadingFields(true);
    try {
      const fields = await johnDeereApi.getFields(businessId);
      setJdFields(fields);
    } catch (err) {
      console.error('Failed to load JD fields:', err);
      setJdFields([]);
    } finally {
      setLoadingFields(false);
    }
  };

  // Entity handlers
  const handleCreateEntity = async (name: string) => {
    if (!businessId) return;
    await grainContractsApi.createGrainEntity(businessId, name);
    await loadData();
  };

  const handleUpdateEntity = async (name: string) => {
    if (!businessId || !selectedEntity) return;
    await grainContractsApi.updateGrainEntity(businessId, selectedEntity.id, { name });
    await loadData();
  };

  const handleDeleteEntity = async (entityId: string) => {
    if (!businessId) return;
    if (!confirm('Are you sure you want to delete this entity? This will also remove all associated data.')) return;
    try {
      await grainContractsApi.deleteGrainEntity(businessId, entityId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete entity:', error);
      alert('Failed to delete entity. It may have associated contracts or farms.');
    }
  };

  // Farm handlers
  const handleCreateFarm = async (data: { name: string; acres: number; grainEntityId: string; commodityType: CommodityType; year: number; projectedYield: number; aph: number }) => {
    if (!businessId) return;
    await breakevenApi.createFarm(businessId, data);
    await loadData();
  };

  const handleDeleteFarm = async (farmId: string) => {
    if (!businessId) return;
    if (!confirm('Are you sure you want to delete this farm?')) return;
    try {
      await breakevenApi.deleteFarm(businessId, farmId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete farm:', error);
      alert('Failed to delete farm');
    }
  };

  // Inline editing handlers
  const handleInlineChange = (farmId: string, field: 'grainEntityId' | 'acres', value: string | number) => {
    setPendingChanges(prev => ({
      ...prev,
      [farmId]: {
        ...prev[farmId],
        [field]: value,
        // Clear entitySplits when switching back to single entity
        ...(field === 'grainEntityId' ? { entitySplits: undefined } : {})
      }
    }));
    // Collapse split mode when selecting a single entity
    if (field === 'grainEntityId') {
      setExpandedSplits(prev => {
        const newSet = new Set(prev);
        newSet.delete(farmId);
        return newSet;
      });
    }
  };

  const handleSplitChange = (farmId: string, splits: CreateEntitySplitRequest[]) => {
    setPendingChanges(prev => ({
      ...prev,
      [farmId]: {
        ...prev[farmId],
        entitySplits: splits,
        grainEntityId: undefined // Clear single entity when using splits
      }
    }));
  };

  const toggleSplitMode = (farmId: string) => {
    const farm = farms.find(f => f.id === farmId);
    if (!farm) return;

    setExpandedSplits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(farmId)) {
        newSet.delete(farmId);
        // When collapsing, reset to single entity if no pending splits
        const changes = pendingChanges[farmId];
        if (!changes?.entitySplits || changes.entitySplits.length === 0) {
          setPendingChanges(p => ({
            ...p,
            [farmId]: {
              ...p[farmId],
              entitySplits: undefined
            }
          }));
        }
      } else {
        newSet.add(farmId);
        // When expanding, initialize with current splits or default 50/50 if multiple entities
        const currentSplits = farm.entitySplits || [];
        if (currentSplits.length === 0 && entities.length >= 2) {
          // Default to 50/50 split with first two entities
          setPendingChanges(p => ({
            ...p,
            [farmId]: {
              ...p[farmId],
              entitySplits: [
                { grainEntityId: farm.grainEntityId, percentage: 50 },
                { grainEntityId: entities.find(e => e.id !== farm.grainEntityId)?.id || entities[1].id, percentage: 50 }
              ]
            }
          }));
        } else if (currentSplits.length > 0) {
          // Use existing splits
          setPendingChanges(p => ({
            ...p,
            [farmId]: {
              ...p[farmId],
              entitySplits: currentSplits.map(s => ({ grainEntityId: s.grainEntityId, percentage: s.percentage }))
            }
          }));
        }
      }
      return newSet;
    });
  };

  const hasChanges = (farmId: string) => {
    const changes = pendingChanges[farmId];
    if (!changes) return false;
    const farm = farms.find(f => f.id === farmId);
    if (!farm) return false;

    // Check for entity split changes
    if (changes.entitySplits !== undefined) {
      const currentSplits = farm.entitySplits || [];
      if (changes.entitySplits.length !== currentSplits.length) return true;
      const splitsChanged = changes.entitySplits.some((s, i) =>
        currentSplits[i]?.grainEntityId !== s.grainEntityId ||
        currentSplits[i]?.percentage !== s.percentage
      );
      if (splitsChanged) return true;
    }

    return (
      (changes.grainEntityId !== undefined && changes.grainEntityId !== farm.grainEntityId) ||
      (changes.acres !== undefined && changes.acres !== farm.acres)
    );
  };

  const hasPendingChanges = Object.keys(pendingChanges).some(farmId => hasChanges(farmId));

  const handleSaveFarm = async (farmId: string) => {
    if (!businessId) return;
    const changes = pendingChanges[farmId];
    if (!changes || !hasChanges(farmId)) return;

    setSavingFarms(prev => new Set(prev).add(farmId));
    try {
      await breakevenApi.updateFarm(businessId, farmId, changes);
      // Remove from pending changes after successful save
      setPendingChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[farmId];
        return newChanges;
      });
      await loadData();
    } catch (error) {
      console.error('Failed to save farm:', error);
      alert('Failed to save changes');
    } finally {
      setSavingFarms(prev => {
        const newSet = new Set(prev);
        newSet.delete(farmId);
        return newSet;
      });
    }
  };

  const handleSaveAllFarms = async () => {
    if (!businessId) return;
    const farmsToSave = Object.keys(pendingChanges).filter(farmId => hasChanges(farmId));

    for (const farmId of farmsToSave) {
      setSavingFarms(prev => new Set(prev).add(farmId));
    }

    try {
      await Promise.all(
        farmsToSave.map(async (farmId) => {
          const changes = pendingChanges[farmId];
          await breakevenApi.updateFarm(businessId, farmId, changes);
        })
      );
      setPendingChanges({});
      await loadData();
    } catch (error) {
      console.error('Failed to save farms:', error);
      alert('Failed to save some changes');
    } finally {
      setSavingFarms(new Set());
    }
  };

  const handleDiscardChanges = (farmId: string) => {
    setPendingChanges(prev => {
      const newChanges = { ...prev };
      delete newChanges[farmId];
      return newChanges;
    });
  };

  // John Deere handlers
  const handleConnectJohnDeere = async () => {
    if (!businessId) return;
    setJdLoading(true);
    try {
      const { url } = await johnDeereApi.getAuthUrl(businessId);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to get JD auth URL:', error);
      alert('Failed to connect to John Deere');
    } finally {
      setJdLoading(false);
    }
  };

  const handleDisconnectJohnDeere = async () => {
    if (!businessId) return;
    if (!confirm('Are you sure you want to disconnect from John Deere?')) return;
    try {
      await johnDeereApi.disconnect(businessId);
      setJdStatus(null);
      setJdOrganizations([]);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleSelectOrganization = async (orgId: string, orgName: string) => {
    if (!businessId) return;
    setJdLoading(true);
    try {
      await johnDeereApi.setOrganization(businessId, orgId, orgName);
      await loadData();
      // Load fields after org is set
      await loadFields();
    } catch (error) {
      console.error('Failed to select organization:', error);
      alert('Failed to select organization');
    } finally {
      setJdLoading(false);
    }
  };

  // Import selected fields as farms
  const handleImportFields = async () => {
    if (!businessId || selectedFields.size === 0 || entities.length === 0) return;

    setImportingFields(true);
    const fieldsToImport = jdFields.filter(f => selectedFields.has(f.id));
    let imported = 0;
    const skipped: string[] = [];

    for (const field of fieldsToImport) {
      try {
        await breakevenApi.createFarm(businessId, {
          name: field.name,
          acres: field.acres || 0,
          grainEntityId: entities[0].id, // Default to first entity
          commodityType: CommodityType.CORN, // Default
          year: currentYear,
          projectedYield: 200, // Default yield
          aph: 200 // Default APH
        });
        imported++;
      } catch (error: any) {
        // Skip duplicates (unique constraint violation)
        if (error?.response?.data?.error?.includes('Unique constraint') ||
            error?.message?.includes('Unique constraint')) {
          skipped.push(field.name);
        } else {
          console.error('Failed to import field:', field.name, error);
          skipped.push(`${field.name} (error)`);
        }
      }
    }

    setSelectedFields(new Set());
    await loadData();
    setImportingFields(false);

    if (skipped.length > 0 && imported > 0) {
      alert(`Imported ${imported} field(s). Skipped ${skipped.length} (already exist): ${skipped.join(', ')}`);
    } else if (skipped.length > 0 && imported === 0) {
      alert(`All selected fields already exist: ${skipped.join(', ')}`);
    } else {
      alert(`Successfully imported ${imported} field(s) as farms`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'entities' as SetupTab, label: 'Entities', count: entities.length },
    { id: 'farms' as SetupTab, label: 'Farms', count: farms.length },
    { id: 'john-deere' as SetupTab, label: 'John Deere', status: jdStatus?.isConnected ? 'Connected' : 'Not Connected' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Setup</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your entities, farms, and integrations
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
              {tab.status && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  tab.status === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.status}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Entities Tab */}
      {activeTab === 'entities' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Entities represent different legal structures or partnerships that own or operate your farms.
            </p>
            <button
              onClick={() => {
                setSelectedEntity(null);
                setShowEntityModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800"
            >
              Add Entity
            </button>
          </div>

          {entities.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No entities</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first entity.</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {entities.map((entity) => {
                  const entityFarms = farms.filter(f => f.grainEntityId === entity.id);
                  const totalAcres = entityFarms.reduce((sum, f) => sum + (f.acres || 0), 0);

                  return (
                    <li key={entity.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{entity.name}</p>
                          <p className="text-sm text-gray-500">
                            {entityFarms.length} farm{entityFarms.length !== 1 ? 's' : ''} &middot; {totalAcres.toLocaleString()} acres
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              setSelectedEntity(entity);
                              setShowEntityModal(true);
                            }}
                            className="text-sm text-gray-600 hover:text-gray-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEntity(entity.id)}
                            className="text-sm text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Farms Tab */}
      {activeTab === 'farms' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Farms/fields for crop planning and cost tracking. Import from John Deere or add manually.
            </p>
            <div className="flex gap-3">
              {hasPendingChanges && (
                <button
                  onClick={handleSaveAllFarms}
                  disabled={savingFarms.size > 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 animate-pulse"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {savingFarms.size > 0 ? 'Saving...' : 'Save All Changes'}
                </button>
              )}
              {jdStatus?.isConnected && (
                <button
                  onClick={() => setActiveTab('john-deere')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="w-4 h-4 mr-2 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Import from John Deere
                </button>
              )}
              <button
                onClick={() => setShowFarmModal(true)}
                disabled={entities.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Farm
              </button>
            </div>
          </div>

          {entities.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                You need to create at least one entity before adding farms.
              </p>
            </div>
          )}

          {farms.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No farms</h3>
              <p className="mt-1 text-sm text-gray-500">
                {jdStatus?.isConnected
                  ? 'Import fields from John Deere or add farms manually.'
                  : 'Add your first farm to start tracking costs and planning.'}
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farm</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acres</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commodity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {farms.map((farm) => {
                    const farmChanges = pendingChanges[farm.id];
                    const currentEntityId = farmChanges?.grainEntityId ?? farm.grainEntityId;
                    const currentAcres = farmChanges?.acres ?? farm.acres;
                    const farmHasChanges = hasChanges(farm.id);
                    const isSaving = savingFarms.has(farm.id);
                    const isExpanded = expandedSplits.has(farm.id);
                    const currentSplits = farmChanges?.entitySplits ?? farm.entitySplits ?? [];
                    const hasSplits = currentSplits.length > 0;

                    return (
                      <tr key={farm.id} className={`${farmHasChanges ? 'bg-yellow-50' : 'hover:bg-gray-50'} transition-colors`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{farm.name}</td>
                        <td className="px-6 py-3">
                          {isExpanded ? (
                            // Expanded split editing mode
                            <div className="space-y-2">
                              {(farmChanges?.entitySplits || currentSplits).map((split, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <select
                                    value={split.grainEntityId}
                                    onChange={(e) => {
                                      const newSplits = [...(farmChanges?.entitySplits || currentSplits)];
                                      newSplits[idx] = { ...newSplits[idx], grainEntityId: e.target.value };
                                      handleSplitChange(farm.id, newSplits);
                                    }}
                                    disabled={isSaving}
                                    className="flex-1 rounded-md text-sm py-1 pl-2 pr-6 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                                  >
                                    {entities.map(e => (
                                      <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={split.percentage}
                                    onChange={(e) => {
                                      const newSplits = [...(farmChanges?.entitySplits || currentSplits)];
                                      newSplits[idx] = { ...newSplits[idx], percentage: parseInt(e.target.value) || 0 };
                                      handleSplitChange(farm.id, newSplits);
                                    }}
                                    disabled={isSaving}
                                    className="w-16 rounded-md text-sm py-1 px-2 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                                  />
                                  <span className="text-xs text-gray-500">%</span>
                                  {(farmChanges?.entitySplits || currentSplits).length > 2 && (
                                    <button
                                      onClick={() => {
                                        const newSplits = (farmChanges?.entitySplits || currentSplits).filter((_, i) => i !== idx);
                                        handleSplitChange(farm.id, newSplits);
                                      }}
                                      disabled={isSaving}
                                      className="text-red-500 hover:text-red-700 text-xs"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              ))}
                              <div className="flex items-center gap-2 pt-1">
                                {(farmChanges?.entitySplits || currentSplits).length < entities.length && (
                                  <button
                                    onClick={() => {
                                      const currentEntityIds = (farmChanges?.entitySplits || currentSplits).map(s => s.grainEntityId);
                                      const availableEntity = entities.find(e => !currentEntityIds.includes(e.id));
                                      if (availableEntity) {
                                        handleSplitChange(farm.id, [
                                          ...(farmChanges?.entitySplits || currentSplits),
                                          { grainEntityId: availableEntity.id, percentage: 0 }
                                        ]);
                                      }
                                    }}
                                    disabled={isSaving}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    + Add Entity
                                  </button>
                                )}
                                <button
                                  onClick={() => toggleSplitMode(farm.id)}
                                  className="text-xs text-gray-500 hover:text-gray-700 ml-auto"
                                >
                                  Cancel Split
                                </button>
                              </div>
                              {/* Percentage total indicator */}
                              {(() => {
                                const total = (farmChanges?.entitySplits || currentSplits).reduce((sum, s) => sum + s.percentage, 0);
                                return total !== 100 ? (
                                  <div className="text-xs text-red-500">
                                    Total: {total}% (must equal 100%)
                                  </div>
                                ) : (
                                  <div className="text-xs text-green-600">Total: 100%</div>
                                );
                              })()}
                            </div>
                          ) : hasSplits ? (
                            // Display existing splits compactly
                            <div className="space-y-0.5">
                              {currentSplits.map((split, idx) => {
                                const entity = entities.find(e => e.id === split.grainEntityId);
                                return (
                                  <div key={idx} className="text-sm">
                                    <span className="font-medium">{entity?.name || 'Unknown'}</span>
                                    <span className="text-gray-500 ml-1">({split.percentage}%)</span>
                                  </div>
                                );
                              })}
                              <button
                                onClick={() => toggleSplitMode(farm.id)}
                                disabled={isSaving}
                                className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                              >
                                Edit Splits
                              </button>
                            </div>
                          ) : (
                            // Single entity mode with split button
                            <div className="flex items-center gap-2">
                              <select
                                value={currentEntityId}
                                onChange={(e) => handleInlineChange(farm.id, 'grainEntityId', e.target.value)}
                                disabled={isSaving}
                                className={`flex-1 rounded-md text-sm py-1.5 pl-2 pr-8 ${
                                  farmHasChanges && farmChanges?.grainEntityId !== undefined
                                    ? 'border-yellow-400 bg-yellow-50 focus:border-yellow-500 focus:ring-yellow-500'
                                    : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
                                } disabled:opacity-50`}
                              >
                                {entities.map(e => (
                                  <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                              </select>
                              {entities.length >= 2 && (
                                <button
                                  onClick={() => toggleSplitMode(farm.id)}
                                  disabled={isSaving}
                                  className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                                  title="Split between multiple entities"
                                >
                                  Split
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.1"
                            value={currentAcres || ''}
                            onChange={(e) => handleInlineChange(farm.id, 'acres', parseFloat(e.target.value) || 0)}
                            disabled={isSaving}
                            className={`block w-24 rounded-md text-sm py-1.5 px-2 ${
                              farmHasChanges && farmChanges?.acres !== undefined
                                ? 'border-yellow-400 bg-yellow-50 focus:border-yellow-500 focus:ring-yellow-500'
                                : 'border-gray-300 focus:border-gray-900 focus:ring-gray-900'
                            } disabled:opacity-50`}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            farm.commodityType === 'CORN' ? 'bg-yellow-100 text-yellow-800' :
                            farm.commodityType === 'SOYBEANS' ? 'bg-green-100 text-green-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {farm.commodityType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{farm.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {farmHasChanges ? (
                            <>
                              <button
                                onClick={() => handleSaveFarm(farm.id)}
                                disabled={isSaving}
                                className="text-green-600 hover:text-green-900 mr-3 font-medium disabled:opacity-50"
                              >
                                {isSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => handleDiscardChanges(farm.id)}
                                disabled={isSaving}
                                className="text-gray-500 hover:text-gray-700 mr-3 disabled:opacity-50"
                              >
                                Discard
                              </button>
                            </>
                          ) : (
                            <a href={`/breakeven/farms/${farm.id}/costs`} className="text-gray-600 hover:text-gray-900 mr-4">
                              Costs
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteFarm(farm.id)}
                            disabled={isSaving}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* John Deere Tab */}
      {activeTab === 'john-deere' && (
        <div className="space-y-6">
          {/* Connection Status Card */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  jdStatus?.isConnected ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <svg className={`w-6 h-6 ${jdStatus?.isConnected ? 'text-green-600' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">John Deere Operations Center</h3>
                  <p className="text-sm text-gray-500">
                    {jdStatus?.isConnected
                      ? `Connected to ${jdStatus.connection?.organizationName || 'your organization'}`
                      : 'Connect to import equipment and fields from Operations Center'}
                  </p>
                </div>
              </div>
              {jdStatus?.isConnected ? (
                <button
                  onClick={handleDisconnectJohnDeere}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 text-sm font-medium"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={handleConnectJohnDeere}
                  disabled={jdLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                >
                  {jdLoading ? 'Connecting...' : 'Connect to John Deere'}
                </button>
              )}
            </div>
          </div>

          {/* Organization Selection */}
          {jdStatus?.isConnected && !jdStatus.connection?.organizationId && jdOrganizations.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Select Organization</h4>
              <div className="space-y-2">
                {jdOrganizations.map(org => (
                  <button
                    key={org.id}
                    onClick={() => handleSelectOrganization(org.id, org.name)}
                    disabled={jdLoading}
                    className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Import Fields Section */}
          {jdStatus?.isConnected && jdStatus.connection?.organizationId && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">Import Fields as Farms</h4>
                <button
                  onClick={loadFields}
                  disabled={loadingFields}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 mr-1.5 ${loadingFields ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loadingFields ? 'Loading...' : 'Refresh Fields'}
                </button>
              </div>

              {loadingFields ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading fields from John Deere...</p>
                </div>
              ) : jdFields.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">{jdFields.length} fields available</span>
                    <button
                      onClick={() => {
                        if (selectedFields.size === jdFields.length) {
                          setSelectedFields(new Set());
                        } else {
                          setSelectedFields(new Set(jdFields.map(f => f.id)));
                        }
                      }}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      {selectedFields.size === jdFields.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                    {jdFields.map(field => (
                      <label key={field.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedFields.has(field.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedFields);
                            if (e.target.checked) {
                              newSelected.add(field.id);
                            } else {
                              newSelected.delete(field.id);
                            }
                            setSelectedFields(newSelected);
                          }}
                          className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900">{field.name}</p>
                          <p className="text-sm text-gray-500">
                            {field.acres ? `${field.acres.toFixed(1)} acres` : 'Acres unknown'}
                            {field.farmName && <span className="ml-2 text-gray-400">({field.farmName})</span>}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleImportFields}
                    disabled={selectedFields.size === 0 || importingFields || entities.length === 0}
                    className="w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                  >
                    {importingFields ? 'Importing...' : `Import ${selectedFields.size} Field(s)`}
                  </button>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Field data will be available once John Deere approves API access.</p>
                  <p className="text-sm mt-2">In the meantime, you can add farms manually.</p>
                </div>
              )}
            </div>
          )}

          {/* Last Sync Info */}
          {jdStatus?.connection?.lastSyncAt && (
            <div className="text-sm text-gray-500 text-center">
              Last synced: {new Date(jdStatus.connection.lastSyncAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <EntityModal
        isOpen={showEntityModal}
        onClose={() => {
          setShowEntityModal(false);
          setSelectedEntity(null);
        }}
        onSave={selectedEntity ? handleUpdateEntity : handleCreateEntity}
        entity={selectedEntity}
      />

      <FarmModal
        isOpen={showFarmModal}
        onClose={() => setShowFarmModal(false)}
        onSave={handleCreateFarm}
        entities={entities}
        defaultYear={currentYear}
      />
    </div>
  );
}
