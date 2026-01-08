import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { biddingApi } from '../api/bidding.api';
import {
  BidRequest,
  BidRequestStatus,
  ProductType,
  CreateBidRequestItemInput
} from '@business-app/shared';

export default function InputBids() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  const [bidRequests, setBidRequests] = useState<BidRequest[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<BidRequestStatus | 'ALL'>('ALL');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewBidsModal, setShowViewBidsModal] = useState(false);
  const [selectedBidRequest, setSelectedBidRequest] = useState<BidRequest | null>(null);
  const [formData, setFormData] = useState({
    desiredDeliveryDate: '',
    notes: ''
  });
  const [items, setItems] = useState<CreateBidRequestItemInput[]>([
    { productType: ProductType.CHEMICAL, productName: '', quantity: 0, unit: 'GAL', currentPrice: 0 }
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user && user.businessMemberships && user.businessMemberships.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(user.businessMemberships[0].businessId);
    }
  }, [user, selectedBusinessId]);

  useEffect(() => {
    if (selectedBusinessId) {
      loadBidRequests();
    }
  }, [selectedBusinessId, filterStatus]);

  // Check for preselected products from Product Catalog
  useEffect(() => {
    const preselectedData = localStorage.getItem('preselectedBidProducts');
    if (preselectedData) {
      try {
        const preselectedItems = JSON.parse(preselectedData);
        if (Array.isArray(preselectedItems) && preselectedItems.length > 0) {
          setItems(preselectedItems);
          setShowCreateModal(true); // Auto-open the create modal
        }
        localStorage.removeItem('preselectedBidProducts'); // Clear after reading
      } catch (err) {
        console.error('Failed to parse preselected products:', err);
      }
    }
  }, []);

  const loadBidRequests = async () => {
    if (!selectedBusinessId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await biddingApi.getBidRequests(selectedBusinessId, {
        status: filterStatus === 'ALL' ? undefined : filterStatus
      });
      setBidRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load bid requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBidRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusinessId) return;

    const validItems = items.filter(item => item.productName && item.quantity > 0);

    // Auto-generate title based on items
    const hasChemicals = validItems.some(item => item.productType === ProductType.CHEMICAL);
    const hasFertilizers = validItems.some(item => item.productType === ProductType.FERTILIZER);

    let title = '';
    if (hasChemicals && hasFertilizers) {
      title = `Chemicals & Fertilizers - ${validItems.length} item${validItems.length > 1 ? 's' : ''}`;
    } else if (hasChemicals) {
      title = validItems.length === 1 ? validItems[0].productName : `Chemicals - ${validItems.length} items`;
    } else if (hasFertilizers) {
      title = validItems.length === 1 ? validItems[0].productName : `Fertilizers - ${validItems.length} items`;
    }

    try {
      await biddingApi.createBidRequest(selectedBusinessId, {
        title,
        desiredDeliveryDate: formData.desiredDeliveryDate || undefined,
        notes: formData.notes || undefined,
        items: validItems
      });

      setShowCreateModal(false);
      resetForm();
      loadBidRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create bid request');
    }
  };

  const handleCloseBidRequest = async (id: string) => {
    if (!selectedBusinessId) return;
    if (!confirm('Are you sure you want to close this bid request? No more bids can be submitted after closing.')) {
      return;
    }

    try {
      await biddingApi.closeBidRequest(selectedBusinessId, id);
      loadBidRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to close bid request');
    }
  };

  const handleDeleteBidRequest = async (id: string) => {
    if (!selectedBusinessId) return;
    if (!confirm('Are you sure you want to delete this bid request?')) {
      return;
    }

    try {
      await biddingApi.deleteBidRequest(selectedBusinessId, id);
      loadBidRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete bid request');
    }
  };

  const handleDeleteRetailerBid = async (bidRequestId: string, bidId: string, retailerName: string) => {
    if (!selectedBusinessId) return;
    if (!confirm(`Are you sure you want to delete the bid from ${retailerName}? This cannot be undone.`)) {
      return;
    }

    try {
      await biddingApi.deleteRetailerBid(selectedBusinessId, bidRequestId, bidId);
      loadBidRequests();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete bid');
    }
  };

  const handleAcceptBid = async (bidId: string, retailerName: string, totalPrice: number) => {
    if (!confirm(`Accept bid from ${retailerName} for $${totalPrice.toLocaleString()}?\n\nThis will notify the retailer that their bid has been accepted.`)) {
      return;
    }

    try {
      await biddingApi.acceptBid(bidId);
      // Reload to show updated status
      loadBidRequests();
      alert(`✅ Bid accepted! ${retailerName} has been notified.`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept bid');
    }
  };

  const resetForm = () => {
    setFormData({
      desiredDeliveryDate: '',
      notes: ''
    });
    setItems([
      { productType: ProductType.CHEMICAL, productName: '', quantity: 0, unit: 'GAL', currentPrice: 0 }
    ]);
  };

  const addItem = () => {
    setItems([...items, { productType: ProductType.CHEMICAL, productName: '', quantity: 0, unit: 'GAL', currentPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Show loading state while auth is loading or user data isn't available
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show message if user has no business memberships
  if (!user.businessMemberships || user.businessMemberships.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow">
          <p className="text-gray-600">You don't have access to any businesses.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Input Bids</h1>
              <p className="mt-1 text-sm text-gray-500">Manage bid requests for fertilizers and chemicals</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Bid Request
              </button>
            </div>
          </div>

          {/* Business Selector */}
          {user && user.businessMemberships.length > 1 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Business</label>
              <select
                value={selectedBusinessId || ''}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {user.businessMemberships.map(membership => (
                  <option key={membership.businessId} value={membership.businessId}>
                    {membership.business.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
            <button onClick={() => setError(null)} className="float-right font-bold">×</button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ALL">All</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bid Requests List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : bidRequests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No bid requests found. Create your first one!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {bidRequests.map((bidRequest) => {
              const chemicals = bidRequest.items?.filter(item => item.productType === 'CHEMICAL') || [];
              const fertilizers = bidRequest.items?.filter(item => item.productType === 'FERTILIZER') || [];
              const allItems = [...chemicals, ...fertilizers];

              // Get unique retailers who have bid
              const retailerBids = bidRequest.bids || [];
              const retailerColors = ['bg-blue-200', 'bg-pink-200', 'bg-yellow-200', 'bg-green-200', 'bg-purple-200', 'bg-orange-200'];

              return (
                <div key={bidRequest.id} className="bg-white rounded-lg shadow overflow-hidden">
                  {/* Header */}
                  <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{bidRequest.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        bidRequest.status === BidRequestStatus.OPEN
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {bidRequest.status}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedBidRequest(bidRequest);
                          setShowViewBidsModal(true);
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                      >
                        📊 View Details
                      </button>
                      {bidRequest.status === BidRequestStatus.OPEN && (
                        <>
                          <button
                            onClick={() => handleCloseBidRequest(bidRequest.id)}
                            className="px-3 py-1 text-sm bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100"
                          >
                            Close
                          </button>
                          <button
                            onClick={() => handleDeleteBidRequest(bidRequest.id)}
                            className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Spreadsheet Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold sticky left-0 bg-gray-100 z-10">
                            Retailer
                          </th>
                          {allItems.map((item) => (
                            <th key={item.id} className="border border-gray-300 px-3 py-2 text-center font-semibold min-w-[120px]">
                              {item.productName}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Gallons Needed Row */}
                        <tr className="bg-white">
                          <td className="border border-gray-300 px-3 py-2 font-medium sticky left-0 bg-white z-10">
                            Gallons Needed
                          </td>
                          {allItems.map((item) => (
                            <td key={item.id} className="border border-gray-300 px-3 py-2 text-center">
                              {item.quantity} {item.unit}
                            </td>
                          ))}
                        </tr>

                        {/* Current Price Row */}
                        <tr className="bg-green-50">
                          <td className="border border-gray-300 px-3 py-2 font-bold sticky left-0 bg-green-50 z-10">
                            Price/{allItems[0]?.unit || 'GAL'}
                          </td>
                          {allItems.map((item) => (
                            <td key={item.id} className="border border-gray-300 px-3 py-2 text-center font-bold text-green-700">
                              {item.currentPrice ? `$${item.currentPrice.toFixed(2)}` : '-'}
                            </td>
                          ))}
                        </tr>

                        {/* Retailer Bid Rows */}
                        {retailerBids.map((bid, index) => (
                          <tr key={bid.id} className={retailerColors[index % retailerColors.length]}>
                            <td className={`border border-gray-300 px-3 py-2 font-medium sticky left-0 z-10 ${retailerColors[index % retailerColors.length]}`}>
                              <div className="flex items-center justify-between">
                                <span>{bid.retailer?.companyName || 'Unknown'}</span>
                                {bidRequest.status === BidRequestStatus.OPEN && (
                                  <button
                                    onClick={() => handleDeleteRetailerBid(bidRequest.id, bid.id, bid.retailer?.companyName || 'Unknown')}
                                    className="ml-2 text-red-600 hover:text-red-800 font-bold text-lg"
                                    title="Delete this bid"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </td>
                            {allItems.map((item) => {
                              const bidItem = bid.bidItems?.find(bi => bi.bidRequestItemId === item.id);
                              return (
                                <td key={item.id} className="border border-gray-300 px-3 py-2 text-center">
                                  {bidItem ? `$${bidItem.pricePerUnit.toFixed(2)}` : '-'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}

                        {/* Empty state if no bids */}
                        {retailerBids.length === 0 && (
                          <tr>
                            <td colSpan={allItems.length + 1} className="border border-gray-300 px-3 py-4 text-center text-gray-500">
                              No bids received yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Bid Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Create Bid Request</h2>
              <form onSubmit={handleCreateBidRequest}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Desired Delivery Date
                    </label>
                    <input
                      type="date"
                      value={formData.desiredDeliveryDate}
                      onChange={(e) => setFormData({ ...formData, desiredDeliveryDate: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      rows={2}
                      placeholder="Any additional details or requirements..."
                    />
                  </div>

                  {/* Items */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Items *
                      </label>
                      <button
                        type="button"
                        onClick={addItem}
                        className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                      >
                        Add Item
                      </button>
                    </div>
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 mb-2 p-3 bg-gray-50 rounded">
                        <select
                          value={item.productType}
                          onChange={(e) => updateItem(index, 'productType', e.target.value)}
                          className="col-span-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="CHEMICAL">Chemical</option>
                          <option value="FERTILIZER">Fertilizer</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Product name"
                          value={item.productName}
                          onChange={(e) => updateItem(index, 'productName', e.target.value)}
                          className="col-span-4 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          placeholder="Quantity"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="col-span-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          className="col-span-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="GAL">GAL</option>
                          <option value="LB">LB</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Current Price"
                          value={item.currentPrice || ''}
                          onChange={(e) => updateItem(index, 'currentPrice', parseFloat(e.target.value) || 0)}
                          className="col-span-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="col-span-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Bid Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Bids Modal */}
      {showViewBidsModal && selectedBidRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">{selectedBidRequest.title}</h2>

              {/* Request Details */}
              <div className="mb-6 p-4 bg-gray-50 rounded">
                <h3 className="font-semibold mb-2">Request Details</h3>
                {selectedBidRequest.description && (
                  <p className="text-sm text-gray-600 mb-2">{selectedBidRequest.description}</p>
                )}
                <div className="text-sm text-gray-600">
                  <p>Status: <span className="font-medium">{selectedBidRequest.status}</span></p>
                  {selectedBidRequest.desiredDeliveryDate && (
                    <p>Desired Delivery: {new Date(selectedBidRequest.desiredDeliveryDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold mb-3">Pricing Summary</h3>
                {(() => {
                  const totalStartingPrice = selectedBidRequest.items?.reduce((sum, item) => {
                    // Use startingPrice (farmer's target or first retailer bid), fallback to currentPrice for backward compatibility
                    const basePrice = item.startingPrice || item.currentPrice || 0;
                    return sum + basePrice * item.quantity;
                  }, 0) || 0;

                  const bestBid = selectedBidRequest.bids && selectedBidRequest.bids.length > 0
                    ? selectedBidRequest.bids.sort((a, b) => a.totalDeliveredPrice - b.totalDeliveredPrice)[0]
                    : null;

                  const savings = bestBid ? totalStartingPrice - bestBid.totalDeliveredPrice : 0;
                  const savingsPercent = totalStartingPrice > 0 ? (savings / totalStartingPrice) * 100 : 0;

                  return (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Starting Price</p>
                        <p className="text-2xl font-bold text-gray-700">${totalStartingPrice.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Best Bid</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {bestBid ? `$${bestBid.totalDeliveredPrice.toLocaleString()}` : 'No bids yet'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Projected Savings</p>
                        <p className="text-2xl font-bold text-green-600">
                          {bestBid ? `$${savings.toLocaleString()}` : '$0'}
                        </p>
                        {bestBid && savingsPercent > 0 && (
                          <p className="text-sm text-green-600">({savingsPercent.toFixed(1)}% off)</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Items - Organized by Chemicals and Fertilizers */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Items Requested</h3>

                {/* Chemicals */}
                {selectedBidRequest.items?.filter(item => item.productType === 'CHEMICAL').length! > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Chemicals</h4>
                    <div className="space-y-2">
                      {selectedBidRequest.items!
                        .filter(item => item.productType === 'CHEMICAL')
                        .map((item) => (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-blue-50 rounded">
                            <span className="font-medium">{item.productName}</span>
                            <div className="flex gap-4 text-sm">
                              <span className="text-gray-600">{item.quantity} {item.unit}</span>
                              {(item.startingPrice || item.currentPrice) && (
                                <span className="text-gray-700 font-semibold">
                                  Starting: ${(item.startingPrice || item.currentPrice)!.toFixed(2)}/{item.unit}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Fertilizers */}
                {selectedBidRequest.items?.filter(item => item.productType === 'FERTILIZER').length! > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Fertilizers</h4>
                    <div className="space-y-2">
                      {selectedBidRequest.items!
                        .filter(item => item.productType === 'FERTILIZER')
                        .map((item) => (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-green-50 rounded">
                            <span className="font-medium">{item.productName}</span>
                            <div className="flex gap-4 text-sm">
                              <span className="text-gray-600">{item.quantity} {item.unit}</span>
                              {(item.startingPrice || item.currentPrice) && (
                                <span className="text-green-600 font-semibold">
                                  Starting: ${(item.startingPrice || item.currentPrice)!.toFixed(2)}/{item.unit}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bids */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">
                  Bids Received ({selectedBidRequest.bids?.length || 0})
                </h3>
                {selectedBidRequest.bids && selectedBidRequest.bids.length > 0 ? (
                  <div className="space-y-3">
                    {selectedBidRequest.bids
                      .sort((a, b) => a.totalDeliveredPrice - b.totalDeliveredPrice)
                      .map((bid, index) => {
                        const isLowestBid = index === 0;
                        const statusColors = {
                          PENDING: 'bg-yellow-100 text-yellow-800',
                          ACCEPTED: 'bg-green-100 text-green-800',
                          REJECTED: 'bg-red-100 text-red-800'
                        };
                        const borderColor = bid.status === 'ACCEPTED' ? 'border-green-400 bg-green-50' : 'border-gray-200';

                        return (
                          <div key={bid.id} className={`p-4 border-2 ${borderColor} rounded-lg`}>
                            {/* Status Badge */}
                            <div className="flex justify-between items-center mb-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[bid.status]}`}>
                                {bid.status}
                              </span>
                              {isLowestBid && bid.status === 'PENDING' && (
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                  ⭐ Best Price
                                </span>
                              )}
                            </div>

                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-lg">{bid.retailer?.companyName}</p>
                                {bid.retailer?.phone && (
                                  <p className="text-sm text-gray-600">Phone: {bid.retailer.phone}</p>
                                )}
                                {bid.retailer?.city && bid.retailer?.state && (
                                  <p className="text-sm text-gray-600">
                                    📍 {bid.retailer.city}, {bid.retailer.state}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-600">
                                  ${bid.totalDeliveredPrice.toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600">Delivered Price</p>
                              </div>
                            </div>

                            {/* Per-Item Pricing Breakdown */}
                            {bid.bidItems && bid.bidItems.length > 0 && (
                              <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                                <p className="text-xs font-semibold text-gray-700 mb-2">PRICING BREAKDOWN</p>
                                <div className="space-y-2">
                                  {bid.bidItems.map((bidItem) => {
                                    const requestItem = selectedBidRequest.items?.find(
                                      (item) => item.id === bidItem.bidRequestItemId
                                    );
                                    if (!requestItem) return null;

                                    const startingPrice = requestItem.startingPrice || requestItem.currentPrice || 0;
                                    const bidPrice = bidItem.pricePerUnit;
                                    const savings = startingPrice - bidPrice;
                                    const savingsPercent = startingPrice > 0 ? (savings / startingPrice) * 100 : 0;

                                    return (
                                      <div key={bidItem.id} className="text-xs">
                                        <p className="font-medium text-gray-700">{requestItem.productName}</p>
                                        <div className="flex justify-between items-center mt-1">
                                          <div>
                                            <span className="text-gray-500">Starting: ${startingPrice.toFixed(2)}/{requestItem.unit}</span>
                                            <span className="mx-2 text-gray-400">→</span>
                                            <span className={`font-semibold ${savings > 0 ? 'text-green-600' : savings < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                                              Bid: ${bidPrice.toFixed(2)}/{requestItem.unit}
                                            </span>
                                          </div>
                                          {savings !== 0 && (
                                            <span className={`text-xs px-2 py-1 rounded ${savings > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                              {savings > 0 ? '-' : '+'}{Math.abs(savingsPercent).toFixed(1)}%
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="mt-3 text-sm text-gray-600">
                              <p>Guaranteed Delivery: {new Date(bid.guaranteedDeliveryDate).toLocaleDateString()}</p>
                              {bid.notes && <p className="mt-1">Notes: {bid.notes}</p>}
                              {bid.acceptedAt && (
                                <p className="mt-1 text-green-600 font-medium">
                                  ✓ Accepted on {new Date(bid.acceptedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>

                            {/* Accept Button - only for PENDING bids */}
                            {bid.status === 'PENDING' && (
                              <div className="mt-4 flex justify-end">
                                <button
                                  onClick={() => handleAcceptBid(bid.id, bid.retailer?.companyName || 'Unknown Retailer', bid.totalDeliveredPrice)}
                                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                                >
                                  ✓ Accept This Bid
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No bids received yet</p>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowViewBidsModal(false);
                    setSelectedBidRequest(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
