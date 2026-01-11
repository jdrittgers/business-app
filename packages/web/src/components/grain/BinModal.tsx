import { useState, useEffect, FormEvent } from 'react';
import { GrainBin } from '@business-app/shared';

interface BinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (binData: any) => Promise<void>;
  onDelete?: () => Promise<void>;
  bin?: GrainBin | null;
  grainEntities: Array<{ id: string; name: string }>;
}

export default function BinModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  bin,
  grainEntities
}: BinModalProps) {
  const [grainEntityId, setGrainEntityId] = useState('');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [currentBushels, setCurrentBushels] = useState('');
  const [commodityType, setCommodityType] = useState<'CORN' | 'SOYBEANS' | 'WHEAT'>('CORN');
  const [cropYear, setCropYear] = useState(new Date().getFullYear().toString());
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bin) {
      // Editing existing bin
      setGrainEntityId(bin.grainEntityId);
      setName(bin.name);
      setCapacity(bin.capacity.toString());
      setCurrentBushels(bin.currentBushels.toString());
      setCommodityType(bin.commodityType);
      setCropYear(bin.cropYear.toString());
      setNotes(bin.notes || '');
    } else {
      // Creating new bin
      setGrainEntityId(grainEntities[0]?.id || '');
      setName('');
      setCapacity('');
      setCurrentBushels('0');
      setCommodityType('CORN');
      setCropYear(new Date().getFullYear().toString());
      setNotes('');
    }
  }, [bin, grainEntities]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const binData = {
        grainEntityId,
        name,
        capacity: parseFloat(capacity),
        currentBushels: bin ? undefined : parseFloat(currentBushels), // Only for new bins
        commodityType,
        cropYear: parseInt(cropYear),
        notes: notes || undefined
      };

      await onSave(binData);
      onClose();
    } catch (error) {
      console.error('Error saving bin:', error);
      alert(error instanceof Error ? error.message : 'Failed to save bin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm('Are you sure you want to delete this bin?')) return;

    setIsSubmitting(true);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting bin:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete bin');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="sm:flex sm:items-start">
            <div className="w-full mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {bin ? 'Edit Grain Bin' : 'Create New Grain Bin'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Grain Entity */}
                <div>
                  <label htmlFor="grainEntity" className="block text-sm font-medium text-gray-700">
                    Grain Entity *
                  </label>
                  <select
                    id="grainEntity"
                    value={grainEntityId}
                    onChange={(e) => setGrainEntityId(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                    disabled={!!bin} // Can't change grain entity on edit
                  >
                    {grainEntities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bin Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Bin Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="North Bin, West Storage, etc."
                    required
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                    Capacity (bushels) *
                  </label>
                  <input
                    type="number"
                    id="capacity"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="10000"
                    min="1"
                    step="0.01"
                    required
                  />
                </div>

                {/* Initial Bushels (only for new bins) */}
                {!bin && (
                  <div>
                    <label htmlFor="currentBushels" className="block text-sm font-medium text-gray-700">
                      Initial Bushels
                    </label>
                    <input
                      type="number"
                      id="currentBushels"
                      value={currentBushels}
                      onChange={(e) => setCurrentBushels(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}

                {/* Commodity Type */}
                <div>
                  <label htmlFor="commodityType" className="block text-sm font-medium text-gray-700">
                    Commodity Type *
                  </label>
                  <select
                    id="commodityType"
                    value={commodityType}
                    onChange={(e) => setCommodityType(e.target.value as 'CORN' | 'SOYBEANS' | 'WHEAT')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    required
                  >
                    <option value="CORN">Corn</option>
                    <option value="SOYBEANS">Soybeans</option>
                    <option value="WHEAT">Wheat</option>
                  </select>
                </div>

                {/* Crop Year */}
                <div>
                  <label htmlFor="cropYear" className="block text-sm font-medium text-gray-700">
                    Crop Year *
                  </label>
                  <input
                    type="number"
                    id="cropYear"
                    value={cropYear}
                    onChange={(e) => setCropYear(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="2025"
                    min="2020"
                    max="2030"
                    required
                  />
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Optional notes..."
                  />
                </div>

                {/* Buttons */}
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
                  {bin && onDelete && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="inline-flex justify-center w-full rounded-md border border-red-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm disabled:opacity-50"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className={`inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50 ${bin && onDelete ? '' : 'sm:col-span-1'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : bin ? 'Update Bin' : 'Create Bin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
