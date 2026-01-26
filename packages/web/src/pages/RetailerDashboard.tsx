import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRetailerAuthStore } from '../store/retailerAuthStore';
import { biddingApi } from '../api/bidding.api';
import { retailerAccessApi } from '../api/retailer-access.api';
import {
  BidRequest,
  RetailerBid,
  BidRequestStatus,
  CreateRetailerBidItemInput,
  formatDistance,
  AccessSummary,
  RetailerAccessRequest,
  PartnerPermissionLevel,
  PartnerModule,
  MODULE_DISPLAY_NAMES,
  PERMISSION_DISPLAY_NAMES
} from '@business-app/shared';

// Countdown Timer Component
function CountdownTimer({ deadline }: { deadline: Date }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const diff = deadlineDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('EXPIRED');
        setIsUrgent(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      // Mark as urgent if less than 24 hours
      setIsUrgent(diff < 24 * 60 * 60 * 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
      isUrgent ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-orange-100 text-orange-800'
    }`}>
      ⏰ {timeLeft}
    </span>
  );
}

export default function RetailerDashboard() {
  const { retailer, user, isAuthenticated } = useRetailerAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'available' | 'my-bids' | 'accepted' | 'farmers'>('available');
  const [openBidRequests, setOpenBidRequests] = useState<BidRequest[]>([]);
  const [myBids, setMyBids] = useState<RetailerBid[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRadius, setSelectedRadius] = useState<number>(50);
  const [accessSummary, setAccessSummary] = useState<AccessSummary | null>(null);
  const [farmerAccessRequests, setFarmerAccessRequests] = useState<RetailerAccessRequest[]>([]);
  const [expandedFarmerId, setExpandedFarmerId] = useState<string | null>(null);

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
    // Load access summary on mount
    loadAccessSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'available') {
      loadOpenBidRequests();
    } else if (activeTab === 'farmers') {
      loadFarmerAccessRequests();
    } else {
      loadMyBids();
    }
  }, [activeTab, selectedRadius]);

  const loadFarmerAccessRequests = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await retailerAccessApi.getMyAccessRequests();
      setFarmerAccessRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load farmer access data');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check if retailer has any access to a farmer
  const hasAnyAccessToFarmer = (request: RetailerAccessRequest): boolean => {
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

  // Helper to get permission level badge color
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

  // Module field mapping
  const MODULE_TO_FIELD: Record<PartnerModule, string> = {
    [PartnerModule.FERTILIZER_CHEMICALS]: 'fertilizerChemicalsAccess',
    [PartnerModule.SEED]: 'seedAccess',
    [PartnerModule.GRAIN_CONTRACTS]: 'grainContractsAccess',
    [PartnerModule.GRAIN_BINS]: 'grainBinsAccess',
    [PartnerModule.LAND_LOANS]: 'landLoansAccess',
    [PartnerModule.OPERATING_LOANS]: 'operatingLoansAccess',
    [PartnerModule.EQUIPMENT_LOANS]: 'equipmentLoansAccess'
  };

  const loadAccessSummary = async () => {
    try {
      const summary = await retailerAccessApi.getMyAccessSummary();
      setAccessSummary(summary);
    } catch (err) {
      // Silently fail - access summary is not critical
      console.error('Failed to load access summary:', err);
    }
  };

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

    // Validate per-item pricing - at least one item must have a price
    const itemsWithPrices = bidFormData.bidItems.filter(
      item => item.pricePerUnit && parseFloat(item.pricePerUnit) > 0
    );

    if (itemsWithPrices.length === 0) {
      setError('Please enter a price for at least one item');
      return;
    }

    // Validate that all entered prices are valid numbers
    for (const item of itemsWithPrices) {
      if (isNaN(parseFloat(item.pricePerUnit)) || parseFloat(item.pricePerUnit) <= 0) {
        setError('Please enter valid prices (greater than 0)');
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
        // Only include items with prices
        const bidItems: CreateRetailerBidItemInput[] = bidFormData.bidItems
          .filter(item => item.pricePerUnit && parseFloat(item.pricePerUnit) > 0)
          .map(item => ({
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

  if (!retailer || !user) {
    return <div>Loading...</div>;
  }

  const acceptedBids = myBids.filter(b => b.status === 'ACCEPTED');

  // Calculate total volumes and amounts
  const calculateVolumes = () => {
    let totalGallons = 0;
    let totalLbs = 0;
    let acceptedTotalValue = 0;

    myBids.forEach(bid => {
      if (bid.status === 'ACCEPTED') {
        acceptedTotalValue += bid.totalDeliveredPrice;
      }

      // Count volumes from bid items for active bids
      if (bid.bidRequest?.status === BidRequestStatus.OPEN && bid.bidRequest.items) {
        bid.bidRequest.items.forEach(item => {
          if (item.unit === 'GAL') {
            totalGallons += item.quantity;
          } else if (item.unit === 'LB' || item.unit === 'TON') {
            totalLbs += item.unit === 'TON' ? item.quantity * 2000 : item.quantity;
          }
        });
      }
    });

    return { totalGallons, totalLbs, acceptedTotalValue };
  };

  const { totalGallons, totalLbs, acceptedTotalValue } = calculateVolumes();

  const stats = {
    totalBids: myBids.length,
    activeBids: myBids.filter(b => b.bidRequest?.status === BidRequestStatus.OPEN).length,
    acceptedBids: acceptedBids.length,
    availableRequests: openBidRequests.length,
    totalGallons,
    totalLbs,
    acceptedTotalValue
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Input Marketplace Dashboard</h1>
        <p className="text-gray-600 mt-1">
          {user.firstName} {user.lastName} • {retailer.companyName}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Total Bids</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{stats.totalBids}</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Active Bids</div>
          <div className="mt-2 text-2xl font-bold text-green-600">{stats.activeBids}</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Accepted Bids</div>
          <div className="mt-2 text-2xl font-bold text-purple-600">{stats.acceptedBids}</div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-500">Available Requests</div>
          <div className="mt-2 text-2xl font-bold text-indigo-600">{stats.availableRequests}</div>
        </div>
      </div>

      {/* Volume & Value Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-5 rounded-xl shadow-sm border border-indigo-200">
          <div className="text-sm font-medium text-indigo-700">Products Out for Bid (GAL)</div>
          <div className="mt-2 text-2xl font-bold text-indigo-900">{stats.totalGallons.toLocaleString()}</div>
          <div className="text-xs text-indigo-600 mt-1">Gallons</div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-xl shadow-sm border border-green-200">
          <div className="text-sm font-medium text-green-700">Products Out for Bid (LB/TON)</div>
          <div className="mt-2 text-2xl font-bold text-green-900">{stats.totalLbs.toLocaleString()}</div>
          <div className="text-xs text-green-600 mt-1">Pounds</div>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-5 rounded-xl shadow-sm border border-purple-200">
          <div className="text-sm font-medium text-purple-700">Accepted Bid Value</div>
          <div className="mt-2 text-2xl font-bold text-purple-900">${stats.acceptedTotalValue.toLocaleString()}</div>
          <div className="text-xs text-purple-600 mt-1">Total Revenue</div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">×</button>
        </div>
      )}

      {/* Access Status Banner */}
      {accessSummary && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Farmer Access:</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                  {accessSummary.approved} Approved
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                  {accessSummary.pending} Pending
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                  {accessSummary.denied} Denied
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              You can only view data from approved farmers
            </p>
          </div>
        </div>
      )}

      {/* Location Warning */}
      {!retailer?.latitude && !retailer?.longitude && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Location not set</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Add your ZIP code to see bid requests near you and filter by distance.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/retailer/profile')}
              className="ml-4 px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 whitespace-nowrap"
            >
              Add ZIP Code
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
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
              <button
                onClick={() => setActiveTab('accepted')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'accepted'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Accepted Bids
              </button>
              <button
                onClick={() => setActiveTab('farmers')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'farmers'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Farmer Access
                {accessSummary?.approved ? (
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                    {accessSummary.approved}
                  </span>
                ) : null}
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
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">{bidRequest.title}</h3>
                            {bidRequest.distance !== undefined && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                {formatDistance(bidRequest.distance)}
                              </span>
                            )}
                            {bidRequest.bidDeadline && (
                              <CountdownTimer deadline={bidRequest.bidDeadline} />
                            )}
                          </div>
                          {bidRequest.description && (
                            <p className="mt-1 text-sm text-gray-600">{bidRequest.description}</p>
                          )}
                          <div className="mt-3 flex gap-6 text-sm text-gray-500 flex-wrap">
                            <span>📍 {bidRequest.business?.city}, {bidRequest.business?.state}</span>
                            <span>🏢 {bidRequest.business?.name}</span>
                            {bidRequest.bidDeadline && (
                              <span className="text-orange-600 font-semibold">🔒 Deadline: {new Date(bidRequest.bidDeadline).toLocaleDateString()}</span>
                            )}
                            {bidRequest.desiredDeliveryDate && (
                              <span>📅 Delivery: {new Date(bidRequest.desiredDeliveryDate).toLocaleDateString()}</span>
                            )}
                          </div>

                          {/* Items with Current Prices */}
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Items Requested:</p>
                            <div className="space-y-2">
                              {bidRequest.items?.map((item) => (
                                <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                  <div className="text-sm text-gray-700">
                                    <span className="font-medium">{item.productName}</span>
                                    <span className="text-gray-500 ml-2">
                                      {item.quantity} {item.unit}
                                    </span>
                                  </div>
                                  {item.currentPrice !== undefined && item.currentPrice > 0 && (
                                    <div className="text-sm">
                                      <span className="text-gray-500">Beat: </span>
                                      <span className="font-bold text-green-600">
                                        ${item.currentPrice.toFixed(2)}/{item.unit}
                                      </span>
                                    </div>
                                  )}
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
            ) : activeTab === 'my-bids' ? (
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
            ) : activeTab === 'accepted' ? (
              // Accepted Bids Tab
              acceptedBids.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">You don't have any accepted bids yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {acceptedBids.map((bid) => (
                    <div key={bid.id} className="border-2 border-green-400 bg-green-50 rounded-lg p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
                              ✓ ACCEPTED
                            </span>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {bid.bidRequest?.title}
                            </h3>
                          </div>

                          {/* Delivery Address & Contact Info */}
                          {bid.bidRequest?.business && (
                            <div className="mt-4 p-3 bg-white rounded border border-green-200">
                              <p className="text-xs font-semibold text-gray-700 mb-2">DELIVERY ADDRESS & CONTACT</p>
                              <p className="font-medium text-gray-900">{bid.bidRequest.business.name}</p>
                              {bid.bidRequest.business.address && (
                                <p className="text-sm text-gray-600">{bid.bidRequest.business.address}</p>
                              )}
                              {bid.bidRequest.business.city && bid.bidRequest.business.state && (
                                <p className="text-sm text-gray-600">
                                  📍 {bid.bidRequest.business.city}, {bid.bidRequest.business.state} {bid.bidRequest.business.zipCode || ''}
                                </p>
                              )}
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                {bid.bidRequest.business.phone && (
                                  <p className="text-sm text-gray-700">
                                    📞 <a href={`tel:${bid.bidRequest.business.phone}`} className="text-blue-600 hover:underline">{bid.bidRequest.business.phone}</a>
                                  </p>
                                )}
                                {bid.bidRequest.business.email && (
                                  <p className="text-sm text-gray-700">
                                    ✉️ <a href={`mailto:${bid.bidRequest.business.email}`} className="text-blue-600 hover:underline">{bid.bidRequest.business.email}</a>
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Your Winning Bid</p>
                              <p className="text-2xl font-bold text-green-600">
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

                          {/* Items Breakdown */}
                          {bid.bidItems && bid.bidItems.length > 0 && (
                            <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                              <p className="text-xs font-semibold text-gray-700 mb-2">ITEMS TO DELIVER</p>
                              <div className="space-y-2">
                                {bid.bidItems.map((bidItem) => {
                                  const requestItem = bid.bidRequest?.items?.find(
                                    (item) => item.id === bidItem.bidRequestItemId
                                  );
                                  if (!requestItem) return null;

                                  return (
                                    <div key={bidItem.id} className="flex justify-between text-sm">
                                      <span className="text-gray-700">
                                        {requestItem.productName} - {requestItem.quantity} {requestItem.unit}
                                      </span>
                                      <span className="font-semibold text-gray-900">
                                        ${bidItem.pricePerUnit.toFixed(2)}/{requestItem.unit}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {bid.notes && (
                            <p className="mt-3 text-sm text-gray-600">Notes: {bid.notes}</p>
                          )}

                          {bid.acceptedAt && (
                            <p className="mt-3 text-sm text-green-600 font-medium">
                              ✓ Accepted on {new Date(bid.acceptedAt).toLocaleDateString()}
                            </p>
                          )}

                          {/* Payment Notice */}
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-sm text-yellow-800">
                              <span className="font-semibold">⚠️ Payment Due Upon Delivery</span>
                              <br />
                              Please coordinate with the farmer for delivery and payment collection.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Farmer Access Tab
              farmerAccessRequests.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="mt-4 text-gray-500">No farmer access requests yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Farmers will appear here once they grant you access to their data.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Group farmers by access status */}
                  {(() => {
                    const withAccess = farmerAccessRequests.filter(hasAnyAccessToFarmer);
                    const pending = farmerAccessRequests.filter(r =>
                      !hasAnyAccessToFarmer(r) && (r.inputsStatus === 'PENDING' || r.grainStatus === 'PENDING')
                    );
                    const noAccess = farmerAccessRequests.filter(r =>
                      !hasAnyAccessToFarmer(r) && r.inputsStatus !== 'PENDING' && r.grainStatus !== 'PENDING'
                    );

                    return (
                      <>
                        {/* Farmers With Access */}
                        {withAccess.length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center">
                              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                              Farmers Who Granted Access ({withAccess.length})
                            </h3>
                            <div className="space-y-3">
                              {withAccess.map((request) => {
                                const isExpanded = expandedFarmerId === request.id;
                                return (
                                  <div
                                    key={request.id}
                                    className="border border-green-200 rounded-lg bg-white overflow-hidden"
                                  >
                                    <div
                                      className="p-4 cursor-pointer hover:bg-gray-50"
                                      onClick={() => setExpandedFarmerId(isExpanded ? null : request.id)}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                            <span className="text-green-700 font-semibold">
                                              {request.business?.name?.charAt(0) || 'F'}
                                            </span>
                                          </div>
                                          <div>
                                            <h4 className="font-semibold text-gray-900">
                                              {request.business?.name || 'Unknown Farm'}
                                            </h4>
                                            {request.business && (
                                              <p className="text-sm text-gray-500">
                                                {(request.business as any).city}, {(request.business as any).state}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                            Has Access
                                          </span>
                                          <svg
                                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </div>
                                      </div>

                                      {/* Access badges preview (when collapsed) */}
                                      {!isExpanded && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {Object.entries(MODULE_TO_FIELD).map(([module, field]) => {
                                            const levelStr = (request as any)[field] as string;
                                            if (!levelStr || levelStr === 'NONE') return null;
                                            const level = levelStr as PartnerPermissionLevel;
                                            return (
                                              <span
                                                key={module}
                                                className={`px-2 py-1 text-xs font-medium rounded border ${getPermissionLevelColor(level)}`}
                                              >
                                                {MODULE_DISPLAY_NAMES[module as PartnerModule]}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>

                                    {/* Expanded view with full permission details */}
                                    {isExpanded && (
                                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                                        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                          Your Access Permissions
                                        </h5>
                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                          {Object.entries(MODULE_TO_FIELD).map(([module, field]) => {
                                            const levelStr = (request as any)[field] as string;
                                            const hasAccess = levelStr && levelStr !== 'NONE';
                                            const level = levelStr as PartnerPermissionLevel;
                                            return (
                                              <div
                                                key={module}
                                                className={`p-3 rounded-lg border ${
                                                  hasAccess
                                                    ? 'bg-white border-green-200'
                                                    : 'bg-gray-100 border-gray-200'
                                                }`}
                                              >
                                                <p className="text-sm font-medium text-gray-700">
                                                  {MODULE_DISPLAY_NAMES[module as PartnerModule]}
                                                </p>
                                                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${
                                                  hasAccess
                                                    ? getPermissionLevelColor(level)
                                                    : 'bg-gray-200 text-gray-500'
                                                }`}>
                                                  {hasAccess ? PERMISSION_DISPLAY_NAMES[level] : 'No Access'}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* Info about what they can do */}
                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                          <p className="text-sm text-blue-800">
                                            <span className="font-semibold">What can you do?</span>
                                            <br />
                                            Based on your permissions, you can view and manage data for the modules listed above.
                                            Contact the farmer if you need additional access.
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Pending Access Requests */}
                        {pending.length > 0 && (
                          <div className="mt-6">
                            <h3 className="text-sm font-semibold text-yellow-700 mb-3 flex items-center">
                              <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                              Pending Requests ({pending.length})
                            </h3>
                            <div className="space-y-3">
                              {pending.map((request) => (
                                <div key={request.id} className="border border-yellow-200 rounded-lg bg-yellow-50 p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                        <span className="text-yellow-700 font-semibold">
                                          {request.business?.name?.charAt(0) || 'F'}
                                        </span>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-gray-900">
                                          {request.business?.name || 'Unknown Farm'}
                                        </h4>
                                        {request.business && (
                                          <p className="text-sm text-gray-500">
                                            {(request.business as any).city}, {(request.business as any).state}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                      Pending Approval
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm text-yellow-700">
                                    Waiting for the farmer to configure your access permissions.
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Denied/No Access */}
                        {noAccess.length > 0 && (
                          <div className="mt-6">
                            <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center">
                              <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
                              No Access ({noAccess.length})
                            </h3>
                            <div className="space-y-3">
                              {noAccess.map((request) => (
                                <div key={request.id} className="border border-gray-200 rounded-lg bg-gray-50 p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                        <span className="text-gray-500 font-semibold">
                                          {request.business?.name?.charAt(0) || 'F'}
                                        </span>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-gray-700">
                                          {request.business?.name || 'Unknown Farm'}
                                        </h4>
                                        {request.business && (
                                          <p className="text-sm text-gray-400">
                                            {(request.business as any).city}, {(request.business as any).state}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                                      No Access
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )
            )}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Pricing (Price per Unit)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Enter prices only for items you want to bid on. You can leave items blank if you don't have competitive pricing for them.
                    </p>
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
                    <p className="mt-1 text-xs text-gray-600">Auto-calculated from items you're bidding on</p>
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
