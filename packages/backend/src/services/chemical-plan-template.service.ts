import { prisma } from '../prisma/client';
import {
  ChemicalPlanTemplate,
  ChemicalPlanTemplateItem,
  ChemicalPlanApplication,
  CreateChemicalPlanTemplateRequest,
  UpdateChemicalPlanTemplateRequest,
  CreateChemicalPlanTemplateItemRequest,
  UpdateChemicalPlanTemplateItemRequest,
  ApplyTemplateRequest,
  ApplyTemplateResponse,
  GetChemicalPlanTemplatesQuery,
  FarmWithTemplateApplication,
  CommodityType,
  UnitType,
  ChemicalCategory,
  PassType,
  ImportInvoiceToTemplateRequest,
  ImportInvoiceToTemplateResponse,
  InvoiceChemicalForImport
} from '@business-app/shared';

export class ChemicalPlanTemplateService {
  /**
   * Get all templates for a business
   */
  async getAll(businessId: string, query: GetChemicalPlanTemplatesQuery = {}): Promise<ChemicalPlanTemplate[]> {
    const templates = await prisma.chemicalPlanTemplate.findMany({
      where: {
        businessId,
        ...(query.commodityType && { commodityType: query.commodityType }),
        ...(query.passType && { passType: query.passType }),
        ...(query.year && { year: query.year }),
        ...(query.isActive !== undefined && { isActive: query.isActive })
      },
      include: {
        items: {
          include: {
            chemical: true
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { applications: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return templates.map(t => this.mapTemplate(t));
  }

  /**
   * Get a single template by ID
   */
  async getById(templateId: string, businessId: string): Promise<ChemicalPlanTemplate | null> {
    const template = await prisma.chemicalPlanTemplate.findFirst({
      where: { id: templateId, businessId },
      include: {
        items: {
          include: {
            chemical: true
          },
          orderBy: { order: 'asc' }
        },
        applications: {
          include: {
            farm: true,
            appliedBy: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        },
        _count: {
          select: { applications: true }
        }
      }
    });

    if (!template) return null;
    return this.mapTemplate(template);
  }

  /**
   * Create a new template
   */
  async create(businessId: string, data: CreateChemicalPlanTemplateRequest): Promise<ChemicalPlanTemplate> {
    // Check for duplicate name
    const existing = await prisma.chemicalPlanTemplate.findFirst({
      where: { businessId, name: data.name }
    });
    if (existing) {
      throw new Error('A template with this name already exists');
    }

    const template = await prisma.chemicalPlanTemplate.create({
      data: {
        businessId,
        name: data.name,
        description: data.description,
        commodityType: data.commodityType,
        passType: data.passType,
        year: data.year,
        items: data.items ? {
          create: data.items.map((item, index) => ({
            chemicalId: item.chemicalId,
            ratePerAcre: item.ratePerAcre,
            rateUnit: item.rateUnit,
            notes: item.notes,
            order: item.order ?? index
          }))
        } : undefined
      },
      include: {
        items: {
          include: { chemical: true },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { applications: true }
        }
      }
    });

    return this.mapTemplate(template);
  }

  /**
   * Update a template
   */
  async update(templateId: string, businessId: string, data: UpdateChemicalPlanTemplateRequest): Promise<ChemicalPlanTemplate> {
    // Verify template exists and belongs to business
    const existing = await this.getById(templateId, businessId);
    if (!existing) {
      throw new Error('Template not found');
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.chemicalPlanTemplate.findFirst({
        where: { businessId, name: data.name, id: { not: templateId } }
      });
      if (duplicate) {
        throw new Error('A template with this name already exists');
      }
    }

    const template = await prisma.chemicalPlanTemplate.update({
      where: { id: templateId },
      data: {
        name: data.name,
        description: data.description,
        commodityType: data.commodityType,
        passType: data.passType,
        year: data.year,
        isActive: data.isActive
      },
      include: {
        items: {
          include: { chemical: true },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: { applications: true }
        }
      }
    });

    return this.mapTemplate(template);
  }

  /**
   * Delete a template
   * Note: Chemicals on farms are preserved but unlinked from the template
   */
  async delete(templateId: string, businessId: string): Promise<void> {
    // Verify template exists and belongs to business
    const existing = await this.getById(templateId, businessId);
    if (!existing) {
      throw new Error('Template not found');
    }

    // Unlink any FarmChemicalUsage records that reference this template's items
    // (chemicals stay on farms but lose the template reference)
    await prisma.farmChemicalUsage.updateMany({
      where: {
        templateItem: {
          templateId
        }
      },
      data: {
        templateItemId: null
      }
    });

    // Delete the template (cascades to items and applications)
    await prisma.chemicalPlanTemplate.delete({
      where: { id: templateId }
    });
  }

  // ===== Template Items =====

  /**
   * Add an item to a template
   */
  async addItem(templateId: string, businessId: string, data: CreateChemicalPlanTemplateItemRequest): Promise<ChemicalPlanTemplateItem> {
    // Verify template exists and belongs to business
    const template = await this.getById(templateId, businessId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Verify chemical exists and belongs to business
    const chemical = await prisma.chemical.findFirst({
      where: { id: data.chemicalId, businessId }
    });
    if (!chemical) {
      throw new Error('Chemical not found');
    }

    // Get max order for new item
    const maxOrder = await prisma.chemicalPlanTemplateItem.aggregate({
      where: { templateId },
      _max: { order: true }
    });

    const item = await prisma.chemicalPlanTemplateItem.create({
      data: {
        templateId,
        chemicalId: data.chemicalId,
        ratePerAcre: data.ratePerAcre,
        rateUnit: data.rateUnit,
        notes: data.notes,
        order: data.order ?? (maxOrder._max.order ?? 0) + 1
      },
      include: { chemical: true }
    });

    return this.mapItem(item);
  }

  /**
   * Update a template item
   */
  async updateItem(itemId: string, businessId: string, data: UpdateChemicalPlanTemplateItemRequest): Promise<ChemicalPlanTemplateItem> {
    // Verify item exists and template belongs to business
    const item = await prisma.chemicalPlanTemplateItem.findFirst({
      where: { id: itemId },
      include: { template: true }
    });
    if (!item || item.template.businessId !== businessId) {
      throw new Error('Template item not found');
    }

    const updated = await prisma.chemicalPlanTemplateItem.update({
      where: { id: itemId },
      data: {
        ratePerAcre: data.ratePerAcre,
        rateUnit: data.rateUnit,
        notes: data.notes,
        order: data.order
      },
      include: { chemical: true }
    });

    return this.mapItem(updated);
  }

  /**
   * Remove an item from a template
   */
  async removeItem(itemId: string, businessId: string): Promise<void> {
    // Verify item exists and template belongs to business
    const item = await prisma.chemicalPlanTemplateItem.findFirst({
      where: { id: itemId },
      include: { template: true }
    });
    if (!item || item.template.businessId !== businessId) {
      throw new Error('Template item not found');
    }

    // Unlink any FarmChemicalUsage records that reference this item
    await prisma.farmChemicalUsage.updateMany({
      where: { templateItemId: itemId },
      data: { templateItemId: null }
    });

    await prisma.chemicalPlanTemplateItem.delete({
      where: { id: itemId }
    });
  }

  // ===== Apply/Remove Template =====

  /**
   * Apply a template to farms
   */
  async applyToFarms(
    templateId: string,
    businessId: string,
    request: ApplyTemplateRequest,
    userId: string
  ): Promise<ApplyTemplateResponse> {
    // Verify template exists and belongs to business
    const template = await prisma.chemicalPlanTemplate.findFirst({
      where: { id: templateId, businessId },
      include: {
        items: {
          include: { chemical: true }
        }
      }
    });
    if (!template) {
      throw new Error('Template not found');
    }

    // Get farms to apply to
    let farmIds: string[] = [];

    if (request.farmIds && request.farmIds.length > 0) {
      // Use specific farm IDs
      farmIds = request.farmIds;
    } else if (request.commodityType || request.year) {
      // Find farms matching criteria
      const farms = await prisma.farm.findMany({
        where: {
          grainEntity: { businessId },
          deletedAt: null,
          ...(request.commodityType && { commodityType: request.commodityType }),
          ...(request.year && { year: request.year })
        },
        select: { id: true }
      });
      farmIds = farms.map(f => f.id);
    }

    if (farmIds.length === 0) {
      return { applied: 0, skipped: 0, farmIds: [] };
    }

    // Verify all farms belong to this business
    const validFarms = await prisma.farm.findMany({
      where: {
        id: { in: farmIds },
        grainEntity: { businessId },
        deletedAt: null
      },
      select: { id: true, acres: true }
    });
    const validFarmIds = validFarms.map(f => f.id);
    const farmAcresMap = new Map(validFarms.map(f => [f.id, Number(f.acres)]));

    // Check which farms already have this template applied
    const existingApplications = await prisma.chemicalPlanApplication.findMany({
      where: {
        templateId,
        farmId: { in: validFarmIds }
      },
      select: { farmId: true }
    });
    const alreadyApplied = new Set(existingApplications.map(a => a.farmId));

    // Filter to farms that don't already have this template
    const farmsToApply = validFarmIds.filter(id => !alreadyApplied.has(id));

    if (farmsToApply.length === 0) {
      return {
        applied: 0,
        skipped: validFarmIds.length,
        farmIds: []
      };
    }

    // Apply template to each farm in a transaction
    await prisma.$transaction(async (tx) => {
      for (const farmId of farmsToApply) {
        // Create application record
        await tx.chemicalPlanApplication.create({
          data: {
            templateId,
            farmId,
            appliedById: userId
          }
        });

        // Get farm acres for calculating amount
        const farmAcres = farmAcresMap.get(farmId) || 0;

        // Create FarmChemicalUsage for each template item
        for (const item of template.items) {
          await tx.farmChemicalUsage.create({
            data: {
              farmId,
              chemicalId: item.chemicalId,
              ratePerAcre: item.ratePerAcre,
              acresApplied: farmAcres,
              amountUsed: Number(item.ratePerAcre) * farmAcres,
              templateItemId: item.id,
              isOverride: false
            }
          });
        }
      }
    });

    return {
      applied: farmsToApply.length,
      skipped: alreadyApplied.size,
      farmIds: farmsToApply
    };
  }

  /**
   * Remove a template from farms
   */
  async removeFromFarms(
    templateId: string,
    businessId: string,
    farmIds: string[]
  ): Promise<void> {
    // Verify template exists and belongs to business
    const template = await this.getById(templateId, businessId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Get template item IDs for unlinking usages
    const templateItemIds = template.items?.map(i => i.id) || [];

    await prisma.$transaction(async (tx) => {
      // Unlink FarmChemicalUsage records (keep the chemicals on the farm)
      await tx.farmChemicalUsage.updateMany({
        where: {
          farmId: { in: farmIds },
          templateItemId: { in: templateItemIds }
        },
        data: {
          templateItemId: null
        }
      });

      // Remove application records
      await tx.chemicalPlanApplication.deleteMany({
        where: {
          templateId,
          farmId: { in: farmIds }
        }
      });
    });
  }

  /**
   * Get all farms that have a template applied
   */
  async getFarmsWithTemplate(templateId: string, businessId: string): Promise<FarmWithTemplateApplication[]> {
    // Verify template exists and belongs to business
    const template = await this.getById(templateId, businessId);
    if (!template) {
      throw new Error('Template not found');
    }

    const applications = await prisma.chemicalPlanApplication.findMany({
      where: { templateId },
      include: {
        farm: {
          include: {
            grainEntity: {
              select: { name: true }
            }
          }
        }
      }
    });

    return applications.map(app => ({
      farmId: app.farm.id,
      farmName: app.farm.name,
      acres: Number(app.farm.acres),
      commodityType: app.farm.commodityType as CommodityType,
      year: app.farm.year,
      grainEntityName: app.farm.grainEntity?.name,
      appliedAt: app.appliedAt,
      hasOverrides: app.hasOverrides
    }));
  }

  /**
   * Get the template applied to a specific farm (if any)
   */
  async getTemplateForFarm(farmId: string, businessId: string): Promise<ChemicalPlanApplication | null> {
    const application = await prisma.chemicalPlanApplication.findFirst({
      where: {
        farmId,
        template: { businessId }
      },
      include: {
        template: true
      }
    });

    if (!application) return null;

    return {
      id: application.id,
      templateId: application.templateId,
      farmId: application.farmId,
      appliedAt: application.appliedAt,
      appliedById: application.appliedById || undefined,
      hasOverrides: application.hasOverrides,
      template: this.mapTemplate(application.template as any)
    };
  }

  /**
   * Mark a farm as having overrides (called when FarmChemicalUsage is modified)
   */
  async markHasOverrides(farmId: string, templateItemId: string): Promise<void> {
    // Find the application for this farm that matches the template item
    const item = await prisma.chemicalPlanTemplateItem.findUnique({
      where: { id: templateItemId },
      select: { templateId: true }
    });

    if (!item) return;

    await prisma.chemicalPlanApplication.updateMany({
      where: {
        farmId,
        templateId: item.templateId
      },
      data: {
        hasOverrides: true
      }
    });

    // Also mark the usage record as an override
    await prisma.farmChemicalUsage.updateMany({
      where: {
        farmId,
        templateItemId
      },
      data: {
        isOverride: true
      }
    });
  }

  /**
   * Reset a farm to use the original template values
   */
  async resetToTemplate(farmId: string, templateId: string, businessId: string): Promise<void> {
    // Verify template exists and belongs to business
    const template = await prisma.chemicalPlanTemplate.findFirst({
      where: { id: templateId, businessId },
      include: { items: true }
    });
    if (!template) {
      throw new Error('Template not found');
    }

    // Verify farm has this template applied
    const application = await prisma.chemicalPlanApplication.findUnique({
      where: { templateId_farmId: { templateId, farmId } }
    });
    if (!application) {
      throw new Error('Template not applied to this farm');
    }

    // Get farm acres
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      select: { acres: true }
    });
    if (!farm) {
      throw new Error('Farm not found');
    }
    const farmAcres = Number(farm.acres);

    await prisma.$transaction(async (tx) => {
      // Delete existing usages from this template
      await tx.farmChemicalUsage.deleteMany({
        where: {
          farmId,
          templateItemId: { in: template.items.map(i => i.id) }
        }
      });

      // Re-create from template
      for (const item of template.items) {
        await tx.farmChemicalUsage.create({
          data: {
            farmId,
            chemicalId: item.chemicalId,
            ratePerAcre: item.ratePerAcre,
            acresApplied: farmAcres,
            amountUsed: Number(item.ratePerAcre) * farmAcres,
            templateItemId: item.id,
            isOverride: false
          }
        });
      }

      // Clear overrides flag
      await tx.chemicalPlanApplication.update({
        where: { templateId_farmId: { templateId, farmId } },
        data: { hasOverrides: false }
      });
    });
  }

  // ===== Invoice Import Methods =====

  /**
   * Get chemicals from a parsed invoice that can be imported
   */
  async getImportableChemicalsFromInvoice(
    businessId: string,
    invoiceId: string
  ): Promise<InvoiceChemicalForImport[]> {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        businessId,
        status: { in: ['PARSED', 'REVIEWED'] }
      },
      include: { lineItems: true }
    });

    if (!invoice) {
      throw new Error('Invoice not found or not parsed');
    }

    const result: InvoiceChemicalForImport[] = [];

    for (const item of invoice.lineItems || []) {
      if (item.productType !== 'CHEMICAL') continue;

      // Check if there's already a matched chemical
      let matchedChemical = null;
      if (item.matchedProductId && item.matchedProductType === 'CHEMICAL') {
        matchedChemical = await prisma.chemical.findUnique({
          where: { id: item.matchedProductId }
        });
      }

      // Try to find by name if not matched
      if (!matchedChemical) {
        matchedChemical = await prisma.chemical.findFirst({
          where: {
            businessId,
            name: { equals: item.productName, mode: 'insensitive' }
          }
        });
      }

      result.push({
        lineItemId: item.id,
        productName: item.productName,
        pricePerUnit: Number(item.pricePerUnit),
        unit: item.unit,
        ratePerAcre: item.ratePerAcre ? Number(item.ratePerAcre) : undefined,
        rateUnit: item.rateUnit || undefined,
        matchedChemicalId: matchedChemical?.id,
        matchedChemicalName: matchedChemical?.name
      });
    }

    return result;
  }

  /**
   * Import chemicals from an invoice to one or more templates
   */
  async importFromInvoice(
    businessId: string,
    request: ImportInvoiceToTemplateRequest
  ): Promise<ImportInvoiceToTemplateResponse> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Fetch the invoice line items
    const lineItems = await prisma.invoiceLineItem.findMany({
      where: {
        id: { in: request.lineItemIds },
        invoice: { businessId },
        productType: 'CHEMICAL'
      }
    });

    // Verify templates belong to business
    const templates = await prisma.chemicalPlanTemplate.findMany({
      where: {
        id: { in: request.templateIds },
        businessId
      },
      include: { items: true }
    });

    if (templates.length === 0) {
      throw new Error('No valid templates found');
    }

    for (const lineItem of lineItems) {
      // Find or create the chemical in the business
      const chemical = await this.findOrCreateChemicalFromLineItem(businessId, lineItem);

      if (!chemical) {
        errors.push(`Could not create chemical for: ${lineItem.productName}`);
        skipped++;
        continue;
      }

      // Add to each selected template
      for (const template of templates) {
        // Check if chemical already exists in template
        const existing = template.items.find(i => i.chemicalId === chemical.id);
        if (existing) {
          skipped++;
          continue;
        }

        // Determine rate per acre
        const ratePerAcre = lineItem.ratePerAcre
          ? Number(lineItem.ratePerAcre)
          : request.defaultRatePerAcre || 1;

        // Get max order
        const maxOrder = template.items.length > 0
          ? Math.max(...template.items.map(i => i.order)) + 1
          : 0;

        await prisma.chemicalPlanTemplateItem.create({
          data: {
            templateId: template.id,
            chemicalId: chemical.id,
            ratePerAcre: ratePerAcre,
            rateUnit: lineItem.rateUnit || undefined,
            notes: `Imported from invoice`,
            order: maxOrder
          }
        });

        // Update template items array for subsequent iterations (to detect duplicates in same batch)
        template.items.push({
          id: '',
          templateId: template.id,
          chemicalId: chemical.id,
          ratePerAcre: ratePerAcre as any,
          notes: null,
          order: maxOrder,
          createdAt: new Date()
        } as any);

        imported++;
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Helper: Find or create chemical from invoice line item
   */
  private async findOrCreateChemicalFromLineItem(
    businessId: string,
    lineItem: any
  ): Promise<{ id: string; name: string } | null> {
    // Try to find existing chemical
    let chemical = await prisma.chemical.findFirst({
      where: {
        businessId,
        name: { equals: lineItem.productName, mode: 'insensitive' },
        unit: lineItem.unit
      }
    });

    if (chemical) {
      return chemical;
    }

    // Try to find by name only (different unit)
    chemical = await prisma.chemical.findFirst({
      where: {
        businessId,
        name: { equals: lineItem.productName, mode: 'insensitive' }
      }
    });

    if (chemical) {
      return chemical;
    }

    // Create new chemical
    chemical = await prisma.chemical.create({
      data: {
        businessId,
        name: lineItem.productName,
        pricePerUnit: lineItem.pricePerUnit || 0,
        unit: lineItem.unit === 'GAL' || lineItem.unit === 'LB' ? lineItem.unit : 'GAL',
        category: 'HERBICIDE', // Default, user can change later
        needsPricing: !lineItem.pricePerUnit || lineItem.pricePerUnit === 0
      }
    });

    return chemical;
  }

  // ===== Helper Methods =====

  private mapTemplate(t: any): ChemicalPlanTemplate {
    return {
      id: t.id,
      businessId: t.businessId,
      name: t.name,
      description: t.description || undefined,
      commodityType: t.commodityType as CommodityType | undefined,
      passType: t.passType as PassType | undefined,
      year: t.year || undefined,
      isActive: t.isActive,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      items: t.items?.map((i: any) => this.mapItem(i)),
      applications: t.applications?.map((a: any) => ({
        id: a.id,
        templateId: a.templateId,
        farmId: a.farmId,
        appliedAt: a.appliedAt,
        appliedById: a.appliedById || undefined,
        hasOverrides: a.hasOverrides,
        farm: a.farm ? {
          id: a.farm.id,
          name: a.farm.name,
          acres: Number(a.farm.acres),
          commodityType: a.farm.commodityType as CommodityType,
          year: a.farm.year
        } : undefined,
        appliedBy: a.appliedBy
      })),
      usageCount: t._count?.applications || 0
    };
  }

  private mapItem(i: any): ChemicalPlanTemplateItem {
    return {
      id: i.id,
      templateId: i.templateId,
      chemicalId: i.chemicalId,
      ratePerAcre: Number(i.ratePerAcre),
      rateUnit: i.rateUnit || undefined,
      notes: i.notes || undefined,
      order: i.order,
      createdAt: i.createdAt,
      chemical: i.chemical ? {
        id: i.chemical.id,
        businessId: i.chemical.businessId,
        name: i.chemical.name,
        pricePerUnit: Number(i.chemical.pricePerUnit),
        unit: i.chemical.unit as UnitType,
        category: i.chemical.category as ChemicalCategory,
        isActive: i.chemical.isActive,
        needsPricing: i.chemical.needsPricing,
        createdAt: i.chemical.createdAt,
        updatedAt: i.chemical.updatedAt,
        defaultRatePerAcre: i.chemical.defaultRatePerAcre ? Number(i.chemical.defaultRatePerAcre) : undefined,
        rateUnit: i.chemical.rateUnit || undefined
      } : undefined
    };
  }
}
