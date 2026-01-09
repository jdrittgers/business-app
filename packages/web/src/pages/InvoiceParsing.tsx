import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { invoiceApi } from '../api/invoice.api';
import {
  Invoice,
  InvoiceStatus,
  InvoiceLineItem,
  InvoiceProductType,
  UpdateInvoiceLineItemRequest
} from '@business-app/shared';

export default function InvoiceParsing() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingLineItems, setEditingLineItems] = useState<InvoiceLineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);

  const businessId = user?.businessMemberships?.[0]?.businessId;

  useEffect(() => {
    if (businessId) {
      loadInvoices();
    }
  }, [businessId]);

  const loadInvoices = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      const data = await invoiceApi.getInvoices(businessId);
      setInvoices(data);
    } catch (error) {
      console.error('Failed to load invoices:', error);
      alert('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [businessId]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!businessId) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only PDF, JPG, and PNG are allowed.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }

    try {
      setUploading(true);
      const invoice = await invoiceApi.uploadInvoice(businessId, file);

      // Add to list and start polling for parsing completion
      await loadInvoices();
      pollInvoiceStatus(invoice.id);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload invoice');
    } finally {
      setUploading(false);
    }
  };

  const pollInvoiceStatus = async (invoiceId: string) => {
    if (!businessId) return;

    const maxAttempts = 30;
    let attempts = 0;

    const poll = setInterval(async () => {
      attempts++;

      try {
        const invoice = await invoiceApi.getInvoice(businessId, invoiceId);

        if (invoice.status === InvoiceStatus.PARSED || invoice.status === InvoiceStatus.FAILED) {
          clearInterval(poll);
          await loadInvoices();

          if (invoice.status === InvoiceStatus.PARSED) {
            // Auto-open review modal
            openReviewModal(invoice);
          } else {
            alert(`Parsing failed: ${invoice.parseError || 'Unknown error'}`);
          }
        }

        if (attempts >= maxAttempts) {
          clearInterval(poll);
          alert('Parsing is taking longer than expected. Please refresh to check status.');
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(poll);
      }
    }, 1000);
  };

  const openReviewModal = async (invoice: Invoice) => {
    if (!businessId) return;

    try {
      const fullInvoice = await invoiceApi.getInvoice(businessId, invoice.id);
      setSelectedInvoice(fullInvoice);
      setEditingLineItems(fullInvoice.lineItems || []);
      setShowReviewModal(true);
    } catch (error) {
      console.error('Failed to load invoice details:', error);
      alert('Failed to load invoice details');
    }
  };

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...editingLineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate totalPrice if quantity or pricePerUnit changed
    if (field === 'quantity' || field === 'pricePerUnit') {
      const quantity = field === 'quantity' ? parseFloat(value) : updated[index].quantity;
      const pricePerUnit = field === 'pricePerUnit' ? parseFloat(value) : updated[index].pricePerUnit;
      updated[index].totalPrice = quantity * pricePerUnit;
    }

    setEditingLineItems(updated);
  };

  const handleSaveChanges = async () => {
    if (!businessId || !selectedInvoice) return;

    try {
      setSaving(true);

      // Update each modified line item
      for (const lineItem of editingLineItems) {
        const updateData: UpdateInvoiceLineItemRequest = {
          productName: lineItem.productName,
          productType: lineItem.productType,
          quantity: lineItem.quantity,
          unit: lineItem.unit,
          pricePerUnit: lineItem.pricePerUnit,
          totalPrice: lineItem.totalPrice
        };

        await invoiceApi.updateLineItem(businessId, lineItem.id, updateData);
      }

      alert('Changes saved successfully');
      await loadInvoices();

      // Refresh the selected invoice
      const updated = await invoiceApi.getInvoice(businessId, selectedInvoice.id);
      setSelectedInvoice(updated);
      setEditingLineItems(updated.lineItems || []);
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleLockPrices = async () => {
    if (!businessId || !selectedInvoice) return;

    const confirmed = window.confirm(
      'Lock prices and update product catalog? This will create purchase history records and cannot be undone.'
    );

    if (!confirmed) return;

    try {
      setLocking(true);
      await invoiceApi.lockPrices(businessId, selectedInvoice.id);
      alert('Prices locked successfully!');

      await loadInvoices();
      setShowReviewModal(false);
      setSelectedInvoice(null);
    } catch (error) {
      console.error('Failed to lock prices:', error);
      alert('Failed to lock prices');
    } finally {
      setLocking(false);
    }
  };

  const handleCreateBidRequest = () => {
    if (!selectedInvoice) return;

    // Pre-fill bid request with invoice data
    const bidItems = editingLineItems.map(item => ({
      productType: item.productType === InvoiceProductType.SEED ? 'SEED' :
                   item.productType === InvoiceProductType.FERTILIZER ? 'FERTILIZER' : 'CHEMICAL',
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      currentPrice: item.pricePerUnit
    }));

    localStorage.setItem('preselectedBidProducts', JSON.stringify(bidItems));
    navigate('/input-bids');
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!businessId) return;

    const confirmed = window.confirm('Delete this invoice? This cannot be undone.');
    if (!confirmed) return;

    try {
      await invoiceApi.deleteInvoice(businessId, invoiceId);
      await loadInvoices();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      alert('Failed to delete invoice');
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const styles: Record<InvoiceStatus, string> = {
      [InvoiceStatus.PENDING]: 'bg-yellow-100 text-yellow-800',
      [InvoiceStatus.PARSED]: 'bg-blue-100 text-blue-800',
      [InvoiceStatus.FAILED]: 'bg-red-100 text-red-800',
      [InvoiceStatus.REVIEWED]: 'bg-green-100 text-green-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Invoice Parsing</h1>
        <p className="text-gray-600">Upload invoices to automatically extract product pricing data</p>
      </div>

      {/* Upload Dropzone */}
      <div
        className={`mb-8 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
        >
          <path
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {uploading ? (
          <p className="text-gray-600">Uploading and parsing invoice...</p>
        ) : (
          <>
            <p className="text-lg text-gray-600 mb-2">Drag and drop invoice file here, or</p>
            <label className="cursor-pointer">
              <span className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Browse Files
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileInput}
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">PDF, JPG, or PNG (max 10MB)</p>
          </>
        )}
      </div>

      {/* Invoice List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Uploaded Invoices</h2>
        </div>

        {invoices.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            No invoices uploaded yet
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <li key={invoice.id} className="px-4 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {invoice.fileName}
                      </p>
                      {getStatusBadge(invoice.status)}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {invoice.vendorName && (
                        <span>Vendor: {invoice.vendorName}</span>
                      )}
                      {invoice.totalAmount && (
                        <span>Total: ${invoice.totalAmount}</span>
                      )}
                      <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
                      <span>{(invoice.fileSize / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {invoice.status === InvoiceStatus.PARSED && (
                      <button
                        onClick={() => openReviewModal(invoice)}
                        className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Review
                      </button>
                    )}

                    {invoice.status === InvoiceStatus.REVIEWED && (
                      <span className="text-sm text-green-600">Prices Locked</span>
                    )}

                    <button
                      onClick={() => handleDeleteInvoice(invoice.id)}
                      className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Review Invoice</h2>
              <div className="mt-2 text-sm text-gray-600">
                {selectedInvoice.vendorName && <p>Vendor: {selectedInvoice.vendorName}</p>}
                {selectedInvoice.invoiceNumber && <p>Invoice #: {selectedInvoice.invoiceNumber}</p>}
                {selectedInvoice.invoiceDate && (
                  <p>Date: {new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/Unit</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {editingLineItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-3 py-3">
                        <select
                          value={item.productType}
                          onChange={(e) => handleLineItemChange(index, 'productType', e.target.value as InvoiceProductType)}
                          className="text-sm border-gray-300 rounded-md"
                          disabled={!!item.priceLockedAt}
                        >
                          <option value={InvoiceProductType.FERTILIZER}>Fertilizer</option>
                          <option value={InvoiceProductType.CHEMICAL}>Chemical</option>
                          <option value={InvoiceProductType.SEED}>Seed</option>
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleLineItemChange(index, 'productName', e.target.value)}
                          className="text-sm border-gray-300 rounded-md w-full"
                          disabled={!!item.priceLockedAt}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                          className="text-sm border-gray-300 rounded-md w-20"
                          disabled={!!item.priceLockedAt}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleLineItemChange(index, 'unit', e.target.value)}
                          className="text-sm border-gray-300 rounded-md w-20"
                          disabled={!!item.priceLockedAt}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={item.pricePerUnit}
                          onChange={(e) => handleLineItemChange(index, 'pricePerUnit', e.target.value)}
                          className="text-sm border-gray-300 rounded-md w-24"
                          disabled={!!item.priceLockedAt}
                        />
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900">
                        ${item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedInvoice(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Close
              </button>

              <div className="flex gap-3">
                {selectedInvoice.status === InvoiceStatus.PARSED && (
                  <>
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>

                    <button
                      onClick={handleLockPrices}
                      disabled={locking}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      {locking ? 'Locking...' : 'Lock Prices'}
                    </button>
                  </>
                )}

                <button
                  onClick={handleCreateBidRequest}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Bid Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
