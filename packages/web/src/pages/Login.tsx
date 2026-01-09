import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { invitationApi } from '../api/invitation.api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError, loadUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [invitationCode, setInvitationCode] = useState<string | null>(null);

  // Check for invitation code
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    const codeFromState = location.state?.invitationCode;
    const code = codeFromUrl || codeFromState;
    if (code) {
      setInvitationCode(code);
    }
  }, [searchParams, location.state]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);

      // If there's an invitation code, accept it after login
      if (invitationCode) {
        try {
          await invitationApi.acceptInvitation(invitationCode);
          await loadUser(); // Reload to get updated memberships
        } catch (err) {
          console.error('Failed to accept invitation:', err);
        }
      }

      navigate('/dashboard');
    } catch (err) {
      // Error is already handled in the store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Business App</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="owner@90ten.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Register as a Farmer
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            Are you a retailer?{' '}
            <Link to="/retailer/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Sign in to the Retailer Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
