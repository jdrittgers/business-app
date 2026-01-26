import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { retailerAccessApi } from '../api/retailer-access.api';
import {
  RetailerAccessRequest,
  AccessSummary,
  RetailerInterest,
  PartnerPermissions,
  PartnerPermissionLevel,
  PartnerModule,
  MODULE_DISPLAY_NAMES,
  PERMISSION_DISPLAY_NAMES
} from '@business-app/shared';

// Group modules by category for display
const MODULE_CATEGORIES = {
  'Farm Inputs': [PartnerModule.FERTILIZER_CHEMICALS, PartnerModule.SEED],
  'Grain': [PartnerModule.GRAIN_CONTRACTS, PartnerModule.GRAIN_BINS],
  'Finance': [PartnerModule.LAND_LOANS, PartnerModule.OPERATING_LOANS, PartnerModule.EQUIPMENT_LOANS]
};

// Map module to permission field
const MODULE_TO_FIELD: Record<PartnerModule, keyof PartnerPermissions> = {
  [PartnerModule.FERTILIZER_CHEMICALS]: 'fertilizerChemicalsAccess',
  [PartnerModule.SEED]: 'seedAccess',
  [PartnerModule.GRAIN_CONTRACTS]: 'grainContractsAccess',
  [PartnerModule.GRAIN_BINS]: 'grainBinsAccess',
  [PartnerModule.LAND_LOANS]: 'landLoansAccess',
  [PartnerModule.OPERATING_LOANS]: 'operatingLoansAccess',
  [PartnerModule.EQUIPMENT_LOANS]: 'equipmentLoansAccess'
};

interface EditingPermissions {
  requestId: string;
  permissions: PartnerPermissions;
  hasChanges: boolean;
}

export default function FarmerAccessManagement() {
  const { user } = useAuthStore();
  const activeBusiness = user?.businessMemberships?.[0]?.business;
  const [requests, setRequests] = useState<RetailerAccessRequest[]>([]);
  const [summary, setSummary] = useState<AccessSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<EditingPermissions | null>(null);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (activeBusiness?.id) {
      loadData();
    }
  }, [activeBusiness?.id]);

  const loadData = async () => {
    if (!activeBusiness?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const [requestsData, summaryData] = await Promise.all([
        retailerAccessApi.getAccessRequests(activeBusiness.id),
        retailerAccessApi.getAccessSummary(activeBusiness.id)
      ]);
      setRequests(requestsData);
      setSummary(summaryData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load access requests');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditingPermissions = (request: RetailerAccessRequest) => {
    // Initialize with current permissions from the request
    const currentPermissions: PartnerPermissions = {
      fertilizerChemicalsAccess: (request as any).fertilizerChemicalsAccess || PartnerPermissionLevel.NONE,
      seedAccess: (request as any).seedAccess || PartnerPermissionLevel.NONE,
      grainContractsAccess: (request as any).grainContractsAccess || PartnerPermissionLevel.NONE,
      grainBinsAccess: (request as any).grainBinsAccess || PartnerPermissionLevel.NONE,
      landLoansAccess: (request as any).landLoansAccess || PartnerPermissionLevel.NONE,
      operatingLoansAccess: (request as any).operatingLoansAccess || PartnerPermissionLevel.NONE,
      equipmentLoansAccess: (request as any).equipmentLoansAccess || PartnerPermissionLevel.NONE
    };

    setEditingPermissions({
      requestId: request.id,
      permissions: currentPermissions,
      hasChanges: false
    });
    setExpandedRequestId(request.id);
  };

  const handlePermissionChange = (module: PartnerModule, level: PartnerPermissionLevel) => {
    if (!editingPermissions) return;

    const field = MODULE_TO_FIELD[module];
    setEditingPermissions({
      ...editingPermissions,
      permissions: {
        ...editingPermissions.permissions,
        [field]: level
      },
      hasChanges: true
    });
  };

  const savePermissions = async () => {
    if (!activeBusiness?.id || !editingPermissions) return;

    setProcessingId(editingPermissions.requestId);
    setError(null);

    try {
      await retailerAccessApi.updatePermissions(
        activeBusiness.id,
        editingPermissions.requestId,
        editingPermissions.permissions
      );
      setEditingPermissions(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save permissions');
    } finally {
      setProcessingId(null);
    }
  };

  const cancelEditingPermissions = () => {
    setEditingPermissions(null);
  };

  const getInterestLabel = (interest?: RetailerInterest) => {
    switch (interest) {
      case 'INPUTS':
        return 'Farm Inputs';
      case 'GRAIN':
        return 'Grain';
      case 'BOTH':
        return 'Inputs & Grain';
      default:
        return 'Unknown';
    }
  };

  const hasAnyAccess = (request: RetailerAccessRequest): boolean => {
    const r = request as any;
    return (
      r.fertilizerChemicalsAccess !== 'NONE' ||
      r.seedAccess !== 'NONE' ||
      r.grainContractsAccess !== 'NONE' ||
      r.grainBinsAccess !== 'NONE' ||
      r.landLoansAccess !== 'NONE' ||
      r.operatingLoansAccess !== 'NONE' ||
      r.equipmentLoansAccess !== 'NONE'
    );
  };

  const getAccessBadge = (request: RetailerAccessRequest) => {
    if (hasAnyAccess(request)) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Has Access</span>;
    }
    if (request.inputsStatus === 'PENDING' || request.grainStatus === 'PENDING') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Pending</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">No Access</span>;
  };

  const getPermissionLevelColor = (level: PartnerPermissionLevel) => {
    switch (level) {
      case PartnerPermissionLevel.EDIT:
        return 'bg-green-100 text-green-800 border-green-300';
      case PartnerPermissionLevel.ADD:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case PartnerPermissionLevel.VIEW:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-500 border-gray-300';
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    if (filter === 'pending') {
      return request.inputsStatus === 'PENDING' || request.grainStatus === 'PENDING';
    }
    if (filter === 'approved') {
      return hasAnyAccess(request);
    }
    if (filter === 'denied') {
      return !hasAnyAccess(request) && request.inputsStatus !== 'PENDING' && request.grainStatus !== 'PENDING';
    }
    return true;
  });

  // Sort pending requests to top
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const aHasPending = a.inputsStatus === 'PENDING' || a.grainStatus === 'PENDING';
    const bHasPending = b.inputsStatus === 'PENDING' || b.grainStatus === 'PENDING';
    if (aHasPending && !bHasPending) return -1;
    if (!aHasPending && bHasPending) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (!activeBusiness) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Please select a business first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Partner Access Management</h1>
        <p className="text-gray-600 mt-1">
          Control what data your partners (retailers, grain merchandisers, banks) can access
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm font-medium text-green-700">Active Partners</div>
            <div className="text-3xl font-bold text-green-900 mt-1">{summary.approved}</div>
            <p className="text-xs text-green-600 mt-1">Have some level of access</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm font-medium text-yellow-700">Pending Requests</div>
            <div className="text-3xl font-bold text-yellow-900 mt-1">{summary.pending}</div>
            <p className="text-xs text-yellow-600 mt-1">Awaiting your response</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700">No Access</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{summary.denied}</div>
            <p className="text-xs text-gray-600 mt-1">Denied or not configured</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {(['all', 'pending', 'approved', 'denied'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 capitalize ${
                  filter === tab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'approved' ? 'Has Access' : tab} {tab === 'pending' && summary?.pending ? `(${summary.pending})` : ''}
              </button>
            ))}
          </nav>
        </div>

        {/* Error Display */}
        {error && (
          <div className="m-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
            <button onClick={() => setError(null)} className="float-right font-bold">x</button>
          </div>
        )}

        {/* Request List */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-500">Loading access requests...</p>
            </div>
          ) : sortedRequests.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="mt-4 text-gray-500">
                {filter === 'all'
                  ? 'No partners have requested access yet.'
                  : `No ${filter} requests.`}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Partners within your area will appear here when they register.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedRequests.map((request) => {
                const isEditing = editingPermissions?.requestId === request.id;
                const isExpanded = expandedRequestId === request.id;

                return (
                  <div
                    key={request.id}
                    className={`border rounded-lg ${
                      request.inputsStatus === 'PENDING' || request.grainStatus === 'PENDING'
                        ? 'border-yellow-300 bg-yellow-50'
                        : hasAnyAccess(request)
                        ? 'border-green-200 bg-white'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Collapsed View */}
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        {/* Partner Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {request.retailer?.companyName}
                            </h3>
                            {request.retailer?.distance !== undefined && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                {Math.round(request.retailer.distance)} miles away
                              </span>
                            )}
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                              Interested in: {getInterestLabel(request.retailer?.interest)}
                            </span>
                            {getAccessBadge(request)}
                          </div>

                          {/* Contact Info */}
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            {request.retailer?.city && request.retailer?.state && (
                              <p>Location: {request.retailer.city}, {request.retailer.state}</p>
                            )}
                            {request.retailer?.phone && (
                              <p>Phone: {request.retailer.phone}</p>
                            )}
                            {request.retailer?.user?.email && (
                              <p>Email: {request.retailer.user.email}</p>
                            )}
                            {request.retailer?.user?.firstName && (
                              <p>Contact: {request.retailer.user.firstName} {request.retailer.user.lastName}</p>
                            )}
                          </div>

                          {/* Current Access Summary (when not expanded) */}
                          {!isExpanded && hasAnyAccess(request) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {Object.entries(MODULE_TO_FIELD).map(([module, field]) => {
                                const level = (request as any)[field] as PartnerPermissionLevel;
                                if (level === PartnerPermissionLevel.NONE) return null;
                                return (
                                  <span
                                    key={module}
                                    className={`px-2 py-1 text-xs font-medium rounded border ${getPermissionLevelColor(level)}`}
                                  >
                                    {MODULE_DISPLAY_NAMES[module as PartnerModule]}: {PERMISSION_DISPLAY_NAMES[level]}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          <p className="mt-2 text-xs text-gray-500">
                            Requested: {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (isExpanded) {
                                setExpandedRequestId(null);
                                setEditingPermissions(null);
                              } else {
                                startEditingPermissions(request);
                              }
                            }}
                            className={`px-4 py-2 text-sm font-medium rounded-md ${
                              isExpanded
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            {isExpanded ? 'Collapse' : 'Configure Access'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Permission Editor */}
                    {isExpanded && isEditing && (
                      <div className="border-t border-gray-200 bg-gray-50 p-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4">
                          Configure Access Levels
                        </h4>

                        <div className="space-y-6">
                          {Object.entries(MODULE_CATEGORIES).map(([category, modules]) => (
                            <div key={category}>
                              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                {category}
                              </h5>
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {modules.map((module) => {
                                  const field = MODULE_TO_FIELD[module];
                                  const currentLevel = editingPermissions.permissions[field];

                                  return (
                                    <div
                                      key={module}
                                      className="bg-white border border-gray-200 rounded-lg p-3"
                                    >
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {MODULE_DISPLAY_NAMES[module]}
                                      </label>
                                      <select
                                        value={currentLevel}
                                        onChange={(e) => handlePermissionChange(module, e.target.value as PartnerPermissionLevel)}
                                        className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                          currentLevel !== PartnerPermissionLevel.NONE
                                            ? 'border-green-300 bg-green-50'
                                            : 'border-gray-300'
                                        }`}
                                      >
                                        <option value={PartnerPermissionLevel.NONE}>No Access</option>
                                        <option value={PartnerPermissionLevel.VIEW}>View Only</option>
                                        <option value={PartnerPermissionLevel.ADD}>View & Add</option>
                                        <option value={PartnerPermissionLevel.EDIT}>Full Access (Edit)</option>
                                      </select>
                                      <p className="mt-1 text-xs text-gray-500">
                                        {currentLevel === PartnerPermissionLevel.NONE && 'Partner cannot see this data'}
                                        {currentLevel === PartnerPermissionLevel.VIEW && 'Partner can view but not modify'}
                                        {currentLevel === PartnerPermissionLevel.ADD && 'Partner can add new records'}
                                        {currentLevel === PartnerPermissionLevel.EDIT && 'Partner has full control'}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-6 pt-4 border-t border-gray-200">
                          <div className="flex flex-wrap gap-2 mb-4">
                            <button
                              onClick={() => {
                                const allEdit: PartnerPermissions = {
                                  fertilizerChemicalsAccess: PartnerPermissionLevel.EDIT,
                                  seedAccess: PartnerPermissionLevel.EDIT,
                                  grainContractsAccess: PartnerPermissionLevel.EDIT,
                                  grainBinsAccess: PartnerPermissionLevel.EDIT,
                                  landLoansAccess: PartnerPermissionLevel.EDIT,
                                  operatingLoansAccess: PartnerPermissionLevel.EDIT,
                                  equipmentLoansAccess: PartnerPermissionLevel.EDIT
                                };
                                setEditingPermissions({
                                  ...editingPermissions,
                                  permissions: allEdit,
                                  hasChanges: true
                                });
                              }}
                              className="px-3 py-1 text-xs font-medium bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Grant Full Access
                            </button>
                            <button
                              onClick={() => {
                                const viewOnly: PartnerPermissions = {
                                  fertilizerChemicalsAccess: PartnerPermissionLevel.VIEW,
                                  seedAccess: PartnerPermissionLevel.VIEW,
                                  grainContractsAccess: PartnerPermissionLevel.VIEW,
                                  grainBinsAccess: PartnerPermissionLevel.VIEW,
                                  landLoansAccess: PartnerPermissionLevel.VIEW,
                                  operatingLoansAccess: PartnerPermissionLevel.VIEW,
                                  equipmentLoansAccess: PartnerPermissionLevel.VIEW
                                };
                                setEditingPermissions({
                                  ...editingPermissions,
                                  permissions: viewOnly,
                                  hasChanges: true
                                });
                              }}
                              className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              View Only (All)
                            </button>
                            <button
                              onClick={() => {
                                const revokeAll: PartnerPermissions = {
                                  fertilizerChemicalsAccess: PartnerPermissionLevel.NONE,
                                  seedAccess: PartnerPermissionLevel.NONE,
                                  grainContractsAccess: PartnerPermissionLevel.NONE,
                                  grainBinsAccess: PartnerPermissionLevel.NONE,
                                  landLoansAccess: PartnerPermissionLevel.NONE,
                                  operatingLoansAccess: PartnerPermissionLevel.NONE,
                                  equipmentLoansAccess: PartnerPermissionLevel.NONE
                                };
                                setEditingPermissions({
                                  ...editingPermissions,
                                  permissions: revokeAll,
                                  hasChanges: true
                                });
                              }}
                              className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Revoke All Access
                            </button>
                          </div>

                          {/* Save/Cancel Buttons */}
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={cancelEditingPermissions}
                              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={savePermissions}
                              disabled={processingId === request.id || !editingPermissions.hasChanges}
                              className={`px-4 py-2 text-sm font-medium rounded-md ${
                                editingPermissions.hasChanges
                                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {processingId === request.id ? 'Saving...' : 'Save Permissions'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">How Partner Access Works</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>- Partners (retailers, grain merchandisers, banks) request access based on location</li>
          <li>- You control exactly what data each partner can see and modify</li>
          <li>- <strong>No Access</strong>: Partner cannot see this data</li>
          <li>- <strong>View Only</strong>: Partner can see but not change data</li>
          <li>- <strong>View & Add</strong>: Partner can view and add new records</li>
          <li>- <strong>Full Access</strong>: Partner can view, add, and edit all records</li>
          <li>- You can change access levels at any time</li>
        </ul>
      </div>
    </div>
  );
}
