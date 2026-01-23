// John Deere Operations Center Integration Types

export interface JohnDeereConnection {
  id: string;
  businessId: string;
  organizationId?: string;
  organizationName?: string;
  isActive: boolean;
  lastSyncAt?: Date | string;
  syncError?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface JohnDeereMachine {
  id: string;
  name: string;
  make?: string;
  model?: string;
  modelYear?: number;
  serialNumber?: string;
  engineHours?: number;
  type?: string;
}

export interface JohnDeereOrganization {
  id: string;
  name: string;
}

export interface EquipmentJohnDeereMapping {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  johnDeereMachineId?: string;
  johnDeereMachineName?: string;
  currentEngineHours?: number;
  lastSyncAt?: Date | string;
}

export interface JohnDeereConnectionStatus {
  isConnected: boolean;
  connection?: JohnDeereConnection;
  needsReauthorization?: boolean;
}

export interface JohnDeereSyncResult {
  success: boolean;
  equipmentSynced: number;
  errors?: string[];
  syncedAt: Date | string;
}

// Request/Response types
export interface ConnectJohnDeereRequest {
  code: string;
  state: string;
}

export interface MapEquipmentToJohnDeereRequest {
  johnDeereMachineId: string;
}

export interface JohnDeereAuthUrl {
  url: string;
  state: string;
}
