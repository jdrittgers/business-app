import { prisma } from '../prisma/client';
import { RetailerInterest as PrismaRetailerInterest } from '@prisma/client';
import {
  Retailer,
  CreateRetailerRequest,
  RetailerLoginRequest,
  RetailerLoginResponse,
  UserRole,
  RetailerInterest
} from '@business-app/shared';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { GeocodingService } from './geocoding.service';
import { retailerAccessService } from './retailer-access.service';

export class RetailerService {
  private geocodingService: GeocodingService;

  constructor() {
    this.geocodingService = new GeocodingService();
  }

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

    // Geocode ZIP code if provided
    let geocodeResult = null;
    if (data.zipCode) {
      try {
        geocodeResult = await this.geocodingService.geocodeZipCode(data.zipCode);
        console.log(`✅ Geocoded ZIP ${data.zipCode}: ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
      } catch (error) {
        console.error('Geocoding failed during registration:', error);
        // Don't fail registration if geocoding fails
        // User can update location later
      }
    }

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
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          latitude: geocodeResult?.latitude,
          longitude: geocodeResult?.longitude,
          radiusPreference: (data as any).radiusPreference || 50,  // Default 50 miles
          interest: ((data as any).interest as PrismaRetailerInterest) || 'BOTH'  // Default to BOTH
        }
      });

      return { user, retailer };
    });

    // Create access requests for farmers within radius (async, don't block registration)
    if (result.retailer.latitude && result.retailer.longitude) {
      retailerAccessService.createAccessRequestsForRadius(result.retailer.id)
        .then(count => console.log(`✅ Created ${count} access requests for new retailer ${result.retailer.companyName}`))
        .catch(err => console.error('Failed to create access requests:', err));
    }

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
        address: result.retailer.address || undefined,
        city: result.retailer.city || undefined,
        state: result.retailer.state || undefined,
        zipCode: result.retailer.zipCode || undefined,
        latitude: result.retailer.latitude ? Number(result.retailer.latitude) : undefined,
        longitude: result.retailer.longitude ? Number(result.retailer.longitude) : undefined,
        radiusPreference: result.retailer.radiusPreference,
        interest: result.retailer.interest as RetailerInterest,
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
        address: user.retailerProfile.address || undefined,
        city: user.retailerProfile.city || undefined,
        state: user.retailerProfile.state || undefined,
        zipCode: user.retailerProfile.zipCode || undefined,
        latitude: user.retailerProfile.latitude ? Number(user.retailerProfile.latitude) : undefined,
        longitude: user.retailerProfile.longitude ? Number(user.retailerProfile.longitude) : undefined,
        radiusPreference: user.retailerProfile.radiusPreference,
        interest: user.retailerProfile.interest as RetailerInterest,
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
      address: retailer.address || undefined,
      city: retailer.city || undefined,
      state: retailer.state || undefined,
      zipCode: retailer.zipCode || undefined,
      latitude: retailer.latitude ? Number(retailer.latitude) : undefined,
      longitude: retailer.longitude ? Number(retailer.longitude) : undefined,
      radiusPreference: retailer.radiusPreference,
      interest: retailer.interest as RetailerInterest,
      createdAt: retailer.createdAt,
      updatedAt: retailer.updatedAt
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    return user;
  }

  async update(
    retailerId: string,
    data: {
      companyName?: string;
      businessLicense?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      radiusPreference?: number;
      interest?: PrismaRetailerInterest;
    }
  ): Promise<Retailer> {
    // Get current retailer for comparison
    const currentRetailer = await prisma.retailer.findUnique({
      where: { id: retailerId }
    });

    if (!currentRetailer) {
      throw new Error('Retailer not found');
    }

    const oldRadius = currentRetailer.radiusPreference;
    const oldInterest = currentRetailer.interest;

    // Geocode if ZIP code is being updated
    let geocodeUpdate = {};
    if (data.zipCode) {
      try {
        const geocodeResult = await this.geocodingService.geocodeZipCode(data.zipCode);
        geocodeUpdate = {
          latitude: geocodeResult.latitude,
          longitude: geocodeResult.longitude
        };
        console.log(`✅ Updated geocode for retailer ${retailerId}`);
      } catch (error) {
        console.error('Geocoding failed during update:', error);
        // Continue update without geocoding
      }
    }

    const retailer = await prisma.retailer.update({
      where: { id: retailerId },
      data: {
        ...data,
        ...geocodeUpdate
      }
    });

    // If radius or interest changed, trigger access request updates
    const newRadius = data.radiusPreference || oldRadius;
    const newInterest = data.interest || oldInterest;

    if (newRadius > oldRadius || newInterest !== oldInterest || Object.keys(geocodeUpdate).length > 0) {
      retailerAccessService.handleRetailerProfileUpdate(
        retailerId,
        oldRadius,
        newRadius,
        oldInterest,
        newInterest
      )
        .then(count => {
          if (count > 0) {
            console.log(`✅ Created ${count} new access requests for retailer ${retailer.companyName} after profile update`);
          }
        })
        .catch(err => console.error('Failed to update access requests:', err));
    }

    return {
      id: retailer.id,
      userId: retailer.userId,
      companyName: retailer.companyName,
      businessLicense: retailer.businessLicense || undefined,
      phone: retailer.phone || undefined,
      address: retailer.address || undefined,
      city: retailer.city || undefined,
      state: retailer.state || undefined,
      zipCode: retailer.zipCode || undefined,
      latitude: retailer.latitude ? Number(retailer.latitude) : undefined,
      longitude: retailer.longitude ? Number(retailer.longitude) : undefined,
      radiusPreference: retailer.radiusPreference,
      interest: retailer.interest as RetailerInterest,
      createdAt: retailer.createdAt,
      updatedAt: retailer.updatedAt
    };
  }
}
