import { UserRole } from './user';

export interface Business {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessMember {
  id: string;
  userId: string;
  businessId: string;
  role: UserRole;
  createdAt: Date;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}

export interface CreateBusinessMemberRequest {
  userId: string;
  role: UserRole;
}
