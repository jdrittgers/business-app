import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { invitationApi } from '../api/invitation.api';
import { useAuthStore } from '../store/authStore';

export default function FarmerRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { loadUser } = useAuthStore();
  const [invitationCode, setInvitationCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    businessName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    disclaimerAccepted: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitationBusinessName, setInvitationBusinessName] = useState<string | null>(null);

  // Check for invitation code in URL or state
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    const codeFromState = location.state?.invitationCode;
    const code = codeFromUrl || codeFromState;

    if (code) {
      setInvitationCode(code);
      // Validate the code and get business name
      validateInvitation(code);
    }
  }, [searchParams, location.state]);

  const validateInvitation = async (code: string) => {
    try {
      const invitation = await invitationApi.validateInvitationCode(code);
      setInvitationBusinessName(invitation.businessName);
      // Pre-fill email if invitation has one
      if (invitation.email) {
        setFormData(prev => ({ ...prev, email: invitation.email || '' }));
      }
    } catch (err) {
      console.error('Invalid invitation code:', err);
      setInvitationCode(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Validate disclaimer acceptance
    if (!formData.disclaimerAccepted) {
      setError('You must accept the terms and disclaimer to create an account');
      return;
    }

    setIsLoading(true);

    try {
      // If using invitation code, skip business creation
      if (invitationCode) {
        // Register without creating a business
        const { confirmPassword, businessName, ...registerDataWithoutBusiness } = formData;

        // Create account (we'll use a special endpoint or handle this differently)
        // For now, create with a placeholder business name that won't be used
        const response = await authApi.registerFarmer({
          ...registerDataWithoutBusiness,
          businessName: 'Temp-' + Date.now() // Temporary, will be removed after joining via invitation
        });

        // Store access token
        localStorage.setItem('accessToken', response.accessToken);

        // Load user data
        await loadUser();

        // Accept the invitation
        await invitationApi.acceptInvitation(invitationCode);

        // Reload user data to get updated business memberships
        await loadUser();

        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        // Normal registration flow - create own business
        const { confirmPassword, ...registerData } = formData;
        const response = await authApi.registerFarmer(registerData);

        // Store access token
        localStorage.setItem('accessToken', response.accessToken);

        // Load user data
        await loadUser();

        // Redirect to dashboard
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {invitationBusinessName && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">You've been invited!</h3>
                  <p className="mt-1 text-sm text-blue-700">
                    Create your account to join <span className="font-semibold">{invitationBusinessName}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {invitationCode ? 'Join Team' : 'Farmer Registration'}
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              {invitationCode
                ? 'Create your account to accept the invitation'
                : 'Create your account to start requesting bids'}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="your@email.com"
              />
            </div>

            {/* Only show business fields if NOT using invitation */}
            {!invitationCode && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business/Farm Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Smith Family Farm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="123 Farm Road"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="OH"
                      maxLength={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="43062"
                      pattern="\d{5}"
                      maxLength={5}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="(555) 123-4567"
              />
              <p className="mt-1 text-xs text-gray-500">
                Required for retailers to coordinate delivery
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    required
                  />
                </div>
                <div className="ml-3">
                  <label htmlFor="disclaimer" className="text-xs text-gray-700">
                    I acknowledge and agree that this platform is a marketplace connecting farmers with retailers.
                    The platform owner is <span className="font-semibold">NOT responsible or liable</span> for any
                    deals, negotiations, transactions, payments, deliveries, product quality, or disputes that occur
                    between parties. All agreements and transactions are made directly between the farmer and retailer
                    at their own risk and responsibility. By using this platform, I agree to hold the platform owner
                    harmless from any claims, damages, or losses arising from my use of this service. *
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">
                Sign in here
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link to="/retailer/register" className="text-sm text-gray-500 hover:text-gray-700">
              Are you a retailer? Register here →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
