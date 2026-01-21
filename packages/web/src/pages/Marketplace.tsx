import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { biddingApi } from '../api/bidding.api';
import { grainMarketplaceApi } from '../api/grain-marketplace.api';
import { retailerAccessApi } from '../api/retailer-access.api';
import { BidRequest, AccessSummary } from '@business-app/shared';

interface GrainOffer {
  id: string;
  status: string;
  bushelsOffered: number;
  pricePerBushel: number;
  totalOfferPrice: number;
  retailer?: {
    companyName: string;
  };
}

export default function Marketplace() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const businessId = user?.businessMemberships?.[0]?.businessId;

  const [bidRequests, setBidRequests] = useState<BidRequest[]>([]);
  const [grainOffers, setGrainOffers] = useState<GrainOffer[]>([]);
  const [accessSummary, setAccessSummary] = useState<AccessSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (businessId) {
      loadData();
    }
  }, [businessId]);

  const loadData = async () => {
    if (!businessId) return;

    setIsLoading(true);
    try {
      const [bidsData, offersData, accessData] = await Promise.all([
        biddingApi.getBidRequests(businessId).catch(() => []),
        grainMarketplaceApi.getFarmerOffers(businessId).catch(() => []),
        retailerAccessApi.getAccessSummary(businessId).catch(() => null)
      ]);

      setBidRequests(bidsData);
      setGrainOffers(offersData);
      setAccessSummary(accessData);
    } catch (err) {
      console.error('Failed to load marketplace data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const openInputBids = bidRequests.filter(b => b.status === 'OPEN').length;
  const totalInputBids = bidRequests.reduce((sum, b) => sum + (b.bids?.length || 0), 0);
  const pendingGrainOffers = grainOffers.filter(o => o.status === 'PENDING').length;
  const acceptedGrainOffers = grainOffers.filter(o => o.status === 'ACCEPTED').length;
  const totalGrainValue = grainOffers
    .filter(o => o.status === 'ACCEPTED')
    .reduce((sum, o) => sum + o.totalOfferPrice, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-gray-600 mt-1">
          Manage your input bids, grain offers, and retailer relationships
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Open Input Bids</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{openInputBids}</div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">{totalInputBids} retailer bids received</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Grain Offers</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{pendingGrainOffers}</div>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">{acceptedGrainOffers} accepted</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Grain Sales Value</div>
              <div className="mt-1 text-2xl font-bold text-green-600">${totalGrainValue.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">From accepted offers</p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Retailer Access</div>
              <div className="mt-1 text-2xl font-bold text-purple-600">
                {accessSummary?.approved || 0}
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {accessSummary?.pending || 0} pending approval
          </p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Input Bids Card */}
        <div
          onClick={() => navigate('/marketplace/input-bids')}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Input Bids</h3>
              <p className="text-sm text-gray-500">Request quotes on farm inputs</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Create bid requests for fertilizers, chemicals, and other farm inputs.
            Retailers will compete for your business with their best prices.
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-600 font-medium">{openInputBids} open requests</span>
            <span className="text-gray-400">View all &rarr;</span>
          </div>
        </div>

        {/* Grain Offers Card */}
        <div
          onClick={() => navigate('/marketplace/grain-offers')}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-amber-300 transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Grain Offers</h3>
              <p className="text-sm text-gray-500">Manage purchase offers</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Review and respond to purchase offers from retailers for grain
            you've marked as available for sale in your bins.
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-amber-600 font-medium">{pendingGrainOffers} pending offers</span>
            <span className="text-gray-400">View all &rarr;</span>
          </div>
        </div>

        {/* Retailer Access Card */}
        <div
          onClick={() => navigate('/marketplace/retailer-access')}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md hover:border-purple-300 transition-all"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Retailer Access</h3>
              <p className="text-sm text-gray-500">Control who sees your data</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Approve or deny retailers who want to view your inventory and
            place bids. You control who has access to your farm data.
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-600 font-medium">
              {accessSummary?.pending || 0} pending requests
            </span>
            <span className="text-gray-400">Manage &rarr;</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {bidRequests.slice(0, 3).map((bid) => (
            <div key={bid.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{bid.title}</p>
                  <p className="text-sm text-gray-500">
                    {bid.bids?.length || 0} bids • {bid.status}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/marketplace/input-bids');
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View
              </button>
            </div>
          ))}
          {grainOffers.slice(0, 2).map((offer) => (
            <div key={offer.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Grain offer from {offer.retailer?.companyName || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {offer.bushelsOffered.toLocaleString()} bu @ ${offer.pricePerBushel}/bu • {offer.status}
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/marketplace/grain-offers');
                }}
                className="text-sm text-amber-600 hover:text-amber-700"
              >
                View
              </button>
            </div>
          ))}
          {bidRequests.length === 0 && grainOffers.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <p>No recent marketplace activity</p>
              <p className="text-sm mt-1">Create an input bid request or mark grain for sale to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
