import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRetailerAuthStore } from '../store/retailerAuthStore';
import { RetailerInterest } from '@business-app/shared';

export default function RetailerRegister() {
  const navigate = useNavigate();
  const { register, isAuthenticated, error, clearError } = useRetailerAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    companyName: '',
    zipCode: '',
    businessLicense: '',
    phone: '',
    interest: 'BOTH' as RetailerInterest,
    radiusPreference: 50,
    disclaimerAccepted: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/retailer/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    // Validate disclaimer acceptance
    if (!formData.disclaimerAccepted) {
      setPasswordError('You must accept the terms and disclaimer to create an account');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName,
        zipCode: formData.zipCode || undefined,
        businessLicense: formData.businessLicense || undefined,
        phone: formData.phone || undefined,
        interest: formData.interest,
        radiusPreference: formData.radiusPreference
      });
      navigate('/retailer/dashboard');
    } catch (err) {
      // Error is handled by the store
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Retailer Registration</h1>
            <p className="mt-2 text-sm text-gray-600">Create your account to start bidding</p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {passwordError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {passwordError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your Company LLC"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code *
              </label>
              <input
                type="text"
                required
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="43062"
                pattern="\d{5}"
                title="Please enter a 5-digit ZIP code"
                maxLength={5}
              />
              <p className="mt-1 text-xs text-gray-500">
                Used to find nearby bid requests within your delivery area
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business License
              </label>
              <input
                type="text"
                value={formData.businessLicense}
                onChange={(e) => setFormData({ ...formData, businessLicense: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What are you interested in? *
              </label>
              <select
                value={formData.interest}
                onChange={(e) => setFormData({ ...formData, interest: e.target.value as RetailerInterest })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="BOTH">Both Farm Inputs & Grain</option>
                <option value="INPUTS">Farm Inputs Only (fertilizer, chemicals, seed)</option>
                <option value="GRAIN">Grain Only (buying grain from farmers)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                This determines what type of data you can request access to view
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Radius (miles) *
              </label>
              <input
                type="number"
                min="10"
                max="500"
                value={formData.radiusPreference}
                onChange={(e) => setFormData({ ...formData, radiusPreference: parseInt(e.target.value) || 50 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Farmers within this radius will be notified of your access request
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Re-enter password"
              />
            </div>

            {/* Legal Disclaimer */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="disclaimer"
                    type="checkbox"
                    checked={formData.disclaimerAccepted}
                    onChange={(e) => setFormData({ ...formData, disclaimerAccepted: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="disclaimer" className="text-xs text-gray-700">
                    I acknowledge and agree that this platform is a marketplace connecting retailers with farmers.
                    The platform owner is <span className="font-semibold">NOT responsible or liable</span> for any
                    deals, negotiations, transactions, payments, deliveries, product quality, or disputes that occur
                    between parties. All agreements and transactions are made directly between the retailer and farmer
                    at their own risk and responsibility. By using this platform, I agree to hold the platform owner
                    harmless from any claims, damages, or losses arising from my use of this service. *
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/retailer/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Sign in here
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to Farmer Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
