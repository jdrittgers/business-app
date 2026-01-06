import { create } from 'zustand';
import { CalendarEvent, CreateCalendarEventRequest, UpdateCalendarEventRequest } from '@business-app/shared';
import { calendarApi } from '../api/calendar.api';
import { getSocket } from '../config/socket';

interface CalendarState {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  selectedBusinessId: string | null;
  loadEvents: (businessId: string, start?: string, end?: string) => Promise<void>;
  createEvent: (businessId: string, eventData: CreateCalendarEventRequest) => Promise<CalendarEvent>;
  updateEvent: (eventId: string, eventData: UpdateCalendarEventRequest) => Promise<CalendarEvent>;
  deleteEvent: (eventId: string) => Promise<void>;
  setSelectedBusinessId: (businessId: string | null) => void;
  clearError: () => void;
  initializeSocketListeners: () => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  isLoading: false,
  error: null,
  selectedBusinessId: null,

  loadEvents: async (businessId: string, start?: string, end?: string) => {
    try {
      set({ isLoading: true, error: null });
      const events = await calendarApi.getBusinessEvents(businessId, { start, end });
      set({ events, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Failed to load events',
        isLoading: false
      });
    }
  },

  createEvent: async (businessId: string, eventData: CreateCalendarEventRequest) => {
    try {
      set({ error: null });
      const newEvent = await calendarApi.createEvent(businessId, eventData);

      // Add to local state
      set(state => ({
        events: [...state.events, newEvent]
      }));

      return newEvent;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create event';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  updateEvent: async (eventId: string, eventData: UpdateCalendarEventRequest) => {
    try {
      set({ error: null });
      const updatedEvent = await calendarApi.updateEvent(eventId, eventData);

      // Update in local state
      set(state => ({
        events: state.events.map(event =>
          event.id === eventId ? updatedEvent : event
        )
      }));

      return updatedEvent;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update event';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  deleteEvent: async (eventId: string) => {
    try {
      set({ error: null });
      await calendarApi.deleteEvent(eventId);

      // Remove from local state
      set(state => ({
        events: state.events.filter(event => event.id !== eventId)
      }));
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete event';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  setSelectedBusinessId: (businessId: string | null) => {
    set({ selectedBusinessId: businessId });
  },

  clearError: () => set({ error: null }),

  initializeSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for calendar event created
    socket.on('calendar:event-created', (event: CalendarEvent) => {
      console.log('📅 Received event created:', event);
      set(state => {
        // Only add if not already in state (avoid duplicates from own actions)
        const exists = state.events.some(e => e.id === event.id);
        if (exists) return state;

        return {
          events: [...state.events, event]
        };
      });
    });

    // Listen for calendar event updated
    socket.on('calendar:event-updated', (event: CalendarEvent) => {
      console.log('📅 Received event updated:', event);
      set(state => ({
        events: state.events.map(e => e.id === event.id ? event : e)
      }));
    });

    // Listen for calendar event deleted
    socket.on('calendar:event-deleted', (data: { eventId: string }) => {
      console.log('📅 Received event deleted:', data);
      set(state => ({
        events: state.events.filter(e => e.id !== data.eventId)
      }));
    });

    // Listen for calendar refresh
    socket.on('calendar:refresh', () => {
      console.log('📅 Received calendar refresh request');
      const { selectedBusinessId } = get();
      if (selectedBusinessId) {
        get().loadEvents(selectedBusinessId);
      }
    });
  }
}));

// Initialize socket listeners when socket connects
if (typeof window !== 'undefined') {
  const socket = getSocket();
  if (socket) {
    useCalendarStore.getState().initializeSocketListeners();
  }
}
