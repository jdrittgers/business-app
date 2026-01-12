import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { grainMarketplaceApi } from '../api/grain-marketplace.api';
import { GrainPurchaseOfferWithDetails, GrainPurchaseOfferStatus } from '@business-app/shared';

export const FarmerGrainOffers: React.FC = () => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<GrainPurchaseOfferWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<GrainPurchaseOfferStatus | ''>('PENDING');
  const [selectedOffer, setSelectedOffer] = useState<GrainPurchaseOfferWithDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // TODO: Get selected business from context
  const selectedBusinessId = 'placeholder-business-id';

  useEffect(() => {
    if (user) {
      loadOffers();
    }
  }, [user, statusFilter]);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const offersData = await grainMarketplaceApi.getFarmerOffers(
        selectedBusinessId,
        statusFilter || undefined
      );
      setOffers(offersData);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to accept this offer? This action cannot be undone.')) {
      return;
    }

    try {
      await grainMarketplaceApi.acceptOffer(offerId);
      await loadOffers();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error accepting offer:', error);
      alert('Failed to accept offer. Please try again.');
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to reject this offer?')) {
      return;
    }

    try {
      await grainMarketplaceApi.rejectOffer(offerId);
      await loadOffers();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error rejecting offer:', error);
      alert('Failed to reject offer. Please try again.');
    }
  };

  const handleCompleteOffer = async (offerId: string) => {
    if (!confirm('Mark this offer as completed? This will deduct the grain from your bin.')) {
      return;
    }

    try {
      await grainMarketplaceApi.completeOffer(offerId);
      await loadOffers();
      setShowDetailsModal(false);
    } catch (error) {
      console.error('Error completing offer:', error);
      alert('Failed to complete offer. Please try again.');
    }
  };

  const handleViewDetails = (offer: GrainPurchaseOfferWithDetails) => {
    setSelectedOffer(offer);
    setShowDetailsModal(true);
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

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading offers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Grain Purchase Offers</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and manage purchase offers from retailers
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="COMPLETED">Completed</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Offers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {offers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {statusFilter ? `No ${statusFilter.toLowerCase()} offers found` : 'No offers found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Retailer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bin
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
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {offers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {offer.retailer.companyName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {offer.retailer.user.firstName} {offer.retailer.user.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{offer.grainBin.name}</div>
                      <div className="text-sm text-gray-500">{offer.grainBin.grainEntity.name}</div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${offer.totalOfferPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(offer.status)}`}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(offer.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewDetails(offer)}
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Offer Details Modal */}
      {showDetailsModal && selectedOffer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-gray-900">Offer Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(selectedOffer.status)}`}>
                  {selectedOffer.status}
                </span>
              </div>

              {/* Retailer Info */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Retailer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Company</label>
                    <p className="text-sm text-gray-900">{selectedOffer.retailer.companyName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact</label>
                    <p className="text-sm text-gray-900">
                      {selectedOffer.retailer.user.firstName} {selectedOffer.retailer.user.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900">{selectedOffer.retailer.user.email}</p>
                  </div>
                  {selectedOffer.retailer.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-sm text-gray-900">{selectedOffer.retailer.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bin Info */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Grain Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bin</label>
                    <p className="text-sm text-gray-900">{selectedOffer.grainBin.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Entity</label>
                    <p className="text-sm text-gray-900">{selectedOffer.grainBin.grainEntity.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Commodity</label>
                    <p className="text-sm text-gray-900">{selectedOffer.grainBin.commodityType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Crop Year</label>
                    <p className="text-sm text-gray-900">{selectedOffer.grainBin.cropYear}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Available in Bin</label>
                    <p className="text-sm text-gray-900">{selectedOffer.grainBin.currentBushels.toLocaleString()} bu</p>
                  </div>
                </div>
              </div>

              {/* Offer Details */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Offer Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bushels Offered</label>
                    <p className="text-sm text-gray-900 font-semibold">{selectedOffer.bushelsOffered.toLocaleString()} bu</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price per Bushel</label>
                    <p className="text-sm text-gray-900 font-semibold">${selectedOffer.pricePerBushel.toFixed(4)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Total Offer Price</label>
                    <p className="text-2xl text-green-600 font-bold">
                      ${selectedOffer.totalOfferPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  {selectedOffer.pickupDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Pickup Date</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedOffer.pickupDate)}</p>
                    </div>
                  )}
                  {selectedOffer.expirationDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Offer Expires</label>
                      <p className="text-sm text-gray-900">{formatDate(selectedOffer.expirationDate)}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Submitted</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedOffer.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOffer.notes && (
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{selectedOffer.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="border-t pt-4 flex justify-end space-x-3">
                {selectedOffer.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleRejectOffer(selectedOffer.id)}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                    >
                      Reject Offer
                    </button>
                    <button
                      onClick={() => handleAcceptOffer(selectedOffer.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Accept Offer
                    </button>
                  </>
                )}
                {selectedOffer.status === 'ACCEPTED' && (
                  <button
                    onClick={() => handleCompleteOffer(selectedOffer.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Mark as Completed
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
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
};
