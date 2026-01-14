import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';

export default function SubscriptionManagement() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    subscriptionStatus,
    isLoading,
    error,
    loadBusinessStatus,
    openCustomerPortal,
    clearError
  } = useSubscriptionStore();
  const navigate = useNavigate();

  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user && user.businessMemberships && user.businessMemberships.length > 0) {
      const businessId = user.businessMemberships[0].businessId;
      loadBusinessStatus(businessId);
    }
  }, [user]);

  const handleManageBilling = async () => {
    if (!subscriptionStatus?.subscription) return;

    try {
      setIsOpeningPortal(true);
      clearError();

      const returnUrl = `${window.location.origin}/subscription`;
      const customerId = subscriptionStatus.subscription.stripeCustomerId;

      const portalUrl = await openCustomerPortal(customerId, returnUrl);

      // Redirect to Stripe Customer Portal
      window.location.href = portalUrl;
    } catch (err: any) {
      console.error('Failed to open customer portal:', err);
      alert(error || 'Failed to open billing portal. Please try again.');
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  if (!user) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trialing: 'bg-blue-100 text-blue-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      canceled: 'bg-red-100 text-red-800',
      incomplete: 'bg-gray-100 text-gray-800'
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-semibold ${
          statusColors[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading subscription details...</p>
          </div>
        )}

        {/* Subscription Details */}
        {!isLoading && subscriptionStatus && (
          <div className="space-y-6">
            {/* Current Plan Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Current Plan</h2>
                  <p className="text-gray-600">Manage your subscription and billing</p>
                </div>
                {subscriptionStatus.subscription && (
                  <div>{getStatusBadge(subscriptionStatus.subscription.status)}</div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Plan</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscriptionStatus.plan.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    ${subscriptionStatus.plan.price}/{subscriptionStatus.plan.interval}
                  </p>
                </div>

                {subscriptionStatus.subscription && (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Billing Period</h3>
                      <p className="text-sm text-gray-900">
                        {formatDate(subscriptionStatus.subscription.currentPeriodStart)} -{' '}
                        {formatDate(subscriptionStatus.subscription.currentPeriodEnd)}
                      </p>
                    </div>

                    {subscriptionStatus.subscription.cancelAtPeriodEnd && (
                      <div className="md:col-span-2">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg
                                className="h-5 w-5 text-yellow-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">
                                Subscription Canceling
                              </h3>
                              <p className="mt-1 text-sm text-yellow-700">
                                Your subscription will end on{' '}
                                {formatDate(subscriptionStatus.subscription.currentPeriodEnd)}.
                                You'll still have access until then.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                {subscriptionStatus.hasActiveSubscription ? (
                  <button
                    onClick={handleManageBilling}
                    disabled={isOpeningPortal}
                    className={`px-6 py-2 rounded-md font-semibold transition-colors ${
                      isOpeningPortal
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isOpeningPortal ? 'Opening...' : 'Manage Billing'}
                  </button>
                ) : (
                  <button
                    onClick={handleUpgrade}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Upgrade to Premium
                  </button>
                )}
              </div>
            </div>

            {/* Usage & Limits Card */}
            {subscriptionStatus.usage && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Usage & Limits</h2>

                <div className="space-y-4">
                  {/* Contracts */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Grain Contracts</span>
                      <span className="text-sm text-gray-600">
                        {subscriptionStatus.usage.contracts}
                        {subscriptionStatus.limits.maxContracts !== null &&
                          subscriptionStatus.limits.maxContracts !== undefined && (
                            <span> / {subscriptionStatus.limits.maxContracts}</span>
                          )}
                        {(subscriptionStatus.limits.maxContracts === null ||
                          subscriptionStatus.limits.maxContracts === undefined) && (
                          <span> / Unlimited</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width:
                            subscriptionStatus.limits.maxContracts
                              ? `${Math.min(
                                  (subscriptionStatus.usage.contracts /
                                    subscriptionStatus.limits.maxContracts) *
                                    100,
                                  100
                                )}%`
                              : '0%'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Bins */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Grain Bins</span>
                      <span className="text-sm text-gray-600">
                        {subscriptionStatus.usage.bins}
                        {subscriptionStatus.limits.maxBins !== null &&
                          subscriptionStatus.limits.maxBins !== undefined && (
                            <span> / {subscriptionStatus.limits.maxBins}</span>
                          )}
                        {(subscriptionStatus.limits.maxBins === null ||
                          subscriptionStatus.limits.maxBins === undefined) && (
                          <span> / Unlimited</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width:
                            subscriptionStatus.limits.maxBins
                              ? `${Math.min(
                                  (subscriptionStatus.usage.bins / subscriptionStatus.limits.maxBins) *
                                    100,
                                  100
                                )}%`
                              : '0%'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Bids This Month */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Bids This Month</span>
                      <span className="text-sm text-gray-600">
                        {subscriptionStatus.usage.bidsThisMonth}
                        {subscriptionStatus.limits.maxBidsPerMonth !== null &&
                          subscriptionStatus.limits.maxBidsPerMonth !== undefined && (
                            <span> / {subscriptionStatus.limits.maxBidsPerMonth}</span>
                          )}
                        {(subscriptionStatus.limits.maxBidsPerMonth === null ||
                          subscriptionStatus.limits.maxBidsPerMonth === undefined) && (
                          <span> / Unlimited</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width:
                            subscriptionStatus.limits.maxBidsPerMonth
                              ? `${Math.min(
                                  (subscriptionStatus.usage.bidsThisMonth /
                                    subscriptionStatus.limits.maxBidsPerMonth) *
                                    100,
                                  100
                                )}%`
                              : '0%'
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Farms */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Farms</span>
                      <span className="text-sm text-gray-600">
                        {subscriptionStatus.usage.farms}
                        {subscriptionStatus.limits.maxFarms !== null &&
                          subscriptionStatus.limits.maxFarms !== undefined && (
                            <span> / {subscriptionStatus.limits.maxFarms}</span>
                          )}
                        {(subscriptionStatus.limits.maxFarms === null ||
                          subscriptionStatus.limits.maxFarms === undefined) && (
                          <span> / Unlimited</span>
                        )}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width:
                            subscriptionStatus.limits.maxFarms
                              ? `${Math.min(
                                  (subscriptionStatus.usage.farms / subscriptionStatus.limits.maxFarms) *
                                    100,
                                  100
                                )}%`
                              : '0%'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Features Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Plan Features</h2>
              <ul className="space-y-3">
                {Array.isArray(subscriptionStatus.plan.features) &&
                  subscriptionStatus.plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="flex-shrink-0 h-6 w-6 text-green-500 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="ml-3 text-gray-700">{feature}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}

        {/* No Subscription State */}
        {!isLoading && !subscriptionStatus && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Active Subscription</h2>
            <p className="text-gray-600 mb-6">
              You're currently on the free plan. Upgrade to Premium to unlock unlimited features.
            </p>
            <button
              onClick={handleUpgrade}
              className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
            >
              View Plans
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
