import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { loansApi } from '../api/loans.api';
import { grainContractsApi } from '../api/grain-contracts.api';
import {
  OperatingLoan,
  CreateOperatingLoanRequest,
  OperatingLoanTransaction,
  GrainEntity,
  LoanTransactionType
} from '@business-app/shared';

// Modal for creating/editing operating loans
interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entityId: string, data: CreateOperatingLoanRequest) => Promise<void>;
  loan?: OperatingLoan | null;
  grainEntities: GrainEntity[];
  currentYear: number;
}

function LoanModal({ isOpen, onClose, onSave, loan, grainEntities, currentYear }: LoanModalProps) {
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [formData, setFormData] = useState<CreateOperatingLoanRequest>({
    lender: '',
    creditLimit: 0,
    interestRate: 0,
    year: currentYear
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (loan) {
      setSelectedEntityId(loan.grainEntityId);
      setFormData({
        lender: loan.lender,
        loanNumber: loan.loanNumber,
        creditLimit: loan.creditLimit,
        interestRate: loan.interestRate,
        currentBalance: loan.currentBalance,
        year: loan.year,
        notes: loan.notes
      });
    } else {
      setSelectedEntityId(grainEntities[0]?.id || '');
      setFormData({
        lender: '',
        creditLimit: 0,
        interestRate: 0,
        year: currentYear
      });
    }
  }, [loan, isOpen, grainEntities, currentYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(selectedEntityId, formData);
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
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            {loan ? 'Edit Operating Loan' : 'Add Operating Loan'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Grain Entity *</label>
              <select
                value={selectedEntityId}
                onChange={(e) => setSelectedEntityId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
                disabled={!!loan}
              >
                {grainEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>{entity.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Year *</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
                disabled={!!loan}
              />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Credit Limit *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.creditLimit || ''}
                  onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Interest Rate *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.interestRate ? formData.interestRate * 100 : ''}
                    onChange={(e) => setFormData({ ...formData, interestRate: parseFloat(e.target.value) / 100 || 0 })}
                    className="block w-full rounded-md border-gray-300 pr-8 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., 7.5"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">%</span>
                  </div>
                </div>
              </div>
            </div>
            {loan && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.currentBalance || ''}
                  onChange={(e) => setFormData({ ...formData, currentBalance: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Normally updated via draws and payments</p>
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

// Transaction Modal (for draws and payments)
interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { amount: number; transactionDate?: string; description?: string }) => Promise<void>;
  loan: OperatingLoan | null;
  type: 'draw' | 'payment';
}

function TransactionModal({ isOpen, onClose, onSave, loan, type }: TransactionModalProps) {
  const [formData, setFormData] = useState({
    amount: 0,
    transactionDate: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      amount: 0,
      transactionDate: new Date().toISOString().split('T')[0],
      description: ''
    });
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(`Failed to record ${type}:`, error);
      alert(error instanceof Error ? error.message : `Failed to record ${type}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !loan) return null;

  const maxAmount = type === 'draw' ? loan.availableCredit : loan.currentBalance;
  const isDraw = type === 'draw';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            {isDraw ? 'Record Draw' : 'Record Payment'} - {loan.lender}
          </h3>
          <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm space-y-1">
            <p><span className="font-medium">Current Balance:</span> ${loan.currentBalance.toLocaleString()}</p>
            <p><span className="font-medium">Credit Limit:</span> ${loan.creditLimit.toLocaleString()}</p>
            <p><span className="font-medium">Available Credit:</span> ${(loan.availableCredit || 0).toLocaleString()}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                max={maxAmount}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Max: ${maxAmount?.toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date *</label>
              <input
                type="date"
                value={formData.transactionDate}
                onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder={isDraw ? 'e.g., Spring inputs' : 'e.g., Grain sale proceeds'}
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
                disabled={isSubmitting || formData.amount <= 0}
                className={`inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm disabled:opacity-50 ${
                  isDraw
                    ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                    : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                }`}
              >
                {isSubmitting ? 'Recording...' : isDraw ? 'Record Draw' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OperatingLoans() {
  const { user } = useAuthStore();
  const [loans, setLoans] = useState<OperatingLoan[]>([]);
  const [grainEntities, setGrainEntities] = useState<GrainEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'draw' | 'payment'>('draw');
  const [selectedLoan, setSelectedLoan] = useState<OperatingLoan | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);

  const businessId = user?.businessMemberships?.[0]?.businessId;

  useEffect(() => {
    if (businessId) {
      loadData();
    }
  }, [businessId, selectedYear]);

  const loadData = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const [loansData, entitiesData] = await Promise.all([
        loansApi.getOperatingLoans(businessId, { year: selectedYear }),
        grainContractsApi.getGrainEntities(businessId)
      ]);
      setLoans(loansData);
      setGrainEntities(entitiesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('Failed to load operating loans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLoan = async (entityId: string, data: CreateOperatingLoanRequest) => {
    await loansApi.createOperatingLoan(entityId, data);
    await loadData();
  };

  const handleUpdateLoan = async (_entityId: string, data: CreateOperatingLoanRequest) => {
    if (!selectedLoan) return;
    await loansApi.updateOperatingLoan(selectedLoan.id, data);
    await loadData();
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm('Are you sure you want to delete this operating loan?')) return;
    try {
      await loansApi.deleteOperatingLoan(loanId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete loan:', error);
      alert('Failed to delete loan');
    }
  };

  const handleRecordDraw = async (data: { amount: number; transactionDate?: string; description?: string }) => {
    if (!selectedLoan) return;
    await loansApi.recordDraw(selectedLoan.id, data);
    await loadData();
  };

  const handleRecordPayment = async (data: { amount: number; transactionDate?: string; description?: string }) => {
    if (!selectedLoan) return;
    await loansApi.recordOperatingLoanPayment(selectedLoan.id, data);
    await loadData();
  };

  // Calculate totals
  const totalCreditLimit = loans.reduce((sum, l) => sum + l.creditLimit, 0);
  const totalBalance = loans.reduce((sum, l) => sum + l.currentBalance, 0);
  const totalAvailable = loans.reduce((sum, l) => sum + (l.availableCredit || 0), 0);
  const totalYTDInterest = loans.reduce((sum, l) => sum + (l.ytdInterestExpense || 0), 0);

  // Year options
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

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
          <h1 className="text-2xl font-semibold text-gray-900">Operating Loans</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track operating lines of credit by entity for break-even calculations.
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center space-x-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setSelectedLoan(null);
              setShowLoanModal(true);
            }}
            disabled={grainEntities.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Add Operating Loan
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Credit</dt>
                  <dd className="text-lg font-medium text-gray-900">${totalCreditLimit.toLocaleString()}</dd>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Current Balance</dt>
                  <dd className="text-lg font-medium text-orange-600">${totalBalance.toLocaleString()}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Available</dt>
                  <dd className="text-lg font-medium text-green-600">${totalAvailable.toLocaleString()}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">YTD Interest</dt>
                  <dd className="text-lg font-medium text-red-600">${totalYTDInterest.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loans List */}
      {grainEntities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No grain entities</h3>
          <p className="mt-1 text-sm text-gray-500">Create grain entities first to add operating loans.</p>
        </div>
      ) : loans.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No operating loans for {selectedYear}</h3>
          <p className="mt-1 text-sm text-gray-500">Add an operating loan to track credit usage.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <ul className="divide-y divide-gray-200">
            {loans.map((loan) => {
              const utilizationPct = loan.creditLimit > 0 ? (loan.currentBalance / loan.creditLimit) * 100 : 0;
              const utilizationColor = utilizationPct > 80 ? 'bg-red-500' : utilizationPct > 50 ? 'bg-yellow-500' : 'bg-green-500';

              return (
                <li key={loan.id}>
                  <div
                    className="px-4 py-4 sm:px-6 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedLoan(expandedLoan === loan.id ? null : loan.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <svg
                          className={`h-5 w-5 text-gray-400 transform transition-transform ${expandedLoan === loan.id ? 'rotate-90' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{loan.grainEntityName}</p>
                          <p className="text-sm text-gray-500">{loan.lender} {loan.loanNumber && `- #${loan.loanNumber}`}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">Utilization</span>
                            <span className="font-medium">{utilizationPct.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className={`${utilizationColor} h-2 rounded-full`} style={{ width: `${Math.min(utilizationPct, 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-orange-600">${loan.currentBalance.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">of ${loan.creditLimit.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900">{((loan.interestRate || 0) * 100).toFixed(2)}%</p>
                          <p className="text-xs text-gray-500">Rate</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-red-600">${(loan.ytdInterestExpense || 0).toLocaleString()}</p>
                          <p className="text-xs text-gray-500">YTD Interest</p>
                        </div>
                        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedLoan(loan);
                              setTransactionType('draw');
                              setShowTransactionModal(true);
                            }}
                            className="text-sm px-2 py-1 bg-orange-100 text-orange-800 rounded hover:bg-orange-200"
                          >
                            Draw
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLoan(loan);
                              setTransactionType('payment');
                              setShowTransactionModal(true);
                            }}
                            className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                          >
                            Payment
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Transactions Section */}
                  {expandedLoan === loan.id && (
                    <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-900">Recent Transactions</h4>
                        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedLoan(loan);
                              setShowLoanModal(true);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-900"
                          >
                            Edit Loan
                          </button>
                          <button
                            onClick={() => handleDeleteLoan(loan.id)}
                            className="text-sm text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {loan.transactions && loan.transactions.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance After</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {loan.transactions.map((txn: OperatingLoanTransaction) => (
                                <tr key={txn.id}>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(txn.transactionDate).toLocaleDateString()}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      txn.type === LoanTransactionType.DRAW
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {txn.type}
                                    </span>
                                  </td>
                                  <td className={`px-3 py-2 whitespace-nowrap text-sm text-right font-medium ${
                                    txn.type === LoanTransactionType.DRAW ? 'text-orange-600' : 'text-green-600'
                                  }`}>
                                    {txn.type === LoanTransactionType.DRAW ? '+' : '-'}${txn.amount.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                                    ${txn.balanceAfter.toLocaleString()}
                                  </td>
                                  <td className="px-3 py-2 text-sm text-gray-500 truncate max-w-xs">
                                    {txn.description || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No transactions yet</p>
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
      <LoanModal
        isOpen={showLoanModal}
        onClose={() => {
          setShowLoanModal(false);
          setSelectedLoan(null);
        }}
        onSave={selectedLoan ? handleUpdateLoan : handleCreateLoan}
        loan={selectedLoan}
        grainEntities={grainEntities}
        currentYear={selectedYear}
      />

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => {
          setShowTransactionModal(false);
          setSelectedLoan(null);
        }}
        onSave={transactionType === 'draw' ? handleRecordDraw : handleRecordPayment}
        loan={selectedLoan}
        type={transactionType}
      />
    </div>
  );
}
