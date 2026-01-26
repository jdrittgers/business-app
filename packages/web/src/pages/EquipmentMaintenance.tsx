import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { maintenanceApi } from '../api/maintenance.api';
import { loansApi } from '../api/loans.api';
import JohnDeereIntegration from '../components/JohnDeereIntegration';
import {
  EquipmentMaintenance as MaintenanceItem,
  CreateMaintenanceRequest,
  UpdateMaintenanceRequest,
  CompleteMaintenanceRequest,
  MaintenanceType,
  MaintenanceFrequency,
  maintenanceTypeLabels,
  maintenanceFrequencyLabels,
  Equipment,
  JohnDeereMachine,
  EquipmentType
} from '@business-app/shared';

// Modal for creating/editing maintenance schedules
interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateMaintenanceRequest | UpdateMaintenanceRequest) => Promise<void>;
  maintenance?: MaintenanceItem | null;
  equipment: Equipment[];
  selectedEquipmentId?: string;
}

function MaintenanceModal({ isOpen, onClose, onSave, maintenance, equipment, selectedEquipmentId }: MaintenanceModalProps) {
  const [formData, setFormData] = useState<CreateMaintenanceRequest>({
    equipmentId: '',
    title: '',
    maintenanceType: MaintenanceType.GREASE,
    frequency: MaintenanceFrequency.MONTHLY
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (maintenance) {
      setFormData({
        equipmentId: maintenance.equipmentId,
        title: maintenance.title,
        description: maintenance.description,
        maintenanceType: maintenance.maintenanceType,
        frequency: maintenance.frequency,
        nextDueDate: maintenance.nextDueDate ? new Date(maintenance.nextDueDate).toISOString().split('T')[0] : undefined,
        intervalHours: maintenance.intervalHours,
        nextDueHours: maintenance.nextDueHours,
        estimatedCost: maintenance.estimatedCost,
        reminderDays: maintenance.reminderDays,
        autoCreateTask: maintenance.autoCreateTask
      });
    } else {
      setFormData({
        equipmentId: selectedEquipmentId || '',
        title: '',
        maintenanceType: MaintenanceType.GREASE,
        frequency: MaintenanceFrequency.MONTHLY,
        nextDueDate: new Date().toISOString().split('T')[0],
        reminderDays: 7,
        autoCreateTask: true
      });
    }
  }, [maintenance, isOpen, selectedEquipmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save maintenance:', error);
      alert(error instanceof Error ? error.message : 'Failed to save maintenance');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isHoursBased = formData.frequency === MaintenanceFrequency.BY_HOURS;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="glass-backdrop transition-opacity" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom glass-modal text-left overflow-hidden transform transition-all animate-slide-up sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            {maintenance ? 'Edit Maintenance Schedule' : 'Add Maintenance Schedule'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Equipment *</label>
              <select
                value={formData.equipmentId}
                onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
                disabled={!!maintenance}
              >
                <option value="">Select Equipment</option>
                {equipment.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Grease fittings, Change oil"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Additional details or instructions"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type *</label>
                <select
                  value={formData.maintenanceType}
                  onChange={(e) => setFormData({ ...formData, maintenanceType: e.target.value as MaintenanceType })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                >
                  {Object.entries(maintenanceTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Frequency *</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as MaintenanceFrequency })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                >
                  {Object.entries(maintenanceFrequencyLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {isHoursBased ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Interval (Hours) *</label>
                  <input
                    type="number"
                    value={formData.intervalHours || ''}
                    onChange={(e) => setFormData({ ...formData, intervalHours: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., 250"
                    required={isHoursBased}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Next Due Hours</label>
                  <input
                    type="number"
                    value={formData.nextDueHours || ''}
                    onChange={(e) => setFormData({ ...formData, nextDueHours: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., 500"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">Next Due Date</label>
                <input
                  type="date"
                  value={formData.nextDueDate || ''}
                  onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Estimated Cost</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.estimatedCost || ''}
                  onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="$"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Reminder Days</label>
                <input
                  type="number"
                  value={formData.reminderDays || 7}
                  onChange={(e) => setFormData({ ...formData, reminderDays: parseInt(e.target.value) || 7 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Days before due date to send reminder</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="autoCreateTask"
                  type="checkbox"
                  checked={formData.autoCreateTask ?? true}
                  onChange={(e) => setFormData({ ...formData, autoCreateTask: e.target.checked })}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="autoCreateTask" className="font-medium text-gray-700">
                  Auto-create Task
                </label>
                <p className="text-gray-500">
                  Automatically create a task when maintenance is due
                </p>
              </div>
            </div>

            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
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

// Modal for completing maintenance
interface CompleteMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CompleteMaintenanceRequest) => Promise<void>;
  maintenance: MaintenanceItem | null;
}

function CompleteMaintenanceModal({ isOpen, onClose, onSave, maintenance }: CompleteMaintenanceModalProps) {
  const [formData, setFormData] = useState<CompleteMaintenanceRequest>({
    completedDate: new Date().toISOString().split('T')[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        completedDate: new Date().toISOString().split('T')[0],
        hoursAtCompletion: maintenance?.nextDueHours,
        actualCost: maintenance?.estimatedCost,
        notes: ''
      });
    }
  }, [isOpen, maintenance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to complete maintenance:', error);
      alert(error instanceof Error ? error.message : 'Failed to complete maintenance');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !maintenance) return null;

  const isHoursBased = maintenance.frequency === MaintenanceFrequency.BY_HOURS;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="glass-backdrop transition-opacity" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom glass-modal text-left overflow-hidden transform transition-all animate-slide-up sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-1">
            Complete Maintenance
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {maintenance.title} - {maintenance.equipmentName}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Completion Date *</label>
              <input
                type="date"
                value={formData.completedDate || ''}
                onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>

            {isHoursBased && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Hours at Completion</label>
                <input
                  type="number"
                  value={formData.hoursAtCompletion || ''}
                  onChange={(e) => setFormData({ ...formData, hoursAtCompletion: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Current engine hours"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Actual Cost</label>
              <input
                type="number"
                step="0.01"
                value={formData.actualCost || ''}
                onChange={(e) => setFormData({ ...formData, actualCost: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="$"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Any notes about the maintenance performed"
              />
            </div>

            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Completing...' : 'Mark Complete'}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EquipmentMaintenance() {
  const { user } = useAuthStore();
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceItem | null>(null);
  const [selectedEquipmentFilter, setSelectedEquipmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'upcoming' | 'ok'>('all');

  const businessId = user?.businessMemberships?.[0]?.businessId;

  useEffect(() => {
    if (businessId) {
      loadData();
    }
  }, [businessId]);

  const loadData = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const [maintenanceData, equipmentData] = await Promise.all([
        maintenanceApi.getAll(businessId),
        loansApi.getEquipment(businessId)
      ]);
      setMaintenanceItems(maintenanceData);
      setEquipment(equipmentData);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load maintenance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaintenance = async (data: CreateMaintenanceRequest | UpdateMaintenanceRequest) => {
    const createData = data as CreateMaintenanceRequest;
    await maintenanceApi.create(createData.equipmentId, createData);
    await loadData();
  };

  const handleUpdateMaintenance = async (data: CreateMaintenanceRequest | UpdateMaintenanceRequest) => {
    if (!selectedMaintenance) return;
    await maintenanceApi.update(selectedMaintenance.id, data as UpdateMaintenanceRequest);
    await loadData();
  };

  const handleDeleteMaintenance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this maintenance schedule?')) return;
    try {
      await maintenanceApi.delete(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete maintenance:', error);
      alert('Failed to delete maintenance');
    }
  };

  // Import equipment from John Deere
  const handleImportFromJohnDeere = async (machine: JohnDeereMachine) => {
    if (!businessId) return;

    // Determine equipment type based on machine type
    let equipmentType = EquipmentType.OTHER;
    const machineType = (machine.type || '').toLowerCase();
    if (machineType.includes('tractor')) equipmentType = EquipmentType.TRACTOR;
    else if (machineType.includes('combine')) equipmentType = EquipmentType.COMBINE;
    else if (machineType.includes('sprayer')) equipmentType = EquipmentType.SPRAYER;
    else if (machineType.includes('planter')) equipmentType = EquipmentType.PLANTER;

    try {
      await loansApi.createEquipment(businessId, {
        name: machine.name,
        equipmentType,
        make: machine.make,
        model: machine.model,
        serialNumber: machine.serialNumber,
        year: machine.modelYear
      });
      alert(`Imported ${machine.name} successfully!`);
      await loadData();
    } catch (error: any) {
      console.error('Failed to import equipment:', error);
      alert(error.message || 'Failed to import equipment');
    }
  };

  const handleCompleteMaintenance = async (data: CompleteMaintenanceRequest) => {
    if (!selectedMaintenance) return;
    await maintenanceApi.complete(selectedMaintenance.id, data);
    await loadData();
  };

  // Get current engine hours for an equipment item
  const getEquipmentHours = (equipmentId: string): number | null => {
    const equip = equipment.find(e => e.id === equipmentId);
    return equip?.currentEngineHours ?? null;
  };

  // Determine status of maintenance item
  const getMaintenanceStatus = (item: MaintenanceItem): 'overdue' | 'upcoming' | 'ok' => {
    const now = new Date();

    // Check hours-based maintenance
    if (item.frequency === MaintenanceFrequency.BY_HOURS && item.nextDueHours) {
      const currentHours = getEquipmentHours(item.equipmentId);
      if (currentHours !== null) {
        if (currentHours >= item.nextDueHours) return 'overdue';
        // Consider "upcoming" if within 10% of due hours or within reminder threshold
        const hoursRemaining = item.nextDueHours - currentHours;
        const reminderHours = item.intervalHours ? item.intervalHours * 0.1 : 50;
        if (hoursRemaining <= reminderHours) return 'upcoming';
      }
    }

    // Check date-based maintenance
    if (item.nextDueDate) {
      const dueDate = new Date(item.nextDueDate);
      if (dueDate < now) return 'overdue';
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - item.reminderDays);
      if (now >= reminderDate) return 'upcoming';
    }
    return 'ok';
  };

  // Filter items
  const filteredItems = maintenanceItems.filter(item => {
    if (selectedEquipmentFilter !== 'all' && item.equipmentId !== selectedEquipmentFilter) return false;
    if (statusFilter !== 'all' && getMaintenanceStatus(item) !== statusFilter) return false;
    return true;
  });

  // Calculate summary stats
  const totalItems = maintenanceItems.length;
  const overdueCount = maintenanceItems.filter(item => getMaintenanceStatus(item) === 'overdue').length;
  const upcomingCount = maintenanceItems.filter(item => getMaintenanceStatus(item) === 'upcoming').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Equipment Maintenance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and schedule maintenance for your equipment.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <button
            onClick={() => {
              setSelectedMaintenance(null);
              setShowMaintenanceModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Maintenance
          </button>
        </div>
      </div>

      {/* John Deere Integration */}
      {businessId && (
        <JohnDeereIntegration
          businessId={businessId}
          onImportEquipment={handleImportFromJohnDeere}
          onSync={loadData}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Items</dt>
                  <dd className="text-lg font-medium text-gray-900">{totalItems}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:bg-red-50"
          onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Overdue</dt>
                  <dd className="text-lg font-medium text-red-600">{overdueCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:bg-orange-50"
          onClick={() => setStatusFilter(statusFilter === 'upcoming' ? 'all' : 'upcoming')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Due Soon</dt>
                  <dd className="text-lg font-medium text-orange-600">{upcomingCount}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 shadow rounded-lg">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
            <select
              value={selectedEquipmentFilter}
              onChange={(e) => setSelectedEquipmentFilter(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Equipment</option>
              {equipment.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="overdue">Overdue</option>
              <option value="upcoming">Due Soon</option>
              <option value="ok">Up to Date</option>
            </select>
          </div>
          {(selectedEquipmentFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSelectedEquipmentFilter('all');
                setStatusFilter('all');
              }}
              className="mt-6 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Maintenance List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No maintenance items</h3>
          <p className="mt-1 text-sm text-gray-500">
            {maintenanceItems.length > 0
              ? 'No items match your filters.'
              : 'Add a maintenance schedule to track equipment maintenance.'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {filteredItems.map((item) => {
              const status = getMaintenanceStatus(item);
              const statusColors = {
                overdue: 'bg-red-100 text-red-800',
                upcoming: 'bg-orange-100 text-orange-800',
                ok: 'bg-green-100 text-green-800'
              };
              const statusLabels = {
                overdue: 'Overdue',
                upcoming: 'Due Soon',
                ok: 'Up to Date'
              };

              return (
                <li key={item.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
                          {statusLabels[status]}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {maintenanceTypeLabels[item.maintenanceType]}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>{item.equipmentName}</span>
                        <span>|</span>
                        <span>{maintenanceFrequencyLabels[item.frequency]}</span>
                        {item.nextDueDate && (
                          <>
                            <span>|</span>
                            <span>Due: {new Date(item.nextDueDate).toLocaleDateString()}</span>
                          </>
                        )}
                        {item.nextDueHours && (
                          <>
                            <span>|</span>
                            <span>Due at {item.nextDueHours.toLocaleString()} hrs</span>
                            {(() => {
                              const currentHours = getEquipmentHours(item.equipmentId);
                              if (currentHours !== null) {
                                const remaining = item.nextDueHours - currentHours;
                                return (
                                  <span className={remaining <= 0 ? 'text-red-600 font-medium' : remaining <= 50 ? 'text-orange-600' : 'text-green-600'}>
                                    ({currentHours.toLocaleString()} current, {remaining > 0 ? `${remaining.toLocaleString()} remaining` : `${Math.abs(remaining).toLocaleString()} overdue`})
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </>
                        )}
                      </div>
                      {item.lastCompletedDate && (
                        <p className="mt-1 text-xs text-gray-400">
                          Last completed: {new Date(item.lastCompletedDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedMaintenance(item);
                          setShowCompleteModal(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => {
                          setSelectedMaintenance(item);
                          setShowMaintenanceModal(true);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMaintenance(item.id)}
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

      {/* Modals */}
      <MaintenanceModal
        isOpen={showMaintenanceModal}
        onClose={() => {
          setShowMaintenanceModal(false);
          setSelectedMaintenance(null);
        }}
        onSave={selectedMaintenance ? handleUpdateMaintenance : handleCreateMaintenance}
        maintenance={selectedMaintenance}
        equipment={equipment}
        selectedEquipmentId={selectedEquipmentFilter !== 'all' ? selectedEquipmentFilter : undefined}
      />

      <CompleteMaintenanceModal
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setSelectedMaintenance(null);
        }}
        onSave={handleCompleteMaintenance}
        maintenance={selectedMaintenance}
      />
    </div>
  );
}
