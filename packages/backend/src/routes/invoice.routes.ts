import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth';
import { requireBusinessAccess } from '../middleware/business-access';
import { upload } from '../config/upload';

const router = Router();

// Upload invoice
router.post(
  '/businesses/:businessId/invoices',
  authenticate,
  requireBusinessAccess,
  upload.single('file'),
  invoiceController.uploadInvoice
);

// Get all invoices for business
router.get(
  '/businesses/:businessId/invoices',
  authenticate,
  requireBusinessAccess,
  invoiceController.getInvoices
);

// Get single invoice
router.get(
  '/businesses/:businessId/invoices/:id',
  authenticate,
  requireBusinessAccess,
  invoiceController.getInvoice
);

// Update line item
router.put(
  '/businesses/:businessId/invoices/line-items/:lineItemId',
  authenticate,
  requireBusinessAccess,
  invoiceController.updateLineItem
);

// Lock prices
router.post(
  '/businesses/:businessId/invoices/:id/lock-prices',
  authenticate,
  requireBusinessAccess,
  invoiceController.lockPrices
);

// Delete invoice
router.delete(
  '/businesses/:businessId/invoices/:id',
  authenticate,
  requireBusinessAccess,
  invoiceController.deleteInvoice
);

// Scan fertilizer bill for a specific farm
router.post(
  '/businesses/:businessId/farms/:farmId/scan-fertilizer-bill',
  authenticate,
  requireBusinessAccess,
  upload.single('file'),
  invoiceController.scanFertilizerBill
);

// Scan seed bill and add to catalog
router.post(
  '/businesses/:businessId/catalog/scan-seed-bill',
  authenticate,
  requireBusinessAccess,
  upload.single('file'),
  invoiceController.scanSeedBillToCatalog
);

// Scan fertilizer bill and add to catalog
router.post(
  '/businesses/:businessId/catalog/scan-fertilizer-bill',
  authenticate,
  requireBusinessAccess,
  upload.single('file'),
  invoiceController.scanFertilizerBillToCatalog
);

// Scan chemical bill and add to catalog
router.post(
  '/businesses/:businessId/catalog/scan-chemical-bill',
  authenticate,
  requireBusinessAccess,
  upload.single('file'),
  invoiceController.scanChemicalBillToCatalog
);

export default router;
