import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { chemicalPlanTemplateApi } from '../api/chemical-plan-template.api';
import { breakevenApi } from '../api/breakeven.api';
import { invoiceApi } from '../api/invoice.api';
import {
  ChemicalPlanTemplate,
  ChemicalPlanTemplateItem,
  Chemical,
  CommodityType,
  Farm,
  PassType,
  InvoiceChemicalForImport,
  Invoice
} from '@business-app/shared';

const COMMODITY_OPTIONS = [
  { value: '', label: 'All Commodities' },
  { value: 'CORN', label: 'Corn' },
  { value: 'SOYBEANS', label: 'Soybeans' },
  { value: 'WHEAT', label: 'Wheat' }
];

const PASS_TYPE_OPTIONS = [
  { value: '', label: 'All Pass Types' },
  { value: 'PRE', label: 'Pre-Emergence' },
  { value: 'POST', label: 'Post-Emergence' },
  { value: 'FUNGICIDE', label: 'Fungicide' },
  { value: 'IN_FURROW', label: 'In-Furrow' }
];

export default function ChemicalPlanTemplates() {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<ChemicalPlanTemplate[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Template Modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChemicalPlanTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    commodityType: '' as CommodityType | '',
    passType: '' as PassType | '',
    year: new Date().getFullYear()
  });

  // Import from Invoice Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTargetTemplateId, setImportTargetTemplateId] = useState<string | null>(null);
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [importableChemicals, setImportableChemicals] = useState<InvoiceChemicalForImport[]>([]);
  const [selectedChemicalIds, setSelectedChemicalIds] = useState<string[]>([]);

  // Item Modal
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ChemicalPlanTemplateItem | null>(null);
  const [itemForm, setItemForm] = useState({
    chemicalId: '',
    ratePerAcre: '',
    notes: ''
  });

  // Apply Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyTemplateId, setApplyTemplateId] = useState<string | null>(null);
  const [applyMode, setApplyMode] = useState<'commodity' | 'manual'>('manual');
  const [applyCommodityType, setApplyCommodityType] = useState<CommodityType | ''>('');
  const [selectedFarmIds, setSelectedFarmIds] = useState<string[]>([]);
  const [applyYear, setApplyYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user && user.businessMemberships.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(user.businessMemberships[0].businessId);
    }
  }, [user, selectedBusinessId]);

  useEffect(() => {
    if (selectedBusinessId) {
      loadData();
    }
  }, [selectedBusinessId]);

  const loadData = async () => {
    if (!selectedBusinessId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [templatesData, chemicalsData, farmsData] = await Promise.all([
        chemicalPlanTemplateApi.getAll(selectedBusinessId),
        breakevenApi.getChemicals(selectedBusinessId),
        breakevenApi.getFarms(selectedBusinessId, { year: new Date().getFullYear() })
      ]);

      setTemplates(templatesData);
      setChemicals(chemicalsData);
      setFarms(farmsData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Template CRUD
  const openCreateTemplateModal = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      description: '',
      commodityType: '',
      passType: '',
      year: new Date().getFullYear()
    });
    setShowTemplateModal(true);
  };

  const openEditTemplateModal = (template: ChemicalPlanTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      commodityType: template.commodityType || '',
      passType: template.passType || '',
      year: template.year || new Date().getFullYear()
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!selectedBusinessId || !templateForm.name.trim()) return;

    try {
      const data = {
        name: templateForm.name.trim(),
        description: templateForm.description.trim() || undefined,
        commodityType: templateForm.commodityType || undefined,
        passType: templateForm.passType || undefined,
        year: templateForm.year || undefined
      };

      if (editingTemplate) {
        await chemicalPlanTemplateApi.update(selectedBusinessId, editingTemplate.id, data);
        showSuccess('Template updated successfully');
      } else {
        await chemicalPlanTemplateApi.create(selectedBusinessId, data);
        showSuccess('Template created successfully');
      }

      setShowTemplateModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!selectedBusinessId) return;
    if (!confirm('Are you sure you want to delete this template? Chemicals will remain on fields that were using it.')) return;

    try {
      await chemicalPlanTemplateApi.delete(selectedBusinessId, templateId);
      showSuccess('Template deleted successfully');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete template');
    }
  };

  // Item CRUD
  const openAddItemModal = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setEditingItem(null);
    setItemForm({
      chemicalId: chemicals[0]?.id || '',
      ratePerAcre: '',
      notes: ''
    });
    setShowItemModal(true);
  };

  const openEditItemModal = (templateId: string, item: ChemicalPlanTemplateItem) => {
    setSelectedTemplateId(templateId);
    setEditingItem(item);
    setItemForm({
      chemicalId: item.chemicalId,
      ratePerAcre: String(item.ratePerAcre),
      notes: item.notes || ''
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    if (!selectedBusinessId || !selectedTemplateId || !itemForm.chemicalId || !itemForm.ratePerAcre) return;

    try {
      if (editingItem) {
        await chemicalPlanTemplateApi.updateItem(selectedBusinessId, selectedTemplateId, editingItem.id, {
          ratePerAcre: parseFloat(itemForm.ratePerAcre),
          notes: itemForm.notes.trim() || undefined
        });
        showSuccess('Chemical updated');
      } else {
        await chemicalPlanTemplateApi.addItem(selectedBusinessId, selectedTemplateId, {
          chemicalId: itemForm.chemicalId,
          ratePerAcre: parseFloat(itemForm.ratePerAcre),
          notes: itemForm.notes.trim() || undefined
        });
        showSuccess('Chemical added to template');
      }

      setShowItemModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save chemical');
    }
  };

  const handleRemoveItem = async (templateId: string, itemId: string) => {
    if (!selectedBusinessId) return;
    if (!confirm('Remove this chemical from the template?')) return;

    try {
      await chemicalPlanTemplateApi.removeItem(selectedBusinessId, templateId, itemId);
      showSuccess('Chemical removed');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove chemical');
    }
  };

  // Apply Template
  const openApplyModal = (templateId: string) => {
    setApplyTemplateId(templateId);
    setApplyMode('manual');
    setApplyCommodityType('');
    setSelectedFarmIds([]);
    setApplyYear(new Date().getFullYear());
    setShowApplyModal(true);
  };

  const handleApplyTemplate = async () => {
    if (!selectedBusinessId || !applyTemplateId) return;

    try {
      let result;
      if (applyMode === 'commodity' && applyCommodityType) {
        result = await chemicalPlanTemplateApi.applyToFarms(selectedBusinessId, applyTemplateId, {
          commodityType: applyCommodityType as CommodityType,
          year: applyYear
        });
      } else if (applyMode === 'manual' && selectedFarmIds.length > 0) {
        result = await chemicalPlanTemplateApi.applyToFarms(selectedBusinessId, applyTemplateId, {
          farmIds: selectedFarmIds
        });
      } else {
        setError('Please select farms or a commodity type');
        return;
      }

      showSuccess(`Template applied to ${result.applied} field(s). ${result.skipped} already had this template.`);
      setShowApplyModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to apply template');
    }
  };

  const toggleFarmSelection = (farmId: string) => {
    setSelectedFarmIds(prev =>
      prev.includes(farmId)
        ? prev.filter(id => id !== farmId)
        : [...prev, farmId]
    );
  };

  const selectAllFarms = () => {
    const filteredFarms = farms.filter(f =>
      !applyCommodityType || f.commodityType === applyCommodityType
    );
    setSelectedFarmIds(filteredFarms.map(f => f.id));
  };

  const clearSelection = () => {
    setSelectedFarmIds([]);
  };

  // Calculate template cost
  const calculateTemplateCost = (template: ChemicalPlanTemplate): number => {
    if (!template.items) return 0;
    return template.items.reduce((sum, item) => {
      const chemical = chemicals.find(c => c.id === item.chemicalId);
      if (!chemical) return sum;
      return sum + (item.ratePerAcre * chemical.pricePerUnit);
    }, 0);
  };

  const getCommodityLabel = (type: CommodityType | undefined): string => {
    if (!type) return 'All';
    switch (type) {
      case 'CORN': return 'Corn';
      case 'SOYBEANS': return 'Soybeans';
      case 'WHEAT': return 'Wheat';
      default: return type;
    }
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

  // Import from Invoice handlers
  const openImportModal = async (templateId: string) => {
    setImportTargetTemplateId(templateId);
    setSelectedInvoiceId(null);
    setImportableChemicals([]);
    setSelectedChemicalIds([]);

    try {
      const invoices = await invoiceApi.getInvoices(selectedBusinessId!);
      setAvailableInvoices(invoices.filter((inv: Invoice) => inv.status === 'PARSED' || inv.status === 'REVIEWED'));
      setShowImportModal(true);
    } catch (err: any) {
      setError('Failed to load invoices');
    }
  };

  const handleInvoiceSelect = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setSelectedChemicalIds([]);

    if (!invoiceId) {
      setImportableChemicals([]);
      return;
    }

    try {
      const chemicals = await chemicalPlanTemplateApi.getImportableChemicals(selectedBusinessId!, invoiceId);
      setImportableChemicals(chemicals);
    } catch (err: any) {
      setError('Failed to load chemicals from invoice');
    }
  };

  const toggleChemicalSelection = (lineItemId: string) => {
    setSelectedChemicalIds(prev =>
      prev.includes(lineItemId)
        ? prev.filter(id => id !== lineItemId)
        : [...prev, lineItemId]
    );
  };

  const handleImportChemicals = async () => {
    if (!selectedBusinessId || !importTargetTemplateId || selectedChemicalIds.length === 0) return;

    try {
      const result = await chemicalPlanTemplateApi.importFromInvoice(selectedBusinessId, {
        invoiceId: selectedInvoiceId!,
        lineItemIds: selectedChemicalIds,
        templateIds: [importTargetTemplateId]
      });

      showSuccess(`Imported ${result.imported} chemical(s). ${result.skipped} skipped.`);
      setShowImportModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import chemicals');
    }
  };

  if (!user || user.businessMemberships.length === 0) {
    return (
      <div className="p-4">
        <p className="text-gray-500">No business found. Please join a business first.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chemical Plan Templates</h1>
          <p className="text-gray-600 mt-1">Create reusable chemical programs and apply them to multiple fields</p>
        </div>
        <button
          onClick={openCreateTemplateModal}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          {successMessage}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      )}

      {/* Templates List */}
      {!isLoading && templates.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No templates yet</h3>
          <p className="mt-1 text-gray-500">Create a template to get started</p>
          <button
            onClick={openCreateTemplateModal}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Create Template
          </button>
        </div>
      )}

      {!isLoading && templates.length > 0 && (
        <div className="space-y-4">
          {templates.map(template => (
            <div key={template.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              {/* Template Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                    {template.commodityType && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        template.commodityType === 'CORN' ? 'bg-yellow-100 text-yellow-800' :
                        template.commodityType === 'SOYBEANS' ? 'bg-green-100 text-green-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {getCommodityLabel(template.commodityType)}
                      </span>
                    )}
                    {template.passType && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        template.passType === 'PRE' ? 'bg-blue-100 text-blue-800' :
                        template.passType === 'POST' ? 'bg-purple-100 text-purple-800' :
                        template.passType === 'FUNGICIDE' ? 'bg-teal-100 text-teal-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {getPassTypeLabel(template.passType)}
                      </span>
                    )}
                    {template.year && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {template.year}
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-gray-600 text-sm mt-1">{template.description}</p>
                  )}
                  <p className="text-gray-500 text-sm mt-2">
                    {template.usageCount || 0} field(s) using this template
                    {template.items && template.items.length > 0 && (
                      <span className="ml-3">
                        Est. Cost: <span className="font-medium text-gray-900">${calculateTemplateCost(template).toFixed(2)}/acre</span>
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openApplyModal(template.id)}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Apply to Fields
                  </button>
                  <button
                    onClick={() => openEditTemplateModal(template)}
                    className="text-gray-600 hover:text-gray-800 p-1.5"
                    title="Edit Template"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-600 hover:text-red-800 p-1.5"
                    title="Delete Template"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Template Items */}
              <div className="px-6 py-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">Chemicals</h4>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openImportModal(template.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Import from Invoice
                    </button>
                    <button
                      onClick={() => openAddItemModal(template.id)}
                      className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Chemical
                    </button>
                  </div>
                </div>

                {(!template.items || template.items.length === 0) ? (
                  <p className="text-gray-500 text-sm italic">No chemicals added yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate/Acre</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost/Acre</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {template.items.map(item => {
                          const chemical = item.chemical || chemicals.find(c => c.id === item.chemicalId);
                          const costPerAcre = chemical ? item.ratePerAcre * chemical.pricePerUnit : 0;
                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                {chemical?.name || 'Unknown'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {item.ratePerAcre}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500">
                                {chemical?.unit || '-'}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                ${costPerAcre.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-500">
                                {item.notes || '-'}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() => openEditItemModal(template.id, item)}
                                  className="text-blue-600 hover:text-blue-800 mr-2"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleRemoveItem(template.id, item.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remove
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
            </div>
          ))}
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={e => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 2025 Corn Herbicide Program"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={templateForm.description}
                  onChange={e => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Optional description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commodity Type</label>
                  <select
                    value={templateForm.commodityType}
                    onChange={e => setTemplateForm(prev => ({ ...prev, commodityType: e.target.value as CommodityType | '' }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {COMMODITY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pass Type</label>
                  <select
                    value={templateForm.passType}
                    onChange={e => setTemplateForm(prev => ({ ...prev, passType: e.target.value as PassType | '' }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {PASS_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input
                  type="number"
                  value={templateForm.year}
                  onChange={e => setTemplateForm(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateForm.name.trim()}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingItem ? 'Edit Chemical' : 'Add Chemical'}
            </h2>

            <div className="space-y-4">
              {!editingItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chemical Product *</label>
                  <select
                    value={itemForm.chemicalId}
                    onChange={e => setItemForm(prev => ({ ...prev, chemicalId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select a chemical...</option>
                    {chemicals.map(c => (
                      <option key={c.id} value={c.id}>{c.name} (${c.pricePerUnit}/{c.unit})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate per Acre *
                  {itemForm.chemicalId && (
                    <span className="font-normal text-gray-500">
                      {' '}({chemicals.find(c => c.id === itemForm.chemicalId)?.unit}/acre)
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={itemForm.ratePerAcre}
                  onChange={e => setItemForm(prev => ({ ...prev, ratePerAcre: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 2.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={itemForm.notes}
                  onChange={e => setItemForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Application notes..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={(!editingItem && !itemForm.chemicalId) || !itemForm.ratePerAcre}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingItem ? 'Save Changes' : 'Add Chemical'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Apply Template to Fields</h2>

            <div className="space-y-4">
              {/* Apply Mode Selection */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={applyMode === 'manual'}
                    onChange={() => setApplyMode('manual')}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span>Select Fields Manually</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={applyMode === 'commodity'}
                    onChange={() => setApplyMode('commodity')}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span>Apply by Commodity</span>
                </label>
              </div>

              {/* Commodity Mode */}
              {applyMode === 'commodity' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commodity Type *</label>
                    <select
                      value={applyCommodityType}
                      onChange={e => setApplyCommodityType(e.target.value as CommodityType | '')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select commodity...</option>
                      <option value="CORN">Corn</option>
                      <option value="SOYBEANS">Soybeans</option>
                      <option value="WHEAT">Wheat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="number"
                      value={applyYear}
                      onChange={e => setApplyYear(parseInt(e.target.value) || new Date().getFullYear())}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  {applyCommodityType && (
                    <p className="col-span-2 text-sm text-gray-600">
                      Will apply to all {getCommodityLabel(applyCommodityType as CommodityType).toLowerCase()} fields for {applyYear}
                    </p>
                  )}
                </div>
              )}

              {/* Manual Mode */}
              {applyMode === 'manual' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Select Fields</label>
                    <div className="flex gap-2">
                      <button onClick={selectAllFarms} className="text-sm text-blue-600 hover:text-blue-800">
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button onClick={clearSelection} className="text-sm text-gray-600 hover:text-gray-800">
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                    {farms.length === 0 ? (
                      <p className="text-gray-500 text-sm p-4">No fields found for this year</p>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {farms.map(farm => (
                          <label
                            key={farm.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedFarmIds.includes(farm.id)}
                              onChange={() => toggleFarmSelection(farm.id)}
                              className="text-green-600 focus:ring-green-500 rounded"
                            />
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">{farm.name}</span>
                              <span className="text-gray-500 text-sm ml-2">
                                ({farm.acres} ac, {getCommodityLabel(farm.commodityType)})
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mt-2">
                    {selectedFarmIds.length} field(s) selected
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowApplyModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyTemplate}
                disabled={
                  (applyMode === 'commodity' && !applyCommodityType) ||
                  (applyMode === 'manual' && selectedFarmIds.length === 0)
                }
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import from Invoice Modal */}
      {showImportModal && importTargetTemplateId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Import Chemicals from Invoice</h2>

            {/* Step 1: Select Invoice */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Invoice</label>
              <select
                value={selectedInvoiceId || ''}
                onChange={e => handleInvoiceSelect(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Choose an invoice...</option>
                {availableInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.vendorName || inv.fileName} - {new Date(inv.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {availableInvoices.length === 0 && (
                <p className="text-gray-500 text-sm mt-2">No parsed invoices found. Upload and parse an invoice first.</p>
              )}
            </div>

            {/* Step 2: Select Chemicals */}
            {selectedInvoiceId && importableChemicals.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Select Chemicals to Import</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedChemicalIds(importableChemicals.map(c => c.lineItemId))}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => setSelectedChemicalIds([])}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {importableChemicals.map(chem => (
                    <label key={chem.lineItemId} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedChemicalIds.includes(chem.lineItemId)}
                        onChange={() => toggleChemicalSelection(chem.lineItemId)}
                        className="text-green-600 focus:ring-green-500 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{chem.productName}</div>
                        <div className="text-sm text-gray-500">
                          ${chem.pricePerUnit}/{chem.unit}
                          {chem.ratePerAcre && ` | ${chem.ratePerAcre} ${chem.rateUnit || chem.unit}/acre`}
                          {chem.matchedChemicalName && (
                            <span className="text-green-600 ml-2">Matched: {chem.matchedChemicalName}</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {selectedInvoiceId && importableChemicals.length === 0 && (
              <p className="text-gray-500 text-sm py-4">No chemicals found in this invoice.</p>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleImportChemicals}
                disabled={selectedChemicalIds.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {selectedChemicalIds.length} Chemical(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
