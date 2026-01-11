import { prisma } from '../prisma/client';
import { ScaleTicketParserService } from './scale-ticket-parser.service';
import { GrainBinService } from './grain-bin.service';
import fs from 'fs';
import path from 'path';

const parser = new ScaleTicketParserService();
const binService = new GrainBinService();

interface UploadScaleTicketData {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

interface AssignBinData {
  binId: string;
  bushelsOverride?: number; // Optional manual override
}

export class ScaleTicketService {
  // Create a new scale ticket (after upload)
  async create(businessId: string, userId: string, data: UploadScaleTicketData): Promise<any> {
    // Verify user is member of business
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId }
    });

    if (!membership) {
      throw new Error('Not authorized to upload scale tickets for this business');
    }

    // Create scale ticket record
    const scaleTicket = await prisma.scaleTicket.create({
      data: {
        businessId,
        uploadedBy: userId,
        fileName: data.fileName,
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        status: 'PENDING'
      }
    });

    // Trigger async parsing
    this.parseTicketAsync(scaleTicket.id, data.filePath, data.mimeType).catch(err => {
      console.error('[ScaleTicketService] Async parsing failed:', err);
    });

    return this.mapToResponse(scaleTicket);
  }

  // Parse ticket asynchronously
  private async parseTicketAsync(ticketId: string, filePath: string, mimeType: string): Promise<void> {
    try {
      console.log('[ScaleTicketService] Starting async parse for ticket:', ticketId);

      // Parse the ticket
      const parsedData = await parser.parseScaleTicket(filePath, mimeType);

      // Update ticket with parsed data
      await prisma.scaleTicket.update({
        where: { id: ticketId },
        data: {
          status: 'PARSED',
          loadNumber: parsedData.loadNumber,
          ticketDate: parsedData.ticketDate ? new Date(parsedData.ticketDate) : undefined,
          netBushels: parsedData.netBushels,
          moisture: parsedData.moisture,
          testWeight: parsedData.testWeight,
          commodityType: parsedData.commodityType,
          buyer: parsedData.buyer,
          parsedData: parsedData as any,
          parsedAt: new Date()
        }
      });

      console.log('[ScaleTicketService] Successfully parsed ticket:', ticketId);
    } catch (error) {
      console.error('[ScaleTicketService] Parsing failed for ticket:', ticketId, error);

      // Update ticket with error
      await prisma.scaleTicket.update({
        where: { id: ticketId },
        data: {
          status: 'FAILED',
          parseError: error instanceof Error ? error.message : 'Unknown parsing error',
          parsedAt: new Date()
        }
      });
    }
  }

  // Get all scale tickets for a business
  async getAll(businessId: string, userId: string): Promise<any[]> {
    // Verify user is member of business
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId }
    });

    if (!membership) {
      throw new Error('Not authorized to view scale tickets for this business');
    }

    const tickets = await prisma.scaleTicket.findMany({
      where: { businessId },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        bin: {
          select: {
            id: true,
            name: true,
            grainEntity: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return tickets.map(ticket => this.mapToResponse(ticket));
  }

  // Get a single scale ticket by ID
  async getById(ticketId: string, businessId: string, userId: string): Promise<any | null> {
    // Verify user is member of business
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId }
    });

    if (!membership) {
      throw new Error('Not authorized to view this scale ticket');
    }

    const ticket = await prisma.scaleTicket.findFirst({
      where: {
        id: ticketId,
        businessId
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        bin: {
          select: {
            id: true,
            name: true,
            grainEntity: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        binTransaction: {
          select: {
            id: true,
            type: true,
            bushels: true,
            transactionDate: true
          }
        }
      }
    });

    if (!ticket) return null;

    return this.mapToResponse(ticket);
  }

  // Assign bin and process (deduct grain)
  async assignBinAndProcess(
    ticketId: string,
    businessId: string,
    userId: string,
    data: AssignBinData
  ): Promise<any> {
    // Verify user is member of business
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId }
    });

    if (!membership) {
      throw new Error('Not authorized to process this scale ticket');
    }

    // Get the scale ticket
    const ticket = await prisma.scaleTicket.findFirst({
      where: {
        id: ticketId,
        businessId
      }
    });

    if (!ticket) {
      throw new Error('Scale ticket not found');
    }

    if (ticket.status !== 'PARSED') {
      throw new Error(`Cannot process ticket with status: ${ticket.status}`);
    }

    if (!ticket.netBushels) {
      throw new Error('Scale ticket has no net bushels data');
    }

    // Get the bin
    const bin = await binService.getById(data.binId);
    if (!bin) {
      throw new Error('Bin not found');
    }

    // Verify commodity type matches (if available)
    if (ticket.commodityType && ticket.commodityType !== bin.commodityType) {
      throw new Error(
        `Commodity type mismatch: ticket is ${ticket.commodityType}, bin is ${bin.commodityType}`
      );
    }

    // Use override bushels if provided, otherwise use parsed value
    const bushelsToDeduct = data.bushelsOverride !== undefined
      ? data.bushelsOverride
      : Number(ticket.netBushels);

    // Build description
    const description = ticket.loadNumber
      ? `Scale ticket #${ticket.loadNumber} - ${ticket.buyer || 'Unknown buyer'}`
      : `Scale ticket from ${ticket.buyer || 'Unknown buyer'}`;

    // Remove grain from bin
    await binService.removeGrain(data.binId, userId, {
      bushels: bushelsToDeduct,
      description,
      scaleTicketId: ticketId
    });

    // Update ticket status
    const updated = await prisma.scaleTicket.update({
      where: { id: ticketId },
      data: {
        binId: data.binId,
        status: 'PROCESSED',
        processedAt: new Date()
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        bin: {
          select: {
            id: true,
            name: true,
            grainEntity: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        binTransaction: {
          select: {
            id: true,
            type: true,
            bushels: true,
            transactionDate: true
          }
        }
      }
    });

    return this.mapToResponse(updated);
  }

  // Delete a scale ticket
  async delete(ticketId: string, businessId: string, userId: string): Promise<void> {
    // Verify user is member of business
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId }
    });

    if (!membership) {
      throw new Error('Not authorized to delete this scale ticket');
    }

    const ticket = await prisma.scaleTicket.findFirst({
      where: {
        id: ticketId,
        businessId
      }
    });

    if (!ticket) {
      throw new Error('Scale ticket not found');
    }

    // Don't allow deletion if processed
    if (ticket.status === 'PROCESSED') {
      throw new Error('Cannot delete a processed scale ticket. Remove the bin transaction first.');
    }

    // Delete the file
    try {
      if (fs.existsSync(ticket.filePath)) {
        fs.unlinkSync(ticket.filePath);
        console.log('[ScaleTicketService] Deleted file:', ticket.filePath);
      }
    } catch (error) {
      console.error('[ScaleTicketService] Error deleting file:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await prisma.scaleTicket.delete({
      where: { id: ticketId }
    });

    console.log('[ScaleTicketService] Deleted scale ticket:', ticketId);
  }

  // Map to response format
  private mapToResponse(ticket: any): any {
    return {
      id: ticket.id,
      businessId: ticket.businessId,
      uploadedBy: ticket.uploadedBy,
      fileName: ticket.fileName,
      filePath: ticket.filePath,
      fileSize: ticket.fileSize,
      mimeType: ticket.mimeType,
      status: ticket.status,
      loadNumber: ticket.loadNumber || undefined,
      ticketDate: ticket.ticketDate || undefined,
      netBushels: ticket.netBushels ? Number(ticket.netBushels) : undefined,
      moisture: ticket.moisture ? Number(ticket.moisture) : undefined,
      testWeight: ticket.testWeight ? Number(ticket.testWeight) : undefined,
      commodityType: ticket.commodityType || undefined,
      buyer: ticket.buyer || undefined,
      parsedData: ticket.parsedData || undefined,
      parseError: ticket.parseError || undefined,
      parsedAt: ticket.parsedAt || undefined,
      processedAt: ticket.processedAt || undefined,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      uploader: ticket.uploader ? {
        id: ticket.uploader.id,
        name: `${ticket.uploader.firstName} ${ticket.uploader.lastName}`,
        email: ticket.uploader.email
      } : undefined,
      bin: ticket.bin ? {
        id: ticket.bin.id,
        name: ticket.bin.name,
        grainEntityId: ticket.bin.grainEntity.id,
        grainEntityName: ticket.bin.grainEntity.name
      } : undefined,
      binTransaction: ticket.binTransaction ? {
        id: ticket.binTransaction.id,
        type: ticket.binTransaction.type,
        bushels: Number(ticket.binTransaction.bushels),
        transactionDate: ticket.binTransaction.transactionDate
      } : undefined
    };
  }
}
