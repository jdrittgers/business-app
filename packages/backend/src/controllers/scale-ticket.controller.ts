import { Request, Response } from 'express';
import { ScaleTicketService } from '../services/scale-ticket.service';

const scaleTicketService = new ScaleTicketService();

export class ScaleTicketController {
  // POST /api/businesses/:businessId/scale-tickets
  async uploadScaleTicket(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const userId = (req as any).user.userId;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const ticket = await scaleTicketService.create(businessId, userId, {
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });

      res.status(201).json(ticket);
    } catch (error) {
      console.error('Upload scale ticket error:', error);
      res.status(500).json({
        error: 'Failed to upload scale ticket',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/businesses/:businessId/scale-tickets
  async getScaleTickets(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const userId = (req as any).user.userId;

      const tickets = await scaleTicketService.getAll(businessId, userId);

      res.json(tickets);
    } catch (error) {
      console.error('Get scale tickets error:', error);
      res.status(500).json({
        error: 'Failed to fetch scale tickets',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // GET /api/businesses/:businessId/scale-tickets/:id
  async getScaleTicket(req: Request, res: Response) {
    try {
      const { businessId, id } = req.params;
      const userId = (req as any).user.userId;

      const ticket = await scaleTicketService.getById(id, businessId, userId);

      if (!ticket) {
        return res.status(404).json({ error: 'Scale ticket not found' });
      }

      res.json(ticket);
    } catch (error) {
      console.error('Get scale ticket error:', error);
      res.status(500).json({
        error: 'Failed to fetch scale ticket',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // POST /api/businesses/:businessId/scale-tickets/:id/assign-bin
  async assignBinAndProcess(req: Request, res: Response) {
    try {
      const { businessId, id } = req.params;
      const userId = (req as any).user.userId;
      const { binId, bushelsOverride } = req.body;

      if (!binId) {
        return res.status(400).json({ error: 'binId is required' });
      }

      const ticket = await scaleTicketService.assignBinAndProcess(id, businessId, userId, {
        binId,
        bushelsOverride: bushelsOverride ? parseFloat(bushelsOverride) : undefined
      });

      res.json(ticket);
    } catch (error) {
      console.error('Assign bin and process error:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }

      if (error instanceof Error && (
        error.message.includes('Cannot process') ||
        error.message.includes('mismatch') ||
        error.message.includes('Insufficient')
      )) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({
        error: 'Failed to assign bin and process ticket',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE /api/businesses/:businessId/scale-tickets/:id
  async deleteScaleTicket(req: Request, res: Response) {
    try {
      const { businessId, id } = req.params;
      const userId = (req as any).user.userId;

      await scaleTicketService.delete(id, businessId, userId);

      res.status(204).send();
    } catch (error) {
      console.error('Delete scale ticket error:', error);

      if (error instanceof Error && error.message === 'Scale ticket not found') {
        return res.status(404).json({ error: 'Scale ticket not found' });
      }

      if (error instanceof Error && error.message.includes('Cannot delete')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({
        error: 'Failed to delete scale ticket',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
