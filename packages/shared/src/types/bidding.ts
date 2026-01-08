// ===== Enums =====

export enum BidRequestStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export enum RetailerBidStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}

export enum ProductType {
  FERTILIZER = 'FERTILIZER',
  CHEMICAL = 'CHEMICAL'
}

// ===== Retailer Types =====

export interface Retailer {
  id: string;
  userId: string;
  companyName: string;
  businessLicense?: string;
  phone?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  radiusPreference?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRetailerRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  zipCode?: string;
  businessLicense?: string;
  phone?: string;
}

export interface RetailerLoginRequest {
  email: string;
  password: string;
}

export interface RetailerLoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  retailer: Retailer;
}

// ===== Bid Request Types =====

export interface BidRequestItem {
  id: string;
  bidRequestId: string;
  productType: ProductType;
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
  currentPrice?: number;  // Current best price per unit - updates when lower bid received
  createdAt: Date;
}

export interface BidRequest {
  id: string;
  businessId: string;
  createdBy: string;
  title: string;
  description?: string;
  status: BidRequestStatus;
  desiredDeliveryDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  items?: BidRequestItem[];
  bids?: RetailerBid[];
  business?: {
    id: string;
    name: string;
    city?: string;
    state?: string;
    zipCode?: string;
    latitude?: number;
    longitude?: number;
  };
  distance?: number;  // Distance in miles (calculated for retailers)
}

export interface CreateBidRequestItemInput {
  productType: ProductType;
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
  currentPrice?: number;  // Initial target price
}

export interface CreateBidRequestRequest {
  title: string;
  description?: string;
  desiredDeliveryDate?: Date | string;
  notes?: string;
  items: CreateBidRequestItemInput[];
}

export interface UpdateBidRequestRequest {
  title?: string;
  description?: string;
  desiredDeliveryDate?: Date | string;
  notes?: string;
}

export interface GetBidRequestsQuery {
  status?: BidRequestStatus;
}

export interface GetOpenBidRequestsQuery {
  radiusMiles?: number;
  latitude?: number;
  longitude?: number;
}

// ===== Retailer Bid Types =====

export interface RetailerBidItem {
  id: string;
  retailerBidId: string;
  bidRequestItemId: string;
  pricePerUnit: number;
  createdAt: Date;
}

export interface RetailerBid {
  id: string;
  bidRequestId: string;
  retailerId: string;
  status: RetailerBidStatus;
  totalDeliveredPrice: number;
  guaranteedDeliveryDate: Date;
  expirationDate?: Date;
  termsAcknowledged: boolean;
  notes?: string;
  acceptedAt?: Date;
  acceptedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  retailer?: Retailer;
  bidRequest?: BidRequest;
  bidItems?: RetailerBidItem[];
}

export interface CreateRetailerBidItemInput {
  bidRequestItemId: string;
  pricePerUnit: number;
}

export interface CreateRetailerBidRequest {
  bidRequestId: string;
  totalDeliveredPrice: number;
  guaranteedDeliveryDate: Date | string;
  expirationDate?: Date | string;
  termsAcknowledged: boolean;
  notes?: string;
  bidItems: CreateRetailerBidItemInput[];  // Per-item pricing
}

export interface UpdateRetailerBidRequest {
  totalDeliveredPrice?: number;
  guaranteedDeliveryDate?: Date | string;
  expirationDate?: Date | string;
  notes?: string;
}
