import { UserRole } from './user';

export interface Business {
  id: string;
  name: string;
  city?: string;
  state?: string;
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
