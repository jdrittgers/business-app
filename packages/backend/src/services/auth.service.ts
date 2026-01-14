import { PrismaClient } from '@prisma/client';
import { LoginRequest, LoginResponse, AuthTokenPayload, UserWithBusinesses, UserRole } from '@business-app/shared';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, getRefreshTokenExpirationDate } from '../utils/jwt';

const prisma = new PrismaClient();

interface RegisterFarmerRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone: string;
  disclaimerAccepted: boolean;
}

interface RegisterResponse extends LoginResponse {
  refreshToken: string;
}

export class AuthService {
  async registerFarmer(data: RegisterFarmerRequest): Promise<RegisterResponse> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user, business, and membership in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'OWNER'
        }
      });

      // Create business
      const business = await tx.business.create({
        data: {
          name: data.businessName,
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: data.zipCode || '',
          phone: data.phone,
          email: data.email
        }
      });

      // Create business membership
      const membership = await tx.businessMember.create({
        data: {
          userId: user.id,
          businessId: business.id,
          role: 'OWNER'
        },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      });

      return { user, membership };
    });

    // Generate tokens
    const tokenPayload: AuthTokenPayload = {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as any as UserRole
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId: result.user.id,
        token: refreshToken,
        expiresAt: getRefreshTokenExpirationDate()
      }
    });

    // Transform user data
    const userResponse: UserWithBusinesses = {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      role: result.user.role as any as UserRole,
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt,
      businessMemberships: [{
        id: result.membership.id,
        userId: result.membership.userId,
        businessId: result.membership.businessId,
        role: result.membership.role as any as UserRole,
        business: result.membership.business
      }]
    };

    return {
      user: userResponse,
      accessToken,
      refreshToken
    };
  }

  async login(loginData: LoginRequest): Promise<LoginResponse> {
    const { email, password } = loginData;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        businessMemberships: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokenPayload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as any as UserRole
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: getRefreshTokenExpirationDate()
      }
    });

    // Transform user data
    const userResponse: UserWithBusinesses = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as any as UserRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      businessMemberships: user.businessMemberships.map(bm => ({
        id: bm.id,
        userId: bm.userId,
        businessId: bm.businessId,
        role: bm.role as any as UserRole,
        business: bm.business
      }))
    };

    return {
      user: userResponse,
      accessToken
    };
  }

  async logout(refreshToken: string): Promise<void> {
    // Delete refresh token from database
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    // Verify refresh token
    let payload: AuthTokenPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }

    // Check if refresh token exists in database and not expired
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new Error('Refresh token expired or invalid');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(payload);

    // Optional: Rotate refresh token for better security
    await prisma.refreshToken.delete({
      where: { token: refreshToken }
    });

    const newRefreshToken = generateRefreshToken(payload);
    await prisma.refreshToken.create({
      data: {
        userId: payload.userId,
        token: newRefreshToken,
        expiresAt: getRefreshTokenExpirationDate()
      }
    });

    return newAccessToken;
  }

  async getCurrentUser(userId: string): Promise<UserWithBusinesses> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        businessMemberships: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as any as UserRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      businessMemberships: user.businessMemberships.map(bm => ({
        id: bm.id,
        userId: bm.userId,
        businessId: bm.businessId,
        role: bm.role as any as UserRole,
        business: bm.business
      }))
    };
  }
}
