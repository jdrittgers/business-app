import { PrismaClient, InvoiceStatus, InvoiceProductType } from '@prisma/client';
import { InvoiceParserService } from './invoice-parser.service';
import fs from 'fs';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const parserService = new InvoiceParserService();

export class InvoiceService {
  async create(businessId: string, userId: string, file: Express.Multer.File) {
    const invoice = await prisma.invoice.create({
      data: {
        businessId,
        uploadedBy: userId,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: InvoiceStatus.PENDING
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Trigger async parsing (don't await - let it run in background)
    this.parseInvoiceAsync(invoice.id, file.path, file.mimetype).catch(error => {
      console.error(`Background parsing failed for invoice ${invoice.id}:`, error);
    });

    return invoice;
  }

  async parseInvoiceAsync(invoiceId: string, filePath: string, mimeType: string) {
    try {
      const parsedData = await parserService.parseInvoice(filePath, mimeType);

      await prisma.$transaction(async (tx) => {
        // Update invoice with parsed metadata
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: InvoiceStatus.PARSED,
            vendorName: parsedData.vendorName,
            invoiceNumber: parsedData.invoiceNumber,
            invoiceDate: parsedData.invoiceDate ? new Date(parsedData.invoiceDate) : null,
            totalAmount: parsedData.totalAmount ? new Decimal(parsedData.totalAmount) : null,
            parsedData: parsedData as any,
            parsedAt: new Date()
          }
        });

        // Create line items
        for (const item of parsedData.lineItems) {
          await tx.invoiceLineItem.create({
            data: {
              invoiceId,
              productType: item.productType as InvoiceProductType,
              productName: item.productName,
              quantity: new Decimal(item.quantity),
              unit: item.unit,
              pricePerUnit: new Decimal(item.pricePerUnit),
              totalPrice: new Decimal(item.totalPrice),
              isNewProduct: false,
              ratePerAcre: item.ratePerAcre ? new Decimal(item.ratePerAcre) : null,
              rateUnit: item.rateUnit || null
            }
          });
        }
      });

      console.log(`Successfully parsed invoice ${invoiceId}`);
    } catch (error) {
      console.error(`Parsing failed for invoice ${invoiceId}:`, error);

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.FAILED,
          parseError: error instanceof Error ? error.message : 'Unknown parsing error'
        }
      });
    }
  }

  async getAll(businessId: string) {
    return prisma.invoice.findMany({
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
        lineItems: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getById(invoiceId: string, businessId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
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
        lineItems: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return invoice;
  }

  async updateLineItem(
    lineItemId: string,
    businessId: string,
    data: {
      productName?: string;
      productType?: InvoiceProductType;
      quantity?: number;
      unit?: string;
      pricePerUnit?: number;
      totalPrice?: number;
      ratePerAcre?: number;
      rateUnit?: string;
    }
  ) {
    const lineItem = await prisma.invoiceLineItem.findFirst({
      where: {
        id: lineItemId,
        invoice: { businessId }
      }
    });

    if (!lineItem) {
      throw new Error('Line item not found');
    }

    if (lineItem.priceLockedAt) {
      throw new Error('Cannot edit line item after prices are locked');
    }

    const updateData: any = {};

    if (data.productName !== undefined) updateData.productName = data.productName;
    if (data.productType !== undefined) updateData.productType = data.productType;
    if (data.quantity !== undefined) updateData.quantity = new Decimal(data.quantity);
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.pricePerUnit !== undefined) updateData.pricePerUnit = new Decimal(data.pricePerUnit);
    if (data.ratePerAcre !== undefined) {
      updateData.ratePerAcre = data.ratePerAcre ? new Decimal(data.ratePerAcre) : null;
    }
    if (data.rateUnit !== undefined) {
      updateData.rateUnit = data.rateUnit || null;
    }

    // Recalculate total price if quantity or pricePerUnit changed
    if (data.quantity !== undefined || data.pricePerUnit !== undefined) {
      const finalQuantity = data.quantity !== undefined ? data.quantity : Number(lineItem.quantity);
      const finalPrice = data.pricePerUnit !== undefined ? data.pricePerUnit : Number(lineItem.pricePerUnit);
      updateData.totalPrice = new Decimal(finalQuantity * finalPrice);
    } else if (data.totalPrice !== undefined) {
      updateData.totalPrice = new Decimal(data.totalPrice);
    }

    return prisma.invoiceLineItem.update({
      where: { id: lineItemId },
      data: updateData
    });
  }

  async lockPrices(invoiceId: string, businessId: string, userId: string) {
    const invoice = await this.getById(invoiceId, businessId);

    if (invoice.status !== InvoiceStatus.PARSED) {
      throw new Error('Can only lock prices for parsed invoices');
    }

    if (!invoice.lineItems || invoice.lineItems.length === 0) {
      throw new Error('No line items to lock');
    }

    await prisma.$transaction(async (tx) => {
      for (const lineItem of invoice.lineItems!) {
        if (lineItem.priceLockedAt) {
          continue; // Skip already locked items
        }

        let productId: string | null = null;

        // Match or create product based on type
        if (lineItem.productType === InvoiceProductType.FERTILIZER) {
          productId = await this.matchOrCreateFertilizer(tx, businessId, lineItem);
        } else if (lineItem.productType === InvoiceProductType.CHEMICAL) {
          productId = await this.matchOrCreateChemical(tx, businessId, lineItem);
        } else if (lineItem.productType === InvoiceProductType.SEED) {
          productId = await this.matchOrCreateSeed(tx, businessId, lineItem);
        }

        // Create purchase history record
        await tx.purchaseHistory.create({
          data: {
            businessId,
            invoiceLineItemId: lineItem.id,
            productType: lineItem.productType,
            productId,
            productName: lineItem.productName,
            purchasedQuantity: lineItem.quantity,
            purchasedUnit: lineItem.unit,
            purchasedPrice: lineItem.pricePerUnit,
            totalCost: lineItem.totalPrice,
            purchasedAt: invoice.invoiceDate || invoice.createdAt,
            vendorName: invoice.vendorName
          }
        });

        // Mark line item as locked
        await tx.invoiceLineItem.update({
          where: { id: lineItem.id },
          data: {
            priceLockedAt: new Date(),
            priceLockedBy: userId,
            matchedProductId: productId,
            matchedProductType: lineItem.productType
          }
        });
      }

      // Update invoice status
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: InvoiceStatus.REVIEWED }
      });
    });

    return this.getById(invoiceId, businessId);
  }

  private async matchOrCreateFertilizer(
    tx: any,
    businessId: string,
    lineItem: any
  ): Promise<string> {
    const existing = await tx.fertilizer.findFirst({
      where: {
        businessId,
        name: {
          equals: lineItem.productName,
          mode: 'insensitive'
        },
        unit: lineItem.unit
      }
    });

    if (existing) {
      await tx.fertilizer.update({
        where: { id: existing.id },
        data: { pricePerUnit: lineItem.pricePerUnit }
      });
      return existing.id;
    }

    const newProduct = await tx.fertilizer.create({
      data: {
        businessId,
        name: lineItem.productName,
        pricePerUnit: lineItem.pricePerUnit,
        unit: lineItem.unit
      }
    });

    return newProduct.id;
  }

  private async matchOrCreateChemical(
    tx: any,
    businessId: string,
    lineItem: any
  ): Promise<string> {
    const existing = await tx.chemical.findFirst({
      where: {
        businessId,
        name: {
          equals: lineItem.productName,
          mode: 'insensitive'
        },
        unit: lineItem.unit
      }
    });

    if (existing) {
      await tx.chemical.update({
        where: { id: existing.id },
        data: { pricePerUnit: lineItem.pricePerUnit }
      });
      return existing.id;
    }

    const newProduct = await tx.chemical.create({
      data: {
        businessId,
        name: lineItem.productName,
        pricePerUnit: lineItem.pricePerUnit,
        unit: lineItem.unit
      }
    });

    return newProduct.id;
  }

  private async matchOrCreateSeed(
    tx: any,
    businessId: string,
    lineItem: any
  ): Promise<string> {
    // Infer commodity type from product name
    const commodityType = this.inferSeedCommodity(lineItem.productName);

    const existing = await tx.seedHybrid.findFirst({
      where: {
        businessId,
        hybridName: {
          equals: lineItem.productName,
          mode: 'insensitive'
        },
        commodityType
      }
    });

    if (existing) {
      await tx.seedHybrid.update({
        where: { id: existing.id },
        data: { pricePerBag: lineItem.pricePerUnit }
      });
      return existing.id;
    }

    // Default seeds per bag by commodity type
    const defaultSeedsPerBag = commodityType === 'SOYBEANS' ? 140000 : 80000;

    const newProduct = await tx.seedHybrid.create({
      data: {
        businessId,
        hybridName: lineItem.productName,
        commodityType,
        pricePerBag: lineItem.pricePerUnit,
        seedsPerBag: lineItem.unit === 'BAG' ? defaultSeedsPerBag : null
      }
    });

    return newProduct.id;
  }

  private inferSeedCommodity(productName: string): string {
    const name = productName.toLowerCase();
    const nameUpper = productName.toUpperCase();

    // Direct commodity mentions
    if (name.includes('corn') || name.includes('maize')) {
      return 'CORN';
    }
    if (name.includes('soybean') || name.includes('soy ') || name.endsWith('soy')) {
      return 'SOYBEANS';
    }
    if (name.includes('wheat')) {
      return 'WHEAT';
    }

    // Soybean brand patterns (Asgrow, NK, etc)
    // Asgrow soybeans: AG followed by numbers like AG36X6, AG38XF2
    if (/^AG\s?\d/.test(nameUpper) || /\bAG\d/.test(nameUpper)) {
      return 'SOYBEANS';
    }
    // NK Soybeans: NK S or NKS patterns like NKS30-T8, NK S30-T8
    if (/\bNK\s?S/.test(nameUpper)) {
      return 'SOYBEANS';
    }
    // Xitavo soybeans (LG Seeds)
    if (name.includes('xitavo')) {
      return 'SOYBEANS';
    }
    // Credenz soybeans
    if (name.includes('credenz') || /^CZ\s?\d/.test(nameUpper)) {
      return 'SOYBEANS';
    }
    // Golden Harvest soybeans: GH followed by numbers
    if (/^GH\s?\d/.test(nameUpper)) {
      return 'SOYBEANS';
    }
    // REV brand soybeans (Bayer)
    if (/^REV\s?\d/.test(nameUpper)) {
      return 'SOYBEANS';
    }
    // Pioneer soybeans usually have X trait marker: P21A50X, P34A97X
    if (/^P\d{2}[A-Z]\d+X/.test(nameUpper)) {
      return 'SOYBEANS';
    }
    // LibertyLink soybeans with LL designation
    if (nameUpper.includes('LL') && /\d{2,}/.test(nameUpper)) {
      return 'SOYBEANS';
    }

    // Corn brand patterns
    // DeKalb corn: DKC followed by numbers like DKC60-12
    if (/^DKC\s?\d/.test(nameUpper) || /\bDKC\d/.test(nameUpper)) {
      return 'CORN';
    }
    // Pioneer corn: P followed by 4 digits like P1197, P0987
    if (/^P\d{4}$/.test(nameUpper) || /^P\d{4}\b/.test(nameUpper)) {
      return 'CORN';
    }
    // Pioneer corn with trait package: P1197AM, P1197AMXT
    if (/^P\d{4}[A-Z]{2,}/.test(nameUpper)) {
      return 'CORN';
    }
    // NK corn: NK followed by numbers (not NKS which is soybeans)
    if (/\bNK\d/.test(nameUpper) && !nameUpper.includes('NKS')) {
      return 'CORN';
    }
    // LG corn patterns
    if (/^LG\d{4}/.test(nameUpper)) {
      return 'CORN';
    }

    // Default to CORN if unclear (most common crop)
    return 'CORN';
  }

  /**
   * Parse a fertilizer bill and apply costs directly to a farm
   */
  async parseAndApplyToFarm(
    businessId: string,
    farmId: string,
    userId: string,
    file: Express.Multer.File
  ): Promise<{
    invoice: any;
    appliedItems: any[];
    newProducts: any[];
  }> {
    // Get farm to verify it exists and get acres
    const farm = await prisma.farm.findFirst({
      where: {
        id: farmId,
        grainEntity: { businessId },
        deletedAt: null
      }
    });

    if (!farm) {
      throw new Error('Farm not found');
    }

    // Create invoice with farmId
    const invoice = await prisma.invoice.create({
      data: {
        businessId,
        uploadedBy: userId,
        farmId,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: InvoiceStatus.PENDING
      }
    });

    try {
      // Parse the invoice synchronously (wait for result)
      const parsedData = await parserService.parseInvoice(file.path, file.mimetype);

      // Update invoice with parsed metadata
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.PARSED,
          vendorName: parsedData.vendorName,
          invoiceNumber: parsedData.invoiceNumber,
          invoiceDate: parsedData.invoiceDate ? new Date(parsedData.invoiceDate) : null,
          totalAmount: parsedData.totalAmount ? new Decimal(parsedData.totalAmount) : null,
          parsedData: parsedData as any,
          parsedAt: new Date()
        }
      });

      // Create line items
      for (const item of parsedData.lineItems) {
        await prisma.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            productType: item.productType as InvoiceProductType,
            productName: item.productName,
            quantity: new Decimal(item.quantity),
            unit: item.unit,
            pricePerUnit: new Decimal(item.pricePerUnit),
            totalPrice: new Decimal(item.totalPrice),
            isNewProduct: false,
            ratePerAcre: item.ratePerAcre ? new Decimal(item.ratePerAcre) : null,
            rateUnit: item.rateUnit || null
          }
        });
      }

      // Get fertilizer line items only
      const fertilizerItems = parsedData.lineItems.filter(
        (item: any) => item.productType === 'FERTILIZER'
      );

      const appliedItems: any[] = [];
      const newProducts: any[] = [];

      // Apply fertilizer items to farm
      await prisma.$transaction(async (tx) => {
        for (const item of fertilizerItems) {
          // Match or create fertilizer product
          const existingFertilizer = await tx.fertilizer.findFirst({
            where: {
              businessId,
              name: { equals: item.productName, mode: 'insensitive' }
            }
          });

          let fertilizer;
          if (existingFertilizer) {
            // Update price if different
            fertilizer = await tx.fertilizer.update({
              where: { id: existingFertilizer.id },
              data: {
                pricePerUnit: new Decimal(item.pricePerUnit),
                defaultRatePerAcre: item.ratePerAcre ? new Decimal(item.ratePerAcre) : undefined,
                rateUnit: item.rateUnit || undefined
              }
            });
          } else {
            // Create new fertilizer product
            fertilizer = await tx.fertilizer.create({
              data: {
                businessId,
                name: item.productName,
                pricePerUnit: new Decimal(item.pricePerUnit),
                unit: item.unit || 'LB',
                defaultRatePerAcre: item.ratePerAcre ? new Decimal(item.ratePerAcre) : undefined,
                rateUnit: item.rateUnit || undefined
              }
            });
            newProducts.push({
              id: fertilizer.id,
              name: fertilizer.name,
              pricePerUnit: Number(fertilizer.pricePerUnit),
              unit: fertilizer.unit
            });
          }

          // Calculate amount used for this farm
          // Use rate per acre if available, otherwise use total quantity
          const farmAcres = Number(farm.acres);
          let amountUsed: number;
          let ratePerAcre: number | null = null;

          if (item.ratePerAcre) {
            ratePerAcre = item.ratePerAcre;
            amountUsed = item.ratePerAcre * farmAcres;
          } else {
            // Use the total quantity from the invoice
            amountUsed = item.quantity;
            ratePerAcre = item.quantity / farmAcres;
          }

          // Create FarmFertilizerUsage record
          const usage = await tx.farmFertilizerUsage.create({
            data: {
              farmId,
              fertilizerId: fertilizer.id,
              amountUsed: new Decimal(amountUsed),
              ratePerAcre: ratePerAcre ? new Decimal(ratePerAcre) : null,
              acresApplied: new Decimal(farmAcres)
            },
            include: {
              fertilizer: true
            }
          });

          appliedItems.push({
            id: usage.id,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            pricePerUnit: item.pricePerUnit,
            ratePerAcre: ratePerAcre,
            amountUsed: amountUsed,
            totalCost: amountUsed * item.pricePerUnit,
            isNew: !existingFertilizer
          });
        }
      });

      // Mark invoice as reviewed
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.REVIEWED }
      });

      // Get updated invoice with line items
      const finalInvoice = await this.getById(invoice.id, businessId);

      return {
        invoice: finalInvoice,
        appliedItems,
        newProducts
      };
    } catch (error) {
      // Mark invoice as failed
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.FAILED,
          parseError: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  async delete(invoiceId: string, businessId: string) {
    const invoice = await this.getById(invoiceId, businessId);

    // Delete file from filesystem
    if (fs.existsSync(invoice.filePath)) {
      fs.unlinkSync(invoice.filePath);
    }

    // Delete invoice (cascade will handle line items and purchase history)
    await prisma.invoice.delete({
      where: { id: invoiceId }
    });
  }

  /**
   * Parse a seed bill and add seed hybrids to the catalog
   */
  async parseSeedBillToCatalog(
    businessId: string,
    userId: string,
    file: Express.Multer.File
  ): Promise<{
    invoice: any;
    addedProducts: any[];
    updatedProducts: any[];
  }> {
    // Create invoice record
    const invoice = await prisma.invoice.create({
      data: {
        businessId,
        uploadedBy: userId,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: InvoiceStatus.PENDING
      }
    });

    try {
      // Parse the invoice
      const parsedData = await parserService.parseInvoice(file.path, file.mimetype);

      // Update invoice with parsed metadata
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.PARSED,
          vendorName: parsedData.vendorName,
          invoiceNumber: parsedData.invoiceNumber,
          invoiceDate: parsedData.invoiceDate ? new Date(parsedData.invoiceDate) : null,
          totalAmount: parsedData.totalAmount ? new Decimal(parsedData.totalAmount) : null,
          parsedData: parsedData as any,
          parsedAt: new Date()
        }
      });

      // Create line items
      for (const item of parsedData.lineItems) {
        await prisma.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            productType: item.productType as InvoiceProductType,
            productName: item.productName,
            quantity: new Decimal(item.quantity),
            unit: item.unit,
            pricePerUnit: new Decimal(item.pricePerUnit),
            totalPrice: new Decimal(item.totalPrice),
            isNewProduct: false,
            ratePerAcre: item.ratePerAcre ? new Decimal(item.ratePerAcre) : null,
            rateUnit: item.rateUnit || null
          }
        });
      }

      // Get seed line items
      const seedItems = parsedData.lineItems.filter(
        (item: any) => item.productType === 'SEED'
      );

      const addedProducts: any[] = [];
      const updatedProducts: any[] = [];

      // Process seed items
      await prisma.$transaction(async (tx) => {
        for (const item of seedItems) {
          // Infer commodity type from product name
          const commodityType = this.inferSeedCommodity(item.productName) as 'CORN' | 'SOYBEANS' | 'WHEAT';

          const existingSeed = await tx.seedHybrid.findFirst({
            where: {
              businessId,
              name: { equals: item.productName, mode: 'insensitive' }
            }
          });

          if (existingSeed) {
            // Update existing seed
            await tx.seedHybrid.update({
              where: { id: existingSeed.id },
              data: {
                pricePerBag: new Decimal(item.pricePerUnit),
                needsPricing: false
              }
            });
            updatedProducts.push({
              id: existingSeed.id,
              name: item.productName,
              pricePerBag: item.pricePerUnit,
              commodityType,
              isNew: false
            });
          } else {
            // Create new seed hybrid
            // Default seeds per bag by commodity type (soybeans: 140k, corn/wheat: 80k)
            const defaultSeedsPerBag = commodityType === 'SOYBEANS' ? 140000 : 80000;

            const newSeed = await tx.seedHybrid.create({
              data: {
                businessId,
                name: item.productName,
                commodityType,
                pricePerBag: new Decimal(item.pricePerUnit),
                seedsPerBag: defaultSeedsPerBag,
                needsPricing: false
              }
            });
            addedProducts.push({
              id: newSeed.id,
              name: item.productName,
              pricePerBag: item.pricePerUnit,
              commodityType,
              isNew: true
            });
          }
        }
      });

      // Mark invoice as reviewed
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.REVIEWED }
      });

      const finalInvoice = await this.getById(invoice.id, businessId);

      return {
        invoice: finalInvoice,
        addedProducts,
        updatedProducts
      };
    } catch (error) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.FAILED,
          parseError: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Parse a fertilizer bill and add products to the catalog
   */
  async parseFertilizerBillToCatalog(
    businessId: string,
    userId: string,
    file: Express.Multer.File
  ): Promise<{
    invoice: any;
    addedProducts: any[];
    updatedProducts: any[];
  }> {
    // Create invoice record
    const invoice = await prisma.invoice.create({
      data: {
        businessId,
        uploadedBy: userId,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: InvoiceStatus.PENDING
      }
    });

    try {
      // Parse the invoice
      const parsedData = await parserService.parseInvoice(file.path, file.mimetype);

      // Update invoice with parsed metadata
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.PARSED,
          vendorName: parsedData.vendorName,
          invoiceNumber: parsedData.invoiceNumber,
          invoiceDate: parsedData.invoiceDate ? new Date(parsedData.invoiceDate) : null,
          totalAmount: parsedData.totalAmount ? new Decimal(parsedData.totalAmount) : null,
          parsedData: parsedData as any,
          parsedAt: new Date()
        }
      });

      // Create line items
      for (const item of parsedData.lineItems) {
        await prisma.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            productType: item.productType as InvoiceProductType,
            productName: item.productName,
            quantity: new Decimal(item.quantity),
            unit: item.unit,
            pricePerUnit: new Decimal(item.pricePerUnit),
            totalPrice: new Decimal(item.totalPrice),
            isNewProduct: false,
            ratePerAcre: item.ratePerAcre ? new Decimal(item.ratePerAcre) : null,
            rateUnit: item.rateUnit || null
          }
        });
      }

      // Get fertilizer line items
      const fertilizerItems = parsedData.lineItems.filter(
        (item: any) => item.productType === 'FERTILIZER'
      );

      const addedProducts: any[] = [];
      const updatedProducts: any[] = [];

      // Process fertilizer items
      await prisma.$transaction(async (tx) => {
        for (const item of fertilizerItems) {
          const existingFertilizer = await tx.fertilizer.findFirst({
            where: {
              businessId,
              name: { equals: item.productName, mode: 'insensitive' }
            }
          });

          if (existingFertilizer) {
            // Update existing fertilizer
            await tx.fertilizer.update({
              where: { id: existingFertilizer.id },
              data: {
                pricePerUnit: new Decimal(item.pricePerUnit),
                needsPricing: false,
                defaultRatePerAcre: item.ratePerAcre ? new Decimal(item.ratePerAcre) : undefined,
                rateUnit: item.rateUnit || undefined
              }
            });
            updatedProducts.push({
              id: existingFertilizer.id,
              name: item.productName,
              pricePerUnit: item.pricePerUnit,
              unit: existingFertilizer.unit,
              isNew: false
            });
          } else {
            // Create new fertilizer
            const newFertilizer = await tx.fertilizer.create({
              data: {
                businessId,
                name: item.productName,
                pricePerUnit: new Decimal(item.pricePerUnit),
                unit: item.unit || 'LB',
                needsPricing: false,
                defaultRatePerAcre: item.ratePerAcre ? new Decimal(item.ratePerAcre) : undefined,
                rateUnit: item.rateUnit || undefined
              }
            });
            addedProducts.push({
              id: newFertilizer.id,
              name: item.productName,
              pricePerUnit: item.pricePerUnit,
              unit: newFertilizer.unit,
              isNew: true
            });
          }
        }
      });

      // Mark invoice as reviewed
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.REVIEWED }
      });

      const finalInvoice = await this.getById(invoice.id, businessId);

      return {
        invoice: finalInvoice,
        addedProducts,
        updatedProducts
      };
    } catch (error) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.FAILED,
          parseError: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Parse a chemical bill and add products to the catalog
   */
  async parseChemicalBillToCatalog(
    businessId: string,
    userId: string,
    file: Express.Multer.File
  ): Promise<{
    invoice: any;
    addedProducts: any[];
    updatedProducts: any[];
  }> {
    // Create invoice record
    const invoice = await prisma.invoice.create({
      data: {
        businessId,
        uploadedBy: userId,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: InvoiceStatus.PENDING
      }
    });

    try {
      // Parse the invoice
      const parsedData = await parserService.parseInvoice(file.path, file.mimetype);

      // Update invoice with parsed metadata
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.PARSED,
          vendorName: parsedData.vendorName,
          invoiceNumber: parsedData.invoiceNumber,
          invoiceDate: parsedData.invoiceDate ? new Date(parsedData.invoiceDate) : null,
          totalAmount: parsedData.totalAmount ? new Decimal(parsedData.totalAmount) : null,
          parsedData: parsedData as any,
          parsedAt: new Date()
        }
      });

      // Create line items
      for (const item of parsedData.lineItems) {
        await prisma.invoiceLineItem.create({
          data: {
            invoiceId: invoice.id,
            productType: item.productType as InvoiceProductType,
            productName: item.productName,
            quantity: new Decimal(item.quantity),
            unit: item.unit,
            pricePerUnit: new Decimal(item.pricePerUnit),
            totalPrice: new Decimal(item.totalPrice),
            isNewProduct: false,
            ratePerAcre: item.ratePerAcre ? new Decimal(item.ratePerAcre) : null,
            rateUnit: item.rateUnit || null
          }
        });
      }

      // Get chemical line items
      const chemicalItems = parsedData.lineItems.filter(
        (item: any) => item.productType === 'CHEMICAL'
      );

      const addedProducts: any[] = [];
      const updatedProducts: any[] = [];

      // Process chemical items
      await prisma.$transaction(async (tx) => {
        for (const item of chemicalItems) {
          // Infer category from product name
          const category = this.inferChemicalCategory(item.productName);

          const existingChemical = await tx.chemical.findFirst({
            where: {
              businessId,
              name: { equals: item.productName, mode: 'insensitive' }
            }
          });

          if (existingChemical) {
            // Update existing chemical
            await tx.chemical.update({
              where: { id: existingChemical.id },
              data: {
                pricePerUnit: new Decimal(item.pricePerUnit),
                needsPricing: false,
                defaultRatePerAcre: item.ratePerAcre ? new Decimal(item.ratePerAcre) : undefined,
                rateUnit: item.rateUnit || undefined
              }
            });
            updatedProducts.push({
              id: existingChemical.id,
              name: item.productName,
              pricePerUnit: item.pricePerUnit,
              unit: existingChemical.unit,
              category: existingChemical.category,
              isNew: false
            });
          } else {
            // Create new chemical
            const newChemical = await tx.chemical.create({
              data: {
                businessId,
                name: item.productName,
                pricePerUnit: new Decimal(item.pricePerUnit),
                unit: item.unit || 'GAL',
                category,
                needsPricing: false,
                defaultRatePerAcre: item.ratePerAcre ? new Decimal(item.ratePerAcre) : undefined,
                rateUnit: item.rateUnit || undefined
              }
            });
            addedProducts.push({
              id: newChemical.id,
              name: item.productName,
              pricePerUnit: item.pricePerUnit,
              unit: newChemical.unit,
              category: newChemical.category,
              isNew: true
            });
          }
        }
      });

      // Mark invoice as reviewed
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.REVIEWED }
      });

      const finalInvoice = await this.getById(invoice.id, businessId);

      return {
        invoice: finalInvoice,
        addedProducts,
        updatedProducts
      };
    } catch (error) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.FAILED,
          parseError: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  /**
   * Infer chemical category from product name
   */
  private inferChemicalCategory(productName: string): 'HERBICIDE' | 'FUNGICIDE' | 'IN_FURROW' {
    const name = productName.toUpperCase();

    // Fungicide keywords
    if (name.includes('FUNGICIDE') || name.includes('DELARO') || name.includes('PRIAXOR') ||
        name.includes('STRATEGO') || name.includes('HEADLINE') || name.includes('QUILT')) {
      return 'FUNGICIDE';
    }

    // In-furrow keywords
    if (name.includes('STARTER') || name.includes('IN-FURROW') || name.includes('INFURROW') ||
        name.includes('POP-UP') || name.includes('POPUP')) {
      return 'IN_FURROW';
    }

    // Default to herbicide
    return 'HERBICIDE';
  }
}

export const invoiceService = new InvoiceService();
