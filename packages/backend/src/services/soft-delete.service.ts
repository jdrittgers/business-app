import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface DeletedItem {
  id: string;
  type: string;
  name: string;
  deletedAt: Date;
  canRestore: boolean;
}

/**
 * Service for handling soft delete operations
 *
 * This service provides:
 * 1. Soft delete operations for all supported models
 * 2. Restoration of soft-deleted records
 * 3. Permanent deletion of old records (30+ days)
 * 4. Listing deleted items for UI display
 */
export class SoftDeleteService {
  private readonly PERMANENT_DELETE_DAYS = 30;

  /**
   * Soft delete a business and all its related entities
   */
  async softDeleteBusiness(businessId: string): Promise<void> {
    await prisma.business.update({
      where: { id: businessId },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Restore a soft-deleted business
   */
  async restoreBusiness(businessId: string): Promise<void> {
    await prisma.business.update({
      where: { id: businessId },
      data: { deletedAt: null }
    });
  }

  /**
   * Soft delete a grain entity
   */
  async softDeleteGrainEntity(entityId: string): Promise<void> {
    await prisma.grainEntity.update({
      where: { id: entityId },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Restore a soft-deleted grain entity
   */
  async restoreGrainEntity(entityId: string): Promise<void> {
    await prisma.grainEntity.update({
      where: { id: entityId },
      data: { deletedAt: null }
    });
  }

  /**
   * Soft delete a grain contract
   */
  async softDeleteGrainContract(contractId: string): Promise<void> {
    await prisma.grainContract.update({
      where: { id: contractId },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Restore a soft-deleted grain contract
   */
  async restoreGrainContract(contractId: string): Promise<void> {
    await prisma.grainContract.update({
      where: { id: contractId },
      data: { deletedAt: null }
    });
  }

  /**
   * Soft delete a grain bin
   */
  async softDeleteGrainBin(binId: string): Promise<void> {
    await prisma.grainBin.update({
      where: { id: binId },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Restore a soft-deleted grain bin
   */
  async restoreGrainBin(binId: string): Promise<void> {
    await prisma.grainBin.update({
      where: { id: binId },
      data: { deletedAt: null }
    });
  }

  /**
   * Soft delete a farm
   */
  async softDeleteFarm(farmId: string): Promise<void> {
    await prisma.farm.update({
      where: { id: farmId },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Restore a soft-deleted farm
   */
  async restoreFarm(farmId: string): Promise<void> {
    await prisma.farm.update({
      where: { id: farmId },
      data: { deletedAt: null }
    });
  }

  /**
   * Soft delete a bid request
   */
  async softDeleteBidRequest(bidRequestId: string): Promise<void> {
    await prisma.bidRequest.update({
      where: { id: bidRequestId },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Restore a soft-deleted bid request
   */
  async restoreBidRequest(bidRequestId: string): Promise<void> {
    await prisma.bidRequest.update({
      where: { id: bidRequestId },
      data: { deletedAt: null }
    });
  }

  /**
   * Soft delete a retailer
   */
  async softDeleteRetailer(retailerId: string): Promise<void> {
    await prisma.retailer.update({
      where: { id: retailerId },
      data: { deletedAt: new Date() }
    });
  }

  /**
   * Restore a soft-deleted retailer
   */
  async restoreRetailer(retailerId: string): Promise<void> {
    await prisma.retailer.update({
      where: { id: retailerId },
      data: { deletedAt: null }
    });
  }

  /**
   * Get all deleted items for a business (for UI display)
   */
  async getDeletedItemsForBusiness(businessId: string): Promise<DeletedItem[]> {
    const deletedItems: DeletedItem[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - this.PERMANENT_DELETE_DAYS);

    // Get deleted grain entities
    const deletedEntities = await prisma.grainEntity.findMany({
      where: {
        businessId,
        deletedAt: { not: null }
      },
      select: {
        id: true,
        name: true,
        deletedAt: true
      }
    });

    deletedItems.push(
      ...deletedEntities.map((entity) => ({
        id: entity.id,
        type: 'grain-entity',
        name: entity.name,
        deletedAt: entity.deletedAt!,
        canRestore: entity.deletedAt! > thirtyDaysAgo
      }))
    );

    // Get deleted grain contracts
    const deletedContracts = await prisma.grainContract.findMany({
      where: {
        grainEntity: {
          businessId
        },
        deletedAt: { not: null }
      },
      select: {
        id: true,
        contractNumber: true,
        deletedAt: true
      }
    });

    deletedItems.push(
      ...deletedContracts.map((contract) => ({
        id: contract.id,
        type: 'grain-contract',
        name: contract.contractNumber || 'Unnamed Contract',
        deletedAt: contract.deletedAt!,
        canRestore: contract.deletedAt! > thirtyDaysAgo
      }))
    );

    // Get deleted grain bins
    const deletedBins = await prisma.grainBin.findMany({
      where: {
        grainEntity: {
          businessId
        },
        deletedAt: { not: null }
      },
      select: {
        id: true,
        name: true,
        deletedAt: true
      }
    });

    deletedItems.push(
      ...deletedBins.map((bin) => ({
        id: bin.id,
        type: 'grain-bin',
        name: bin.name,
        deletedAt: bin.deletedAt!,
        canRestore: bin.deletedAt! > thirtyDaysAgo
      }))
    );

    // Get deleted farms
    const deletedFarms = await prisma.farm.findMany({
      where: {
        grainEntity: {
          businessId
        },
        deletedAt: { not: null }
      },
      select: {
        id: true,
        name: true,
        deletedAt: true
      }
    });

    deletedItems.push(
      ...deletedFarms.map((farm) => ({
        id: farm.id,
        type: 'farm',
        name: farm.name,
        deletedAt: farm.deletedAt!,
        canRestore: farm.deletedAt! > thirtyDaysAgo
      }))
    );

    // Get deleted bid requests
    const deletedBids = await prisma.bidRequest.findMany({
      where: {
        businessId,
        deletedAt: { not: null }
      },
      select: {
        id: true,
        title: true,
        deletedAt: true
      }
    });

    deletedItems.push(
      ...deletedBids.map((bid) => ({
        id: bid.id,
        type: 'bid-request',
        name: bid.title,
        deletedAt: bid.deletedAt!,
        canRestore: bid.deletedAt! > thirtyDaysAgo
      }))
    );

    // Sort by deletion date (most recent first)
    return deletedItems.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
  }

  /**
   * Get all deleted items for a retailer (for UI display)
   */
  async getDeletedItemsForRetailer(retailerId: string): Promise<DeletedItem[]> {
    const deletedItems: DeletedItem[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - this.PERMANENT_DELETE_DAYS);

    // Get deleted bid requests from this retailer
    // Note: Retailers don't directly create bid requests, businesses do
    // This query might need adjustment based on actual retailer data model
    const deletedBids = await prisma.retailerBid.findMany({
      where: {
        retailerId,
        bidRequest: {
          deletedAt: { not: null }
        }
      },
      select: {
        id: true,
        bidRequest: {
          select: {
            title: true,
            deletedAt: true
          }
        }
      }
    });

    deletedItems.push(
      ...deletedBids.map((bid) => ({
        id: bid.id,
        type: 'retailer-bid',
        name: bid.bidRequest.title,
        deletedAt: bid.bidRequest.deletedAt!,
        canRestore: bid.bidRequest.deletedAt! > thirtyDaysAgo
      }))
    );

    return deletedItems.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
  }

  /**
   * Permanently delete items that have been soft-deleted for more than 30 days
   * This should be run as a scheduled job
   */
  async permanentlyDeleteOldItems(): Promise<{
    businesses: number;
    grainEntities: number;
    grainContracts: number;
    grainBins: number;
    farms: number;
    bidRequests: number;
    retailers: number;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - this.PERMANENT_DELETE_DAYS);

    // Permanently delete old items
    // Note: We need to bypass the soft delete middleware for this
    // The middleware will convert these to soft deletes, so we need to use raw queries

    const businesses = await prisma.$executeRaw`
      DELETE FROM businesses WHERE deleted_at IS NOT NULL AND deleted_at < ${thirtyDaysAgo}
    `;

    const grainEntities = await prisma.$executeRaw`
      DELETE FROM grain_entities WHERE deleted_at IS NOT NULL AND deleted_at < ${thirtyDaysAgo}
    `;

    const grainContracts = await prisma.$executeRaw`
      DELETE FROM grain_contracts WHERE deleted_at IS NOT NULL AND deleted_at < ${thirtyDaysAgo}
    `;

    const grainBins = await prisma.$executeRaw`
      DELETE FROM grain_bins WHERE deleted_at IS NOT NULL AND deleted_at < ${thirtyDaysAgo}
    `;

    const farms = await prisma.$executeRaw`
      DELETE FROM farms WHERE deleted_at IS NOT NULL AND deleted_at < ${thirtyDaysAgo}
    `;

    const bidRequests = await prisma.$executeRaw`
      DELETE FROM bid_requests WHERE deleted_at IS NOT NULL AND deleted_at < ${thirtyDaysAgo}
    `;

    const retailers = await prisma.$executeRaw`
      DELETE FROM retailers WHERE deleted_at IS NOT NULL AND deleted_at < ${thirtyDaysAgo}
    `;

    return {
      businesses,
      grainEntities,
      grainContracts,
      grainBins,
      farms,
      bidRequests,
      retailers
    };
  }

  /**
   * Restore an item by type and ID
   */
  async restoreItem(type: string, id: string): Promise<void> {
    switch (type) {
      case 'business':
        await this.restoreBusiness(id);
        break;
      case 'grain-entity':
        await this.restoreGrainEntity(id);
        break;
      case 'grain-contract':
        await this.restoreGrainContract(id);
        break;
      case 'grain-bin':
        await this.restoreGrainBin(id);
        break;
      case 'farm':
        await this.restoreFarm(id);
        break;
      case 'bid-request':
        await this.restoreBidRequest(id);
        break;
      case 'retailer':
        await this.restoreRetailer(id);
        break;
      default:
        throw new Error(`Unknown item type: ${type}`);
    }
  }

  /**
   * Permanently delete an item by type and ID (admin only)
   */
  async permanentlyDeleteItem(type: string, id: string): Promise<void> {
    // Use raw SQL to bypass the soft delete middleware
    switch (type) {
      case 'business':
        await prisma.$executeRaw`DELETE FROM businesses WHERE id = ${id}`;
        break;
      case 'grain-entity':
        await prisma.$executeRaw`DELETE FROM grain_entities WHERE id = ${id}`;
        break;
      case 'grain-contract':
        await prisma.$executeRaw`DELETE FROM grain_contracts WHERE id = ${id}`;
        break;
      case 'grain-bin':
        await prisma.$executeRaw`DELETE FROM grain_bins WHERE id = ${id}`;
        break;
      case 'farm':
        await prisma.$executeRaw`DELETE FROM farms WHERE id = ${id}`;
        break;
      case 'bid-request':
        await prisma.$executeRaw`DELETE FROM bid_requests WHERE id = ${id}`;
        break;
      case 'retailer':
        await prisma.$executeRaw`DELETE FROM retailers WHERE id = ${id}`;
        break;
      default:
        throw new Error(`Unknown item type: ${type}`);
    }
  }
}
