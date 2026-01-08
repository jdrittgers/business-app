import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRetailerAuthStore } from '../store/retailerAuthStore';
import { biddingApi } from '../api/bidding.api';
import {
  BidRequest,
  RetailerBid,
  BidRequestStatus,
  CreateRetailerBidItemInput,
  formatDistance
} from '@business-app/shared';

export default function RetailerDashboard() {
  const { retailer, user, isAuthenticated, logout } = useRetailerAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'available' | 'my-bids'>('available');
  const [openBidRequests, setOpenBidRequests] = useState<BidRequest[]>([]);
  const [myBids, setMyBids] = useState<RetailerBid[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRadius, setSelectedRadius] = useState<number>(50);

  // Modal state
  const [showSubmitBidModal, setShowSubmitBidModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedBidRequest, setSelectedBidRequest] = useState<BidRequest | null>(null);
  const [editingBid, setEditingBid] = useState<RetailerBid | null>(null);
  const [bidFormData, setBidFormData] = useState({
    totalDeliveredPrice: '',
    guaranteedDeliveryDate: '',
    expirationDate: '',
    termsAcknowledged: false,
    notes: '',
    bidItems: [] as { bidRequestItemId: string; pricePerUnit: string }[]
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/retailer/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (activeTab === 'available') {
      loadOpenBidRequests();
    } else {
      loadMyBids();
    }
  }, [activeTab, selectedRadius]);

  const loadOpenBidRequests = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: any = {};

      if (retailer?.latitude && retailer?.longitude) {
        params.latitude = retailer.latitude;
        params.longitude = retailer.longitude;
        params.radiusMiles = selectedRadius;
      }

      const data = await biddingApi.getOpenBidRequests(params);
      setOpenBidRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load bid requests');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyBids = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await biddingApi.getMyBids();
      setMyBids(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load your bids');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBidRequest) return;

    if (!bidFormData.termsAcknowledged) {
      setError('You must acknowledge the terms');
      return;
    }

    // Validate per-item pricing
    if (bidFormData.bidItems.length === 0) {
      setError('Please enter prices for all items');
      return;
    }

    for (const item of bidFormData.bidItems) {
      if (!item.pricePerUnit || parseFloat(item.pricePerUnit) <= 0) {
        setError('Please enter valid prices for all items');
        return;
      }
    }

    // Show confirmation modal for new bids
    if (!editingBid) {
      setShowConfirmationModal(true);
      return;
    }

    // If editing, submit directly
    await submitBidToAPI();
  };

  const submitBidToAPI = async () => {
    if (!selectedBidRequest) return;

    try {
      if (editingBid) {
        await biddingApi.updateBid(editingBid.id, {
          totalDeliveredPrice: parseFloat(bidFormData.totalDeliveredPrice),
          guaranteedDeliveryDate: bidFormData.guaranteedDeliveryDate,
          expirationDate: bidFormData.expirationDate || undefined,
          notes: bidFormData.notes || undefined
        });
      } else {
        const bidItems: CreateRetailerBidItemInput[] = bidFormData.bidItems.map(item => ({
          bidRequestItemId: item.bidRequestItemId,
          pricePerUnit: parseFloat(item.pricePerUnit)
        }));

        await biddingApi.createBid({
          bidRequestId: selectedBidRequest.id,
          totalDeliveredPrice: parseFloat(bidFormData.totalDeliveredPrice),
          guaranteedDeliveryDate: bidFormData.guaranteedDeliveryDate,
          expirationDate: bidFormData.expirationDate || undefined,
          termsAcknowledged: bidFormData.termsAcknowledged,
          notes: bidFormData.notes || undefined,
          bidItems
        });
      }

      setShowSubmitBidModal(false);
      setShowConfirmationModal(false);
      resetBidForm();
      loadMyBids();
      loadOpenBidRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit bid');
      setShowConfirmationModal(false);
    }
  };

  const handleEditBid = (bid: RetailerBid) => {
    setEditingBid(bid);
    setSelectedBidRequest(bid.bidRequest || null);

    // Populate bidItems from existing bid
    const existingBidItems = bid.bidItems?.map(item => ({
      bidRequestItemId: item.bidRequestItemId,
      pricePerUnit: item.pricePerUnit.toString()
    })) || [];

    setBidFormData({
      totalDeliveredPrice: bid.totalDeliveredPrice.toString(),
      guaranteedDeliveryDate: new Date(bid.guaranteedDeliveryDate).toISOString().split('T')[0],
      expirationDate: bid.expirationDate ? new Date(bid.expirationDate).toISOString().split('T')[0] : '',
      termsAcknowledged: true,
      notes: bid.notes || '',
      bidItems: existingBidItems
    });
    setShowSubmitBidModal(true);
  };

  const handleDeleteBid = async (bidId: string) => {
    if (!confirm('Are you sure you want to delete this bid?')) {
      return;
    }

    try {
      await biddingApi.deleteBid(bidId);
      loadMyBids();
      loadOpenBidRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete bid');
    }
  };

  const openSubmitBidModal = (bidRequest: BidRequest) => {
    setSelectedBidRequest(bidRequest);
    setEditingBid(null);

    // Initialize bidItems for each item in the request
    const initialBidItems = bidRequest.items?.map(item => ({
      bidRequestItemId: item.id,
      pricePerUnit: ''
    })) || [];

    setBidFormData({
      totalDeliveredPrice: '',
      guaranteedDeliveryDate: '',
      expirationDate: '',
      termsAcknowledged: false,
      notes: '',
      bidItems: initialBidItems
    });

    setShowSubmitBidModal(true);
  };

  const resetBidForm = () => {
    setBidFormData({
      totalDeliveredPrice: '',
      guaranteedDeliveryDate: '',
      expirationDate: '',
      termsAcknowledged: false,
      notes: '',
      bidItems: []
    });
    setSelectedBidRequest(null);
    setEditingBid(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/retailer/login');
  };

  if (!retailer || !user) {
    return <div>Loading...</div>;
  }

  const stats = {
    totalBids: myBids.length,
    activeBids: myBids.filter(b => b.bidRequest?.status === BidRequestStatus.OPEN).length,
    availableRequests: openBidRequests.length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{retailer.companyName}</h1>
              <p className="mt-1 text-indigo-200">
                {user.firstName} {user.lastName} • {user.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-800 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Total Bids</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{stats.totalBids}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Active Bids</div>
            <div className="mt-2 text-3xl font-bold text-green-600">{stats.activeBids}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm font-medium text-gray-500">Available Requests</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">{stats.availableRequests}</div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
            <button onClick={() => setError(null)} className="float-right font-bold">×</button>
          </div>
        )}

        {/* Location Warning */}
        {!retailer?.latitude && !retailer?.longitude && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Location not set</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Add your ZIP code to see bid requests near you and filter by distance. Update your profile to add your location.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('available')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'available'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Available Bid Requests
              </button>
              <button
                onClick={() => setActiveTab('my-bids')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'my-bids'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Bids
              </button>
            </nav>
          </div>

          {/* Radius Filter - Only show in Available tab when retailer has location */}
          {activeTab === 'available' && retailer?.latitude && retailer?.longitude && (
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Show bid requests within:
                </label>
                <select
                  value={selectedRadius}
                  onChange={(e) => setSelectedRadius(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={25}>25 miles</option>
                  <option value={50}>50 miles</option>
                  <option value={100}>100 miles</option>
                  <option value={200}>200 miles</option>
                  <option value={500}>500 miles</option>
                </select>
                <span className="text-sm text-gray-500">
                  {openBidRequests.length} {openBidRequests.length === 1 ? 'request' : 'requests'} found
                </span>
              </div>
            </div>
          )}

          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : activeTab === 'available' ? (
              // Available Bid Requests Tab
              openBidRequests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No open bid requests available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {openBidRequests.map((bidRequest) => (
                    <div key={bidRequest.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">{bidRequest.title}</h3>
                            {bidRequest.distance !== undefined && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                {formatDistance(bidRequest.distance)}
                              </span>
                            )}
                          </div>
                          {bidRequest.description && (
                            <p className="mt-1 text-sm text-gray-600">{bidRequest.description}</p>
                          )}
                          <div className="mt-3 flex gap-6 text-sm text-gray-500">
                            <span>📍 {bidRequest.business?.city}, {bidRequest.business?.state}</span>
                            <span>🏢 {bidRequest.business?.name}</span>
                            {bidRequest.desiredDeliveryDate && (
                              <span>📅 Desired: {new Date(bidRequest.desiredDeliveryDate).toLocaleDateString()}</span>
                            )}
                          </div>

                          {/* Items */}
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Items Requested:</p>
                            <div className="space-y-1">
                              {bidRequest.items?.map((item) => (
                                <div key={item.id} className="text-sm text-gray-600">
                                  • {item.productName} - {item.quantity} {item.unit}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => openSubmitBidModal(bidRequest)}
                          className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
                        >
                          Submit Bid
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // My Bids Tab
              myBids.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">You haven't submitted any bids yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myBids.map((bid) => (
                    <div key={bid.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {bid.bidRequest?.title}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              bid.bidRequest?.status === BidRequestStatus.OPEN
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {bid.bidRequest?.status}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Your Bid</p>
                              <p className="text-2xl font-bold text-indigo-600">
                                ${bid.totalDeliveredPrice.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Delivery Date</p>
                              <p className="font-medium">
                                {new Date(bid.guaranteedDeliveryDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {bid.notes && (
                            <p className="mt-3 text-sm text-gray-600">Notes: {bid.notes}</p>
                          )}

                          <p className="mt-3 text-xs text-gray-500">
                            Submitted: {new Date(bid.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {bid.bidRequest?.status === BidRequestStatus.OPEN && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditBid(bid)}
                              className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteBid(bid.id)}
                              className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Submit/Edit Bid Modal */}
      {showSubmitBidModal && selectedBidRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                {editingBid ? 'Edit Bid' : 'Submit Bid'}
              </h2>

              {/* Request Details */}
              <div className="mb-6 p-4 bg-gray-50 rounded">
                <h3 className="font-semibold mb-2">{selectedBidRequest.title}</h3>
                <p className="text-sm text-gray-600">
                  {selectedBidRequest.business?.name} • {selectedBidRequest.business?.city}, {selectedBidRequest.business?.state}
                </p>
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Items:</p>
                  {selectedBidRequest.items?.map((item) => (
                    <p key={item.id} className="text-sm text-gray-600">
                      • {item.productName} - {item.quantity} {item.unit}
                    </p>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmitBid}>
                <div className="space-y-4">
                  {/* Per-Item Pricing */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Pricing (Price per Unit) *
                    </label>
                    <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
                      {selectedBidRequest.items?.map((item) => {
                        const bidItem = bidFormData.bidItems.find(bi => bi.bidRequestItemId === item.id);
                        return (
                          <div key={item.id} className="flex items-center gap-3 pb-3 border-b border-gray-100 last:border-0">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                              <p className="text-xs text-gray-500">{item.quantity} {item.unit} needed</p>
                              {item.currentPrice && (
                                <p className="text-xs text-green-600">Current best: ${item.currentPrice.toFixed(2)}/{item.unit}</p>
                              )}
                            </div>
                            <div className="w-32">
                              <div className="relative">
                                <span className="absolute left-2 top-2 text-gray-500 text-sm">$</span>
                                <input
                                  type="number"
                                  required
                                  step="0.01"
                                  min="0.01"
                                  value={bidItem?.pricePerUnit || ''}
                                  onChange={(e) => {
                                    const newBidItems = [...bidFormData.bidItems];
                                    const existingIndex = newBidItems.findIndex(bi => bi.bidRequestItemId === item.id);
                                    if (existingIndex >= 0) {
                                      newBidItems[existingIndex].pricePerUnit = e.target.value;
                                    } else {
                                      newBidItems.push({
                                        bidRequestItemId: item.id,
                                        pricePerUnit: e.target.value
                                      });
                                    }

                                    // Auto-calculate total
                                    const total = selectedBidRequest.items?.reduce((sum, reqItem) => {
                                      const bi = newBidItems.find(b => b.bidRequestItemId === reqItem.id);
                                      if (bi && bi.pricePerUnit) {
                                        return sum + (parseFloat(bi.pricePerUnit) * Number(reqItem.quantity));
                                      }
                                      return sum;
                                    }, 0) || 0;

                                    setBidFormData({
                                      ...bidFormData,
                                      bidItems: newBidItems,
                                      totalDeliveredPrice: total.toFixed(2)
                                    });
                                  }}
                                  className="w-full pl-6 pr-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  placeholder="0.00"
                                />
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">per {item.unit}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Total Price (auto-calculated) */}
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Delivered Price *
                    </label>
                    <div className="text-2xl font-bold text-green-700">
                      ${bidFormData.totalDeliveredPrice || '0.00'}
                    </div>
                    <p className="mt-1 text-xs text-gray-600">Auto-calculated from per-unit prices</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Guaranteed Delivery Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={bidFormData.guaranteedDeliveryDate}
                        onChange={(e) => setBidFormData({ ...bidFormData, guaranteedDeliveryDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bid Expiration Date
                      </label>
                      <input
                        type="date"
                        value={bidFormData.expirationDate}
                        onChange={(e) => setBidFormData({ ...bidFormData, expirationDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Optional: When your bid expires</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={bidFormData.notes}
                      onChange={(e) => setBidFormData({ ...bidFormData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                      placeholder="Any additional information..."
                    />
                  </div>

                  {!editingBid && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          checked={bidFormData.termsAcknowledged}
                          onChange={(e) => setBidFormData({ ...bidFormData, termsAcknowledged: e.target.checked })}
                          className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          I acknowledge that the price I am submitting is the <strong>delivered price</strong> to the farmer's location, and I guarantee delivery by the date specified above. *
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubmitBidModal(false);
                      resetBidForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    {editingBid ? 'Update Bid' : 'Submit Bid'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Confirm Official Bid Submission
              </h3>
              <div className="text-sm text-gray-600 space-y-3 mb-6 text-left">
                <p className="font-semibold text-gray-900">
                  This bid is official and binding. Please confirm:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Your total bid: <strong className="text-green-700">${bidFormData.totalDeliveredPrice}</strong></li>
                  <li>Delivery by: <strong>{new Date(bidFormData.guaranteedDeliveryDate).toLocaleDateString()}</strong></li>
                  {bidFormData.expirationDate && (
                    <li>Bid expires: <strong>{new Date(bidFormData.expirationDate).toLocaleDateString()}</strong></li>
                  )}
                  <li>This is a delivered price to the farmer's location</li>
                  <li>You can update or delete this bid until the farmer closes the request</li>
                </ul>
                <p className="text-red-600 font-medium mt-4">
                  By confirming, you are officially submitting this bid and agree to honor these terms if selected.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmationModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitBidToAPI}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold"
                >
                  Confirm & Submit Bid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
