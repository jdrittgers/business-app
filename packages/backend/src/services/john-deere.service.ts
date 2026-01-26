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
    this.scopes = process.env.JOHN_DEERE_SCOPES || 'ag1 ag2 ag3 eq1 eq2 org1 org2 files offline_access';

    // Debug: Log if JD credentials are configured
    console.log('[JohnDeere] Client ID value:', JSON.stringify(this.clientId));
    console.log('[JohnDeere] Client ID length:', this.clientId.length);
    console.log('[JohnDeere] Redirect URI configured:', !!this.redirectUri);

    if (!this.clientId) {
      console.warn('[JohnDeere] WARNING: JOHN_DEERE_CLIENT_ID is not set!');
    } else if (this.clientId.length !== 20) {
      console.warn('[JohnDeere] WARNING: Client ID length is', this.clientId.length, 'expected 20');
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
   * Uses HATEOAS to discover equipment endpoint from organization
   */
  async getMachines(businessId: string): Promise<JohnDeereMachine[]> {
    const connection = await prisma.johnDeereConnection.findUnique({
      where: { businessId }
    });

    if (!connection?.organizationId) {
      throw new Error('No organization selected');
    }

    const accessToken = await this.getValidAccessToken(businessId);
    const orgId = connection.organizationId;

    // Step 1: Get organization to discover available links
    console.log('[JohnDeere] Fetching organization to discover equipment links...');
    const orgResponse = await fetch(`${JD_API_BASE}/organizations/${orgId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.deere.axiom.v3+json'
      }
    });

    if (!orgResponse.ok) {
      console.log('[JohnDeere] Failed to fetch organization:', orgResponse.status);
      return [];
    }

    const orgData = await orgResponse.json() as { links?: Array<{ rel: string; uri: string }> };
    console.log('[JohnDeere] Organization links available:', orgData.links?.map(l => l.rel).join(', '));

    // Step 2: Look for equipment/machines links - try multiple options
    const equipmentRels = ['equipment', 'implements', 'assets', 'wdtCapableMachines', 'machines', 'contributedEquipment', 'ownedEquipment'];
    let equipmentUrl: string | null = null;
    let foundRel: string | null = null;

    for (const rel of equipmentRels) {
      const link = orgData.links?.find(l => l.rel === rel);
      if (link?.uri) {
        // Convert production URL to sandbox if needed
        let url = link.uri.replace('https://api.deere.com', 'https://sandboxapi.deere.com');
        console.log('[JohnDeere] Found link:', rel, '->', url);

        // Try fetching to see if it works
        const testResponse = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.deere.axiom.v3+json'
          }
        });

        if (testResponse.ok) {
          equipmentUrl = url;
          foundRel = rel;
          console.log('[JohnDeere] Successfully accessed:', rel);
          break;
        } else {
          console.log('[JohnDeere] Link', rel, 'returned:', testResponse.status);
        }
      }
    }

    if (!equipmentUrl) {
      console.log('[JohnDeere] No working equipment link found. All links returned errors.');
      return [];
    }

    // Step 3: Fetch equipment from discovered URL (refetch since we consumed the test response)
    console.log('[JohnDeere] Using equipment endpoint:', foundRel, '->', equipmentUrl);
    const response = await fetch(equipmentUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.deere.axiom.v3+json'
      }
    });

    if (!response.ok) {
      console.log('[JohnDeere] Equipment fetch failed:', response.status, response.statusText);
      return [];
    }

    const allEquipment: JohnDeereMachine[] = [];

    const parseEquipment = (equipment: Array<any>) => {
      for (const equip of equipment) {
        allEquipment.push({
          id: equip.id,
          name: equip.name || `${equip.make || ''} ${equip.model || ''}`.trim() || 'Unknown Equipment',
          make: equip.make,
          model: equip.model,
          modelYear: equip.modelYear,
          serialNumber: equip.serialNumber || equip.vin,
          engineHours: equip.engineHours,
          type: equip.equipmentType || equip.type || equip.category
        });
      }
    };

    const firstData = await response.json() as { values?: Array<any>; links?: Array<{ rel: string; uri: string }> };
    console.log('[JohnDeere] Equipment page - found', firstData.values?.length || 0, 'items');

    if (firstData.values && firstData.values.length > 0) {
      console.log('[JohnDeere] Sample equipment:', JSON.stringify(firstData.values[0], null, 2));
    }

    parseEquipment(firstData.values || []);

    // Handle pagination
    let nextLink = firstData.links?.find(l => l.rel === 'nextPage');
    while (nextLink?.uri) {
      const pageResponse = await fetch(nextLink.uri, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.deere.axiom.v3+json'
        }
      });
      if (!pageResponse.ok) break;
      const pageData = await pageResponse.json() as { values?: Array<any>; links?: Array<{ rel: string; uri: string }> };
      parseEquipment(pageData.values || []);
      nextLink = pageData.links?.find(l => l.rel === 'nextPage');
    }

    console.log('[JohnDeere] Total equipment retrieved:', allEquipment.length);
    return allEquipment;
  }

  /**
   * Get engine hours for a specific machine/equipment
   * Uses the /machines/{id}/engineHours endpoint
   */
  async getMachineHours(businessId: string, machineId: string): Promise<number | null> {
    const accessToken = await this.getValidAccessToken(businessId);

    // Use the engineHours endpoint that's available in the API
    try {
      const response = await fetch(
        `${JD_API_BASE}/machines/${machineId}/engineHours`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.deere.axiom.v3+json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json() as { values?: Array<{ engineHours?: number }> };
        // The response may be an array of readings, get the most recent
        if (data.values && data.values.length > 0) {
          return data.values[0].engineHours || null;
        }
        // Or it might be a direct value
        const directData = data as any;
        return directData.engineHours || directData.value || null;
      } else {
        console.log('[JohnDeere] Engine hours not available for machine:', machineId, response.status);
      }
    } catch (error) {
      console.error('[JohnDeere] Error fetching machine hours:', error);
    }

    // Fallback: try the equipment endpoint directly
    try {
      const response = await fetch(
        `${JD_API_BASE}/equipment/${machineId}`,
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
      console.error('[JohnDeere] Error fetching equipment details:', error);
    }

    return null;
  }

  /**
   * Get fields from John Deere organization (with pagination)
   */
  async getFields(businessId: string): Promise<Array<{ id: string; name: string; acres?: number; farmName?: string }>> {
    const connection = await prisma.johnDeereConnection.findUnique({
      where: { businessId }
    });

    if (!connection?.organizationId) {
      throw new Error('No organization selected');
    }

    const accessToken = await this.getValidAccessToken(businessId);
    const orgId = connection.organizationId;

    // Use the documented Fields Read endpoint
    const fieldsUrl = `${JD_API_BASE}/organizations/${orgId}/fields`;
    console.log('[JohnDeere] Fetching fields from:', fieldsUrl);

    const allFields: Array<{ id: string; name: string; acres?: number; farmName?: string }> = [];
    let nextUrl: string | null = fieldsUrl;

    while (nextUrl) {
      console.log('[JohnDeere] Fetching:', nextUrl);
      const response = await fetch(nextUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.deere.axiom.v3+json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[JohnDeere] Fields request failed:', response.status, response.statusText, errorText);
        if (allFields.length === 0) {
          // Only return empty if we got nothing
          return [];
        }
        break;
      }

      const data = await response.json() as { values?: Array<any>; links?: Array<{ rel: string; uri: string }> };
      console.log('[JohnDeere] Fields page - found', data.values?.length || 0, 'fields');

      // Log first field for debugging structure
      if (data.values && data.values.length > 0 && allFields.length === 0) {
        console.log('[JohnDeere] Sample field structure:', JSON.stringify(data.values[0], null, 2));
        console.log('[JohnDeere] Field keys:', Object.keys(data.values[0]).join(', '));
      }

      const fields = data.values || [];
      for (const field of fields) {
        // Parse acres - JD typically uses 'area' with value and unitOfMeasure
        // Or it might be in activeArea or totalArea
        let acres: number | undefined;

        // Try various possible acre fields
        const possibleAcreFields = [
          field.area?.value,
          field.activeArea?.value,
          field.totalArea?.value,
          field.acres,
          field.totalArea,
          field.activeArea,
          field.area
        ];

        for (const val of possibleAcreFields) {
          if (val !== undefined && val !== null) {
            const parsed = typeof val === 'number' ? val : parseFloat(val);
            if (!isNaN(parsed) && parsed > 0) {
              acres = parsed;
              // Check if we need to convert from hectares
              const unit = field.area?.unitOfMeasure || field.activeArea?.unitOfMeasure || field.totalArea?.unitOfMeasure;
              if (unit === 'ha' || unit === 'hectare' || unit === 'hectares') {
                acres = acres * 2.47105;
              }
              break;
            }
          }
        }

        // Log if we couldn't find acres for first field
        if (allFields.length === 0 && !acres) {
          console.log('[JohnDeere] Could not find acres in field. Available properties:',
            JSON.stringify({ area: field.area, activeArea: field.activeArea, totalArea: field.totalArea, acres: field.acres }));
        }

        allFields.push({
          id: field.id,
          name: field.name || 'Unnamed Field',
          acres: acres && !isNaN(acres) ? Math.round(acres * 100) / 100 : undefined,
          farmName: field.farm?.name || undefined
        });
      }

      // Check for next page - JD uses HATEOAS links
      const nextLink = data.links?.find(l => l.rel === 'nextPage');
      nextUrl = nextLink?.uri || null;

      if (nextUrl) {
        console.log('[JohnDeere] More fields available, fetching next page...');
      }
    }

    console.log('[JohnDeere] Total fields retrieved:', allFields.length);
    return allFields;
  }

  /**
   * Get farms from John Deere organization
   */
  async getFarms(businessId: string): Promise<Array<{ id: string; name: string }>> {
    const connection = await prisma.johnDeereConnection.findUnique({
      where: { businessId }
    });

    if (!connection?.organizationId) {
      throw new Error('No organization selected');
    }

    const accessToken = await this.getValidAccessToken(businessId);
    const orgId = connection.organizationId;

    const farmsUrl = `${JD_API_BASE}/organizations/${orgId}/farms`;
    console.log('[JohnDeere] Fetching farms from:', farmsUrl);

    const response = await fetch(farmsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.deere.axiom.v3+json'
      }
    });

    if (!response.ok) {
      console.log('[JohnDeere] Farms request failed:', response.status, response.statusText);
      return [];
    }

    const data = await response.json() as { values?: Array<any> };
    console.log('[JohnDeere] Found', data.values?.length || 0, 'farms');

    return (data.values || []).map((farm: any) => ({
      id: farm.id,
      name: farm.name || 'Unnamed Farm'
    }));
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

  /**
   * Debug method to see raw API responses
   */
  async getDebugInfo(businessId: string): Promise<any> {
    const connection = await prisma.johnDeereConnection.findUnique({
      where: { businessId }
    });

    if (!connection) {
      return { error: 'No connection found' };
    }

    const accessToken = await this.getValidAccessToken(businessId);
    const results: any = {
      connection: {
        organizationId: connection.organizationId,
        organizationName: connection.organizationName,
        isActive: connection.isActive
      },
      apiResponses: {}
    };

    // Test /organizations endpoint
    try {
      const orgResponse = await fetch(`${JD_API_BASE}/organizations`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.deere.axiom.v3+json'
        }
      });
      results.apiResponses.organizations = {
        status: orgResponse.status,
        statusText: orgResponse.statusText,
        data: orgResponse.ok ? await orgResponse.json() : await orgResponse.text()
      };
    } catch (e: any) {
      results.apiResponses.organizations = { error: e.message };
    }

    // Test /equipment endpoint
    try {
      const equipResponse = await fetch(`${JD_API_BASE}/equipment`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.deere.axiom.v3+json'
        }
      });
      results.apiResponses.equipment = {
        status: equipResponse.status,
        statusText: equipResponse.statusText,
        data: equipResponse.ok ? await equipResponse.json() : await equipResponse.text()
      };
    } catch (e: any) {
      results.apiResponses.equipment = { error: e.message };
    }

    // Test organization-specific equipment if we have an org ID
    if (connection.organizationId) {
      try {
        const orgEquipResponse = await fetch(
          `${JD_API_BASE}/organizations/${connection.organizationId}/equipment`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/vnd.deere.axiom.v3+json'
            }
          }
        );
        results.apiResponses.organizationEquipment = {
          status: orgEquipResponse.status,
          statusText: orgEquipResponse.statusText,
          data: orgEquipResponse.ok ? await orgEquipResponse.json() : await orgEquipResponse.text()
        };
      } catch (e: any) {
        results.apiResponses.organizationEquipment = { error: e.message };
      }

      // Also try /machines endpoint for this org
      try {
        const machinesResponse = await fetch(
          `${JD_API_BASE}/organizations/${connection.organizationId}/machines`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/vnd.deere.axiom.v3+json'
            }
          }
        );
        results.apiResponses.organizationMachines = {
          status: machinesResponse.status,
          statusText: machinesResponse.statusText,
          data: machinesResponse.ok ? await machinesResponse.json() : await machinesResponse.text()
        };
      } catch (e: any) {
        results.apiResponses.organizationMachines = { error: e.message };
      }
    }

    return results;
  }
}

export const johnDeereService = new JohnDeereService();
