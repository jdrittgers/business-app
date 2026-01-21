import { PrismaClient, AccessRequestStatus, RetailerInterest } from '@prisma/client';
import { PushNotificationService } from './push-notification.service';
import { broadcastToBusinessRoom } from '../config/socket';

const pushNotificationService = new PushNotificationService();

const prisma = new PrismaClient();

interface RespondToRequestData {
  type: 'inputs' | 'grain';
  status: 'APPROVED' | 'DENIED';
  respondedBy: string;
}

interface AccessSummary {
  approved: number;
  pending: number;
  denied: number;
}

class RetailerAccessService {
  /**
   * Create access requests for all farmers within retailer's radius
   * Called on retailer registration and profile updates
   */
  async createAccessRequestsForRadius(retailerId: string): Promise<number> {
    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
      include: { user: true }
    });

    if (!retailer || !retailer.latitude || !retailer.longitude) {
      console.log('Retailer missing location data, skipping access request creation');
      return 0;
    }

    // Get all businesses with location data
    const businesses = await prisma.business.findMany({
      where: {
        deletedAt: null,
        latitude: { not: null },
        longitude: { not: null }
      },
      include: {
        members: {
          include: { user: true }
        }
      }
    });

    const retailerLat = Number(retailer.latitude);
    const retailerLon = Number(retailer.longitude);
    const radiusMiles = retailer.radiusPreference;

    let requestsCreated = 0;

    for (const business of businesses) {
      if (!business.latitude || !business.longitude) continue;

      const distance = this.calculateDistance(
        retailerLat,
        retailerLon,
        Number(business.latitude),
        Number(business.longitude)
      );

      // Skip if outside radius
      if (distance > radiusMiles) continue;

      // Check if request already exists
      const existingRequest = await prisma.retailerAccessRequest.findUnique({
        where: {
          retailerId_businessId: {
            retailerId,
            businessId: business.id
          }
        }
      });

      if (existingRequest) continue;

      // Create new access request
      const accessRequest = await prisma.retailerAccessRequest.create({
        data: {
          retailerId,
          businessId: business.id,
          inputsStatus: 'PENDING',
          grainStatus: 'PENDING'
        }
      });

      requestsCreated++;

      // Send notifications to all business members
      await this.notifyBusinessOfNewRequest(business, retailer, distance);

      // Mark notification as sent
      await prisma.retailerAccessRequest.update({
        where: { id: accessRequest.id },
        data: { notificationSentAt: new Date() }
      });
    }

    return requestsCreated;
  }

  /**
   * Handle retailer profile update - create requests for newly in-range farmers
   */
  async handleRetailerProfileUpdate(
    retailerId: string,
    oldRadius: number,
    newRadius: number,
    oldInterest?: RetailerInterest,
    newInterest?: RetailerInterest
  ): Promise<number> {
    // If radius increased, create requests for newly in-range farmers
    if (newRadius > oldRadius) {
      return this.createAccessRequestsForRadius(retailerId);
    }

    // If interest changed, we might want to notify farmers
    // For now, just return 0 - existing requests cover both types
    return 0;
  }

  /**
   * Get all access requests for a business (farmer view)
   */
  async getAccessRequestsForBusiness(businessId: string) {
    const requests = await prisma.retailerAccessRequest.findMany({
      where: { businessId },
      include: {
        retailer: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get business location to calculate distances
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { latitude: true, longitude: true }
    });

    return requests.map(request => {
      let distance: number | null = null;

      if (business?.latitude && business?.longitude && request.retailer.latitude && request.retailer.longitude) {
        distance = this.calculateDistance(
          Number(business.latitude),
          Number(business.longitude),
          Number(request.retailer.latitude),
          Number(request.retailer.longitude)
        );
      }

      return {
        id: request.id,
        retailerId: request.retailerId,
        businessId: request.businessId,
        inputsStatus: request.inputsStatus,
        grainStatus: request.grainStatus,
        inputsRespondedAt: request.inputsRespondedAt,
        grainRespondedAt: request.grainRespondedAt,
        notificationSentAt: request.notificationSentAt,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
        retailer: {
          id: request.retailer.id,
          companyName: request.retailer.companyName,
          interest: request.retailer.interest,
          city: request.retailer.city,
          state: request.retailer.state,
          phone: request.retailer.phone,
          user: request.retailer.user,
          distance
        }
      };
    });
  }

  /**
   * Get pending access requests for a business
   */
  async getPendingRequestsForBusiness(businessId: string) {
    const allRequests = await this.getAccessRequestsForBusiness(businessId);
    return allRequests.filter(
      r => r.inputsStatus === 'PENDING' || r.grainStatus === 'PENDING'
    );
  }

  /**
   * Get access summary counts for a business
   */
  async getAccessSummaryForBusiness(businessId: string): Promise<AccessSummary> {
    const requests = await prisma.retailerAccessRequest.findMany({
      where: { businessId }
    });

    // Count unique statuses (a request counts as approved if either is approved)
    let approved = 0;
    let pending = 0;
    let denied = 0;

    for (const request of requests) {
      if (request.inputsStatus === 'APPROVED' || request.grainStatus === 'APPROVED') {
        approved++;
      } else if (request.inputsStatus === 'PENDING' || request.grainStatus === 'PENDING') {
        pending++;
      } else {
        denied++;
      }
    }

    return { approved, pending, denied };
  }

  /**
   * Farmer responds to an access request
   */
  async respondToRequest(requestId: string, data: RespondToRequestData) {
    const { type, status, respondedBy } = data;

    const updateData: any = {
      respondedBy
    };

    if (type === 'inputs') {
      updateData.inputsStatus = status;
      updateData.inputsRespondedAt = new Date();
    } else {
      updateData.grainStatus = status;
      updateData.grainRespondedAt = new Date();
    }

    const request = await prisma.retailerAccessRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        retailer: {
          include: { user: true }
        },
        business: true
      }
    });

    // Notify retailer of the response
    // TODO: Send push notification to retailer
    console.log(`📧 Notify retailer ${request.retailer.companyName}: ${type} access ${status} by ${request.business.name}`);

    return request;
  }

  /**
   * Check if retailer has access to a business for a specific type
   */
  async hasAccess(retailerId: string, businessId: string, type: 'inputs' | 'grain'): Promise<boolean> {
    const request = await prisma.retailerAccessRequest.findUnique({
      where: {
        retailerId_businessId: {
          retailerId,
          businessId
        }
      }
    });

    if (!request) return false;

    if (type === 'inputs') {
      return request.inputsStatus === 'APPROVED';
    } else {
      return request.grainStatus === 'APPROVED';
    }
  }

  /**
   * Get all access requests for a retailer
   */
  async getAccessRequestsForRetailer(retailerId: string) {
    const requests = await prisma.retailerAccessRequest.findMany({
      where: { retailerId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get retailer location to calculate distances
    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
      select: { latitude: true, longitude: true }
    });

    return requests.map(request => {
      let distance: number | null = null;

      if (retailer?.latitude && retailer?.longitude && request.business.latitude && request.business.longitude) {
        distance = this.calculateDistance(
          Number(retailer.latitude),
          Number(retailer.longitude),
          Number(request.business.latitude),
          Number(request.business.longitude)
        );
      }

      return {
        id: request.id,
        retailerId: request.retailerId,
        businessId: request.businessId,
        inputsStatus: request.inputsStatus,
        grainStatus: request.grainStatus,
        createdAt: request.createdAt,
        business: {
          ...request.business,
          latitude: request.business.latitude ? Number(request.business.latitude) : null,
          longitude: request.business.longitude ? Number(request.business.longitude) : null,
          distance
        }
      };
    });
  }

  /**
   * Get access summary for a retailer
   */
  async getAccessSummaryForRetailer(retailerId: string): Promise<AccessSummary> {
    const requests = await prisma.retailerAccessRequest.findMany({
      where: { retailerId }
    });

    let approved = 0;
    let pending = 0;
    let denied = 0;

    for (const request of requests) {
      if (request.inputsStatus === 'APPROVED' || request.grainStatus === 'APPROVED') {
        approved++;
      } else if (request.inputsStatus === 'PENDING' || request.grainStatus === 'PENDING') {
        pending++;
      } else {
        denied++;
      }
    }

    return { approved, pending, denied };
  }

  /**
   * Get list of business IDs that retailer has access to for a specific type
   */
  async getAccessibleBusinessIds(retailerId: string, type: 'inputs' | 'grain'): Promise<string[]> {
    const statusField = type === 'inputs' ? 'inputsStatus' : 'grainStatus';

    const requests = await prisma.retailerAccessRequest.findMany({
      where: {
        retailerId,
        [statusField]: 'APPROVED'
      },
      select: { businessId: true }
    });

    return requests.map(r => r.businessId);
  }

  /**
   * Send notification to business members about new access request
   */
  private async notifyBusinessOfNewRequest(
    business: any,
    retailer: any,
    distance: number
  ): Promise<void> {
    const interestText = retailer.interest === 'BOTH'
      ? 'inputs and grain'
      : retailer.interest === 'INPUTS'
        ? 'farm inputs'
        : 'grain';

    const title = 'New Retailer Access Request';
    const body = `${retailer.companyName} (${Math.round(distance)} miles away) wants to view your ${interestText}`;

    // Send push notification to all business members
    for (const member of business.members) {
      try {
        await pushNotificationService.sendToUser(member.userId, {
          title,
          body,
          data: {
            type: 'retailer_access_request',
            retailerId: retailer.id,
            businessId: business.id
          }
        });
      } catch (error) {
        console.error(`Failed to send push to user ${member.userId}:`, error);
      }
    }

    // Emit socket event
    broadcastToBusinessRoom(business.id, 'retailer:access-request', {
      retailerId: retailer.id,
      companyName: retailer.companyName,
      interest: retailer.interest,
      distance: Math.round(distance)
    });
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in miles
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const retailerAccessService = new RetailerAccessService();
