export interface CalendarEvent {
  id: string;
  businessId: string;
  userId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  startTime: string | Date;
  endTime: string | Date;
  allDay?: boolean;
  color?: string;
}

export interface UpdateCalendarEventRequest {
  title?: string;
  description?: string;
  startTime?: string | Date;
  endTime?: string | Date;
  allDay?: boolean;
  color?: string;
}

export interface GetCalendarEventsQuery {
  start?: string;
  end?: string;
  userId?: string;
}
