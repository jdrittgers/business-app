import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { invitationApi, CreateInvitationRequest, InvitationResponse } from '../api/invitation.api';

export default function TeamManagement() {
  const { user } = useAuthStore();
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState<CreateInvitationRequest>({
    businessId: '',
    role: 'EMPLOYEE',
    email: '',
    expiresInDays: 7,
    maxUses: 1
  });

  // Get the user's business (assuming first business membership for now)
  const userBusiness = user?.businessMemberships?.[0];

  useEffect(() => {
    if (userBusiness?.businessId) {
      setFormData(prev => ({ ...prev, businessId: userBusiness.businessId }));
      loadInvitations();
    }
  }, [userBusiness?.businessId]);

  const loadInvitations = async () => {
    if (!userBusiness?.businessId) return;

    setIsLoading(true);
    setError('');

    try {
      const data = await invitationApi.getBusinessInvitations(userBusiness.businessId);
      setInvitations(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const newInvitation = await invitationApi.createInvitation({
        ...formData,
        email: formData.email || undefined // Convert empty string to undefined
      });

      setSuccess(`Invitation created! Code: ${newInvitation.code}`);
      setInvitations([newInvitation, ...invitations]);
      setShowCreateForm(false);

      // Reset form
      setFormData({
        businessId: userBusiness?.businessId || '',
        role: 'EMPLOYEE',
        email: '',
        expiresInDays: 7,
        maxUses: 1
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create invitation');
    }
  };

  const handleDeactivate = async (invitationId: string) => {
    if (!confirm('Are you sure you want to deactivate this invitation?')) return;

    setError('');
    try {
      await invitationApi.deactivateInvitation(invitationId);
      setInvitations(invitations.map(inv =>
        inv.id === invitationId ? { ...inv, isActive: false } : inv
      ));
      setSuccess('Invitation deactivated');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to deactivate invitation');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess(`Code ${code} copied to clipboard!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  if (userBusiness?.role !== 'OWNER') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">Only business owners can manage team invitations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-8">
            <h1 className="text-3xl font-bold text-white">Team Management</h1>
            <p className="mt-2 text-green-100">{userBusiness?.business?.name}</p>
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

            <div className="mb-6">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium"
              >
                {showCreateForm ? 'Cancel' : '+ Create Invitation'}
              </button>
            </div>

            {showCreateForm && (
              <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Invitation</h2>
                <form onSubmit={handleCreateInvitation} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'MANAGER' | 'EMPLOYEE' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Managers can view and edit most data. Employees have limited access.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="jacob@rittgersfarms.com"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      If provided, only this email can use this invitation code.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expires In (Days) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={formData.expiresInDays}
                        onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Uses *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={formData.maxUses}
                        onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 font-medium"
                  >
                    Generate Invitation Code
                  </button>
                </form>
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Invitations</h2>

              {isLoading ? (
                <p className="text-gray-500">Loading invitations...</p>
              ) : invitations.length === 0 ? (
                <p className="text-gray-500">No invitations created yet.</p>
              ) : (
                <div className="space-y-4">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className={`border rounded-lg p-4 ${
                        invitation.isActive ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <code className="text-2xl font-mono font-bold text-green-600">
                              {invitation.code}
                            </code>
                            <button
                              onClick={() => copyToClipboard(invitation.code)}
                              className="text-sm text-gray-600 hover:text-green-600"
                              title="Copy to clipboard"
                            >
                              📋 Copy
                            </button>
                            {!invitation.isActive && (
                              <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                                Deactivated
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Role:</span>{' '}
                              <span className="capitalize">{invitation.role.toLowerCase()}</span>
                            </div>
                            <div>
                              <span className="font-medium">Uses:</span>{' '}
                              {invitation.currentUses} / {invitation.maxUses}
                            </div>
                            <div>
                              <span className="font-medium">Expires:</span>{' '}
                              {new Date(invitation.expiresAt).toLocaleDateString()}
                            </div>
                            {invitation.email && (
                              <div>
                                <span className="font-medium">Email:</span> {invitation.email}
                              </div>
                            )}
                          </div>
                        </div>

                        {invitation.isActive && (
                          <button
                            onClick={() => handleDeactivate(invitation.id)}
                            className="ml-4 text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Deactivate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
