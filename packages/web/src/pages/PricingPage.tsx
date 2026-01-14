import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { SubscriptionPlan } from '@business-app/shared';

export default function PricingPage() {
  const { user, isAuthenticated } = useAuthStore();
  const { plans, isLoading, error, loadPlans, createCheckoutSession, clearError } = useSubscriptionStore();
  const navigate = useNavigate();

  const [selectedEntityType, setSelectedEntityType] = useState<'BUSINESS' | 'RETAILER'>('BUSINESS');
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    loadPlans(selectedEntityType);
  }, [selectedEntityType]);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (!user) return;

    // Determine entity ID based on type
    let entityId: string;
    if (selectedEntityType === 'BUSINESS') {
      if (!user.businessMemberships || user.businessMemberships.length === 0) {
        alert('No business found. Please create a business first.');
        return;
      }
      entityId = user.businessMemberships[0].businessId;
    } else {
      // For retailers, we'd need retailer ID - placeholder for now
      alert('Retailer subscriptions coming soon!');
      return;
    }

    try {
      setIsUpgrading(true);
      clearError();

      const successUrl = `${window.location.origin}/subscription/success`;
      const cancelUrl = `${window.location.origin}/pricing`;

      const checkoutUrl = await createCheckoutSession(
        entityId,
        selectedEntityType,
        plan.id,
        successUrl,
        cancelUrl
      );

      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    } catch (err: any) {
      console.error('Failed to create checkout session:', err);
      alert(error || 'Failed to start checkout. Please try again.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const freePlan = plans.find(p => p.name === 'Free');
  const premiumPlan = plans.find(p => p.name === 'Premium');

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
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
        {/* Entity Type Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setSelectedEntityType('BUSINESS')}
              className={`px-6 py-2 text-sm font-medium rounded-l-lg border ${
                selectedEntityType === 'BUSINESS'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Farm / Business Plans
            </button>
            <button
              type="button"
              onClick={() => setSelectedEntityType('RETAILER')}
              className={`px-6 py-2 text-sm font-medium rounded-r-lg border-t border-b border-r ${
                selectedEntityType === 'RETAILER'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Retailer Plans
            </button>
          </div>
        </div>

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
            <p className="mt-2 text-gray-600">Loading plans...</p>
          </div>
        )}

        {/* Pricing Cards */}
        {!isLoading && (
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            {freePlan && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-gray-200">
                <div className="px-6 py-8">
                  <h3 className="text-2xl font-bold text-gray-900">{freePlan.name}</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-5xl font-extrabold text-gray-900">$0</span>
                    <span className="ml-1 text-xl text-gray-500">/month</span>
                  </div>
                  <p className="mt-4 text-gray-600">Perfect for trying out our platform</p>

                  {/* Features */}
                  <ul className="mt-6 space-y-4">
                    {Array.isArray(freePlan.features) &&
                      freePlan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <svg
                            className="flex-shrink-0 h-6 w-6 text-green-500"
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

                  <button
                    disabled
                    className="mt-8 w-full bg-gray-300 text-gray-600 py-3 px-6 rounded-md font-semibold cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                </div>
              </div>
            )}

            {/* Premium Plan */}
            {premiumPlan && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden border-2 border-blue-600 relative">
                {/* Popular Badge */}
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                  POPULAR
                </div>

                <div className="px-6 py-8">
                  <h3 className="text-2xl font-bold text-gray-900">{premiumPlan.name}</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-5xl font-extrabold text-gray-900">
                      ${premiumPlan.price.toFixed(2)}
                    </span>
                    <span className="ml-1 text-xl text-gray-500">/{premiumPlan.interval}</span>
                  </div>
                  <p className="mt-4 text-gray-600">Unlimited everything for growing farms</p>

                  {/* Features */}
                  <ul className="mt-6 space-y-4">
                    {Array.isArray(premiumPlan.features) &&
                      premiumPlan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          <svg
                            className="flex-shrink-0 h-6 w-6 text-blue-600"
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

                  <button
                    onClick={() => handleUpgrade(premiumPlan)}
                    disabled={isUpgrading}
                    className={`mt-8 w-full py-3 px-6 rounded-md font-semibold transition-colors ${
                      isUpgrading
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isUpgrading ? 'Processing...' : 'Upgrade Now'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I cancel my subscription anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can cancel your subscription at any time. Your access will continue until
                the end of your current billing period.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, Mastercard, American Express) through our
                secure payment processor, Stripe.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Is my data secure?
              </h3>
              <p className="text-gray-600">
                Absolutely! We use industry-standard encryption and automated daily backups to keep
                your data safe and secure. Your business information is never shared with third
                parties.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                What happens if I exceed the free plan limits?
              </h3>
              <p className="text-gray-600">
                You'll be prompted to upgrade to Premium when you reach your plan limits. Your
                existing data is always safe, and you can upgrade at any time to unlock unlimited
                features.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
