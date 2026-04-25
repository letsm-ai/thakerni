import React, { useState, useEffect, useCallback } from 'react';
import { calendarApi, googleCalendarApi } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Trash, Clock, CalendarBlank, GoogleLogo, ArrowsClockwise, Link, LinkBreak, CloudArrowDown, CloudArrowUp, Globe } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Calendar } from '../components/ui/calendar';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

const CalendarPage = () => {
  const { t, isRTL } = useLanguage();
  const [events, setEvents] = useState([]);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    start_time: '09:00',
    end_time: '10:00',
    all_day: false,
    sync_to_google: false
  });

  const loadEvents = useCallback(async () => {
    try {
      const response = await calendarApi.getEvents();
      setEvents(response.data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkGoogleStatus = useCallback(async () => {
    try {
      const res = await googleCalendarApi.getStatus();
      setGoogleConnected(res.data.connected);
      if (res.data.connected) {
        loadGoogleEvents();
      }
    } catch { /* not connected */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGoogleEvents = async () => {
    try {
      const res = await googleCalendarApi.getEvents();
      setGoogleEvents(res.data.events || []);
    } catch (error) {
      console.error('Error loading Google events:', error);
      if (error.response?.status === 401) {
        setGoogleConnected(false);
        toast.error('Google Calendar session expired. Please reconnect.');
      }
    }
  };

  useEffect(() => {
    loadEvents();
    checkGoogleStatus();
  }, [loadEvents, checkGoogleStatus]);

  // Handle OAuth callback params
  useEffect(() => {
    if (searchParams.get('google_connected') === 'true') {
      toast.success('Google Calendar connected successfully!');
      setGoogleConnected(true);
      loadGoogleEvents();
      setSearchParams({});
    } else if (searchParams.get('google_error')) {
      toast.error(`Google Calendar: ${searchParams.get('google_error')}`);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnectGoogle = async () => {
    try {
      const res = await googleCalendarApi.connect();
      if (res.data.authorization_url) {
        window.location.href = res.data.authorization_url;
      }
    } catch (error) {
      toast.error('Failed to start Google Calendar connection');
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await googleCalendarApi.disconnect();
      setGoogleConnected(false);
      setGoogleEvents([]);
      toast.success('Google Calendar disconnected');
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  const handleSyncPull = async () => {
    setSyncing(true);
    try {
      const res = await googleCalendarApi.syncPull();
      toast.success(res.data.message);
      loadEvents();
      loadGoogleEvents();
    } catch (error) {
      toast.error('Sync failed: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncPush = async () => {
    setSyncing(true);
    try {
      const res = await googleCalendarApi.syncPush();
      toast.success(res.data.message);
      loadEvents();
    } catch (error) {
      toast.error('Sync failed: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setSyncing(false);
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
      // Create locally
      await calendarApi.createEvent({
        title: newEvent.title,
        description: newEvent.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        all_day: newEvent.all_day
      });

      // Also create in Google Calendar if connected and user opted in
      if (googleConnected && newEvent.sync_to_google) {
        try {
          await googleCalendarApi.createEvent({
            title: newEvent.title,
            description: newEvent.description,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            all_day: newEvent.all_day
          });
          toast.success('Event created in both Letsm AI and Google Calendar');
        } catch {
          toast.success('Event created locally. Google sync failed.');
        }
      } else {
        toast.success('Event created');
      }

      setNewEvent({ title: '', description: '', start_time: '09:00', end_time: '10:00', all_day: false, sync_to_google: false });
      setShowModal(false);
      loadEvents();
      if (googleConnected) loadGoogleEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
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
    const localFiltered = events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === date.toDateString();
    });
    const googleFiltered = googleEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === date.toDateString();
    }).filter(ge => !localFiltered.some(le => le.google_event_id === ge.google_event_id));
    return [...localFiltered, ...googleFiltered];
  };

  const allEventDates = [
    ...events.map(e => new Date(e.start_time)),
    ...googleEvents.map(e => new Date(e.start_time))
  ];

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <div className="p-6 md:p-8" data-testid="calendar-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">{t('calendar')}</h1>
          <p className="text-slate-500 mt-1">{isRTL ? 'أدر جدولك وأحداثك' : 'Manage your schedule and events'}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#002FA7] text-white rounded-md px-4 py-2.5 font-semibold hover:bg-[#001A7A] transition-colors"
          data-testid="add-event-button"
        >
          <Plus size={20} weight="bold" />
          {t('addEvent')}
        </button>
      </div>

      {/* Google Calendar Connection Bar */}
      <div className={`mb-6 rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3 ${
        googleConnected ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
      }`} data-testid="google-calendar-bar">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${googleConnected ? 'bg-green-100' : 'bg-white border border-slate-200'}`}>
            <GoogleLogo size={22} weight="bold" className={googleConnected ? 'text-green-600' : 'text-slate-400'} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Google Calendar</p>
            <p className="text-xs text-slate-500">{googleConnected ? 'Connected — bidirectional sync enabled' : 'Connect to sync events with Google Calendar'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {googleConnected ? (
            <>
              <button onClick={handleSyncPull} disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                data-testid="sync-pull-btn">
                <CloudArrowDown size={16} /> {syncing ? 'Syncing...' : 'Pull from Google'}
              </button>
              <button onClick={handleSyncPush} disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                data-testid="sync-push-btn">
                <CloudArrowUp size={16} /> {syncing ? 'Syncing...' : 'Push to Google'}
              </button>
              <button onClick={handleDisconnectGoogle}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                data-testid="disconnect-google-btn">
                <LinkBreak size={16} /> Disconnect
              </button>
            </>
          ) : (
            <button onClick={handleConnectGoogle}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
              data-testid="connect-google-btn">
              <Link size={16} weight="bold" /> Connect Google Calendar
            </button>
          )}
        </div>
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
              hasEvent: allEventDates
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
                    key={event.event_id || event.google_event_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="group bg-slate-50 border border-slate-100 rounded-lg p-3 hover:border-slate-200 transition-all"
                    data-testid={`event-${event.event_id || event.google_event_id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-900 text-sm">{event.title}</h3>
                          {event.source === 'google' && (
                            <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Globe size={10} /> Google
                            </span>
                          )}
                          {event.google_event_id && event.source !== 'google' && (
                            <span className="text-[10px] font-medium bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <ArrowsClockwise size={10} /> Synced
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                          <Clock size={12} />
                          {event.all_day ? 'All day' : `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`}
                        </div>
                      </div>
                      {event.event_id && (
                        <button
                          onClick={() => handleDeleteEvent(event.event_id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
                          data-testid={`delete-event-${event.event_id}`}
                        >
                          <Trash size={14} className="text-slate-400 hover:text-red-500" />
                        </button>
                      )}
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
            <DialogDescription className="text-sm text-slate-500">
              Add a new event to your calendar
            </DialogDescription>
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

            {googleConnected && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <input
                  type="checkbox"
                  id="sync_google"
                  checked={newEvent.sync_to_google}
                  onChange={(e) => setNewEvent({ ...newEvent, sync_to_google: e.target.checked })}
                  className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  data-testid="sync-google-checkbox"
                />
                <label htmlFor="sync_google" className="text-sm text-blue-700 flex items-center gap-1.5">
                  <GoogleLogo size={14} weight="bold" /> Also create in Google Calendar
                </label>
              </div>
            )}

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
