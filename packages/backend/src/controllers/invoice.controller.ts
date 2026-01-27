import { Request, Response } from 'express';
import { invoiceService } from '../services/invoice.service';
import { InvoiceProductType } from '@prisma/client';

export const uploadInvoice = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const userId = (req as any).user.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const invoice = await invoiceService.create(businessId, userId, req.file);

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Upload invoice error:', error);
    res.status(500).json({
      error: 'Failed to upload invoice',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getInvoices = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;

    const invoices = await invoiceService.getAll(businessId);

    res.json(invoices);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      error: 'Failed to fetch invoices',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getInvoice = async (req: Request, res: Response) => {
  try {
    const { businessId, id } = req.params;

    const invoice = await invoiceService.getById(id, businessId);

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);

    if (error instanceof Error && error.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.status(500).json({
      error: 'Failed to fetch invoice',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateLineItem = async (req: Request, res: Response) => {
  try {
    const { businessId, lineItemId } = req.params;
    const { productName, productType, quantity, unit, pricePerUnit, totalPrice, ratePerAcre, rateUnit } = req.body;

    const updatedLineItem = await invoiceService.updateLineItem(lineItemId, businessId, {
      productName,
      productType: productType as InvoiceProductType,
      quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
      unit,
      pricePerUnit: pricePerUnit !== undefined ? parseFloat(pricePerUnit) : undefined,
      totalPrice: totalPrice !== undefined ? parseFloat(totalPrice) : undefined,
      ratePerAcre: ratePerAcre !== undefined && ratePerAcre !== '' ? parseFloat(ratePerAcre) : undefined,
      rateUnit: rateUnit !== undefined && rateUnit !== '' ? rateUnit : undefined
    });

    res.json(updatedLineItem);
  } catch (error) {
    console.error('Update line item error:', error);

    if (error instanceof Error && error.message === 'Line item not found') {
      return res.status(404).json({ error: 'Line item not found' });
    }

    if (error instanceof Error && error.message.includes('Cannot edit line item')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to update line item',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const lockPrices = async (req: Request, res: Response) => {
  try {
    const { businessId, id } = req.params;
    const userId = (req as any).user.userId;

    const invoice = await invoiceService.lockPrices(id, businessId, userId);

    res.json(invoice);
  } catch (error) {
    console.error('Lock prices error:', error);

    if (error instanceof Error && error.message.includes('Can only lock prices')) {
      return res.status(400).json({ error: error.message });
    }

    if (error instanceof Error && error.message === 'No line items to lock') {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({
      error: 'Failed to lock prices',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteInvoice = async (req: Request, res: Response) => {
  try {
    const { businessId, id } = req.params;

    await invoiceService.delete(id, businessId);

    res.status(204).send();
  } catch (error) {
    console.error('Delete invoice error:', error);

    if (error instanceof Error && error.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.status(500).json({
      error: 'Failed to delete invoice',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Scan a fertilizer bill and apply costs to a specific farm
 */
export const scanFertilizerBill = async (req: Request, res: Response) => {
  try {
    const { businessId, farmId } = req.params;
    const userId = (req as any).user.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await invoiceService.parseAndApplyToFarm(
      businessId,
      farmId,
      userId,
      req.file
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Scan fertilizer bill error:', error);

    if (error instanceof Error && error.message === 'Farm not found') {
      return res.status(404).json({ error: 'Farm not found' });
    }

    res.status(500).json({
      error: 'Failed to scan fertilizer bill',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Scan a seed bill and add seed hybrids to the catalog
 */
export const scanSeedBillToCatalog = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const userId = (req as any).user.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await invoiceService.parseSeedBillToCatalog(
      businessId,
      userId,
      req.file
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Scan seed bill error:', error);
    res.status(500).json({
      error: 'Failed to scan seed bill',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Scan a fertilizer bill and add products to the catalog
 */
export const scanFertilizerBillToCatalog = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const userId = (req as any).user.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await invoiceService.parseFertilizerBillToCatalog(
      businessId,
      userId,
      req.file
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Scan fertilizer bill to catalog error:', error);
    res.status(500).json({
      error: 'Failed to scan fertilizer bill',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Scan a chemical bill and add products to the catalog
 */
export const scanChemicalBillToCatalog = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;
    const userId = (req as any).user.userId;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await invoiceService.parseChemicalBillToCatalog(
      businessId,
      userId,
      req.file
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Scan chemical bill to catalog error:', error);
    res.status(500).json({
      error: 'Failed to scan chemical bill',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
