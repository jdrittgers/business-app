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
  const [isAvailableForSale, setIsAvailableForSale] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
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
      setIsAvailableForSale(bin.isAvailableForSale || false);
      setTargetPrice(bin.targetPrice ? bin.targetPrice.toString() : '');
      setNotes(bin.notes || '');
    } else {
      // Creating new bin
      setGrainEntityId(grainEntities[0]?.id || '');
      setName('');
      setCapacity('');
      setCurrentBushels('0');
      setCommodityType('CORN');
      setCropYear(new Date().getFullYear().toString());
      setIsAvailableForSale(false);
      setTargetPrice('');
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
        isAvailableForSale: bin ? isAvailableForSale : undefined, // Only for existing bins
        targetPrice: bin && targetPrice ? parseFloat(targetPrice) : undefined,
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

                {/* Contracted Bushels Display (only when editing) */}
                {bin && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Inventory Status</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Bushels:</span>
                        <div className="font-semibold text-gray-900">
                          {bin.currentBushels.toLocaleString()} bu
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Contracted:</span>
                        <div className="font-semibold text-blue-600">
                          {bin.contractedBushels.toLocaleString()} bu
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Available:</span>
                        <div className="font-semibold text-green-600">
                          {(bin.currentBushels - bin.contractedBushels).toLocaleString()} bu
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Capacity:</span>
                        <div className="font-semibold text-gray-900">
                          {bin.capacity.toLocaleString()} bu
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Available for Sale Toggle (only when editing) */}
                {bin && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label htmlFor="availableForSale" className="block text-sm font-medium text-gray-700">
                          Available for Sale in Marketplace
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          When enabled, retailers can see this bin and submit purchase offers
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAvailableForSale(!isAvailableForSale)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          isAvailableForSale ? 'bg-green-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            isAvailableForSale ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    {isAvailableForSale && (
                      <>
                        <div className="mt-3 p-3 bg-green-50 rounded-md">
                          <div className="flex">
                            <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <p className="ml-3 text-xs text-green-700">
                              This bin is visible to retailers in the marketplace
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <label htmlFor="targetPrice" className="block text-sm font-medium text-gray-700">
                            Target Cash Price ($/bushel)
                          </label>
                          <input
                            type="number"
                            id="targetPrice"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            placeholder="e.g., 4.50"
                            min="0"
                            step="0.01"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Optional: Set your target price for retailers to see in the marketplace
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

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
