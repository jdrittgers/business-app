import { Router } from 'express';
import { CalendarController } from '../controllers/calendar.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const calendarController = new CalendarController();

// All calendar routes require authentication
router.use(authenticate);

// Business calendar routes
router.get('/businesses/:businessId/events', (req, res) =>
  calendarController.getBusinessEvents(req, res)
);
router.post('/businesses/:businessId/events', (req, res) =>
  calendarController.createEvent(req, res)
);

// Individual event routes
router.get('/events/:eventId', (req, res) =>
  calendarController.getEvent(req, res)
);
router.patch('/events/:eventId', (req, res) =>
  calendarController.updateEvent(req, res)
);
router.delete('/events/:eventId', (req, res) =>
  calendarController.deleteEvent(req, res)
);

export default router;
