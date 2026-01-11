export interface GrainBin {
  id: string;
  grainEntityId: string;
  grainEntityName?: string;
  businessId?: string;
  name: string;
  capacity: number;
  currentBushels: number;
  commodityType: 'CORN' | 'SOYBEANS' | 'WHEAT';
  cropYear: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  fillPercentage?: number;
}

export enum ScaleTicketStatus {
  PENDING = 'PENDING',
  PARSED = 'PARSED',
  FAILED = 'FAILED',
  PROCESSED = 'PROCESSED'
}

export interface ScaleTicket {
  id: string;
  businessId: string;
  uploadedBy: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: ScaleTicketStatus;
  loadNumber?: string;
  ticketDate?: Date;
  netBushels?: number;
  moisture?: number;
  testWeight?: number;
  commodityType?: 'CORN' | 'SOYBEANS' | 'WHEAT';
  buyer?: string;
  parsedData?: any;
  parseError?: string;
  parsedAt?: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  uploader?: {
    id: string;
    name: string;
    email: string;
  };
  bin?: {
    id: string;
    name: string;
    grainEntityId: string;
    grainEntityName: string;
  };
  binTransaction?: {
    id: string;
    type: string;
    bushels: number;
    transactionDate: Date;
  };
}

export interface BinTransaction {
  id: string;
  binId: string;
  type: 'ADDITION' | 'REMOVAL' | 'SALE' | 'ADJUSTMENT';
  bushels: number;
  description?: string;
  scaleTicket?: {
    id: string;
    loadNumber?: string;
    ticketDate?: Date;
  };
  grainContract?: {
    id: string;
    contractNumber?: string;
    buyer: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  transactionDate: Date;
  createdAt: Date;
}

export interface CreateGrainBinRequest {
  grainEntityId: string;
  name: string;
  capacity: number;
  currentBushels?: number;
  commodityType: 'CORN' | 'SOYBEANS' | 'WHEAT';
  cropYear: number;
  notes?: string;
}

export interface UpdateGrainBinRequest {
  name?: string;
  capacity?: number;
  commodityType?: 'CORN' | 'SOYBEANS' | 'WHEAT';
  cropYear?: number;
  notes?: string;
  isActive?: boolean;
}

export interface AddGrainRequest {
  bushels: number;
  description?: string;
}

export interface AssignBinRequest {
  binId: string;
  bushelsOverride?: number;
}

export interface BinSummary {
  commodityType: 'CORN' | 'SOYBEANS' | 'WHEAT';
  totalCapacity: number;
  totalBushels: number;
  binCount: number;
}
