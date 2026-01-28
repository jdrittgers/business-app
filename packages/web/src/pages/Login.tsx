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
      // Error is handled in the store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 mx-4">
        <div className="text-center mb-8">
          <img
            src="/kernelag-logo.jpg"
            alt="KernelAg"
            className="w-20 h-20 mx-auto mb-4 rounded-xl object-cover"
          />
          <h1 className="text-3xl font-bold text-gray-900">Farmer Login</h1>
          <p className="text-gray-500 mt-1">Sign in to your KernelAg account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg font-semibold text-white bg-emerald-500 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-gray-200 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-600 hover:text-emerald-700 font-medium">
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

        {/* Demo Credentials */}
        <div className="mt-5 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Demo Account</p>
          <div className="space-y-1.5">
            <div className="flex items-center text-sm">
              <span className="text-slate-500 w-20">Email:</span>
              <span className="font-mono font-medium text-slate-800">demo@demo.com</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-slate-500 w-20">Password:</span>
              <span className="font-mono font-medium text-slate-800">demo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
