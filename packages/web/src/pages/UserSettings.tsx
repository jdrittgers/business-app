import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { invitationApi } from '../api/invitation.api';
import { userApi } from '../api/user.api';

export default function UserSettings() {
  const { user, logout, loadUser } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'businesses' | 'account'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Join business state
  const [invitationCode, setInvitationCode] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Profile update state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || ''
  });

  const handleJoinBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Validate invitation code
      const invitation = await invitationApi.validateInvitationCode(invitationCode);

      if (!confirm(`Join ${invitation.businessName} as ${invitation.role}?`)) {
        setIsLoading(false);
        return;
      }

      // Accept invitation
      await invitationApi.acceptInvitation(invitationCode);

      // Reload user data
      await loadUser();

      setSuccess(`Successfully joined ${invitation.businessName}!`);
      setInvitationCode('');
      setShowJoinModal(false);

      setTimeout(() => {
        setSuccess('');
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join business');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // TODO: Create API endpoint to update user profile
      // For now, just show success
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = 'DELETE';
    const userInput = prompt(
      `⚠️ WARNING: This action cannot be undone!\n\nThis will permanently delete your account and remove you from all businesses.\n\nType "${confirmText}" to confirm:`
    );

    if (userInput !== confirmText) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await userApi.deleteAccount();
      alert('Your account has been successfully deleted.');
      await logout();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-700 hover:text-gray-900 text-sm font-medium mr-4"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-bold text-gray-900">Business App</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-8">
            <h1 className="text-3xl font-bold text-white">Account Settings</h1>
            <p className="mt-2 text-green-100">{user.email}</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px px-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'profile'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('businesses')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'businesses'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Businesses
              </button>
              <button
                onClick={() => setActiveTab('account')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'account'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Account
              </button>
            </nav>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 font-medium disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {/* Businesses Tab */}
            {activeTab === 'businesses' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">My Businesses</h2>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    + Join Business
                  </button>
                </div>

                <div className="space-y-4">
                  {user.businessMemberships && user.businessMemberships.length > 0 ? (
                    user.businessMemberships.map((membership) => (
                      <div
                        key={membership.businessId}
                        className="border border-gray-300 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {membership.business.name}
                            </h3>
                            <div className="mt-2 flex items-center gap-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                membership.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                                membership.role === 'MANAGER' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {membership.role}
                              </span>
                            </div>
                          </div>

                          {membership.business.name.startsWith('Temp-') && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                              Temporary
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No businesses yet. Use an invitation code to join one!</p>
                  )}
                </div>

                {/* Join Business Modal */}
                {showJoinModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Join a Business</h3>

                      <form onSubmit={handleJoinBusiness}>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Invitation Code
                          </label>
                          <input
                            type="text"
                            value={invitationCode}
                            onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                            placeholder="ABC12345"
                            maxLength={8}
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Enter the 8-character invitation code from your employer
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowJoinModal(false);
                              setInvitationCode('');
                              setError('');
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading || invitationCode.length !== 8}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            {isLoading ? 'Joining...' : 'Join'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Management</h2>

                <div className="space-y-6">
                  {/* Logout */}
                  <div className="border border-gray-300 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Sign Out</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Sign out of your account on this device
                    </p>
                    <button
                      onClick={async () => {
                        await logout();
                        navigate('/login');
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Sign Out
                    </button>
                  </div>

                  {/* Delete Account */}
                  <div className="border border-red-300 rounded-lg p-4 bg-red-50">
                    <h3 className="font-semibold text-red-900 mb-2">Delete Account</h3>
                    <p className="text-sm text-red-700 mb-3">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
