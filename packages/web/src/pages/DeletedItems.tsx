import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { DeletedItem } from '@business-app/shared';

export default function DeletedItems() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    deletedItems,
    isLoading,
    error,
    loadDeletedItems,
    restoreItem,
    permanentlyDeleteItem,
    clearError
  } = useSubscriptionStore();
  const navigate = useNavigate();

  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user && user.businessMemberships && user.businessMemberships.length > 0) {
      const businessId = user.businessMemberships[0].businessId;
      loadDeletedItems(businessId);
    }
  }, [user]);

  const handleRestore = async (item: DeletedItem) => {
    if (!confirm(`Are you sure you want to restore "${item.name}"?`)) return;

    try {
      setIsRestoring(item.id);
      clearError();
      await restoreItem(item.type, item.id);
      alert(`"${item.name}" has been restored successfully!`);
    } catch (err: any) {
      console.error('Failed to restore item:', err);
      alert(error || 'Failed to restore item. Please try again.');
    } finally {
      setIsRestoring(null);
    }
  };

  const handlePermanentDelete = async (item: DeletedItem) => {
    if (
      !confirm(
        `⚠️ WARNING: This will PERMANENTLY delete "${item.name}". This action cannot be undone. Are you absolutely sure?`
      )
    ) {
      return;
    }

    try {
      setIsDeleting(item.id);
      clearError();
      await permanentlyDeleteItem(item.type, item.id);
      alert(`"${item.name}" has been permanently deleted.`);
    } catch (err: any) {
      console.error('Failed to permanently delete item:', err);
      alert(error || 'Failed to delete item. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysUntilPermanentDeletion = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expirationDate = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const now = new Date();
    const daysLeft = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      contract: '📄',
      bin: '🌾',
      farm: '🚜',
      bidrequest: '📊',
      business: '🏢',
      retailer: '🏬'
    };
    return icons[type.toLowerCase()] || '📦';
  };

  const filteredItems =
    selectedType === 'all'
      ? deletedItems
      : deletedItems.filter(item => item.type.toLowerCase() === selectedType.toLowerCase());

  const uniqueTypes = Array.from(new Set(deletedItems.map(item => item.type)));

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Deleted Items</h1>
              <p className="text-sm text-gray-600">
                Restore or permanently delete items within 30 days
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Data Retention Policy</h3>
              <p className="mt-1 text-sm text-blue-700">
                Deleted items are kept for 30 days before being permanently removed. You can
                restore any item within this period.
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Type Filter */}
        {!isLoading && deletedItems.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedType('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All ({deletedItems.length})
              </button>
              {uniqueTypes.map(type => {
                const count = deletedItems.filter(item => item.type === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading deleted items...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredItems.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No deleted items</h3>
            <p className="mt-1 text-gray-500">
              {selectedType === 'all'
                ? "You don't have any deleted items."
                : `You don't have any deleted ${selectedType} items.`}
            </p>
          </div>
        )}

        {/* Deleted Items List */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deleted At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Remaining
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map(item => {
                    const daysLeft = getDaysUntilPermanentDeletion(item.deletedAt);
                    const isExpiringSoon = daysLeft <= 7;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-2xl mr-2">{getTypeIcon(item.type)}</span>
                            <span className="text-sm font-medium text-gray-900">
                              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatDate(item.deletedAt)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              isExpiringSoon
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            {item.canRestore && (
                              <button
                                onClick={() => handleRestore(item)}
                                disabled={isRestoring === item.id || isDeleting === item.id}
                                className={`px-3 py-1 rounded-md transition-colors ${
                                  isRestoring === item.id || isDeleting === item.id
                                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
                                {isRestoring === item.id ? 'Restoring...' : 'Restore'}
                              </button>
                            )}
                            <button
                              onClick={() => handlePermanentDelete(item)}
                              disabled={isRestoring === item.id || isDeleting === item.id}
                              className={`px-3 py-1 rounded-md transition-colors ${
                                isRestoring === item.id || isDeleting === item.id
                                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                              }`}
                            >
                              {isDeleting === item.id ? 'Deleting...' : 'Delete Forever'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
