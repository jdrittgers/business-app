import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { loansApi } from '../api/loans.api';
import {
  Equipment,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  EquipmentLoan,
  CreateEquipmentLoanRequest,
  UpdateEquipmentLoanRequest,
  EquipmentType,
  EquipmentFinancingType,
  PaymentFrequency,
  CreateEquipmentLoanPaymentRequest
} from '@business-app/shared';

const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  [EquipmentType.TRACTOR]: 'Tractor',
  [EquipmentType.COMBINE]: 'Combine',
  [EquipmentType.PLANTER]: 'Planter',
  [EquipmentType.SPRAYER]: 'Sprayer',
  [EquipmentType.GRAIN_CART]: 'Grain Cart',
  [EquipmentType.SEMI_TRUCK]: 'Semi Truck',
  [EquipmentType.TRAILER]: 'Trailer',
  [EquipmentType.TILLAGE]: 'Tillage',
  [EquipmentType.OTHER]: 'Other'
};

// Modal for creating/editing equipment
interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateEquipmentRequest | UpdateEquipmentRequest) => Promise<void>;
  equipment?: Equipment | null;
}

function EquipmentModal({ isOpen, onClose, onSave, equipment }: EquipmentModalProps) {
  const [formData, setFormData] = useState<CreateEquipmentRequest>({
    name: '',
    equipmentType: EquipmentType.TRACTOR
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (equipment) {
      setFormData({
        name: equipment.name,
        equipmentType: equipment.equipmentType,
        year: equipment.year,
        make: equipment.make,
        model: equipment.model,
        serialNumber: equipment.serialNumber,
        purchaseDate: equipment.purchaseDate ? new Date(equipment.purchaseDate).toISOString().split('T')[0] : undefined,
        purchasePrice: equipment.purchasePrice,
        currentValue: equipment.currentValue,
        notes: equipment.notes
      });
    } else {
      setFormData({
        name: '',
        equipmentType: EquipmentType.TRACTOR
      });
    }
  }, [equipment, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save equipment:', error);
      alert(error instanceof Error ? error.message : 'Failed to save equipment');
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
            {equipment ? 'Edit Equipment' : 'Add Equipment'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., John Deere 8R 410"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Type *</label>
                <select
                  value={formData.equipmentType}
                  onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value as EquipmentType })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                >
                  {Object.entries(EQUIPMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Year</label>
                <input
                  type="number"
                  value={formData.year || ''}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., 2022"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Make</label>
                <input
                  type="text"
                  value={formData.make || ''}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., John Deere"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Model</label>
                <input
                  type="text"
                  value={formData.model || ''}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., 8R 410"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Serial Number</label>
              <input
                type="text"
                value={formData.serialNumber || ''}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Value</label>
              <input
                type="number"
                step="0.01"
                value={formData.currentValue || ''}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
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

// Modal for creating/editing equipment loans
interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateEquipmentLoanRequest | UpdateEquipmentLoanRequest) => Promise<void>;
  loan?: EquipmentLoan | null;
  equipmentName: string;
  equipmentPurchaseDate?: string;
}

function LoanModal({ isOpen, onClose, onSave, loan, equipmentName, equipmentPurchaseDate }: LoanModalProps) {
  const [formData, setFormData] = useState<CreateEquipmentLoanRequest & Partial<Pick<UpdateEquipmentLoanRequest, 'annualInterestOverride' | 'annualPrincipalOverride'>>>({
    lender: '',
    financingType: EquipmentFinancingType.LOAN,
    useSimpleMode: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOverrides, setShowOverrides] = useState(false);

  useEffect(() => {
    if (loan) {
      setFormData({
        lender: loan.lender,
        loanNumber: loan.loanNumber,
        financingType: loan.financingType,
        useSimpleMode: loan.useSimpleMode,
        principal: loan.principal,
        interestRate: loan.interestRate,
        termMonths: loan.termMonths,
        startDate: loan.startDate ? new Date(loan.startDate).toISOString().split('T')[0] : undefined,
        paymentFrequency: loan.paymentFrequency,
        monthlyPayment: loan.monthlyPayment,
        remainingBalance: loan.remainingBalance,
        annualPayment: loan.annualPayment,
        leaseEndDate: loan.leaseEndDate ? new Date(loan.leaseEndDate).toISOString().split('T')[0] : undefined,
        residualValue: loan.residualValue,
        downPayment: loan.downPayment,
        downPaymentDate: loan.downPaymentDate ? new Date(loan.downPaymentDate).toISOString().split('T')[0] : undefined,
        nextPaymentDate: loan.nextPaymentDate ? new Date(loan.nextPaymentDate).toISOString().split('T')[0] : undefined,
        includeInBreakeven: loan.includeInBreakeven,
        notes: loan.notes
      });
      // Show overrides section if any override is set
      setShowOverrides(!!loan.annualInterestOverride || !!loan.annualPrincipalOverride);
    } else {
      // Auto-populate start date from equipment purchase date
      setFormData({
        lender: '',
        financingType: EquipmentFinancingType.LOAN,
        useSimpleMode: true,
        startDate: equipmentPurchaseDate || undefined,
        includeInBreakeven: false
      });
      setShowOverrides(false);
    }
  }, [loan, isOpen, equipmentPurchaseDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save loan:', error);
      alert(error instanceof Error ? error.message : 'Failed to save loan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isLease = formData.financingType === EquipmentFinancingType.LEASE;
  const isSimpleMode = formData.useSimpleMode;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-1">
            {loan ? 'Edit' : 'Add'} {isLease ? 'Lease' : 'Loan'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">{equipmentName}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Financing Type *</label>
                <select
                  value={formData.financingType}
                  onChange={(e) => setFormData({ ...formData, financingType: e.target.value as EquipmentFinancingType })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={!!loan}
                >
                  <option value={EquipmentFinancingType.LOAN}>Loan</option>
                  <option value={EquipmentFinancingType.LEASE}>Lease</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mode *</label>
                <select
                  value={formData.useSimpleMode ? 'simple' : 'full'}
                  onChange={(e) => setFormData({ ...formData, useSimpleMode: e.target.value === 'simple' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="simple">Simple (Annual Payment)</option>
                  <option value="full">Full Amortization</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Lender *</label>
              <input
                type="text"
                value={formData.lender}
                onChange={(e) => setFormData({ ...formData, lender: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder={isLease ? 'e.g., John Deere Financial' : 'e.g., Farm Credit'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{isLease ? 'Lease' : 'Loan'} Number</label>
              <input
                type="text"
                value={formData.loanNumber || ''}
                onChange={(e) => setFormData({ ...formData, loanNumber: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            {isSimpleMode ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Annual Payment *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.annualPayment || ''}
                  onChange={(e) => setFormData({ ...formData, annualPayment: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Interest will be estimated at 40% of total payment for break-even calculations.
                </p>
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
                      onChange={(e) => setFormData({ ...formData, principal: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required={!isSimpleMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Interest Rate *</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.interestRate ? formData.interestRate * 100 : ''}
                        onChange={(e) => setFormData({ ...formData, interestRate: e.target.value ? parseFloat(e.target.value) / 100 : undefined })}
                        className="block w-full rounded-md border-gray-300 pr-8 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="e.g., 6.5"
                        required={!isSimpleMode}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Term (Months) *</label>
                    <input
                      type="number"
                      value={formData.termMonths || ''}
                      onChange={(e) => setFormData({ ...formData, termMonths: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="e.g., 60"
                      required={!isSimpleMode}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                    <input
                      type="date"
                      value={formData.startDate || ''}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required={!isSimpleMode}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Frequency</label>
                    <select
                      value={formData.paymentFrequency || PaymentFrequency.MONTHLY}
                      onChange={(e) => setFormData({ ...formData, paymentFrequency: e.target.value as PaymentFrequency })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value={PaymentFrequency.MONTHLY}>Monthly</option>
                      <option value={PaymentFrequency.QUARTERLY}>Quarterly</option>
                      <option value={PaymentFrequency.SEMI_ANNUAL}>Semi-Annual</option>
                      <option value={PaymentFrequency.ANNUAL}>Annual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monthly Payment</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.monthlyPayment || ''}
                      onChange={(e) => setFormData({ ...formData, monthlyPayment: e.target.value ? parseFloat(e.target.value) : undefined })}
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
                    onChange={(e) => setFormData({ ...formData, remainingBalance: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </>
            )}

            {isLease && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lease End Date</label>
                  <input
                    type="date"
                    value={formData.leaseEndDate || ''}
                    onChange={(e) => setFormData({ ...formData, leaseEndDate: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Residual Value</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.residualValue || ''}
                    onChange={(e) => setFormData({ ...formData, residualValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {/* Down Payment Section */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Down Payment</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.downPayment || ''}
                  onChange={(e) => setFormData({ ...formData, downPayment: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Down Payment Date</label>
                <input
                  type="date"
                  value={formData.downPaymentDate || ''}
                  onChange={(e) => setFormData({ ...formData, downPaymentDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Next Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Next Payment Date</label>
              <input
                type="date"
                value={formData.nextPaymentDate || ''}
                onChange={(e) => setFormData({ ...formData, nextPaymentDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                You will receive a notification 7 days before this date.
              </p>
            </div>

            {/* Include in Break-Even */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="includeInBreakeven"
                  type="checkbox"
                  checked={formData.includeInBreakeven || false}
                  onChange={(e) => setFormData({ ...formData, includeInBreakeven: e.target.checked })}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="includeInBreakeven" className="font-medium text-gray-700">
                  Include in Break-Even Calculations
                </label>
                <p className="text-gray-500">
                  Annual cost will be distributed evenly across all farm acres.
                </p>
              </div>
            </div>

            {/* Calculated Annual Interest/Principal - Show when editing */}
            {loan && (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Annual Cost Summary</span>
                  <button
                    type="button"
                    onClick={() => setShowOverrides(!showOverrides)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showOverrides ? 'Hide Overrides' : 'Override Values'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Annual Interest:</span>
                    <span className="ml-2 font-medium text-red-600">
                      ${(loan.calculatedAnnualInterest || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Annual Principal:</span>
                    <span className="ml-2 font-medium text-blue-600">
                      ${(loan.calculatedAnnualPrincipal || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                {showOverrides && (
                  <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Interest Override</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.annualInterestOverride || ''}
                        onChange={(e) => setFormData({ ...formData, annualInterestOverride: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Leave blank to use calculated"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Principal Override</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.annualPrincipalOverride || ''}
                        onChange={(e) => setFormData({ ...formData, annualPrincipalOverride: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Leave blank to use calculated"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
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
  onSave: (data: CreateEquipmentLoanPaymentRequest) => Promise<void>;
  loan: EquipmentLoan | null;
}

function PaymentModal({ isOpen, onClose, onSave, loan }: PaymentModalProps) {
  const [formData, setFormData] = useState<CreateEquipmentLoanPaymentRequest>({
    paymentDate: new Date().toISOString().split('T')[0],
    totalAmount: 0,
    principalAmount: 0,
    interestAmount: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && loan) {
      const monthlyPayment = loan.monthlyPayment || (loan.annualPayment ? loan.annualPayment / 12 : 0);
      // Estimate interest portion (40% of payment for simple mode or calculate from balance)
      const estimatedInterest = loan.useSimpleMode
        ? monthlyPayment * 0.4
        : ((loan.remainingBalance || 0) * (loan.interestRate || 0)) / 12;
      const estimatedPrincipal = monthlyPayment - estimatedInterest;

      setFormData({
        paymentDate: new Date().toISOString().split('T')[0],
        totalAmount: monthlyPayment,
        principalAmount: Math.max(0, estimatedPrincipal),
        interestAmount: Math.max(0, estimatedInterest)
      });
    }
  }, [isOpen, loan]);

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
                onChange={(e) => {
                  const total = parseFloat(e.target.value) || 0;
                  const interestRatio = formData.totalAmount > 0
                    ? formData.interestAmount / formData.totalAmount
                    : 0.4;
                  setFormData({
                    ...formData,
                    totalAmount: total,
                    interestAmount: total * interestRatio,
                    principalAmount: total * (1 - interestRatio)
                  });
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Principal Amount *</label>
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
                <label className="block text-sm font-medium text-gray-700">Interest Amount *</label>
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
              <input
                type="text"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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

export default function EquipmentLoans() {
  const { user } = useAuthStore();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<EquipmentLoan | null>(null);
  const [expandedEquipment, setExpandedEquipment] = useState<string | null>(null);

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
      const data = await loansApi.getEquipment(businessId);
      setEquipment(data);
    } catch (error) {
      console.error('Failed to load equipment:', error);
      alert('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEquipment = async (data: CreateEquipmentRequest | UpdateEquipmentRequest) => {
    if (!businessId) return;
    await loansApi.createEquipment(businessId, data as CreateEquipmentRequest);
    await loadData();
  };

  const handleUpdateEquipment = async (data: CreateEquipmentRequest | UpdateEquipmentRequest) => {
    if (!businessId || !selectedEquipment) return;
    await loansApi.updateEquipment(businessId, selectedEquipment.id, data);
    await loadData();
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!businessId) return;
    if (!confirm('Are you sure you want to delete this equipment? All associated loans will also be deleted.')) return;
    try {
      await loansApi.deleteEquipment(businessId, equipmentId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete equipment:', error);
      alert('Failed to delete equipment');
    }
  };

  const handleCreateLoan = async (data: CreateEquipmentLoanRequest | UpdateEquipmentLoanRequest) => {
    if (!selectedEquipment) return;
    await loansApi.createEquipmentLoan(selectedEquipment.id, data as CreateEquipmentLoanRequest);
    await loadData();
  };

  const handleUpdateLoan = async (data: CreateEquipmentLoanRequest | UpdateEquipmentLoanRequest) => {
    if (!selectedLoan) return;
    await loansApi.updateEquipmentLoan(selectedLoan.id, data);
    await loadData();
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm('Are you sure you want to delete this loan?')) return;
    try {
      await loansApi.deleteEquipmentLoan(loanId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete loan:', error);
      alert('Failed to delete loan');
    }
  };

  const handleRecordPayment = async (data: CreateEquipmentLoanPaymentRequest) => {
    if (!selectedLoan) return;
    await loansApi.recordEquipmentLoanPayment(selectedLoan.id, data);
    await loadData();
  };

  // Calculate totals
  const totalCurrentValue = equipment.reduce((sum, e) => sum + (e.currentValue || 0), 0);
  const totalLoanBalance = equipment.reduce((sum, e) => sum + (e.totalLoanBalance || 0), 0);
  const totalAnnualInterest = equipment.reduce((sum, e) => sum + (e.annualInterestExpense || 0), 0);
  const totalAnnualPrincipal = equipment.reduce((sum, e) => sum + (e.annualPrincipalExpense || 0), 0);

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
          <h1 className="text-2xl font-semibold text-gray-900">Equipment Loans</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track equipment and machinery financing for break-even calculations.
          </p>
        </div>
        <div className="mt-3 sm:mt-0">
          <button
            onClick={() => {
              setSelectedEquipment(null);
              setShowEquipmentModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Equipment
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Equipment</dt>
                  <dd className="text-lg font-medium text-gray-900">{equipment.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Value</dt>
                  <dd className="text-lg font-medium text-blue-600">${totalCurrentValue.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Balance</dt>
                  <dd className="text-lg font-medium text-orange-600">${totalLoanBalance.toLocaleString()}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Interest/yr</dt>
                  <dd className="text-lg font-medium text-red-600">${totalAnnualInterest.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Principal/yr</dt>
                  <dd className="text-lg font-medium text-green-600">${totalAnnualPrincipal.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment List */}
      {equipment.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No equipment</h3>
          <p className="mt-1 text-sm text-gray-500">Add equipment to track loans and leases.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {equipment.map((item) => {
              const hasLoans = item.equipmentLoans && item.equipmentLoans.length > 0;
              const loanCount = item.equipmentLoans?.length || 0;

              return (
                <li key={item.id}>
                  <div
                    className="px-4 py-4 sm:px-6 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedEquipment(expandedEquipment === item.id ? null : item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg
                          className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedEquipment === item.id ? 'rotate-90' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            {EQUIPMENT_TYPE_LABELS[item.equipmentType]}
                            {item.year && ` - ${item.year}`}
                            {item.make && ` ${item.make}`}
                            {item.model && ` ${item.model}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-900">{loanCount} {loanCount === 1 ? 'loan' : 'loans'}</p>
                          <p className="text-xs text-gray-500">
                            {item.equipmentLoans?.filter(l => l.financingType === EquipmentFinancingType.LEASE).length || 0} lease(s)
                          </p>
                        </div>
                        {item.currentValue !== undefined && item.currentValue !== null && (
                          <div className="text-right">
                            <p className="text-sm text-blue-600">${item.currentValue.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Value</p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-sm text-orange-600">${(item.totalLoanBalance || 0).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Balance</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-red-600">${(item.annualInterestExpense || 0).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Interest/yr</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Loans Section */}
                  {expandedEquipment === item.id && (
                    <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-900">Loans & Leases</h4>
                        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedEquipment(item);
                              setSelectedLoan(null);
                              setShowLoanModal(true);
                            }}
                            className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                          >
                            Add Loan/Lease
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEquipment(item);
                              setShowEquipmentModal(true);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-900"
                          >
                            Edit Equipment
                          </button>
                          <button
                            onClick={() => handleDeleteEquipment(item.id)}
                            className="text-sm text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {hasLoans ? (
                        <div className="space-y-3">
                          {item.equipmentLoans?.map((loan) => {
                            // Check if next payment date is within 7 days
                            const nextPaymentDate = loan.nextPaymentDate ? new Date(loan.nextPaymentDate) : null;
                            const sevenDaysFromNow = new Date();
                            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                            const paymentSoon = nextPaymentDate && nextPaymentDate <= sevenDaysFromNow && nextPaymentDate >= new Date();

                            return (
                            <div
                              key={loan.id}
                              className={`bg-white rounded-lg border p-4 ${paymentSoon ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                                    <p className="text-sm font-medium text-gray-900">{loan.lender}</p>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      loan.financingType === EquipmentFinancingType.LEASE
                                        ? 'bg-purple-100 text-purple-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {loan.financingType}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      loan.useSimpleMode
                                        ? 'bg-gray-100 text-gray-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {loan.useSimpleMode ? 'Simple' : 'Amortized'}
                                    </span>
                                    {loan.includeInBreakeven && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                        In Break-Even
                                      </span>
                                    )}
                                  </div>
                                  {loan.loanNumber && (
                                    <p className="text-xs text-gray-500">#{loan.loanNumber}</p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-4">
                                  {loan.useSimpleMode ? (
                                    <div className="text-right">
                                      <p className="text-sm text-gray-900">${(loan.annualPayment || 0).toLocaleString()}/yr</p>
                                      <p className="text-xs text-gray-500">Annual Payment</p>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="text-right">
                                        <p className="text-sm text-gray-900">${(loan.remainingBalance || 0).toLocaleString()}</p>
                                        <p className="text-xs text-gray-500">Balance</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm text-gray-900">{((loan.interestRate || 0) * 100).toFixed(2)}%</p>
                                        <p className="text-xs text-gray-500">Rate</p>
                                      </div>
                                    </>
                                  )}
                                  <div className="text-right">
                                    <p className="text-sm text-red-600">${(loan.calculatedAnnualInterest || loan.annualInterestExpense || 0).toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Interest/yr</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-blue-600">${(loan.calculatedAnnualPrincipal || 0).toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Principal/yr</p>
                                  </div>
                                  <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => {
                                        setSelectedLoan(loan);
                                        setShowPaymentModal(true);
                                      }}
                                      className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                                    >
                                      Payment
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedEquipment(item);
                                        setSelectedLoan(loan);
                                        setShowLoanModal(true);
                                      }}
                                      className="text-sm text-blue-600 hover:text-blue-900"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLoan(loan.id)}
                                      className="text-sm text-red-600 hover:text-red-900"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                              {/* Additional info row */}
                              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                <div className="flex space-x-4">
                                  {loan.financingType === EquipmentFinancingType.LEASE && loan.leaseEndDate && (
                                    <span>
                                      Lease ends: {new Date(loan.leaseEndDate).toLocaleDateString()}
                                      {loan.residualValue !== undefined && loan.residualValue !== null && ` | Residual: $${loan.residualValue.toLocaleString()}`}
                                    </span>
                                  )}
                                  {loan.downPayment && (
                                    <span>Down payment: ${loan.downPayment.toLocaleString()}</span>
                                  )}
                                </div>
                                {nextPaymentDate && (
                                  <span className={paymentSoon ? 'text-orange-600 font-medium' : ''}>
                                    Next payment: {nextPaymentDate.toLocaleDateString()}
                                    {paymentSoon && ' (Due Soon)'}
                                  </span>
                                )}
                              </div>
                            </div>
                          )})}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No loans or leases for this equipment</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Modals */}
      <EquipmentModal
        isOpen={showEquipmentModal}
        onClose={() => {
          setShowEquipmentModal(false);
          setSelectedEquipment(null);
        }}
        onSave={selectedEquipment ? handleUpdateEquipment : handleCreateEquipment}
        equipment={selectedEquipment}
      />

      <LoanModal
        isOpen={showLoanModal}
        onClose={() => {
          setShowLoanModal(false);
          setSelectedLoan(null);
        }}
        onSave={selectedLoan ? handleUpdateLoan : handleCreateLoan}
        loan={selectedLoan}
        equipmentName={selectedEquipment?.name || ''}
        equipmentPurchaseDate={selectedEquipment?.purchaseDate ? new Date(selectedEquipment.purchaseDate).toISOString().split('T')[0] : undefined}
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
