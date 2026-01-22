import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { loansApi } from '../api/loans.api';
import {
  LandParcel,
  LandLoan,
  CreateLandParcelRequest,
  CreateLandLoanRequest,
  PaymentFrequency
} from '@business-app/shared';

// Modal component for creating/editing land parcels
interface ParcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateLandParcelRequest) => Promise<void>;
  parcel?: LandParcel | null;
}

function ParcelModal({ isOpen, onClose, onSave, parcel }: ParcelModalProps) {
  const [formData, setFormData] = useState<CreateLandParcelRequest>({
    name: '',
    totalAcres: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (parcel) {
      setFormData({
        name: parcel.name,
        totalAcres: parcel.totalAcres,
        legalDescription: parcel.legalDescription,
        county: parcel.county,
        state: parcel.state,
        purchaseDate: parcel.purchaseDate ? new Date(parcel.purchaseDate).toISOString().split('T')[0] : undefined,
        purchasePrice: parcel.purchasePrice,
        notes: parcel.notes
      });
    } else {
      setFormData({ name: '', totalAcres: 0 });
    }
  }, [parcel, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save parcel:', error);
      alert(error instanceof Error ? error.message : 'Failed to save parcel');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            {parcel ? 'Edit Land Parcel' : 'Add Land Parcel'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Acres *</label>
              <input
                type="number"
                step="0.01"
                value={formData.totalAcres}
                onChange={(e) => setFormData({ ...formData, totalAcres: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">County</label>
                <input
                  type="text"
                  value={formData.county || ''}
                  onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">State</label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Legal Description</label>
              <textarea
                value={formData.legalDescription || ''}
                onChange={(e) => setFormData({ ...formData, legalDescription: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                <input
                  type="date"
                  value={formData.purchaseDate || ''}
                  onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Purchase Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice || ''}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || undefined })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Modal component for creating/editing land loans
interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateLandLoanRequest) => Promise<void>;
  loan?: LandLoan | null;
}

function LoanModal({ isOpen, onClose, onSave, loan }: LoanModalProps) {
  const [useSimpleMode, setUseSimpleMode] = useState(true);
  const [formData, setFormData] = useState<CreateLandLoanRequest>({
    lender: '',
    useSimpleMode: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (loan) {
      setUseSimpleMode(loan.useSimpleMode);
      setFormData({
        lender: loan.lender,
        loanNumber: loan.loanNumber,
        useSimpleMode: loan.useSimpleMode,
        principal: loan.principal,
        interestRate: loan.interestRate,
        termMonths: loan.termMonths,
        startDate: loan.startDate ? new Date(loan.startDate).toISOString().split('T')[0] : undefined,
        paymentFrequency: loan.paymentFrequency,
        monthlyPayment: loan.monthlyPayment,
        remainingBalance: loan.remainingBalance,
        annualPayment: loan.annualPayment,
        notes: loan.notes
      });
    } else {
      setUseSimpleMode(true);
      setFormData({ lender: '', useSimpleMode: true });
    }
  }, [loan, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({ ...formData, useSimpleMode });
      onClose();
    } catch (error) {
      console.error('Failed to save loan:', error);
      alert(error instanceof Error ? error.message : 'Failed to save loan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            {loan ? 'Edit Land Loan' : 'Add Land Loan'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Lender *</label>
              <input
                type="text"
                value={formData.lender}
                onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Farm Credit, Local Bank"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Loan Number</label>
              <input
                type="text"
                value={formData.loanNumber || ''}
                onChange={(e) => setFormData({ ...formData, loanNumber: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <span className="text-sm font-medium text-gray-700">Tracking Mode</span>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setUseSimpleMode(true)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    useSimpleMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Simple
                </button>
                <button
                  type="button"
                  onClick={() => setUseSimpleMode(false)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    !useSimpleMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Full Amortization
                </button>
              </div>
            </div>

            {useSimpleMode ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Annual Payment *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.annualPayment || ''}
                  onChange={(e) => setFormData({ ...formData, annualPayment: parseFloat(e.target.value) || undefined })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Total annual payment amount"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Interest is estimated as ~40% of annual payment</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Principal *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.principal || ''}
                      onChange={(e) => setFormData({ ...formData, principal: parseFloat(e.target.value) || undefined })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Interest Rate *</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.interestRate ? formData.interestRate * 100 : ''}
                      onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) / 100 || undefined })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="e.g., 5.5"
                      required
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Term (Months)</label>
                    <input
                      type="number"
                      value={formData.termMonths || ''}
                      onChange={(e) => setFormData({ ...formData, termMonths: parseInt(e.target.value) || undefined })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate || ''}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Frequency</label>
                    <select
                      value={formData.paymentFrequency || ''}
                      onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value as PaymentFrequency || undefined })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="SEMI_ANNUAL">Semi-Annual</option>
                      <option value="ANNUAL">Annual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monthly Payment</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monthlyPayment || ''}
                      onChange={(e) => setFormData({ ...formData, monthlyPayment: parseFloat(e.target.value) || undefined })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Remaining Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.remainingBalance || ''}
                    onChange={(e) => setFormData({ ...formData, remainingBalance: parseFloat(e.target.value) || undefined })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Defaults to principal if not specified"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Payment Modal
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { paymentDate: string; totalAmount: number; principalAmount: number; interestAmount: number; notes?: string }) => Promise<void>;
  loan: LandLoan | null;
}

function PaymentModal({ isOpen, onClose, onSave, loan }: PaymentModalProps) {
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    totalAmount: 0,
    principalAmount: 0,
    interestAmount: 0,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (loan?.monthlyPayment) {
      setFormData(prev => ({
        ...prev,
        totalAmount: loan.monthlyPayment || 0
      }));
    }
  }, [loan, isOpen]);

  const handleTotalChange = (total: number) => {
    // Auto-split based on interest rate estimate
    const rate = loan?.interestRate || 0.05;
    const balance = loan?.remainingBalance || 0;
    const monthlyInterest = balance * rate / 12;
    const interestPortion = Math.min(monthlyInterest, total);
    const principalPortion = total - interestPortion;

    setFormData({
      ...formData,
      totalAmount: total,
      interestAmount: interestPortion,
      principalAmount: principalPortion
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to record payment:', error);
      alert(error instanceof Error ? error.message : 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !loan) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Record Payment - {loan.lender}
          </h3>
          <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm">
            <p><span className="font-medium">Remaining Balance:</span> ${loan.remainingBalance?.toLocaleString()}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Date *</label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total Amount *</label>
              <input
                type="number"
                step="0.01"
                value={formData.totalAmount || ''}
                onChange={(e) => handleTotalChange(parseFloat(e.target.value) || 0)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Principal Portion *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.principalAmount || ''}
                  onChange={(e) => setFormData({ ...formData, principalAmount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Interest Portion *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.interestAmount || ''}
                  onChange={(e) => setFormData({ ...formData, interestAmount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LandParcels() {
  const { user } = useAuthStore();
  const [parcels, setParcels] = useState<LandParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showParcelModal, setShowParcelModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<LandParcel | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<LandLoan | null>(null);
  const [expandedParcel, setExpandedParcel] = useState<string | null>(null);

  const businessId = user?.businessMemberships?.[0]?.businessId;

  useEffect(() => {
    if (businessId) {
      loadParcels();
    }
  }, [businessId]);

  const loadParcels = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const data = await loansApi.getLandParcels(businessId);
      setParcels(data);
    } catch (error) {
      console.error('Failed to load land parcels:', error);
      alert('Failed to load land parcels');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateParcel = async (data: CreateLandParcelRequest) => {
    if (!businessId) return;
    await loansApi.createLandParcel(businessId, data);
    await loadParcels();
  };

  const handleUpdateParcel = async (data: CreateLandParcelRequest) => {
    if (!businessId || !selectedParcel) return;
    await loansApi.updateLandParcel(businessId, selectedParcel.id, data);
    await loadParcels();
  };

  const handleDeleteParcel = async (parcelId: string) => {
    if (!businessId) return;
    if (!confirm('Are you sure you want to delete this land parcel?')) return;
    try {
      await loansApi.deleteLandParcel(businessId, parcelId);
      await loadParcels();
    } catch (error) {
      console.error('Failed to delete parcel:', error);
      alert('Failed to delete parcel');
    }
  };

  const handleCreateLoan = async (data: CreateLandLoanRequest) => {
    if (!selectedParcel) return;
    await loansApi.createLandLoan(selectedParcel.id, data);
    await loadParcels();
  };

  const handleUpdateLoan = async (data: CreateLandLoanRequest) => {
    if (!selectedLoan) return;
    await loansApi.updateLandLoan(selectedLoan.id, data);
    await loadParcels();
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm('Are you sure you want to delete this loan?')) return;
    try {
      await loansApi.deleteLandLoan(loanId);
      await loadParcels();
    } catch (error) {
      console.error('Failed to delete loan:', error);
      alert('Failed to delete loan');
    }
  };

  const handleRecordPayment = async (data: { paymentDate: string; totalAmount: number; principalAmount: number; interestAmount: number; notes?: string }) => {
    if (!selectedLoan) return;
    await loansApi.recordLandLoanPayment(selectedLoan.id, data);
    await loadParcels();
  };

  // Calculate totals
  const totalAcres = parcels.reduce((sum, p) => sum + p.totalAcres, 0);
  const totalLoanBalance = parcels.reduce((sum, p) => sum + (p.totalLoanBalance || 0), 0);
  const totalAnnualInterest = parcels.reduce((sum, p) => sum + (p.annualInterestExpense || 0), 0);

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
          <h1 className="text-2xl font-semibold text-gray-900">Land Parcels</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your land parcels and associated loans for break-even calculations.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedParcel(null);
            setShowParcelModal(true);
          }}
          className="mt-3 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add Land Parcel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Acres</dt>
                  <dd className="text-lg font-medium text-gray-900">{totalAcres.toLocaleString()} ac</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Loan Balance</dt>
                  <dd className="text-lg font-medium text-gray-900">${totalLoanBalance.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Annual Interest</dt>
                  <dd className="text-lg font-medium text-red-600">${totalAnnualInterest.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Parcels List */}
      {parcels.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No land parcels</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a land parcel.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {parcels.map((parcel) => (
              <li key={parcel.id}>
                <div
                  className="px-4 py-4 sm:px-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedParcel(expandedParcel === parcel.id ? null : parcel.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg
                        className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedParcel === parcel.id ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{parcel.name}</p>
                        <p className="text-sm text-gray-500">
                          {parcel.totalAcres.toLocaleString()} acres
                          {parcel.county && ` - ${parcel.county}`}
                          {parcel.state && `, ${parcel.state}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-900">${(parcel.totalLoanBalance || 0).toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Loan Balance</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-red-600">${(parcel.annualInterestExpense || 0).toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Annual Interest</p>
                      </div>
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedParcel(parcel);
                            setShowParcelModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteParcel(parcel.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Loans Section */}
                {expandedParcel === parcel.id && (
                  <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-900">Loans</h4>
                      <button
                        onClick={() => {
                          setSelectedParcel(parcel);
                          setSelectedLoan(null);
                          setShowLoanModal(true);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-900"
                      >
                        + Add Loan
                      </button>
                    </div>

                    {parcel.landLoans && parcel.landLoans.length > 0 ? (
                      <div className="space-y-3">
                        {parcel.landLoans.map((loan) => (
                          <div key={loan.id} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{loan.lender}</p>
                                <p className="text-xs text-gray-500">
                                  {loan.useSimpleMode
                                    ? `Annual Payment: $${(loan.annualPayment || 0).toLocaleString()}`
                                    : `${(loan.interestRate ? loan.interestRate * 100 : 0).toFixed(2)}% Rate • $${(loan.remainingBalance || 0).toLocaleString()} Balance`}
                                </p>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-right">
                                  <p className="text-sm text-red-600">${(loan.annualInterestExpense || 0).toLocaleString()}</p>
                                  <p className="text-xs text-gray-500">Est. Interest/yr</p>
                                </div>
                                {!loan.useSimpleMode && (
                                  <button
                                    onClick={() => {
                                      setSelectedLoan(loan);
                                      setShowPaymentModal(true);
                                    }}
                                    className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                                  >
                                    Payment
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedParcel(parcel);
                                    setSelectedLoan(loan);
                                    setShowLoanModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900 text-sm"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteLoan(loan.id)}
                                  className="text-red-600 hover:text-red-900 text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No loans for this parcel</p>
                    )}

                    {/* Associated Farms */}
                    {parcel.farms && parcel.farms.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Associated Farms</h4>
                        <div className="flex flex-wrap gap-2">
                          {parcel.farms.map((farm: any) => (
                            <span key={farm.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {farm.name} ({farm.year}) - {farm.acres} ac
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modals */}
      <ParcelModal
        isOpen={showParcelModal}
        onClose={() => {
          setShowParcelModal(false);
          setSelectedParcel(null);
        }}
        onSave={selectedParcel ? handleUpdateParcel : handleCreateParcel}
        parcel={selectedParcel}
      />

      <LoanModal
        isOpen={showLoanModal}
        onClose={() => {
          setShowLoanModal(false);
          setSelectedLoan(null);
        }}
        onSave={selectedLoan ? handleUpdateLoan : handleCreateLoan}
        loan={selectedLoan}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedLoan(null);
        }}
        onSave={handleRecordPayment}
        loan={selectedLoan}
      />
    </div>
  );
}
