export enum UserRole {
  OWNER = 'OWNER',
  EMPLOYEE = 'EMPLOYEE'
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
  business: {
    id: string;
    name: string;
  };
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
