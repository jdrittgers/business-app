import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CalendarService } from '../services/calendar.service';
import { CreateCalendarEventRequest, UpdateCalendarEventRequest, GetCalendarEventsQuery } from '@business-app/shared';
import { CalendarEvents } from '../sockets/events.emitter';

const calendarService = new CalendarService();

export class CalendarController {
  async getBusinessEvents(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const query: GetCalendarEventsQuery = {
        start: req.query.start as string,
        end: req.query.end as string,
        userId: req.query.userId as string
      };

      const events = await calendarService.getBusinessEvents(businessId, req.user.userId, query);
      res.json(events);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      console.error('Get events error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { businessId } = req.params;
      const eventData: CreateCalendarEventRequest = req.body;

      if (!eventData.title || !eventData.startTime || !eventData.endTime) {
        res.status(400).json({ error: 'Title, start time, and end time are required' });
        return;
      }

      const event = await calendarService.createEvent(businessId, req.user.userId, eventData);

      // Broadcast event creation to all business members
      CalendarEvents.eventCreated(businessId, event);

      res.status(201).json(event);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { eventId } = req.params;
      const event = await calendarService.getEvent(eventId, req.user.userId);
      res.json(event);
    } catch (error) {
      if (error instanceof Error && error.message === 'Event not found') {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      console.error('Get event error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { eventId } = req.params;
      const eventData: UpdateCalendarEventRequest = req.body;

      const event = await calendarService.updateEvent(eventId, req.user.userId, eventData);

      // Broadcast event update to all business members
      CalendarEvents.eventUpdated(event.businessId, event);

      res.json(event);
    } catch (error) {
      if (error instanceof Error && error.message === 'Event not found') {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { eventId } = req.params;

      // Get event before deletion to broadcast businessId
      const event = await calendarService.getEvent(eventId, req.user.userId);
      await calendarService.deleteEvent(eventId, req.user.userId);

      // Broadcast event deletion to all business members
      CalendarEvents.eventDeleted(event.businessId, eventId);

      res.json({ message: 'Event deleted successfully' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Event not found') {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(403).json({ error: error.message });
        return;
      }
      console.error('Delete event error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
