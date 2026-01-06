import { PrismaClient, UserRole } from '@prisma/client';
import { CalendarEvent, CreateCalendarEventRequest, UpdateCalendarEventRequest, GetCalendarEventsQuery } from '@business-app/shared';

const prisma = new PrismaClient();

export class CalendarService {
  async getBusinessEvents(
    businessId: string,
    userId: string,
    query: GetCalendarEventsQuery
  ): Promise<CalendarEvent[]> {
    // Check if user is a member of this business
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId
        }
      }
    });

    if (!membership) {
      throw new Error('Not authorized to view this business calendar');
    }

    // Build query filters
    const whereClause: any = {
      businessId
    };

    // Add date range filters if provided
    if (query.start || query.end) {
      whereClause.startTime = {};
      if (query.start) {
        whereClause.startTime.gte = new Date(query.start);
      }
      if (query.end) {
        whereClause.startTime.lte = new Date(query.end);
      }
    }

    // Apply visibility rules
    if (membership.role === UserRole.EMPLOYEE) {
      // Employees see their own events + owner's events
      const owners = await prisma.businessMember.findMany({
        where: {
          businessId,
          role: UserRole.OWNER
        },
        select: { userId: true }
      });

      const ownerIds = owners.map(o => o.userId);
      whereClause.userId = {
        in: [...ownerIds, userId]
      };
    } else if (query.userId) {
      // Owner requested specific user's events
      whereClause.userId = query.userId;
    }
    // Owners see all events if no userId filter

    const events = await prisma.calendarEvent.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    return events.map(event => ({
      id: event.id,
      businessId: event.businessId,
      userId: event.userId,
      title: event.title,
      description: event.description || undefined,
      startTime: event.startTime,
      endTime: event.endTime,
      allDay: event.allDay,
      color: event.color || undefined,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      user: event.user
    }));
  }

  async createEvent(
    businessId: string,
    userId: string,
    eventData: CreateCalendarEventRequest
  ): Promise<CalendarEvent> {
    // Verify user is a member of this business
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId
        }
      }
    });

    if (!membership) {
      throw new Error('Not authorized to create events in this business');
    }

    const event = await prisma.calendarEvent.create({
      data: {
        businessId,
        userId,
        title: eventData.title,
        description: eventData.description,
        startTime: new Date(eventData.startTime),
        endTime: new Date(eventData.endTime),
        allDay: eventData.allDay || false,
        color: eventData.color
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return {
      id: event.id,
      businessId: event.businessId,
      userId: event.userId,
      title: event.title,
      description: event.description || undefined,
      startTime: event.startTime,
      endTime: event.endTime,
      allDay: event.allDay,
      color: event.color || undefined,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      user: event.user
    };
  }

  async updateEvent(
    eventId: string,
    userId: string,
    eventData: UpdateCalendarEventRequest
  ): Promise<CalendarEvent> {
    // Check if event exists and user owns it
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id: eventId }
    });

    if (!existingEvent) {
      throw new Error('Event not found');
    }

    if (existingEvent.userId !== userId) {
      throw new Error('Not authorized to update this event');
    }

    const updateData: any = {};
    if (eventData.title !== undefined) updateData.title = eventData.title;
    if (eventData.description !== undefined) updateData.description = eventData.description;
    if (eventData.startTime !== undefined) updateData.startTime = new Date(eventData.startTime);
    if (eventData.endTime !== undefined) updateData.endTime = new Date(eventData.endTime);
    if (eventData.allDay !== undefined) updateData.allDay = eventData.allDay;
    if (eventData.color !== undefined) updateData.color = eventData.color;

    const event = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return {
      id: event.id,
      businessId: event.businessId,
      userId: event.userId,
      title: event.title,
      description: event.description || undefined,
      startTime: event.startTime,
      endTime: event.endTime,
      allDay: event.allDay,
      color: event.color || undefined,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      user: event.user
    };
  }

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    // Check if event exists and user owns it
    const existingEvent = await prisma.calendarEvent.findUnique({
      where: { id: eventId }
    });

    if (!existingEvent) {
      throw new Error('Event not found');
    }

    if (existingEvent.userId !== userId) {
      throw new Error('Not authorized to delete this event');
    }

    await prisma.calendarEvent.delete({
      where: { id: eventId }
    });
  }

  async getEvent(eventId: string, userId: string): Promise<CalendarEvent> {
    const event = await prisma.calendarEvent.findUnique({
      where: { id: eventId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    // Verify user has access to this business
    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId: event.businessId
        }
      }
    });

    if (!membership) {
      throw new Error('Not authorized to view this event');
    }

    // Apply visibility rules
    if (membership.role === UserRole.EMPLOYEE && event.userId !== userId) {
      // Employee can only see their own events or owner's events
      const isOwnerEvent = await prisma.businessMember.findFirst({
        where: {
          userId: event.userId,
          businessId: event.businessId,
          role: UserRole.OWNER
        }
      });

      if (!isOwnerEvent) {
        throw new Error('Not authorized to view this event');
      }
    }

    return {
      id: event.id,
      businessId: event.businessId,
      userId: event.userId,
      title: event.title,
      description: event.description || undefined,
      startTime: event.startTime,
      endTime: event.endTime,
      allDay: event.allDay,
      color: event.color || undefined,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      user: event.user
    };
  }
}
