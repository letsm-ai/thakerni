import React, { useState, useEffect } from 'react';
import { calendarApi } from '../lib/api';
import { Plus, Trash, Clock, CalendarBlank } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Calendar } from '../components/ui/calendar';

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    all_day: false
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await calendarApi.getEvents();
      setEvents(response.data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;

    const startDateTime = new Date(selectedDate);
    const endDateTime = new Date(selectedDate);

    if (!newEvent.all_day) {
      const [startHours, startMinutes] = newEvent.start_time.split(':');
      const [endHours, endMinutes] = newEvent.end_time.split(':');
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
    } else {
      startDateTime.setHours(0, 0, 0, 0);
      endDateTime.setHours(23, 59, 59, 999);
    }

    try {
      await calendarApi.createEvent({
        title: newEvent.title,
        description: newEvent.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        all_day: newEvent.all_day
      });
      setNewEvent({ title: '', description: '', start_time: '09:00', end_time: '10:00', all_day: false });
      setShowModal(false);
      loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await calendarApi.deleteEvent(eventId);
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <div className="p-6 md:p-8" data-testid="calendar-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">Calendar</h1>
          <p className="text-slate-500 mt-1">Manage your schedule and events</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#002FA7] text-white rounded-md px-4 py-2.5 font-semibold hover:bg-[#001A7A] transition-colors"
          data-testid="add-event-button"
        >
          <Plus size={20} weight="bold" />
          Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="w-full"
            modifiers={{
              hasEvent: events.map(e => new Date(e.start_time))
            }}
            modifiersStyles={{
              hasEvent: { backgroundColor: '#002FA710', borderRadius: '50%' }
            }}
            data-testid="calendar-widget"
          />
        </div>

        {/* Events for Selected Date */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 font-heading mb-4">
            {formatDate(selectedDate)}
          </h2>

          <div className="space-y-3">
            {loading ? (
              <p className="text-slate-500 text-sm">Loading...</p>
            ) : selectedDateEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarBlank size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No events for this day</p>
              </div>
            ) : (
              <AnimatePresence>
                {selectedDateEvents.map((event) => (
                  <motion.div
                    key={event.event_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="group bg-slate-50 border border-slate-100 rounded-lg p-3 hover:border-slate-200 transition-all"
                    data-testid={`event-${event.event_id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-slate-900 text-sm">{event.title}</h3>
                        {event.description && (
                          <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                          <Clock size={12} />
                          {event.all_day ? 'All day' : `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(event.event_id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
                        data-testid={`delete-event-${event.event_id}`}
                      >
                        <Trash size={14} className="text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900 font-heading">
              Create New Event
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateEvent} className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                Event Title *
              </label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none"
                placeholder="Enter event title"
                required
                data-testid="event-title-input"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                Description
              </label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none resize-none"
                rows={2}
                placeholder="Add description (optional)"
                data-testid="event-description-input"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="all_day"
                checked={newEvent.all_day}
                onChange={(e) => setNewEvent({ ...newEvent, all_day: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-[#002FA7] focus:ring-[#002FA7]"
                data-testid="all-day-checkbox"
              />
              <label htmlFor="all_day" className="text-sm text-slate-700">All day event</label>
            </div>

            {!newEvent.all_day && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newEvent.start_time}
                    onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none"
                    data-testid="event-start-time"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newEvent.end_time}
                    onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none"
                    data-testid="event-end-time"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-white text-slate-900 border border-slate-200 rounded-md font-medium hover:bg-slate-50 transition-colors"
                data-testid="cancel-event-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-[#002FA7] text-white rounded-md font-semibold hover:bg-[#001A7A] transition-colors"
                data-testid="save-event-button"
              >
                Create Event
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
