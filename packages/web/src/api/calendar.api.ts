import apiClient from './client';
import { CalendarEvent, CreateCalendarEventRequest, UpdateCalendarEventRequest, GetCalendarEventsQuery } from '@business-app/shared';

export const calendarApi = {
  getBusinessEvents: async (businessId: string, query?: GetCalendarEventsQuery): Promise<CalendarEvent[]> => {
    const response = await apiClient.get<CalendarEvent[]>(`/api/businesses/${businessId}/events`, {
      params: query
    });
    return response.data;
  },

  createEvent: async (businessId: string, eventData: CreateCalendarEventRequest): Promise<CalendarEvent> => {
    const response = await apiClient.post<CalendarEvent>(`/api/businesses/${businessId}/events`, eventData);
    return response.data;
  },

  getEvent: async (eventId: string): Promise<CalendarEvent> => {
    const response = await apiClient.get<CalendarEvent>(`/api/events/${eventId}`);
    return response.data;
  },

  updateEvent: async (eventId: string, eventData: UpdateCalendarEventRequest): Promise<CalendarEvent> => {
    const response = await apiClient.patch<CalendarEvent>(`/api/events/${eventId}`, eventData);
    return response.data;
  },

  deleteEvent: async (eventId: string): Promise<void> => {
    await apiClient.delete(`/api/events/${eventId}`);
  }
};
