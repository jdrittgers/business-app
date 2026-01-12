import { GrainBin } from './grain-bins';
import { Business, GrainEntity } from './index';

export enum GrainPurchaseOfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  COMPLETED = 'COMPLETED'
}

export interface Retailer {
  id: string;
  userId: string;
  companyName: string;
  businessLicense?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  radiusPreference: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetailerWithUser extends Retailer {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

export interface GrainPurchaseOffer {
  id: string;
  retailerId: string;
  grainBinId: string;
  bushelsOffered: number;
  pricePerBushel: number;
  totalOfferPrice: number;
  status: GrainPurchaseOfferStatus;
  expirationDate?: Date;
  pickupDate?: Date;
  notes?: string;
  acceptedAt?: Date;
  acceptedBy?: string;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GrainPurchaseOfferWithDetails extends GrainPurchaseOffer {
  retailer: RetailerWithUser;
  grainBin: GrainBin & {
    grainEntity: GrainEntity & {
      business: Business;
    };
  };
}

export interface GrainBinWithDistance extends GrainBin {
  distance: number;
  grainEntity: GrainEntity & {
    business: Business;
  };
}

export interface CreateGrainPurchaseOfferRequest {
  retailerId: string;
  grainBinId: string;
  bushelsOffered: number;
  pricePerBushel: number;
  expirationDate?: Date;
  pickupDate?: Date;
  notes?: string;
}

export interface SearchBinsRequest {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  commodityType?: 'CORN' | 'SOYBEANS' | 'WHEAT';
}
