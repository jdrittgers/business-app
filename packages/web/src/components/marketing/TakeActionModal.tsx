import { useState, useEffect } from 'react';
import {
  MarketingSignal,
  MarketingSignalType,
  ContractType,
  CropYear,
  GrainEntity,
  CreateGrainContractRequest
} from '@business-app/shared';
import { grainContractsApi } from '../../api/grain-contracts.api';

interface TakeActionModalProps {
  signal: MarketingSignal;
  businessId: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Map signal type to contract type
function getContractType(signalType: MarketingSignalType): ContractType {
  switch (signalType) {
    case MarketingSignalType.CASH_SALE:
      return ContractType.CASH;
    case MarketingSignalType.BASIS_CONTRACT:
      return ContractType.BASIS;
    case MarketingSignalType.HTA_RECOMMENDATION:
      return ContractType.HTA;
    default:
      return ContractType.CASH;
  }
}

export default function TakeActionModal({
  signal,
  businessId,
  onClose,
  onSuccess
}: TakeActionModalProps) {
  const [grainEntities, setGrainEntities] = useState<GrainEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [contractType, setContractType] = useState<ContractType>(
    getContractType(signal.signalType)
  );
  const [cropYear, setCropYear] = useState<CropYear>(
    signal.isNewCrop ? CropYear.NEW_CROP : CropYear.OLD_CROP
  );
  const [year, setYear] = useState<number>(signal.cropYear || new Date().getFullYear());
  const [bushels, setBushels] = useState<string>(
    signal.recommendedBushels?.toString() || ''
  );
  const [buyer, setBuyer] = useState<string>('');
  const [cashPrice, setCashPrice] = useState<string>(signal.currentPrice.toFixed(2));
  const [deliveryStartDate, setDeliveryStartDate] = useState<string>('');
  const [deliveryEndDate, setDeliveryEndDate] = useState<string>('');
  const [notes, setNotes] = useState<string>(
    `Created from AI signal: ${signal.title}`
  );

  useEffect(() => {
    loadGrainEntities();
  }, []);

  const loadGrainEntities = async () => {
    try {
      const entities = await grainContractsApi.getGrainEntities(businessId);
      setGrainEntities(entities);
      if (entities.length > 0) {
        setSelectedEntityId(entities[0].id);
      }
    } catch (err) {
      console.error('Failed to load grain entities:', err);
      setError('Failed to load grain entities');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEntityId) {
      setError('Please select a grain entity');
      return;
    }

    if (!bushels || parseFloat(bushels) <= 0) {
      setError('Please enter a valid bushel amount');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const contractData: CreateGrainContractRequest = {
        grainEntityId: selectedEntityId,
        contractType,
        cropYear,
        year,
        commodityType: signal.commodityType,
        buyer: buyer || 'TBD',
        totalBushels: parseFloat(bushels),
        cashPrice: contractType === ContractType.CASH ? parseFloat(cashPrice) : undefined,
        deliveryStartDate: deliveryStartDate || undefined,
        deliveryEndDate: deliveryEndDate || undefined,
        notes
      };

      await grainContractsApi.createContract(contractData);
      onSuccess();
    } catch (err: any) {
      console.error('Failed to create contract:', err);
      setError(err.response?.data?.error || 'Failed to create contract');
    } finally {
      setSaving(false);
    }
  };

  // Check if signal type is compatible with creating a contract
  const isCompatibleSignal = [
    MarketingSignalType.CASH_SALE,
    MarketingSignalType.BASIS_CONTRACT,
    MarketingSignalType.HTA_RECOMMENDATION
  ].includes(signal.signalType);

  if (!isCompatibleSignal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cannot Create Contract</h2>
          <p className="text-gray-600 mb-4">
            This signal type ({signal.signalType}) cannot be converted to a contract automatically.
            Please create the contract manually if needed.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold text-gray-900">Create Contract from Signal</h2>
          <p className="text-sm text-gray-500 mt-1">{signal.title}</p>
        </div>

        {/* Signal Summary */}
        <div className="bg-blue-50 border-b border-blue-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-3 h-3 rounded-full ${
              signal.commodityType === 'CORN' ? 'bg-yellow-500' :
              signal.commodityType === 'SOYBEANS' ? 'bg-green-500' : 'bg-amber-600'
            }`}></span>
            <span className="font-medium">{signal.commodityType}</span>
            <span className="text-gray-500">-</span>
            <span className="text-sm text-gray-600">{signal.summary}</span>
          </div>
          {signal.recommendedBushels && (
            <p className="text-sm text-blue-700">
              Recommended: {signal.recommendedBushels.toLocaleString()} bushels at ${signal.currentPrice.toFixed(2)}/bu
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading grain entities...
            </div>
          ) : grainEntities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No grain entities found. Please create one first.
            </div>
          ) : (
            <>
              {/* Grain Entity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grain Entity
                </label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  {grainEntities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contract Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Type
                </label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value as ContractType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value={ContractType.CASH}>Cash</option>
                  <option value={ContractType.BASIS}>Basis</option>
                  <option value={ContractType.HTA}>HTA</option>
                </select>
              </div>

              {/* Crop Year */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Crop Year
                  </label>
                  <select
                    value={cropYear}
                    onChange={(e) => setCropYear(e.target.value as CropYear)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  >
                    <option value={CropYear.NEW_CROP}>New Crop</option>
                    <option value={CropYear.OLD_CROP}>Old Crop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
              </div>

              {/* Bushels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bushels
                </label>
                <input
                  type="number"
                  value={bushels}
                  onChange={(e) => setBushels(e.target.value)}
                  placeholder="Enter bushels"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>

              {/* Buyer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buyer
                </label>
                <input
                  type="text"
                  value={buyer}
                  onChange={(e) => setBuyer(e.target.value)}
                  placeholder="Enter buyer name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>

              {/* Cash Price (for cash contracts) */}
              {contractType === ContractType.CASH && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cash Price ($/bu)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashPrice}
                    onChange={(e) => setCashPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
              )}

              {/* Delivery Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Start
                  </label>
                  <input
                    type="date"
                    value={deliveryStartDate}
                    onChange={(e) => setDeliveryStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery End
                  </label>
                  <input
                    type="date"
                    value={deliveryEndDate}
                    onChange={(e) => setDeliveryEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                />
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loading || grainEntities.length === 0}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
            >
              {saving ? 'Creating...' : 'Create Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
