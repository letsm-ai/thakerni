import { useState, useEffect, useCallback, useMemo } from 'react';
import { teamApi } from '../../lib/api';
import { CaretLeft, CaretRight, CheckSquare, Bell, X } from '@phosphor-icons/react';

// Deterministic colour from a string (member id/email) — stable across renders
const PALETTE = [
  { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500', ring: 'ring-violet-300' },
  { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500', ring: 'ring-sky-300' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'ring-emerald-300' },
  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', ring: 'ring-amber-300' },
  { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', ring: 'ring-rose-300' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500', ring: 'ring-indigo-300' },
  { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500', ring: 'ring-teal-300' },
];

function memberColor(id) {
  if (!id) return PALETTE[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_AR = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

export default function TeamCalendarTab({ t, isRTL }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [counts, setCounts] = useState({ tasks: 0, reminders: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [memberFilter, setMemberFilter] = useState('all');
  const [selectedDay, setSelectedDay] = useState(null);

  const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const res = await teamApi.getCalendar({
        from_date: from.toISOString(),
        to_date: to.toISOString(),
      });
      setEvents(res.data.events || []);
      setMembers(res.data.members || []);
      setCounts(res.data.counts || { tasks: 0, reminders: 0, total: 0 });
    } catch (e) {
      console.error('Failed to load team calendar:', e);
    } finally {
      setLoading(false);
    }
  }, [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const filteredEvents = useMemo(() => {
    if (memberFilter === 'all') return events;
    return events.filter(e => e.owner?.user_id === memberFilter);
  }, [events, memberFilter]);

  const eventsByDay = useMemo(() => {
    const m = new Map();
    for (const ev of filteredEvents) {
      if (!ev.date) continue;
      const d = new Date(ev.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(ev);
    }
    return m;
  }, [filteredEvents]);

  const cells = useMemo(() => monthMatrix(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const monthLabel = isRTL ? MONTH_NAMES_AR[cursor.getMonth()] : MONTH_NAMES_EN[cursor.getMonth()];
  const weekdays = isRTL ? WEEKDAYS_AR : WEEKDAYS_EN;

  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1));

  const isToday = (d) => d && d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  const cellKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const selectedEvents = selectedDay ? (eventsByDay.get(cellKey(selectedDay)) || []) : [];

  return (
    <div data-testid="team-calendar-tab" className="space-y-4">
      {/* Header / controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="p-2 hover:bg-slate-100 rounded-lg" data-testid="cal-prev-month" aria-label="Previous month">
              <CaretLeft size={18} />
            </button>
            <h3 className="text-lg font-semibold text-slate-900 min-w-[160px] text-center" data-testid="cal-month-label">
              {monthLabel} {cursor.getFullYear()}
            </h3>
            <button onClick={goNext} className="p-2 hover:bg-slate-100 rounded-lg" data-testid="cal-next-month" aria-label="Next month">
              <CaretRight size={18} />
            </button>
            <button onClick={goToday} className="ml-2 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200" data-testid="cal-today-button">
              {isRTL ? 'اليوم' : 'Today'}
            </button>
          </div>

          {/* Member filter */}
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
            data-testid="cal-member-filter"
          >
            <option value="all">{isRTL ? 'كل الأعضاء' : 'All members'}</option>
            {members.map(m => (
              <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>
            ))}
          </select>
        </div>

        {/* Legend + counts */}
        <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 flex-wrap" data-testid="cal-legend">
            {members.map(m => {
              const c = memberColor(m.user_id);
              return (
                <span key={m.user_id} className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 rounded-full px-2 py-1">
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  {m.name || m.email}
                </span>
              );
            })}
            {members.length === 0 && (
              <span className="text-xs text-slate-400">{isRTL ? 'لا يوجد أعضاء بعد' : 'No team members yet'}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><CheckSquare size={14} /> {counts.tasks} {isRTL ? 'مهمة' : 'tasks'}</span>
            <span className="inline-flex items-center gap-1"><Bell size={14} /> {counts.reminders} {isRTL ? 'تذكير' : 'reminders'}</span>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {weekdays.map(w => (
            <div key={w} className="px-2 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">{w}</div>
          ))}
        </div>

        {/* Days */}
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">{isRTL ? 'جاري التحميل...' : 'Loading calendar...'}</div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((d, idx) => {
              if (!d) return <div key={`empty-${idx}`} className="min-h-[110px] border-t border-l border-slate-100 bg-slate-50/40" />;
              const dayEvents = eventsByDay.get(cellKey(d)) || [];
              const isCurrentDay = isToday(d);
              const isSelected = selectedDay && cellKey(selectedDay) === cellKey(d);
              return (
                <button
                  key={cellKey(d)}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className={`text-left min-h-[110px] border-t border-l border-slate-100 px-2 py-1.5 hover:bg-slate-50 transition-colors focus:outline-none ${isSelected ? 'bg-violet-50/60 ring-1 ring-violet-300' : ''}`}
                  data-testid={`cal-day-${cellKey(d)}`}
                >
                  <div className={`text-xs font-semibold mb-1 ${isCurrentDay ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-600 text-white' : 'text-slate-600'}`}>
                    {d.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => {
                      const c = memberColor(ev.owner?.user_id);
                      const Icon = ev.kind === 'task' ? CheckSquare : Bell;
                      return (
                        <div
                          key={ev.id}
                          className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded ${c.bg} ${c.text} truncate ${ev.completed ? 'opacity-50 line-through' : ''}`}
                          title={`${ev.title} — ${ev.owner?.name || ''}`}
                        >
                          <Icon size={10} weight="bold" />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-slate-400 px-1">
                        +{dayEvents.length - 3} {isRTL ? 'أكثر' : 'more'}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="bg-white border border-slate-200 rounded-xl p-4" data-testid="cal-day-detail">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900">
              {selectedDay.toLocaleDateString(isRTL ? 'ar' : 'en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h4>
            <button onClick={() => setSelectedDay(null)} className="p-1 text-slate-400 hover:text-slate-700" data-testid="cal-close-day-detail">
              <X size={16} />
            </button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">{isRTL ? 'لا توجد أحداث في هذا اليوم' : 'No events scheduled this day'}</p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map(ev => {
                const c = memberColor(ev.owner?.user_id);
                const Icon = ev.kind === 'task' ? CheckSquare : Bell;
                const time = new Date(ev.date).toLocaleTimeString(isRTL ? 'ar' : 'en', { hour: '2-digit', minute: '2-digit' });
                return (
                  <li key={ev.id} className={`flex items-start gap-3 p-3 rounded-lg ${c.bg}`}>
                    <Icon size={18} weight="bold" className={c.text} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${c.text} ${ev.completed ? 'line-through opacity-60' : ''}`}>{ev.title}</div>
                      {ev.description && <div className="text-xs text-slate-600 mt-0.5">{ev.description}</div>}
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span className="capitalize">{ev.kind === 'task' ? (isRTL ? 'مهمة' : 'Task') : (isRTL ? 'تذكير' : 'Reminder')}</span>
                        <span>·</span>
                        <span>{time}</span>
                        {ev.owner?.name && (<><span>·</span><span>{ev.owner.name}</span></>)}
                        {ev.priority && <span className="capitalize text-rose-600">· {ev.priority}</span>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
