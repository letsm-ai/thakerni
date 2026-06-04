import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { GoogleLogo } from '@phosphor-icons/react';

export default function CalendarEventModal({
  open, onOpenChange, googleConnected, newEvent, onChange, onSubmit, onCancel,
}) {
  const setField = (patch) => onChange({ ...newEvent, ...patch });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900 font-heading">
            Create New Event
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Add a new event to your calendar
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
              Event Title *
            </label>
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => setField({ title: e.target.value })}
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
              onChange={(e) => setField({ description: e.target.value })}
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
              onChange={(e) => setField({ all_day: e.target.checked })}
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
                onChange={(e) => setField({ sync_to_google: e.target.checked })}
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
                  onChange={(e) => setField({ start_time: e.target.value })}
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
                  onChange={(e) => setField({ end_time: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none"
                  data-testid="event-end-time"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
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
  );
}
