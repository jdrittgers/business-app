import { prisma } from '../prisma/client';
import {
  BidRequest,
  CreateBidRequestRequest,
  UpdateBidRequestRequest,
  GetBidRequestsQuery,
  BidRequestStatus
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
            currentPrice: item.currentPrice
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

  async getOpenBidRequests(): Promise<BidRequest[]> {
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
            state: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return bidRequests.map(br => ({
      ...this.mapToResponse(br),
      business: {
        id: br.business.id,
        name: br.business.name,
        city: br.business.city || undefined,
        state: br.business.state || undefined
      }
    }));
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

    // Verify bid belongs to this bid request
    const bid = await prisma.retailerBid.findFirst({
      where: {
        id: bidId,
        bidRequestId
      }
    });

    if (!bid) {
      throw new Error('Bid not found');
    }

    // Delete the bid (cascades to bid items)
    await prisma.retailerBid.delete({
      where: { id: bidId }
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
        currentPrice: item.currentPrice ? Number(item.currentPrice) : undefined,
        createdAt: item.createdAt
      })),
      bids: bidRequest.bids?.map((bid: any) => ({
        id: bid.id,
        bidRequestId: bid.bidRequestId,
        retailerId: bid.retailerId,
        totalDeliveredPrice: Number(bid.totalDeliveredPrice),
        guaranteedDeliveryDate: bid.guaranteedDeliveryDate,
        termsAcknowledged: bid.termsAcknowledged,
        notes: bid.notes || undefined,
        createdAt: bid.createdAt,
        updatedAt: bid.updatedAt,
        retailer: bid.retailer ? {
          id: bid.retailer.id,
          userId: bid.retailer.userId,
          companyName: bid.retailer.companyName,
          businessLicense: bid.retailer.businessLicense || undefined,
          phone: bid.retailer.phone || undefined,
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
}
