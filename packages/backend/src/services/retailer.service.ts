import { prisma } from '../prisma/client';
import {
  Retailer,
  CreateRetailerRequest,
  RetailerLoginRequest,
  RetailerLoginResponse,
  UserRole
} from '@business-app/shared';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

export class RetailerService {
  async register(data: CreateRetailerRequest): Promise<RetailerLoginResponse> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user with RETAILER role and retailer profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'RETAILER'
        }
      });

      const retailer = await tx.retailer.create({
        data: {
          userId: user.id,
          companyName: data.companyName,
          businessLicense: data.businessLicense,
          phone: data.phone
        }
      });

      return { user, retailer };
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as unknown as UserRole
    });

    const refreshToken = generateRefreshToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role as unknown as UserRole
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: result.user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    return {
      accessToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role as unknown as UserRole
      },
      retailer: {
        id: result.retailer.id,
        userId: result.retailer.userId,
        companyName: result.retailer.companyName,
        businessLicense: result.retailer.businessLicense || undefined,
        phone: result.retailer.phone || undefined,
        createdAt: result.retailer.createdAt,
        updatedAt: result.retailer.updatedAt
      }
    };
  }

  async login(credentials: RetailerLoginRequest): Promise<RetailerLoginResponse> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      include: {
        retailerProfile: true
      }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify role is RETAILER
    if (user.role !== UserRole.RETAILER) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await comparePassword(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    if (!user.retailerProfile) {
      throw new Error('Retailer profile not found');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as unknown as UserRole
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role as unknown as UserRole
    });

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as unknown as UserRole
      },
      retailer: {
        id: user.retailerProfile.id,
        userId: user.retailerProfile.userId,
        companyName: user.retailerProfile.companyName,
        businessLicense: user.retailerProfile.businessLicense || undefined,
        phone: user.retailerProfile.phone || undefined,
        createdAt: user.retailerProfile.createdAt,
        updatedAt: user.retailerProfile.updatedAt
      }
    };
  }

  async getByUserId(userId: string): Promise<Retailer | null> {
    const retailer = await prisma.retailer.findUnique({
      where: { userId }
    });

    if (!retailer) return null;

    return {
      id: retailer.id,
      userId: retailer.userId,
      companyName: retailer.companyName,
      businessLicense: retailer.businessLicense || undefined,
      phone: retailer.phone || undefined,
      createdAt: retailer.createdAt,
      updatedAt: retailer.updatedAt
    };
  }

  async update(retailerId: string, data: { companyName?: string; businessLicense?: string; phone?: string }): Promise<Retailer> {
    const retailer = await prisma.retailer.update({
      where: { id: retailerId },
      data
    });

    return {
      id: retailer.id,
      userId: retailer.userId,
      companyName: retailer.companyName,
      businessLicense: retailer.businessLicense || undefined,
      phone: retailer.phone || undefined,
      createdAt: retailer.createdAt,
      updatedAt: retailer.updatedAt
    };
  }
}
