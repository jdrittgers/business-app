import { useState, useEffect } from 'react';
import { johnDeereApi } from '../api/john-deere.api';
import {
  JohnDeereConnectionStatus,
  JohnDeereOrganization,
  JohnDeereMachine,
  EquipmentJohnDeereMapping
} from '@business-app/shared';

interface JohnDeereIntegrationProps {
  businessId: string;
  onSync?: () => void;
}

export default function JohnDeereIntegration({ businessId, onSync }: JohnDeereIntegrationProps) {
  const [status, setStatus] = useState<JohnDeereConnectionStatus | null>(null);
  const [organizations, setOrganizations] = useState<JohnDeereOrganization[]>([]);
  const [machines, setMachines] = useState<JohnDeereMachine[]>([]);
  const [mappings, setMappings] = useState<EquipmentJohnDeereMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showOrgSelect, setShowOrgSelect] = useState(false);
  const [showMapping, setShowMapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();

    // Check for OAuth callback params
    const params = new URLSearchParams(window.location.search);
    const jdConnected = params.get('jd_connected');
    const jdError = params.get('jd_error');

    if (jdConnected) {
      // Clear URL params and reload status
      window.history.replaceState({}, '', window.location.pathname);
      loadStatus();
    }
    if (jdError) {
      setError(jdError);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [businessId]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const statusData = await johnDeereApi.getStatus(businessId);
      setStatus(statusData);

      if (statusData.isConnected && statusData.connection?.organizationId) {
        // Load mappings if connected
        await loadMappings();
      }
    } catch (err) {
      console.error('Error loading JD status:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMappings = async () => {
    try {
      const [mappingsData, machinesData] = await Promise.all([
        johnDeereApi.getMappings(businessId),
        johnDeereApi.getMachines(businessId)
      ]);
      setMappings(mappingsData);
      setMachines(machinesData);
    } catch (err) {
      console.error('Error loading mappings:', err);
    }
  };

  const handleConnect = async () => {
    try {
      const { url } = await johnDeereApi.getAuthUrl(businessId);
      // Redirect to John Deere OAuth
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to start connection');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect from John Deere? Equipment mappings will be removed.')) {
      return;
    }
    try {
      await johnDeereApi.disconnect(businessId);
      setStatus({ isConnected: false });
      setMappings([]);
      setMachines([]);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    }
  };

  const handleSelectOrg = async () => {
    try {
      const orgs = await johnDeereApi.getOrganizations(businessId);
      setOrganizations(orgs);
      setShowOrgSelect(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load organizations');
    }
  };

  const handleOrgSelected = async (org: JohnDeereOrganization) => {
    try {
      await johnDeereApi.setOrganization(businessId, org.id, org.name);
      setShowOrgSelect(false);
      await loadStatus();
      await loadMappings();
    } catch (err: any) {
      setError(err.message || 'Failed to set organization');
    }
  };

  const handleMapEquipment = async (equipmentId: string, machineId: string | null) => {
    try {
      await johnDeereApi.mapEquipment(equipmentId, machineId);
      await loadMappings();
    } catch (err: any) {
      setError(err.message || 'Failed to map equipment');
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await johnDeereApi.sync(businessId);
      if (result.success) {
        alert(`Successfully synced ${result.equipmentSynced} equipment`);
      } else {
        alert(`Sync completed with errors: ${result.errors?.join(', ')}`);
      }
      await loadMappings();
      onSync?.();
    } catch (err: any) {
      setError(err.message || 'Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse flex items-center space-x-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">John Deere Operations Center</h3>
              <p className="text-sm text-gray-500">
                {status?.isConnected
                  ? status.connection?.organizationName || 'Connected'
                  : 'Sync equipment hours automatically'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {status?.isConnected ? (
              <>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Connected
                </span>
                <button
                  onClick={handleDisconnect}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Connect
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100">
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 underline mt-1">
            Dismiss
          </button>
        </div>
      )}

      {/* Content when connected */}
      {status?.isConnected && (
        <div className="p-4">
          {/* Organization selection needed */}
          {!status.connection?.organizationId && (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-3">Select your Operations Center organization</p>
              <button
                onClick={handleSelectOrg}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Select Organization
              </button>
            </div>
          )}

          {/* Organization selector modal */}
          {showOrgSelect && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowOrgSelect(false)} />
                <div className="relative bg-white rounded-lg p-6 max-w-md w-full">
                  <h3 className="text-lg font-medium mb-4">Select Organization</h3>
                  <div className="space-y-2">
                    {organizations.map(org => (
                      <button
                        key={org.id}
                        onClick={() => handleOrgSelected(org)}
                        className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50"
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowOrgSelect(false)}
                    className="mt-4 w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Equipment Mapping Section */}
          {status.connection?.organizationId && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Equipment Mapping</h4>
                  <p className="text-xs text-gray-500">
                    Link your equipment to John Deere machines for automatic hours sync
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowMapping(!showMapping)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showMapping ? 'Hide' : 'Configure'}
                  </button>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              </div>

              {/* Last sync info */}
              {status.connection?.lastSyncAt && (
                <p className="text-xs text-gray-500 mb-3">
                  Last synced: {new Date(status.connection.lastSyncAt).toLocaleString()}
                </p>
              )}

              {/* Mapping table */}
              {showMapping && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Equipment</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">John Deere Machine</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {mappings.map(mapping => (
                        <tr key={mapping.equipmentId}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {mapping.equipmentName}
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={mapping.johnDeereMachineId || ''}
                              onChange={(e) => handleMapEquipment(mapping.equipmentId, e.target.value || null)}
                              className="text-sm border-gray-300 rounded-md"
                            >
                              <option value="">Not linked</option>
                              {machines.map(machine => (
                                <option key={machine.id} value={machine.id}>
                                  {machine.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {mapping.currentEngineHours != null
                              ? `${mapping.currentEngineHours.toLocaleString()} hrs`
                              : '-'}
                          </td>
                        </tr>
                      ))}
                      {mappings.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center text-sm text-gray-500">
                            No equipment found. Add equipment first.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Quick status */}
              {!showMapping && mappings.length > 0 && (
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{mappings.filter(m => m.johnDeereMachineId).length} of {mappings.length} equipment linked</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
