import { Router } from 'express';
import { ScaleTicketController } from '../controllers/scale-ticket.controller';
import { authenticate } from '../middleware/auth';
import { requireBusinessAccess } from '../middleware/business-access';
import { upload } from '../config/upload';

const router = Router();
const scaleTicketController = new ScaleTicketController();

// Upload scale ticket
router.post(
  '/businesses/:businessId/scale-tickets',
  authenticate,
  requireBusinessAccess,
  upload.single('file'),
  (req, res) => scaleTicketController.uploadScaleTicket(req, res)
);

// Get all scale tickets for business
router.get(
  '/businesses/:businessId/scale-tickets',
  authenticate,
  requireBusinessAccess,
  (req, res) => scaleTicketController.getScaleTickets(req, res)
);

// Get single scale ticket
router.get(
  '/businesses/:businessId/scale-tickets/:id',
  authenticate,
  requireBusinessAccess,
  (req, res) => scaleTicketController.getScaleTicket(req, res)
);

// Assign bin and process ticket
router.post(
  '/businesses/:businessId/scale-tickets/:id/assign-bin',
  authenticate,
  requireBusinessAccess,
  (req, res) => scaleTicketController.assignBinAndProcess(req, res)
);

// Delete scale ticket
router.delete(
  '/businesses/:businessId/scale-tickets/:id',
  authenticate,
  requireBusinessAccess,
  (req, res) => scaleTicketController.deleteScaleTicket(req, res)
);

export default router;
