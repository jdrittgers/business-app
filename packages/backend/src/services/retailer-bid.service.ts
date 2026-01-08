import { prisma } from '../prisma/client';
import {
  RetailerBid,
  CreateRetailerBidRequest,
  UpdateRetailerBidRequest,
  BidRequestStatus
} from '@business-app/shared';

export class RetailerBidService {
  async create(retailerId: string, data: CreateRetailerBidRequest): Promise<RetailerBid> {
    // Verify bid request exists and is OPEN
    const bidRequest = await prisma.bidRequest.findUnique({
      where: { id: data.bidRequestId }
    });

    if (!bidRequest) {
      throw new Error('Bid request not found');
    }

    if (bidRequest.status !== BidRequestStatus.OPEN) {
      throw new Error('Bid request is closed and not accepting new bids');
    }

    // Verify terms are acknowledged
    if (!data.termsAcknowledged) {
      throw new Error('Terms must be acknowledged before submitting a bid');
    }

    // Check if retailer already has a bid for this request
    const existingBid = await prisma.retailerBid.findUnique({
      where: {
        bidRequestId_retailerId: {
          bidRequestId: data.bidRequestId,
          retailerId
        }
      }
    });

    if (existingBid) {
      throw new Error('You have already submitted a bid for this request. Use update instead.');
    }

    // Create bid and bid items in a transaction, updating currentPrice if lower
    const bid = await prisma.$transaction(async (tx) => {
      // Create the retailer bid
      const newBid = await tx.retailerBid.create({
        data: {
          bidRequestId: data.bidRequestId,
          retailerId,
          totalDeliveredPrice: data.totalDeliveredPrice,
          guaranteedDeliveryDate: new Date(data.guaranteedDeliveryDate),
          expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
          termsAcknowledged: data.termsAcknowledged,
          notes: data.notes
        }
      });

      // Create bid items
      if (data.bidItems && data.bidItems.length > 0) {
        await tx.retailerBidItem.createMany({
          data: data.bidItems.map(item => ({
            retailerBidId: newBid.id,
            bidRequestItemId: item.bidRequestItemId,
            pricePerUnit: item.pricePerUnit
          }))
        });

        // Update currentPrice for each item if the bid is lower
        for (const bidItem of data.bidItems) {
          const requestItem = await tx.bidRequestItem.findUnique({
            where: { id: bidItem.bidRequestItemId }
          });

          if (requestItem) {
            // If startingPrice is null (farmer left it blank), set it to this first bid's price
            const updates: any = {};

            if (!requestItem.startingPrice) {
              updates.startingPrice = bidItem.pricePerUnit;
              updates.currentPrice = bidItem.pricePerUnit;
            } else if (!requestItem.currentPrice || bidItem.pricePerUnit < Number(requestItem.currentPrice)) {
              // Update currentPrice if this bid is lower (or if no current price exists)
              updates.currentPrice = bidItem.pricePerUnit;
            }

            if (Object.keys(updates).length > 0) {
              await tx.bidRequestItem.update({
                where: { id: bidItem.bidRequestItemId },
                data: updates
              });
            }
          }
        }
      }

      // Fetch the complete bid with all relations
      return await tx.retailerBid.findUnique({
        where: { id: newBid.id },
        include: {
          retailer: true,
          bidRequest: {
            include: {
              items: true
            }
          },
          bidItems: true
        }
      });
    });

    return this.mapToResponse(bid!);
  }

  async update(bidId: string, retailerId: string, data: UpdateRetailerBidRequest): Promise<RetailerBid> {
    // Verify bid belongs to retailer
    const existingBid = await prisma.retailerBid.findFirst({
      where: {
        id: bidId,
        retailerId
      },
      include: {
        bidRequest: true
      }
    });

    if (!existingBid) {
      throw new Error('Bid not found');
    }

    // Verify bid request is still OPEN
    if (existingBid.bidRequest.status !== BidRequestStatus.OPEN) {
      throw new Error('Cannot update bid - bid request is closed');
    }

    const bid = await prisma.retailerBid.update({
      where: { id: bidId },
      data: {
        ...(data.totalDeliveredPrice !== undefined && { totalDeliveredPrice: data.totalDeliveredPrice }),
        ...(data.guaranteedDeliveryDate && { guaranteedDeliveryDate: new Date(data.guaranteedDeliveryDate) }),
        ...(data.notes !== undefined && { notes: data.notes })
      },
      include: {
        retailer: true,
        bidRequest: {
          include: {
            items: true
          }
        }
      }
    });

    return this.mapToResponse(bid);
  }

  async getByBidRequest(bidRequestId: string): Promise<RetailerBid[]> {
    const bids = await prisma.retailerBid.findMany({
      where: { bidRequestId },
      include: {
        retailer: true
      },
      orderBy: {
        totalDeliveredPrice: 'asc' // Lowest price first
      }
    });

    return bids.map(bid => this.mapToResponse(bid));
  }

  async getByRetailer(retailerId: string): Promise<RetailerBid[]> {
    const bids = await prisma.retailerBid.findMany({
      where: { retailerId },
      include: {
        bidRequest: {
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
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return bids.map(bid => this.mapToResponse(bid));
  }

  async delete(bidId: string, retailerId: string): Promise<void> {
    // Verify bid belongs to retailer and get its items
    const existingBid = await prisma.retailerBid.findFirst({
      where: {
        id: bidId,
        retailerId
      },
      include: {
        bidRequest: true,
        bidItems: true
      }
    });

    if (!existingBid) {
      throw new Error('Bid not found');
    }

    // Verify bid request is still OPEN
    if (existingBid.bidRequest.status !== BidRequestStatus.OPEN) {
      throw new Error('Cannot delete bid - bid request is closed');
    }

    // Store the item IDs that need price recalculation
    const itemIds = existingBid.bidItems.map(item => item.bidRequestItemId);

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

  private mapToResponse(bid: any): RetailerBid {
    return {
      id: bid.id,
      bidRequestId: bid.bidRequestId,
      retailerId: bid.retailerId,
      status: bid.status,
      totalDeliveredPrice: Number(bid.totalDeliveredPrice),
      guaranteedDeliveryDate: bid.guaranteedDeliveryDate,
      expirationDate: bid.expirationDate || undefined,
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
        createdAt: bid.retailer.createdAt,
        updatedAt: bid.retailer.updatedAt
      } : undefined,
      bidRequest: bid.bidRequest ? {
        id: bid.bidRequest.id,
        businessId: bid.bidRequest.businessId,
        createdBy: bid.bidRequest.createdBy,
        title: bid.bidRequest.title,
        description: bid.bidRequest.description || undefined,
        status: bid.bidRequest.status,
        desiredDeliveryDate: bid.bidRequest.desiredDeliveryDate || undefined,
        notes: bid.bidRequest.notes || undefined,
        createdAt: bid.bidRequest.createdAt,
        updatedAt: bid.bidRequest.updatedAt,
        closedAt: bid.bidRequest.closedAt || undefined,
        items: bid.bidRequest.items?.map((item: any) => ({
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
        business: bid.bidRequest.business
      } : undefined,
      bidItems: bid.bidItems?.map((item: any) => ({
        id: item.id,
        retailerBidId: item.retailerBidId,
        bidRequestItemId: item.bidRequestItemId,
        pricePerUnit: Number(item.pricePerUnit),
        createdAt: item.createdAt
      }))
    };
  }
}
