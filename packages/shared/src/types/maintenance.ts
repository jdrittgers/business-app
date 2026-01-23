// Equipment Maintenance Types

export enum MaintenanceType {
  GREASE = 'GREASE',
  OIL_CHANGE = 'OIL_CHANGE',
  FILTER_CHANGE = 'FILTER_CHANGE',
  INSPECTION = 'INSPECTION',
  REPAIR = 'REPAIR',
  OTHER = 'OTHER'
}

export enum MaintenanceFrequency {
  ONE_TIME = 'ONE_TIME',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  ANNUAL = 'ANNUAL',
  BY_HOURS = 'BY_HOURS'
}

export interface EquipmentMaintenance {
  id: string;
  equipmentId: string;
  equipmentName?: string;
  title: string;
  description?: string;
  maintenanceType: MaintenanceType;
  frequency: MaintenanceFrequency;

  // Time-based scheduling
  nextDueDate?: Date | string;
  lastCompletedDate?: Date | string;

  // Hours-based scheduling
  intervalHours?: number;
  lastCompletedHours?: number;
  nextDueHours?: number;

  // Cost tracking
  estimatedCost?: number;

  // Reminder settings
  reminderSent: boolean;
  reminderDays: number;

  // Task integration
  autoCreateTask: boolean;
  currentTaskId?: string;

  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;

  // Included relations
  history?: MaintenanceHistory[];
}

export interface MaintenanceHistory {
  id: string;
  maintenanceId: string;
  completedDate: Date | string;
  completedByUserId?: string;
  completedByName?: string;
  hoursAtCompletion?: number;
  actualCost?: number;
  notes?: string;
  createdAt: Date | string;
}

export interface CreateMaintenanceRequest {
  equipmentId: string;
  title: string;
  description?: string;
  maintenanceType: MaintenanceType;
  frequency: MaintenanceFrequency;

  // Time-based
  nextDueDate?: string;

  // Hours-based
  intervalHours?: number;
  nextDueHours?: number;

  estimatedCost?: number;
  reminderDays?: number;
  autoCreateTask?: boolean;
}

export interface UpdateMaintenanceRequest {
  title?: string;
  description?: string;
  maintenanceType?: MaintenanceType;
  frequency?: MaintenanceFrequency;
  nextDueDate?: string;
  intervalHours?: number;
  nextDueHours?: number;
  estimatedCost?: number;
  reminderDays?: number;
  autoCreateTask?: boolean;
  isActive?: boolean;
}

export interface CompleteMaintenanceRequest {
  completedDate?: string;
  hoursAtCompletion?: number;
  actualCost?: number;
  notes?: string;
}

// Helper to get display label for maintenance type
export const maintenanceTypeLabels: Record<MaintenanceType, string> = {
  [MaintenanceType.GREASE]: 'Grease',
  [MaintenanceType.OIL_CHANGE]: 'Oil Change',
  [MaintenanceType.FILTER_CHANGE]: 'Filter Change',
  [MaintenanceType.INSPECTION]: 'Inspection',
  [MaintenanceType.REPAIR]: 'Repair',
  [MaintenanceType.OTHER]: 'Other'
};

// Helper to get display label for frequency
export const maintenanceFrequencyLabels: Record<MaintenanceFrequency, string> = {
  [MaintenanceFrequency.ONE_TIME]: 'One Time',
  [MaintenanceFrequency.WEEKLY]: 'Weekly',
  [MaintenanceFrequency.MONTHLY]: 'Monthly',
  [MaintenanceFrequency.QUARTERLY]: 'Quarterly',
  [MaintenanceFrequency.SEMI_ANNUAL]: 'Semi-Annual',
  [MaintenanceFrequency.ANNUAL]: 'Annual',
  [MaintenanceFrequency.BY_HOURS]: 'By Hours'
};
