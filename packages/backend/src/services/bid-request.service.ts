import { prisma } from '../prisma/client';
import {
  BidRequest,
  CreateBidRequestRequest,
  UpdateBidRequestRequest,
  GetBidRequestsQuery,
  GetOpenBidRequestsQuery,
  BidRequestStatus,
  calculateDistance
} from '@business-app/shared';

export class BidRequestService {
  async create(businessId: string, userId: string, data: CreateBidRequestRequest): Promise<BidRequest> {
    // Verify user is member of business
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId }
    });

    if (!membership) {
      throw new Error('Not authorized to create bid requests for this business');
    }

    // Create bid request with items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const bidRequest = await tx.bidRequest.create({
        data: {
          businessId,
          createdBy: userId,
          title: data.title,
          description: data.description,
          desiredDeliveryDate: data.desiredDeliveryDate ? new Date(data.desiredDeliveryDate) : undefined,
          notes: data.notes,
          status: BidRequestStatus.OPEN
        }
      });

      // Create items
      if (data.items && data.items.length > 0) {
        await tx.bidRequestItem.createMany({
          data: data.items.map(item => ({
            bidRequestId: bidRequest.id,
            productType: item.productType,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            startingPrice: item.currentPrice,  // Farmer's target price becomes the base (can be null)
            currentPrice: item.currentPrice    // Initially same as starting price
          }))
        });
      }

      // Fetch the complete bid request with items
      return await tx.bidRequest.findUnique({
        where: { id: bidRequest.id },
        include: {
          items: true,
          bids: {
            include: {
              retailer: true
            }
          }
        }
      });
    });

    if (!result) {
      throw new Error('Failed to create bid request');
    }

    return this.mapToResponse(result);
  }

  async getAll(businessId: string, query?: GetBidRequestsQuery): Promise<BidRequest[]> {
    const bidRequests = await prisma.bidRequest.findMany({
      where: {
        businessId,
        ...(query?.status && { status: query.status })
      },
      include: {
        items: true,
        bids: {
          include: {
            retailer: true,
            bidItems: true  // Include per-item pricing
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // OPEN first
        { createdAt: 'desc' }
      ]
    });

    return bidRequests.map(br => this.mapToResponse(br));
  }

  async getOpenBidRequests(query?: GetOpenBidRequestsQuery): Promise<BidRequest[]> {
    const bidRequests = await prisma.bidRequest.findMany({
      where: {
        status: BidRequestStatus.OPEN
      },
      include: {
        items: true,
        business: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            zipCode: true,
            latitude: true,
            longitude: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Map to response format
    let results = bidRequests.map(br => ({
      ...this.mapToResponse(br),
      business: {
        id: br.business.id,
        name: br.business.name,
        city: br.business.city || undefined,
        state: br.business.state || undefined,
        zipCode: br.business.zipCode || undefined,
        latitude: br.business.latitude ? Number(br.business.latitude) : undefined,
        longitude: br.business.longitude ? Number(br.business.longitude) : undefined
      }
    }));

    // Calculate distances if retailer location provided
    if (query?.latitude && query?.longitude) {
      const retailerCoords = {
        latitude: query.latitude,
        longitude: query.longitude
      };

      results = results.map(bidRequest => {
        // Calculate distance if business has coordinates
        if (bidRequest.business?.latitude && bidRequest.business?.longitude) {
          const businessCoords = {
            latitude: bidRequest.business.latitude,
            longitude: bidRequest.business.longitude
          };

          const distance = calculateDistance(retailerCoords, businessCoords);

          return {
            ...bidRequest,
            distance
          };
        }

        // No coordinates - can't calculate distance
        return bidRequest;
      });

      // Filter by radius if specified
      if (query.radiusMiles) {
        results = results.filter(bidRequest => {
          // If no distance calculated (no coordinates), include by default
          if (bidRequest.distance === undefined) return true;

          // Filter by radius
          return bidRequest.distance <= query.radiusMiles!;
        });
      }

      // Sort by distance (closest first)
      results.sort((a, b) => {
        // Items without distance go to the end
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
    }

    return results;
  }

  async getById(id: string, businessId?: string): Promise<BidRequest | null> {
    const bidRequest = await prisma.bidRequest.findFirst({
      where: {
        id,
        ...(businessId && { businessId })
      },
      include: {
        items: true,
        bids: {
          include: {
            retailer: true
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true
          }
        }
      }
    });

    if (!bidRequest) return null;

    return {
      ...this.mapToResponse(bidRequest),
      business: {
        id: bidRequest.business.id,
        name: bidRequest.business.name,
        city: bidRequest.business.city || undefined,
        state: bidRequest.business.state || undefined
      }
    };
  }

  async update(id: string, businessId: string, data: UpdateBidRequestRequest): Promise<BidRequest> {
    // Verify bid request belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Bid request not found');
    }

    const bidRequest = await prisma.bidRequest.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        desiredDeliveryDate: data.desiredDeliveryDate ? new Date(data.desiredDeliveryDate) : undefined,
        notes: data.notes
      },
      include: {
        items: true,
        bids: {
          include: {
            retailer: true
          }
        }
      }
    });

    return this.mapToResponse(bidRequest);
  }

  async close(id: string, businessId: string): Promise<BidRequest> {
    // Verify bid request belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Bid request not found');
    }

    if (existing.status === BidRequestStatus.CLOSED) {
      throw new Error('Bid request is already closed');
    }

    const bidRequest = await prisma.bidRequest.update({
      where: { id },
      data: {
        status: BidRequestStatus.CLOSED,
        closedAt: new Date()
      },
      include: {
        items: true,
        bids: {
          include: {
            retailer: true
          }
        }
      }
    });

    return this.mapToResponse(bidRequest);
  }

  async delete(id: string, businessId: string): Promise<void> {
    // Verify bid request belongs to business
    const existing = await this.getById(id, businessId);
    if (!existing) {
      throw new Error('Bid request not found');
    }

    await prisma.bidRequest.delete({
      where: { id }
    });
  }

  async deleteRetailerBid(bidId: string, bidRequestId: string, businessId: string): Promise<void> {
    // Verify bid request belongs to business
    const bidRequest = await this.getById(bidRequestId, businessId);
    if (!bidRequest) {
      throw new Error('Bid request not found');
    }

    // Verify bid belongs to this bid request and get its items
    const bid = await prisma.retailerBid.findFirst({
      where: {
        id: bidId,
        bidRequestId
      },
      include: {
        bidItems: true
      }
    });

    if (!bid) {
      throw new Error('Bid not found');
    }

    // Store the item IDs that need price recalculation
    const itemIds = bid.bidItems.map(item => item.bidRequestItemId);

    // Delete the bid in a transaction and recalculate prices
    await prisma.$transaction(async (tx) => {
      // Delete the bid (cascades to bid items)
      await tx.retailerBid.delete({
        where: { id: bidId }
      });

      // Recalculate currentPrice for each affected item
      for (const itemId of itemIds) {
        // Get the item to access its startingPrice
        const item = await tx.bidRequestItem.findUnique({
          where: { id: itemId }
        });

        // Find the lowest price among remaining bids for this item
        const lowestBidItem = await tx.retailerBidItem.findFirst({
          where: { bidRequestItemId: itemId },
          orderBy: { pricePerUnit: 'asc' }
        });

        // Update the item's currentPrice (revert to startingPrice if no bids remain)
        await tx.bidRequestItem.update({
          where: { id: itemId },
          data: {
            currentPrice: lowestBidItem ? lowestBidItem.pricePerUnit : item?.startingPrice
          }
        });
      }
    });
  }

  private mapToResponse(bidRequest: any): BidRequest {
    return {
      id: bidRequest.id,
      businessId: bidRequest.businessId,
      createdBy: bidRequest.createdBy,
      title: bidRequest.title,
      description: bidRequest.description || undefined,
      status: bidRequest.status,
      desiredDeliveryDate: bidRequest.desiredDeliveryDate || undefined,
      notes: bidRequest.notes || undefined,
      createdAt: bidRequest.createdAt,
      updatedAt: bidRequest.updatedAt,
      closedAt: bidRequest.closedAt || undefined,
      items: bidRequest.items?.map((item: any) => ({
        id: item.id,
        bidRequestId: item.bidRequestId,
        productType: item.productType,
        productId: item.productId || undefined,
        productName: item.productName,
        quantity: Number(item.quantity),
        unit: item.unit,
        startingPrice: item.startingPrice ? Number(item.startingPrice) : undefined,
        currentPrice: item.currentPrice ? Number(item.currentPrice) : undefined,
        createdAt: item.createdAt
      })),
      bids: bidRequest.bids?.map((bid: any) => ({
        id: bid.id,
        bidRequestId: bid.bidRequestId,
        retailerId: bid.retailerId,
        status: bid.status,
        totalDeliveredPrice: Number(bid.totalDeliveredPrice),
        guaranteedDeliveryDate: bid.guaranteedDeliveryDate,
        termsAcknowledged: bid.termsAcknowledged,
        notes: bid.notes || undefined,
        acceptedAt: bid.acceptedAt || undefined,
        acceptedBy: bid.acceptedBy || undefined,
        createdAt: bid.createdAt,
        updatedAt: bid.updatedAt,
        retailer: bid.retailer ? {
          id: bid.retailer.id,
          userId: bid.retailer.userId,
          companyName: bid.retailer.companyName,
          businessLicense: bid.retailer.businessLicense || undefined,
          phone: bid.retailer.phone || undefined,
          address: bid.retailer.address || undefined,
          city: bid.retailer.city || undefined,
          state: bid.retailer.state || undefined,
          zipCode: bid.retailer.zipCode || undefined,
          latitude: bid.retailer.latitude ? Number(bid.retailer.latitude) : undefined,
          longitude: bid.retailer.longitude ? Number(bid.retailer.longitude) : undefined,
          radiusPreference: bid.retailer.radiusPreference,
          createdAt: bid.retailer.createdAt,
          updatedAt: bid.retailer.updatedAt
        } : undefined,
        bidItems: bid.bidItems?.map((item: any) => ({
          id: item.id,
          retailerBidId: item.retailerBidId,
          bidRequestItemId: item.bidRequestItemId,
          pricePerUnit: Number(item.pricePerUnit),
          createdAt: item.createdAt
        }))
      }))
    };
  }

  // Accept a retailer bid
  async acceptBid(bidId: string, userId: string): Promise<void> {
    // Get the bid with relations
    const bid = await prisma.retailerBid.findUnique({
      where: { id: bidId },
      include: {
        bidRequest: {
          include: {
            business: true
          }
        },
        retailer: {
          include: {
            user: true
          }
        }
      }
    });

    if (!bid) {
      throw new Error('Bid not found');
    }

    // Verify user has permission (member of business)
    const membership = await prisma.businessMember.findFirst({
      where: {
        userId,
        businessId: bid.bidRequest.businessId
      }
    });

    if (!membership) {
      throw new Error('Not authorized to accept bids for this business');
    }

    // Check if bid is still pending
    if (bid.status !== 'PENDING') {
      throw new Error(`Cannot accept bid with status: ${bid.status}`);
    }

    // Update bid status to ACCEPTED
    await prisma.retailerBid.update({
      where: { id: bidId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedBy: userId
      }
    });

    // TODO: Send notification to retailer (implement with Socket.io)
    console.log(`✅ Bid ${bidId} accepted by user ${userId}`);
    console.log(`📧 Notify retailer: ${bid.retailer.companyName} (${bid.retailer.user.email})`);
  }
}
