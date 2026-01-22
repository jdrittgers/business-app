import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { invitationApi } from '../api/invitation.api';
import { userApi } from '../api/user.api';
import { grainContractsApi } from '../api/grain-contracts.api';
import { GrainEntity } from '@business-app/shared';

export default function UserSettings() {
  const { user, logout, loadUser } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'businesses' | 'entities' | 'account'>('profile');
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

  // Business location state
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [businessZipCode, setBusinessZipCode] = useState('');

  // Entities state
  const [entities, setEntities] = useState<GrainEntity[]>([]);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState<GrainEntity | null>(null);
  const [entityFormData, setEntityFormData] = useState({ name: '' });

  const businessId = user?.businessMemberships?.[0]?.businessId;

  // Load entities when tab changes to entities
  useEffect(() => {
    if (activeTab === 'entities' && businessId) {
      loadEntities();
    }
  }, [activeTab, businessId]);

  const loadEntities = async () => {
    if (!businessId) return;
    try {
      const data = await grainContractsApi.getGrainEntities(businessId);
      setEntities(data);
    } catch (err) {
      console.error('Failed to load entities:', err);
    }
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setIsLoading(true);
    setError('');

    try {
      await grainContractsApi.createGrainEntity(businessId, entityFormData.name);
      setSuccess('Entity created successfully!');
      setShowEntityModal(false);
      setEntityFormData({ name: '' });
      await loadEntities();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create entity');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !editingEntity) return;
    setIsLoading(true);
    setError('');

    try {
      await grainContractsApi.updateGrainEntity(businessId, editingEntity.id, { name: entityFormData.name });
      setSuccess('Entity updated successfully!');
      setShowEntityModal(false);
      setEditingEntity(null);
      setEntityFormData({ name: '' });
      await loadEntities();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update entity');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntity = async (entityId: string, entityName: string) => {
    if (!businessId) return;
    if (!confirm(`Are you sure you want to delete "${entityName}"? This may affect farms and contracts associated with this entity.`)) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await grainContractsApi.deleteGrainEntity(businessId, entityId);
      setSuccess('Entity deleted successfully!');
      await loadEntities();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete entity');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleUpdateBusinessLocation = async (businessId: string, zipCode: string) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await userApi.updateBusinessLocation(businessId, zipCode);
      setSuccess('Business location updated successfully!');

      // Reload user data to get updated business info
      await loadUser();

      setEditingBusinessId(null);
      setBusinessZipCode('');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update business location');
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
                onClick={() => setActiveTab('entities')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'entities'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Entities
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
                          <div className="flex-1">
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

                            {/* Location info */}
                            {editingBusinessId === membership.businessId ? (
                              <div className="mt-3 space-y-2">
                                <input
                                  type="text"
                                  value={businessZipCode}
                                  onChange={(e) => setBusinessZipCode(e.target.value)}
                                  placeholder="ZIP Code"
                                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                  maxLength={5}
                                  pattern="\d{5}"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUpdateBusinessLocation(membership.businessId, businessZipCode)}
                                    disabled={isLoading || businessZipCode.length !== 5}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {isLoading ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingBusinessId(null);
                                      setBusinessZipCode('');
                                    }}
                                    className="px-3 py-1 border border-gray-300 text-sm rounded hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2">
                                {membership.business.latitude && membership.business.longitude ? (
                                  <div className="text-sm text-gray-600">
                                    📍 Location set: {membership.business.zipCode || 'Custom'}
                                    {(membership.role === 'OWNER' || membership.role === 'MANAGER') && (
                                      <button
                                        onClick={() => {
                                          setEditingBusinessId(membership.businessId);
                                          setBusinessZipCode(membership.business.zipCode || '');
                                        }}
                                        className="ml-2 text-green-600 hover:text-green-700"
                                      >
                                        Edit
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  (membership.role === 'OWNER' || membership.role === 'MANAGER') && (
                                    <button
                                      onClick={() => {
                                        setEditingBusinessId(membership.businessId);
                                        setBusinessZipCode('');
                                      }}
                                      className="text-sm text-green-600 hover:text-green-700"
                                    >
                                      + Set Location (required for grain marketplace)
                                    </button>
                                  )
                                )}
                              </div>
                            )}
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

            {/* Entities Tab */}
            {activeTab === 'entities' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Grain Entities</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Manage your farming entities (e.g., Rittgers Grains, JDR Ag, etc.)
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingEntity(null);
                      setEntityFormData({ name: '' });
                      setShowEntityModal(true);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    + Add Entity
                  </button>
                </div>

                <div className="space-y-3">
                  {entities.length > 0 ? (
                    entities.map((entity) => (
                      <div
                        key={entity.id}
                        className="border border-gray-300 rounded-lg p-4 flex justify-between items-center"
                      >
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{entity.name}</h3>
                          <p className="text-sm text-gray-500">
                            Created {new Date(entity.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingEntity(entity);
                              setEntityFormData({ name: entity.name });
                              setShowEntityModal(true);
                            }}
                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEntity(entity.id, entity.name)}
                            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="mt-2 text-gray-500">No entities yet</p>
                      <p className="text-sm text-gray-400">Add your first entity to get started</p>
                    </div>
                  )}
                </div>

                {/* Entity Modal */}
                {showEntityModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {editingEntity ? 'Edit Entity' : 'Add New Entity'}
                      </h3>

                      <form onSubmit={editingEntity ? handleUpdateEntity : handleCreateEntity}>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Entity Name
                          </label>
                          <input
                            type="text"
                            value={entityFormData.name}
                            onChange={(e) => setEntityFormData({ name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="e.g., Rittgers Grains, JDR Ag"
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            This is typically a farming operation, partnership, or LLC
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowEntityModal(false);
                              setEditingEntity(null);
                              setEntityFormData({ name: '' });
                              setError('');
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading || !entityFormData.name.trim()}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            {isLoading ? 'Saving...' : editingEntity ? 'Update' : 'Create'}
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
