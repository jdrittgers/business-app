import { PrismaClient } from '@prisma/client';
import { LoginRequest, LoginResponse, AuthTokenPayload, UserWithBusinesses, UserRole } from '@business-app/shared';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, getRefreshTokenExpirationDate } from '../utils/jwt';

const prisma = new PrismaClient();

export class AuthService {
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
                name: true
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
                name: true
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
