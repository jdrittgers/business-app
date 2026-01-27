import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRetailerAuthStore } from '../store/retailerAuthStore';
import { grainMarketplaceApi } from '../api/grain-marketplace.api';
import { GrainBinWithDistance, GrainPurchaseOfferWithDetails, GrainPurchaseOfferStatus } from '@business-app/shared';
import { GrainBinVisual } from '../components/grain/GrainBinVisual';

const RetailerGrainMarketplace: React.FC = () => {
  const navigate = useNavigate();
  const { retailer, user } = useRetailerAuthStore();
  const [bins, setBins] = useState<GrainBinWithDistance[]>([]);
  const [myOffers, setMyOffers] = useState<GrainPurchaseOfferWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBin, setSelectedBin] = useState<GrainBinWithDistance | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);

  // Search filters
  const [radius, setRadius] = useState(50);
  const [commodityFilter, setCommodityFilter] = useState<'CORN' | 'SOYBEANS' | 'WHEAT' | ''>('');

  // Offer form
  const [offerForm, setOfferForm] = useState({
    bushelsOffered: '',
    pricePerBushel: '',
    pickupDate: '',
    expirationDate: '',
    notes: ''
  });

  useEffect(() => {
    if (user && retailer) {
      loadData();
    }
  }, [user, retailer]);

  const loadData = async () => {
    if (!retailer) return;

    // Skip search if no location is set, but still load offers
    if (!retailer.latitude || !retailer.longitude) {
      setLoading(false);
      setBins([]);
      try {
        const offersData = await grainMarketplaceApi.getRetailerOffers(retailer.id);
        setMyOffers(offersData);
      } catch (error) {
        console.error('Error loading offers:', error);
      }
      return;
    }

    setLoading(true);
    try {
      const latitude = Number(retailer.latitude);
      const longitude = Number(retailer.longitude);

      console.log('Searching bins with:', { latitude, longitude, radius, commodityFilter });

      const [binsData, offersData] = await Promise.all([
        grainMarketplaceApi.searchBins({
          latitude,
          longitude,
          radiusMiles: radius,
          ...(commodityFilter && { commodityType: commodityFilter })
        }),
        grainMarketplaceApi.getRetailerOffers(retailer.id)
      ]);

      console.log('Found bins:', binsData.length);
      setBins(binsData);
      setMyOffers(offersData);
    } catch (error) {
      console.error('Error loading marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadData();
  };

  const handleMakeOffer = (bin: GrainBinWithDistance) => {
    setSelectedBin(bin);
    setOfferForm({
      bushelsOffered: '',
      pricePerBushel: '',
      pickupDate: '',
      expirationDate: '',
      notes: ''
    });
    setShowOfferModal(true);
  };

  const handleSubmitOffer = async () => {
    if (!selectedBin || !retailer) return;

    try {
      await grainMarketplaceApi.createOffer({
        retailerId: retailer.id,
        grainBinId: selectedBin.id,
        bushelsOffered: parseFloat(offerForm.bushelsOffered),
        pricePerBushel: parseFloat(offerForm.pricePerBushel),
        pickupDate: offerForm.pickupDate ? new Date(offerForm.pickupDate) : undefined,
        expirationDate: offerForm.expirationDate ? new Date(offerForm.expirationDate) : undefined,
        notes: offerForm.notes || undefined
      });

      setShowOfferModal(false);
      setSelectedBin(null);
      loadData(); // Reload to show new offer
    } catch (error) {
      console.error('Error creating offer:', error);
      alert('Failed to create offer. Please try again.');
    }
  };

  const handleCancelOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to cancel this offer?')) return;
    if (!retailer) return;

    try {
      await grainMarketplaceApi.cancelOffer(retailer.id, offerId);
      loadData();
    } catch (error) {
      console.error('Error cancelling offer:', error);
      alert('Failed to cancel offer. Please try again.');
    }
  };

  const getStatusBadgeClass = (status: GrainPurchaseOfferStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateTotalPrice = () => {
    const bushels = parseFloat(offerForm.bushelsOffered) || 0;
    const pricePerBushel = parseFloat(offerForm.pricePerBushel) || 0;
    return bushels * pricePerBushel;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading marketplace...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grain Marketplace</h1>
          <p className="text-gray-600 mt-1">
            Browse available grain inventory and submit purchase offers
          </p>
        </div>
        {!retailer?.latitude && !retailer?.longitude && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm">
            Set your location in <button onClick={() => navigate('/retailer/profile')} className="underline font-medium text-yellow-900">Profile Settings</button> to see bins
          </div>
        )}
      </div>

      <div className="space-y-6">

      {/* Search Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Search Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Radius (miles)
            </label>
            <input
              type="number"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
              min="1"
              max="500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Commodity Type
            </label>
            <select
              value={commodityFilter}
              onChange={(e) => setCommodityFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Commodities</option>
              <option value="CORN">Corn</option>
              <option value="SOYBEANS">Soybeans</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Available Bins */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Available Grain Inventory ({bins.length})
        </h2>
        {bins.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No grain bins found within {radius} miles
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {bins.map((bin) => (
              <div key={bin.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                <GrainBinVisual bin={bin} />
                <div className="mt-3 space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Farm:</span>{' '}
                    <span className="text-gray-900">{bin.grainEntity.business.name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Location:</span>{' '}
                    <span className="text-gray-900">
                      {bin.grainEntity.business.city}, {bin.grainEntity.business.state}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Distance:</span>{' '}
                    <span className="text-gray-900">{bin.distance.toFixed(1)} miles</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Crop Year:</span>{' '}
                    <span className="text-gray-900">{bin.cropYear}</span>
                  </div>
                  {bin.targetPrice && (
                    <div className="pt-2 border-t border-gray-200">
                      <span className="font-medium text-gray-700">Target Price:</span>{' '}
                      <span className="text-green-600 font-semibold">${bin.targetPrice.toFixed(2)}/bu</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleMakeOffer(bin)}
                  className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Make Offer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Offers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Offers ({myOffers.length})</h2>
        {myOffers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            You haven't submitted any offers yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Farm / Bin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commodity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bushels
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price/Bu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myOffers.map((offer) => (
                  <tr key={offer.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {offer.grainBin.grainEntity.business.name}
                      </div>
                      <div className="text-sm text-gray-500">{offer.grainBin.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {offer.grainBin.commodityType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {offer.bushelsOffered.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${offer.pricePerBushel.toFixed(4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${offer.totalOfferPrice.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(offer.status)}`}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {offer.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelOffer(offer.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Make Offer Modal */}
      {showOfferModal && selectedBin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Make Offer</h2>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <div className="font-medium text-gray-900">{selectedBin.name}</div>
                <div className="text-gray-600">{selectedBin.grainEntity.business.name}</div>
                <div className="text-gray-600">
                  {selectedBin.commodityType} - {selectedBin.cropYear} Crop
                </div>
                <div className="text-gray-600">
                  Available: {selectedBin.currentBushels.toLocaleString()} bushels
                </div>
                {selectedBin.targetPrice && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <span className="font-medium text-gray-700">Farmer's Target Price:</span>{' '}
                    <span className="text-green-600 font-semibold">${selectedBin.targetPrice.toFixed(2)}/bu</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bushels Offered *
                </label>
                <input
                  type="number"
                  value={offerForm.bushelsOffered}
                  onChange={(e) => setOfferForm({ ...offerForm, bushelsOffered: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  max={Number(selectedBin.currentBushels)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per Bushel ($) *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={offerForm.pricePerBushel}
                  onChange={(e) => setOfferForm({ ...offerForm, pricePerBushel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              {offerForm.bushelsOffered && offerForm.pricePerBushel && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700">Total Offer Price:</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${calculateTotalPrice().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desired Pickup Date
                </label>
                <input
                  type="date"
                  value={offerForm.pickupDate}
                  onChange={(e) => setOfferForm({ ...offerForm, pickupDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer Expiration Date
                </label>
                <input
                  type="date"
                  value={offerForm.expirationDate}
                  onChange={(e) => setOfferForm({ ...offerForm, expirationDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={offerForm.notes}
                  onChange={(e) => setOfferForm({ ...offerForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Any additional details..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowOfferModal(false);
                  setSelectedBin(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOffer}
                disabled={!offerForm.bushelsOffered || !offerForm.pricePerBushel}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Offer
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default RetailerGrainMarketplace;
