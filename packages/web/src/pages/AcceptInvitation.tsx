import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invitationApi, InvitationWithBusiness } from '../api/invitation.api';
import { useAuthStore } from '../store/authStore';

export default function AcceptInvitation() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState<'enter-code' | 'confirm' | 'success'>('enter-code');
  const [code, setCode] = useState('');
  const [invitation, setInvitation] = useState<InvitationWithBusiness | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const validatedInvitation = await invitationApi.validateInvitationCode(code.toUpperCase().trim());
      setInvitation(validatedInvitation);
      setStep('confirm');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired invitation code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user) {
      setError('You must be logged in to accept an invitation');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await invitationApi.acceptInvitation(code.toUpperCase().trim());
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept invitation');
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to the Team!</h1>
            <p className="text-gray-600 mb-6">
              You've successfully joined {invitation?.businessName}
            </p>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'confirm' && invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Confirm Invitation</h1>
            <p className="text-gray-600 text-center mb-6">
              You've been invited to join a team
            </p>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Business</p>
                  <p className="text-lg font-semibold text-gray-900">{invitation.businessName}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Your Role</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {invitation.role.toLowerCase()}
                  </p>
                </div>

                {invitation.email && (
                  <div>
                    <p className="text-sm text-gray-600">Email Restriction</p>
                    <p className="text-sm text-gray-900">{invitation.email}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600">Invitation Code</p>
                  <p className="text-lg font-mono font-bold text-green-600">{invitation.code}</p>
                </div>
              </div>
            </div>

            {!user ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center mb-4">
                  You must be logged in to accept this invitation
                </p>
                <button
                  onClick={() => navigate('/login', { state: { invitationCode: code } })}
                  className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 font-medium"
                >
                  Log In to Accept
                </button>
                <button
                  onClick={() => navigate('/register', { state: { invitationCode: code } })}
                  className="w-full bg-white text-green-600 border-2 border-green-600 py-3 rounded-md hover:bg-green-50 font-medium"
                >
                  Create Account
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleAcceptInvitation}
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading ? 'Accepting...' : 'Accept Invitation'}
                </button>
                <button
                  onClick={() => setStep('enter-code')}
                  className="w-full bg-white text-gray-700 border border-gray-300 py-3 rounded-md hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Join a Team</h1>
            <p className="mt-2 text-sm text-gray-600">
              Enter the invitation code you received
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleValidateCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invitation Code
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-center text-2xl font-mono font-bold tracking-widest"
                placeholder="ABC12345"
                maxLength={8}
                pattern="[A-Z0-9]{8}"
                title="Enter an 8-character invitation code"
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Enter the 8-character code provided by your employer
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || code.length !== 8}
              className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Validating...' : 'Continue'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have a code?{' '}
              <button
                onClick={() => navigate('/')}
                className="text-green-600 hover:text-green-700 font-medium"
              >
                Back to home
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
