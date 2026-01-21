import { PrismaClient, CommodityType, GrainPurchaseOfferStatus } from '@prisma/client';
import { retailerAccessService } from './retailer-access.service';

const prisma = new PrismaClient();

interface CreateGrainPurchaseOfferRequest {
  retailerId: string;
  grainBinId: string;
  bushelsOffered: number;
  pricePerBushel: number;
  expirationDate?: Date;
  pickupDate?: Date;
  notes?: string;
}

interface UpdateOfferStatusRequest {
  status: GrainPurchaseOfferStatus;
  acceptedBy?: string;
}

interface GetBinsWithinRadiusOptions {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  commodityType?: CommodityType;
  retailerId?: string;
}

export class GrainMarketplaceService {
  /**
   * Get all grain bins within a specified radius of a location
   * Uses Haversine formula for distance calculation
   * If retailerId provided, only returns bins from businesses where retailer has grain access
   */
  async getBinsWithinRadius(options: GetBinsWithinRadiusOptions) {
    const { latitude, longitude, radiusMiles, commodityType, retailerId } = options;

    // Get list of business IDs retailer has grain access to (if retailerId provided)
    let accessibleBusinessIds: string[] | null = null;
    if (retailerId) {
      accessibleBusinessIds = await retailerAccessService.getAccessibleBusinessIds(retailerId, 'grain');
    }

    // Get all active bins with business location data
    const bins = await prisma.grainBin.findMany({
      where: {
        isActive: true,
        isAvailableForSale: true, // Only show bins marked as available
        currentBushels: { gt: 0 }, // Only show bins with grain
        ...(commodityType && { commodityType }),
        // Filter by accessible businesses if retailerId is provided
        ...(accessibleBusinessIds !== null && {
          grainEntity: {
            businessId: { in: accessibleBusinessIds }
          }
        })
      },
      include: {
        grainEntity: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
                address: true,
                city: true,
                state: true,
                zipCode: true
              }
            }
          }
        }
      }
    });

    // Filter by distance using Haversine formula and convert Decimal fields to numbers
    const binsWithDistance = bins
      .map(bin => {
        const businessLat = bin.grainEntity.business.latitude;
        const businessLon = bin.grainEntity.business.longitude;

        if (!businessLat || !businessLon) {
          return null;
        }

        const distance = this.calculateDistance(
          latitude,
          longitude,
          Number(businessLat),
          Number(businessLon)
        );

        return {
          ...bin,
          // Convert Decimal fields to numbers
          capacity: Number(bin.capacity),
          currentBushels: Number(bin.currentBushels),
          contractedBushels: Number(bin.contractedBushels),
          targetPrice: bin.targetPrice ? Number(bin.targetPrice) : undefined,
          distance,
          grainEntity: {
            ...bin.grainEntity,
            business: {
              ...bin.grainEntity.business,
              latitude: businessLat ? Number(businessLat) : null,
              longitude: businessLon ? Number(businessLon) : null
            }
          }
        };
      })
      .filter(bin => bin !== null && bin.distance <= radiusMiles)
      .sort((a, b) => a!.distance - b!.distance);

    return binsWithDistance;
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

  /**
   * Create a grain purchase offer
   */
  async createOffer(data: CreateGrainPurchaseOfferRequest) {
    // Validate bin exists and has enough grain
    const bin = await prisma.grainBin.findUnique({
      where: { id: data.grainBinId }
    });

    if (!bin) {
      throw new Error('Grain bin not found');
    }

    if (Number(bin.currentBushels) < data.bushelsOffered) {
      throw new Error(`Insufficient grain in bin. Available: ${bin.currentBushels}, Requested: ${data.bushelsOffered}`);
    }

    const totalOfferPrice = data.bushelsOffered * data.pricePerBushel;

    const newOffer = await prisma.grainPurchaseOffer.create({
      data: {
        retailerId: data.retailerId,
        grainBinId: data.grainBinId,
        bushelsOffered: data.bushelsOffered,
        pricePerBushel: data.pricePerBushel,
        totalOfferPrice,
        expirationDate: data.expirationDate,
        pickupDate: data.pickupDate,
        notes: data.notes
      },
      include: {
        retailer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        grainBin: {
          include: {
            grainEntity: {
              include: {
                business: true
              }
            }
          }
        }
      }
    });

    return this.transformOffer(newOffer);
  }

  /**
   * Transform offer data by converting Decimal fields to numbers
   */
  private transformOffer(offer: any) {
    return {
      ...offer,
      bushelsOffered: Number(offer.bushelsOffered),
      pricePerBushel: Number(offer.pricePerBushel),
      totalOfferPrice: Number(offer.totalOfferPrice),
      grainBin: offer.grainBin ? {
        ...offer.grainBin,
        capacity: Number(offer.grainBin.capacity),
        currentBushels: Number(offer.grainBin.currentBushels),
        contractedBushels: Number(offer.grainBin.contractedBushels),
        targetPrice: offer.grainBin.targetPrice ? Number(offer.grainBin.targetPrice) : undefined
      } : undefined
    };
  }

  /**
   * Get all offers for a retailer
   */
  async getRetailerOffers(retailerId: string, status?: GrainPurchaseOfferStatus) {
    const offers = await prisma.grainPurchaseOffer.findMany({
      where: {
        retailerId,
        ...(status && { status })
      },
      include: {
        grainBin: {
          include: {
            grainEntity: {
              include: {
                business: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return offers.map(offer => this.transformOffer(offer));
  }

  /**
   * Get all offers for a farmer's bins (by business)
   */
  async getFarmerOffers(businessId: string, status?: GrainPurchaseOfferStatus) {
    const offers = await prisma.grainPurchaseOffer.findMany({
      where: {
        grainBin: {
          grainEntity: {
            businessId
          }
        },
        ...(status && { status })
      },
      include: {
        retailer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        grainBin: {
          include: {
            grainEntity: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return offers.map(offer => this.transformOffer(offer));
  }

  /**
   * Get a single offer by ID
   */
  async getOfferById(offerId: string) {
    const offer = await prisma.grainPurchaseOffer.findUnique({
      where: { id: offerId },
      include: {
        retailer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        grainBin: {
          include: {
            grainEntity: {
              include: {
                business: true
              }
            }
          }
        }
      }
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    return this.transformOffer(offer);
  }

  /**
   * Accept an offer
   */
  async acceptOffer(offerId: string, acceptedBy: string) {
    const offer = await this.getOfferById(offerId);

    if (offer.status !== 'PENDING') {
      throw new Error('Only pending offers can be accepted');
    }

    // Check if bin still has enough grain
    const bin = await prisma.grainBin.findUnique({
      where: { id: offer.grainBinId }
    });

    if (!bin || Number(bin.currentBushels) < Number(offer.bushelsOffered)) {
      throw new Error('Insufficient grain in bin');
    }

    const updatedOffer = await prisma.grainPurchaseOffer.update({
      where: { id: offerId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedBy
      },
      include: {
        retailer: {
          include: {
            user: true
          }
        },
        grainBin: {
          include: {
            grainEntity: {
              include: {
                business: true
              }
            }
          }
        }
      }
    });

    return this.transformOffer(updatedOffer);
  }

  /**
   * Reject an offer
   */
  async rejectOffer(offerId: string) {
    const offer = await this.getOfferById(offerId);

    if (offer.status !== 'PENDING') {
      throw new Error('Only pending offers can be rejected');
    }

    const rejectedOffer = await prisma.grainPurchaseOffer.update({
      where: { id: offerId },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date()
      },
      include: {
        retailer: {
          include: {
            user: true
          }
        },
        grainBin: {
          include: {
            grainEntity: {
              include: {
                business: true
              }
            }
          }
        }
      }
    });

    return this.transformOffer(rejectedOffer);
  }

  /**
   * Cancel an offer (by retailer)
   */
  async cancelOffer(offerId: string, retailerId: string) {
    const offer = await this.getOfferById(offerId);

    if (offer.retailerId !== retailerId) {
      throw new Error('Unauthorized to cancel this offer');
    }

    if (offer.status !== 'PENDING') {
      throw new Error('Only pending offers can be cancelled');
    }

    return prisma.grainPurchaseOffer.delete({
      where: { id: offerId }
    });
  }

  /**
   * Mark offer as completed (grain delivered)
   */
  async completeOffer(offerId: string) {
    const offer = await this.getOfferById(offerId);

    if (offer.status !== 'ACCEPTED') {
      throw new Error('Only accepted offers can be completed');
    }

    // Update offer status and deduct grain from bin
    await prisma.$transaction([
      prisma.grainPurchaseOffer.update({
        where: { id: offerId },
        data: { status: 'COMPLETED' }
      }),
      prisma.grainBin.update({
        where: { id: offer.grainBinId },
        data: {
          currentBushels: {
            decrement: offer.bushelsOffered
          }
        }
      }),
      prisma.binTransaction.create({
        data: {
          binId: offer.grainBinId,
          type: 'SALE',
          bushels: Number(offer.bushelsOffered) * -1, // Negative for removal
          description: `Sale to retailer - ${offer.bushelsOffered} bu @ $${offer.pricePerBushel}/bu`,
          createdBy: offer.acceptedBy!,
          transactionDate: new Date()
        }
      })
    ]);

    // Fetch and return the updated offer with all relations
    return this.getOfferById(offerId);
  }
}
