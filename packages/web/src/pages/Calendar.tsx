import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAuthStore } from '../store/authStore';
import { useCalendarStore } from '../store/calendarStore';
import { CalendarEvent } from '@business-app/shared';
import EventModal from '../components/calendar/EventModal';

export default function Calendar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { events, loadEvents, createEvent, updateEvent, deleteEvent, selectedBusinessId, setSelectedBusinessId, error } = useCalendarStore();
  const navigate = useNavigate();
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (user && user.businessMemberships.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(user.businessMemberships[0].businessId);
    }
  }, [user, selectedBusinessId, setSelectedBusinessId]);

  useEffect(() => {
    if (selectedBusinessId) {
      loadEvents(selectedBusinessId);
    }
  }, [selectedBusinessId, loadEvents]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDateClick = (info: any) => {
    setSelectedDate(info.date);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (info: any) => {
    const event = events.find(e => e.id === info.event.id);
    if (event) {
      setSelectedEvent(event);
      setSelectedDate(null);
      setShowEventModal(true);
    }
  };

  const handleSaveEvent = async (eventData: any) => {
    if (!selectedBusinessId) return;

    if (selectedEvent) {
      // Update existing event
      await updateEvent(selectedEvent.id, eventData);
    } else {
      // Create new event
      await createEvent(selectedBusinessId, eventData);
    }
  };

  const handleDeleteEvent = async () => {
    if (selectedEvent) {
      await deleteEvent(selectedEvent.id);
    }
  };

  const formattedEvents = events.map((event: CalendarEvent) => ({
    id: event.id,
    title: event.title,
    start: event.startTime,
    end: event.endTime,
    allDay: event.allDay,
    backgroundColor: event.color || '#3b82f6',
    extendedProps: {
      description: event.description,
      user: event.user
    }
  }));

  if (!user) {
    return <div>Loading...</div>;
  }

  const selectedBusiness = user.businessMemberships.find(
    m => m.businessId === selectedBusinessId
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">Business App</h1>
              <div className="flex space-x-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/calendar')}
                  className="text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Calendar
                </button>
                <button
                  onClick={() => navigate('/tasks')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Tasks
                </button>
                {user.businessMemberships.some(m => m.business.name === 'Rittgers Farm') && (
                  <button
                    onClick={() => navigate('/grain-contracts')}
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Grain Contracts
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>

              {/* Business Selector */}
              <select
                value={selectedBusinessId || ''}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {user.businessMemberships.map((membership) => (
                  <option key={membership.businessId} value={membership.businessId}>
                    {membership.business.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedBusiness && (
              <div className="mb-4 text-sm text-gray-600">
                Viewing: <span className="font-medium">{selectedBusiness.business.name}</span>
                {' '} | Role: <span className="font-medium">{selectedBusiness.role}</span>
                {selectedBusiness.role === 'EMPLOYEE' && (
                  <span className="ml-2 text-gray-500">(You can see your events and owner's events)</span>
                )}
              </div>
            )}

            {/* FullCalendar */}
            <div className="calendar-container">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={formattedEvents}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                editable={false}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                height="auto"
              />
            </div>
          </div>
        </div>
      </main>

      {/* Event Modal */}
      <EventModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
          setSelectedDate(null);
        }}
        onSave={handleSaveEvent}
        onDelete={selectedEvent ? handleDeleteEvent : undefined}
        event={selectedEvent}
        selectedDate={selectedDate}
      />
    </div>
  );
}
