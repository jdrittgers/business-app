import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { retailerAccessApi } from '../api/retailer-access.api';
import {
  RetailerAccessRequest,
  AccessSummary,
  AccessRequestStatus,
  RetailerInterest
} from '@business-app/shared';

export default function FarmerAccessManagement() {
  const { user } = useAuthStore();
  const activeBusiness = user?.businessMemberships?.[0]?.business;
  const [requests, setRequests] = useState<RetailerAccessRequest[]>([]);
  const [summary, setSummary] = useState<AccessSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  const handleRespond = async (
    requestId: string,
    type: 'inputs' | 'grain',
    status: 'APPROVED' | 'DENIED'
  ) => {
    if (!activeBusiness?.id) return;

    setProcessingId(requestId);
    setError(null);

    try {
      await retailerAccessApi.respondToRequest(activeBusiness.id, requestId, { type, status });
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update access');
    } finally {
      setProcessingId(null);
    }
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

  const getStatusBadge = (status: AccessRequestStatus) => {
    switch (status) {
      case 'APPROVED':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Approved</span>;
      case 'DENIED':
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Denied</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Pending</span>;
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    if (filter === 'pending') {
      return request.inputsStatus === 'PENDING' || request.grainStatus === 'PENDING';
    }
    if (filter === 'approved') {
      return request.inputsStatus === 'APPROVED' || request.grainStatus === 'APPROVED';
    }
    if (filter === 'denied') {
      return request.inputsStatus === 'DENIED' && request.grainStatus === 'DENIED';
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
        <h1 className="text-2xl font-bold text-gray-900">Retailer Access Management</h1>
        <p className="text-gray-600 mt-1">
          Control which retailers can view your inventory and place bids
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm font-medium text-green-700">Approved</div>
            <div className="text-3xl font-bold text-green-900 mt-1">{summary.approved}</div>
            <p className="text-xs text-green-600 mt-1">Can view your data</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm font-medium text-yellow-700">Pending</div>
            <div className="text-3xl font-bold text-yellow-900 mt-1">{summary.pending}</div>
            <p className="text-xs text-yellow-600 mt-1">Awaiting your response</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700">Denied</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{summary.denied}</div>
            <p className="text-xs text-gray-600 mt-1">No access</p>
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
                {tab} {tab === 'pending' && summary?.pending ? `(${summary.pending})` : ''}
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
                  ? 'No retailers have requested access yet.'
                  : `No ${filter} requests.`}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Retailers within your area will appear here when they register.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedRequests.map((request) => (
                <div
                  key={request.id}
                  className={`border rounded-lg p-6 ${
                    request.inputsStatus === 'PENDING' || request.grainStatus === 'PENDING'
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Retailer Info */}
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

                      <p className="mt-2 text-xs text-gray-500">
                        Requested: {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Access Controls */}
                    <div className="flex flex-col gap-4 lg:w-80">
                      {/* Inputs Access */}
                      <div className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Inputs Access</span>
                          {getStatusBadge(request.inputsStatus as AccessRequestStatus)}
                        </div>
                        {request.inputsStatus === 'PENDING' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRespond(request.id, 'inputs', 'APPROVED')}
                              disabled={processingId === request.id}
                              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRespond(request.id, 'inputs', 'DENIED')}
                              disabled={processingId === request.id}
                              className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                              Deny
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {request.inputsStatus === 'DENIED' ? (
                              <button
                                onClick={() => handleRespond(request.id, 'inputs', 'APPROVED')}
                                disabled={processingId === request.id}
                                className="flex-1 px-3 py-2 bg-green-100 text-green-700 text-sm rounded-md hover:bg-green-200 disabled:opacity-50"
                              >
                                Grant Access
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRespond(request.id, 'inputs', 'DENIED')}
                                disabled={processingId === request.id}
                                className="flex-1 px-3 py-2 bg-red-100 text-red-700 text-sm rounded-md hover:bg-red-200 disabled:opacity-50"
                              >
                                Revoke Access
                              </button>
                            )}
                          </div>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Can view your input bid requests
                        </p>
                      </div>

                      {/* Grain Access */}
                      <div className="border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Grain Access</span>
                          {getStatusBadge(request.grainStatus as AccessRequestStatus)}
                        </div>
                        {request.grainStatus === 'PENDING' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRespond(request.id, 'grain', 'APPROVED')}
                              disabled={processingId === request.id}
                              className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRespond(request.id, 'grain', 'DENIED')}
                              disabled={processingId === request.id}
                              className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                              Deny
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {request.grainStatus === 'DENIED' ? (
                              <button
                                onClick={() => handleRespond(request.id, 'grain', 'APPROVED')}
                                disabled={processingId === request.id}
                                className="flex-1 px-3 py-2 bg-green-100 text-green-700 text-sm rounded-md hover:bg-green-200 disabled:opacity-50"
                              >
                                Grant Access
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRespond(request.id, 'grain', 'DENIED')}
                                disabled={processingId === request.id}
                                className="flex-1 px-3 py-2 bg-red-100 text-red-700 text-sm rounded-md hover:bg-red-200 disabled:opacity-50"
                              >
                                Revoke Access
                              </button>
                            )}
                          </div>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Can view grain bins marked for sale
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">How Retailer Access Works</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>- Retailers set a search radius when they register</li>
          <li>- If your farm is within their radius, they'll request access</li>
          <li>- You control access separately for inputs and grain</li>
          <li>- <strong>Inputs access</strong>: Retailer can view and bid on your input requests</li>
          <li>- <strong>Grain access</strong>: Retailer can view grain bins you've marked for sale</li>
          <li>- You can revoke access at any time</li>
        </ul>
      </div>
    </div>
  );
}
