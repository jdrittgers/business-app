import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { invoiceApi } from '../api/invoice.api';
import { breakevenApi } from '../api/breakeven.api';
import { chemicalPlanTemplateApi } from '../api/chemical-plan-template.api';
import {
  Invoice,
  InvoiceStatus,
  InvoiceLineItem,
  InvoiceProductType,
  UpdateInvoiceLineItemRequest,
  UnitType,
  CommodityType,
  ChemicalPlanTemplate,
  PassType
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

  // Product creation from line items
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState<InvoiceLineItem | null>(null);
  const [seedFormData, setSeedFormData] = useState<{
    commodityType: CommodityType;
    seedsPerBag: string;
  }>({
    commodityType: CommodityType.CORN,
    seedsPerBag: ''
  });

  // Add to Template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<ChemicalPlanTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [chemicalsToImport, setChemicalsToImport] = useState<InvoiceLineItem[]>([]);

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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Handle multiple files
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        await handleFileUpload(file);
      }
    }
  }, [businessId]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Handle multiple files
      const files = Array.from(e.target.files);
      for (const file of files) {
        await handleFileUpload(file);
      }
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

  const openManualEntryModal = async (invoice: Invoice) => {
    if (!businessId) return;

    try {
      const fullInvoice = await invoiceApi.getInvoice(businessId, invoice.id);
      setSelectedInvoice(fullInvoice);
      // Start with one empty line item for manual entry
      setEditingLineItems([{
        id: 'temp-' + Date.now(),
        invoiceId: invoice.id,
        productType: InvoiceProductType.FERTILIZER,
        productName: '',
        quantity: 0,
        unit: '',
        pricePerUnit: 0,
        totalPrice: 0,
        isNewProduct: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
      setShowReviewModal(true);
    } catch (error) {
      console.error('Failed to open manual entry:', error);
      alert('Failed to open manual entry');
    }
  };

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updated = [...editingLineItems];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate totalPrice if quantity or pricePerUnit changed
    if (field === 'quantity' || field === 'pricePerUnit') {
      const quantity = field === 'quantity' ? parseFloat(value) : Number(updated[index].quantity);
      const pricePerUnit = field === 'pricePerUnit' ? parseFloat(value) : Number(updated[index].pricePerUnit);
      updated[index].totalPrice = quantity * pricePerUnit;
    }

    setEditingLineItems(updated);
  };

  const handleAddLineItem = () => {
    if (!selectedInvoice) return;

    const newItem: InvoiceLineItem = {
      id: 'temp-' + Date.now(),
      invoiceId: selectedInvoice.id,
      productType: InvoiceProductType.FERTILIZER,
      productName: '',
      quantity: 0,
      unit: '',
      pricePerUnit: 0,
      totalPrice: 0,
      isNewProduct: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setEditingLineItems([...editingLineItems, newItem]);
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

  const handleAddToProducts = (lineItem: InvoiceLineItem) => {
    if (lineItem.productType === InvoiceProductType.SEED) {
      // Seeds need additional info
      setSelectedLineItem(lineItem);
      setSeedFormData({ commodityType: CommodityType.CORN, seedsPerBag: '' });
      setShowSeedModal(true);
    } else {
      // Fertilizers and chemicals can be added directly
      addFertilizerOrChemical(lineItem);
    }
  };

  const addFertilizerOrChemical = async (lineItem: InvoiceLineItem) => {
    if (!businessId) return;

    // Check if ratePerAcre is available - if so, ask user to confirm
    if (lineItem.ratePerAcre && lineItem.ratePerAcre > 0) {
      const rateUnit = lineItem.rateUnit || lineItem.unit;
      const confirmed = window.confirm(
        `Using Rate per Acre for product pricing:\n\n` +
        `Product: ${lineItem.productName}\n` +
        `Rate per Acre: ${lineItem.ratePerAcre} ${rateUnit}/acre\n` +
        `Price: $${Number(lineItem.pricePerUnit).toFixed(2)}/${lineItem.unit}\n\n` +
        `This will add the product with rate-based pricing for breakeven calculations.\n\n` +
        `Continue?`
      );
      if (!confirmed) return;
    }

    try {
      const productData = {
        name: lineItem.productName,
        pricePerUnit: Number(lineItem.pricePerUnit),
        unit: lineItem.unit as UnitType
      };

      if (lineItem.productType === InvoiceProductType.FERTILIZER) {
        await breakevenApi.createFertilizer(businessId, productData);
        const rateInfo = lineItem.ratePerAcre ? ` (${lineItem.ratePerAcre} ${lineItem.rateUnit || lineItem.unit}/acre)` : '';
        alert(`✅ Added "${lineItem.productName}" to Fertilizers!${rateInfo}`);
      } else if (lineItem.productType === InvoiceProductType.CHEMICAL) {
        await breakevenApi.createChemical(businessId, productData);
        const rateInfo = lineItem.ratePerAcre ? ` (${lineItem.ratePerAcre} ${lineItem.rateUnit || lineItem.unit}/acre)` : '';
        alert(`✅ Added "${lineItem.productName}" to Chemicals!${rateInfo}`);
      }
    } catch (error: any) {
      console.error('Failed to add product:', error);
      alert(error.response?.data?.error || 'Failed to add product to catalog');
    }
  };

  const handleAddSeedProduct = async () => {
    if (!businessId || !selectedLineItem) return;

    if (!seedFormData.seedsPerBag) {
      alert('Please enter seeds per bag');
      return;
    }

    try {
      const seedData = {
        name: selectedLineItem.productName,
        commodityType: seedFormData.commodityType,
        pricePerBag: Number(selectedLineItem.pricePerUnit),
        seedsPerBag: parseInt(seedFormData.seedsPerBag)
      };

      await breakevenApi.createSeedHybrid(businessId, seedData);
      alert(`✅ Added "${selectedLineItem.productName}" to Seed Hybrids!`);

      setShowSeedModal(false);
      setSelectedLineItem(null);
      setSeedFormData({ commodityType: CommodityType.CORN, seedsPerBag: '' });
    } catch (error: any) {
      console.error('Failed to add seed:', error);
      alert(error.response?.data?.error || 'Failed to add seed to catalog');
    }
  };

  // Add to Template handlers
  const loadTemplates = async () => {
    if (!businessId) return;
    try {
      const data = await chemicalPlanTemplateApi.getAll(businessId, { isActive: true });
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleAddToTemplate = (item: InvoiceLineItem) => {
    setChemicalsToImport([item]);
    loadTemplates();
    setSelectedTemplateIds([]);
    setShowTemplateModal(true);
  };

  const handleBulkAddToTemplate = () => {
    const chemicals = editingLineItems.filter(i => i.productType === InvoiceProductType.CHEMICAL);
    if (chemicals.length === 0) {
      alert('No chemicals found to add');
      return;
    }
    setChemicalsToImport(chemicals);
    loadTemplates();
    setSelectedTemplateIds([]);
    setShowTemplateModal(true);
  };

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplateIds(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const getPassTypeLabel = (type: PassType | undefined): string => {
    if (!type) return '';
    switch (type) {
      case 'PRE': return 'Pre';
      case 'POST': return 'Post';
      case 'FUNGICIDE': return 'Fungicide';
      case 'IN_FURROW': return 'In-Furrow';
      default: return type;
    }
  };

  const handleConfirmAddToTemplate = async () => {
    if (!businessId || !selectedInvoice || selectedTemplateIds.length === 0) return;

    try {
      const result = await chemicalPlanTemplateApi.importFromInvoice(businessId, {
        invoiceId: selectedInvoice.id,
        lineItemIds: chemicalsToImport.map(c => c.id),
        templateIds: selectedTemplateIds
      });

      alert(`Added ${result.imported} chemical(s) to template(s). ${result.skipped} skipped (already in template).`);
      setShowTemplateModal(false);
    } catch (error: any) {
      console.error('Failed to add to template:', error);
      alert(error.response?.data?.error || 'Failed to add chemicals to template');
    }
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
            <p className="text-lg text-gray-600 mb-2">Drag and drop invoice files here, or</p>
            <label className="cursor-pointer">
              <span className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                Browse Files
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleFileInput}
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">PDF, JPG, or PNG (max 10MB each) - Select multiple files at once</p>
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

                    {invoice.status === InvoiceStatus.FAILED && (
                      <button
                        onClick={() => openManualEntryModal(invoice)}
                        className="px-3 py-1 text-sm font-medium text-orange-600 hover:text-orange-800"
                      >
                        Manual Entry
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
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Qty (Total)
                      <div className="text-xs font-normal text-gray-400 normal-case">For bids</div>
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rate/Acre
                      <div className="text-xs font-normal text-gray-400 normal-case">For products</div>
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rate Unit
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Unit</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/Unit</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {editingLineItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-2 py-3">
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
                      <td className="px-2 py-3">
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleLineItemChange(index, 'productName', e.target.value)}
                          className="text-sm border-gray-300 rounded-md w-full"
                          disabled={!!item.priceLockedAt}
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={Number(item.quantity)}
                          onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                          className="text-sm border-gray-300 rounded-md w-20"
                          disabled={!!item.priceLockedAt}
                          placeholder="Total qty"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          step="0.0001"
                          value={item.ratePerAcre !== undefined ? Number(item.ratePerAcre) : ''}
                          onChange={(e) => handleLineItemChange(index, 'ratePerAcre', e.target.value)}
                          className="text-sm border-gray-300 rounded-md w-20"
                          disabled={!!item.priceLockedAt}
                          placeholder="Rate"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <select
                          value={item.rateUnit || ''}
                          onChange={(e) => handleLineItemChange(index, 'rateUnit', e.target.value)}
                          className="text-sm border-gray-300 rounded-md w-24"
                          disabled={!!item.priceLockedAt}
                        >
                          <option value="">Select...</option>
                          <option value="OZ">oz</option>
                          <option value="PT">pint</option>
                          <option value="QT">quart</option>
                          <option value="GAL">gallon</option>
                          <option value="LB">lb</option>
                        </select>
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleLineItemChange(index, 'unit', e.target.value)}
                          className="text-sm border-gray-300 rounded-md w-20"
                          disabled={!!item.priceLockedAt}
                        />
                      </td>
                      <td className="px-2 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={Number(item.pricePerUnit)}
                          onChange={(e) => handleLineItemChange(index, 'pricePerUnit', e.target.value)}
                          className="text-sm border-gray-300 rounded-md w-24"
                          disabled={!!item.priceLockedAt}
                        />
                      </td>
                      <td className="px-2 py-3 text-sm text-gray-900">
                        ${Number(item.totalPrice).toFixed(2)}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleAddToProducts(item)}
                            className="px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded"
                            disabled={!!item.priceLockedAt}
                            title="Add to product catalog"
                          >
                            Add to Products
                          </button>
                          {item.productType === InvoiceProductType.CHEMICAL && (
                            <button
                              onClick={() => handleAddToTemplate(item)}
                              className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-600 rounded"
                              disabled={!!item.priceLockedAt}
                              title="Add to chemical plan template"
                            >
                              To Template
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                onClick={handleAddLineItem}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-600 rounded-md"
              >
                + Add Line Item
              </button>
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
                  onClick={handleBulkAddToTemplate}
                  disabled={editingLineItems.filter(i => i.productType === InvoiceProductType.CHEMICAL).length === 0}
                  className="px-4 py-2 border border-purple-600 text-sm font-medium rounded-md text-purple-600 hover:bg-purple-50 disabled:opacity-50"
                >
                  Add Chemicals to Template
                </button>

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

      {/* Seed Product Modal */}
      {showSeedModal && selectedLineItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add Seed to Product Catalog
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Product: <span className="font-medium">{selectedLineItem.productName}</span>
              </p>
              <p className="text-sm text-gray-600">
                Price per Bag: <span className="font-medium">${Number(selectedLineItem.pricePerUnit).toFixed(2)}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commodity Type *
                </label>
                <select
                  value={seedFormData.commodityType}
                  onChange={(e) => setSeedFormData({ ...seedFormData, commodityType: e.target.value as CommodityType })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="CORN">Corn</option>
                  <option value="SOYBEANS">Soybeans</option>
                  <option value="WHEAT">Wheat</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seeds per Bag *
                </label>
                <input
                  type="number"
                  value={seedFormData.seedsPerBag}
                  onChange={(e) => setSeedFormData({ ...seedFormData, seedsPerBag: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., 80000"
                  min="1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSeedModal(false);
                  setSelectedLineItem(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSeedProduct}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Add to Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Add to Chemical Plan Template
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                {chemicalsToImport.length} chemical(s) selected:
              </p>
              <ul className="text-sm bg-gray-50 rounded p-2 max-h-32 overflow-y-auto">
                {chemicalsToImport.map(c => (
                  <li key={c.id} className="py-0.5">{c.productName}</li>
                ))}
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Template(s)
              </label>
              {templates.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">
                  No templates found. Create a template first in Chemical Plan Templates.
                </p>
              ) : (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {templates.map(template => (
                    <label key={template.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTemplateIds.includes(template.id)}
                        onChange={() => toggleTemplateSelection(template.id)}
                        className="text-blue-600 focus:ring-blue-500 rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-xs text-gray-500">
                          {template.commodityType || 'All commodities'}
                          {template.passType && ` | ${getPassTypeLabel(template.passType)}`}
                          {template.year && ` | ${template.year}`}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddToTemplate}
                disabled={selectedTemplateIds.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Add to {selectedTemplateIds.length} Template(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
