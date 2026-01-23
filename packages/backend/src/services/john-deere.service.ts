import { prisma } from '../prisma/client';
import {
  JohnDeereConnection,
  JohnDeereMachine,
  JohnDeereOrganization,
  JohnDeereConnectionStatus,
  JohnDeereSyncResult,
  EquipmentJohnDeereMapping
} from '@business-app/shared';
import crypto from 'crypto';

// John Deere OAuth endpoints
const JD_AUTH_BASE = 'https://signin.johndeere.com/oauth2/aus78tnlaysMraFhC1t7';
const JD_API_BASE = 'https://sandboxapi.deere.com/platform'; // Use 'https://partnerapi.deere.com/platform' for production

class JohnDeereService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private scopes: string;

  constructor() {
    this.clientId = process.env.JOHN_DEERE_CLIENT_ID || '';
    this.clientSecret = process.env.JOHN_DEERE_CLIENT_SECRET || '';
    this.redirectUri = process.env.JOHN_DEERE_REDIRECT_URI || '';
    this.scopes = process.env.JOHN_DEERE_SCOPES || 'ag1 ag2 ag3 eq1 eq2 offline_access';

    // Debug: Log if JD credentials are configured
    console.log('[JohnDeere] Client ID configured:', !!this.clientId);
    console.log('[JohnDeere] Redirect URI configured:', !!this.redirectUri);

    // Debug: Show all env var names containing JOHN or DEERE
    const jdEnvVars = Object.keys(process.env).filter(k => k.includes('JOHN') || k.includes('DEERE'));
    console.log('[JohnDeere] Env vars with JOHN/DEERE:', jdEnvVars);

    // Debug: Show a few other expected env vars to verify env loading
    console.log('[JohnDeere] DATABASE_URL set:', !!process.env.DATABASE_URL);
    console.log('[JohnDeere] PORT set:', process.env.PORT);

    if (!this.clientId) {
      console.warn('[JohnDeere] WARNING: JOHN_DEERE_CLIENT_ID is not set!');
    }
    if (!this.redirectUri) {
      console.warn('[JohnDeere] WARNING: JOHN_DEERE_REDIRECT_URI is not set!');
    }
  }

  // ===== OAuth Methods =====

  /**
   * Generate the authorization URL for John Deere OAuth
   */
  getAuthorizationUrl(businessId: string): { url: string; state: string } {
    // Create a state token that includes the businessId for the callback
    const stateData = {
      businessId,
      nonce: crypto.randomBytes(16).toString('hex')
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: this.scopes,
      state
    });

    return {
      url: `${JD_AUTH_BASE}/v1/authorize?${params.toString()}`,
      state
    };
  }

  /**
   * Exchange authorization code for access/refresh tokens
   */
  async handleCallback(code: string, state: string): Promise<JohnDeereConnection> {
    // Decode state to get businessId
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    const { businessId } = stateData;

    // Exchange code for tokens
    const tokenResponse = await fetch(`${JD_AUTH_BASE}/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    const tokens = await tokenResponse.json() as { access_token: string; refresh_token: string; expires_in: number };

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    // Create or update the connection
    const connection = await prisma.johnDeereConnection.upsert({
      where: { businessId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt,
        isActive: true,
        syncError: null
      },
      create: {
        businessId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt,
        isActive: true
      }
    });

    return this.mapConnection(connection);
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(connectionId: string): Promise<void> {
    const connection = await prisma.johnDeereConnection.findUnique({
      where: { id: connectionId }
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    const tokenResponse = await fetch(`${JD_AUTH_BASE}/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      await prisma.johnDeereConnection.update({
        where: { id: connectionId },
        data: { isActive: false, syncError: 'Token refresh failed - please reconnect' }
      });
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const tokens = await tokenResponse.json() as { access_token: string; refresh_token?: string; expires_in: number };
    const tokenExpiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    await prisma.johnDeereConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || connection.refreshToken,
        tokenExpiresAt,
        syncError: null
      }
    });
  }

  /**
   * Get a valid access token, refreshing if needed
   */
  async getValidAccessToken(businessId: string): Promise<string> {
    const connection = await prisma.johnDeereConnection.findUnique({
      where: { businessId }
    });

    if (!connection) {
      throw new Error('No John Deere connection found');
    }

    if (!connection.isActive) {
      throw new Error('John Deere connection is inactive - please reconnect');
    }

    // Refresh if token expires in less than 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (connection.tokenExpiresAt < fiveMinutesFromNow) {
      await this.refreshAccessToken(connection.id);
      const updated = await prisma.johnDeereConnection.findUnique({
        where: { id: connection.id }
      });
      return updated!.accessToken;
    }

    return connection.accessToken;
  }

  /**
   * Disconnect John Deere from a business
   */
  async disconnect(businessId: string): Promise<void> {
    await prisma.johnDeereConnection.delete({
      where: { businessId }
    });

    // Clear John Deere mappings from equipment
    await prisma.equipment.updateMany({
      where: { businessId },
      data: {
        johnDeereMachineId: null,
        currentEngineHours: null,
        lastHoursSyncAt: null
      }
    });
  }

  // ===== API Methods =====

  /**
   * Get organizations the user has access to
   */
  async getOrganizations(businessId: string): Promise<JohnDeereOrganization[]> {
    const accessToken = await this.getValidAccessToken(businessId);

    const response = await fetch(`${JD_API_BASE}/organizations`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.deere.axiom.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch organizations: ${response.statusText}`);
    }

    const data = await response.json() as { values?: Array<{ id: string; name: string }> };
    return (data.values || []).map((org) => ({
      id: org.id,
      name: org.name
    }));
  }

  /**
   * Set the organization for a connection
   */
  async setOrganization(businessId: string, organizationId: string, organizationName: string): Promise<void> {
    await prisma.johnDeereConnection.update({
      where: { businessId },
      data: { organizationId, organizationName }
    });
  }

  /**
   * Get machines (equipment) from John Deere
   */
  async getMachines(businessId: string): Promise<JohnDeereMachine[]> {
    const connection = await prisma.johnDeereConnection.findUnique({
      where: { businessId }
    });

    if (!connection?.organizationId) {
      throw new Error('No organization selected');
    }

    const accessToken = await this.getValidAccessToken(businessId);

    const response = await fetch(
      `${JD_API_BASE}/organizations/${connection.organizationId}/machines`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.deere.axiom.v3+json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch machines: ${response.statusText}`);
    }

    const data = await response.json() as { values?: Array<any> };
    return (data.values || []).map((machine) => ({
      id: machine.id,
      name: machine.name || `${machine.make} ${machine.model}`,
      make: machine.make,
      model: machine.model,
      modelYear: machine.modelYear,
      serialNumber: machine.serialNumber,
      engineHours: machine.engineHours,
      type: machine.machineType
    }));
  }

  /**
   * Get engine hours for a specific machine
   */
  async getMachineHours(businessId: string, machineId: string): Promise<number | null> {
    const connection = await prisma.johnDeereConnection.findUnique({
      where: { businessId }
    });

    if (!connection?.organizationId) {
      throw new Error('No organization selected');
    }

    const accessToken = await this.getValidAccessToken(businessId);

    // Try the measurements endpoint first (newer API)
    try {
      const response = await fetch(
        `${JD_API_BASE}/organizations/${connection.organizationId}/machines/${machineId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.deere.axiom.v3+json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json() as { engineHours?: number };
        return data.engineHours || null;
      }
    } catch (error) {
      console.error('Error fetching machine hours:', error);
    }

    return null;
  }

  // ===== Equipment Mapping & Sync Methods =====

  /**
   * Get equipment with their John Deere mappings
   */
  async getEquipmentMappings(businessId: string): Promise<EquipmentJohnDeereMapping[]> {
    const equipment = await prisma.equipment.findMany({
      where: { businessId, isActive: true, deletedAt: null }
    });

    return equipment.map(e => ({
      equipmentId: e.id,
      equipmentName: e.name,
      equipmentType: e.equipmentType,
      johnDeereMachineId: e.johnDeereMachineId || undefined,
      johnDeereMachineName: undefined, // Would need to fetch from JD
      currentEngineHours: e.currentEngineHours || undefined,
      lastSyncAt: e.lastHoursSyncAt || undefined
    }));
  }

  /**
   * Map an equipment to a John Deere machine
   */
  async mapEquipmentToMachine(equipmentId: string, johnDeereMachineId: string): Promise<void> {
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: { johnDeereMachineId }
    });
  }

  /**
   * Unmap an equipment from John Deere
   */
  async unmapEquipment(equipmentId: string): Promise<void> {
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: {
        johnDeereMachineId: null,
        currentEngineHours: null,
        lastHoursSyncAt: null
      }
    });
  }

  /**
   * Sync hours for all mapped equipment in a business
   */
  async syncAllEquipmentHours(businessId: string): Promise<JohnDeereSyncResult> {
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      const equipment = await prisma.equipment.findMany({
        where: {
          businessId,
          johnDeereMachineId: { not: null },
          isActive: true,
          deletedAt: null
        }
      });

      for (const equip of equipment) {
        try {
          const hours = await this.getMachineHours(businessId, equip.johnDeereMachineId!);

          if (hours !== null) {
            await prisma.equipment.update({
              where: { id: equip.id },
              data: {
                currentEngineHours: Math.round(hours),
                lastHoursSyncAt: new Date()
              }
            });
            syncedCount++;
          }
        } catch (error: any) {
          errors.push(`Failed to sync ${equip.name}: ${error.message}`);
        }
      }

      // Update last sync time on connection
      await prisma.johnDeereConnection.update({
        where: { businessId },
        data: {
          lastSyncAt: new Date(),
          syncError: errors.length > 0 ? errors.join('; ') : null
        }
      });

      return {
        success: errors.length === 0,
        equipmentSynced: syncedCount,
        errors: errors.length > 0 ? errors : undefined,
        syncedAt: new Date()
      };
    } catch (error: any) {
      await prisma.johnDeereConnection.update({
        where: { businessId },
        data: { syncError: error.message }
      });

      return {
        success: false,
        equipmentSynced: 0,
        errors: [error.message],
        syncedAt: new Date()
      };
    }
  }

  // ===== Status Methods =====

  /**
   * Get connection status for a business
   */
  async getConnectionStatus(businessId: string): Promise<JohnDeereConnectionStatus> {
    const connection = await prisma.johnDeereConnection.findUnique({
      where: { businessId }
    });

    if (!connection) {
      return { isConnected: false };
    }

    const needsReauthorization = !connection.isActive ||
      connection.tokenExpiresAt < new Date();

    return {
      isConnected: true,
      connection: this.mapConnection(connection),
      needsReauthorization
    };
  }

  // ===== Helper Methods =====

  private mapConnection(connection: any): JohnDeereConnection {
    return {
      id: connection.id,
      businessId: connection.businessId,
      organizationId: connection.organizationId || undefined,
      organizationName: connection.organizationName || undefined,
      isActive: connection.isActive,
      lastSyncAt: connection.lastSyncAt || undefined,
      syncError: connection.syncError || undefined,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt
    };
  }
}

export const johnDeereService = new JohnDeereService();
