import { Business } from './business';

export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  RETAILER = 'RETAILER'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithBusinesses extends User {
  businessMemberships: BusinessMembership[];
}

export interface BusinessMembership {
  id: string;
  userId: string;
  businessId: string;
  role: UserRole;
  business: Business;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserWithBusinesses;
  accessToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}
