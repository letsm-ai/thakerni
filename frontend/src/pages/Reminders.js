import React, { useState, useEffect } from 'react';
import { remindersApi } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Bell, Trash, Clock, Repeat } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Calendar } from '../components/ui/calendar';

const Reminders = () => {
  const { t, isRTL } = useLanguage();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    reminder_time: null,
    repeat: 'none'
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('09:00');

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const response = await remindersApi.getReminders();
      setReminders(response.data);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!newReminder.title.trim() || !selectedDate) return;

    const [hours, minutes] = selectedTime.split(':');
    const reminderTime = new Date(selectedDate);
    reminderTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    try {
      await remindersApi.createReminder({
        ...newReminder,
        reminder_time: reminderTime.toISOString()
      });
      setNewReminder({ title: '', description: '', reminder_time: null, repeat: 'none' });
      setSelectedDate(null);
      setSelectedTime('09:00');
      setShowModal(false);
      loadReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      await remindersApi.deleteReminder(reminderId);
      loadReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRepeatLabel = (repeat) => {
    switch (repeat) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return 'No repeat';
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto" data-testid="reminders-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">{t('reminders')}</h1>
          <p className="text-slate-500 mt-1">{isRTL ? 'لا تفوت أي لحظة مهمة' : 'Never miss an important moment'}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#002FA7] text-white rounded-md px-4 py-2.5 font-semibold hover:bg-[#001A7A] transition-colors"
          data-testid="add-reminder-button"
        >
          <Plus size={20} weight="bold" />
          {t('addReminder')}
        </button>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading reminders...</div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
            <Bell size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">{t('noReminders')}</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-[#002FA7] font-semibold hover:underline"
            >
              Create your first reminder
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {reminders.map((reminder) => (
              <motion.div
                key={reminder.reminder_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="group bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-all"
                data-testid={`reminder-${reminder.reminder_id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#002FA7]/10 flex items-center justify-center flex-shrink-0">
                    <Bell size={20} className="text-[#002FA7]" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900">{reminder.title}</h3>
                    {reminder.description && (
                      <p className="text-sm text-slate-500 mt-1">{reminder.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={14} />
                        {formatDateTime(reminder.reminder_time)}
                      </span>
                      {reminder.repeat !== 'none' && (
                        <span className="flex items-center gap-1 text-xs text-[#002FA7]">
                          <Repeat size={14} />
                          {getRepeatLabel(reminder.repeat)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteReminder(reminder.reminder_id)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-100 rounded transition-all"
                    data-testid={`delete-reminder-${reminder.reminder_id}`}
                  >
                    <Trash size={18} className="text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add Reminder Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900 font-heading">
              {t('createNewReminder')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateReminder} className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                {t('reminderTitle')} *
              </label>
              <input
                type="text"
                value={newReminder.title}
                onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none"
                placeholder={isRTL ? 'أدخل عنوان التذكير' : 'Enter reminder title'}
                required
                dir="auto"
                data-testid="reminder-title-input"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                {t('description')}
              </label>
              <textarea
                value={newReminder.description}
                onChange={(e) => setNewReminder({ ...newReminder, description: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none resize-none"
                rows={2}
                placeholder={isRTL ? 'أضف وصفاً (اختياري)' : 'Add description (optional)'}
                dir="auto"
                data-testid="reminder-description-input"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                {t('date')} *
              </label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="border border-slate-200 rounded-md"
                data-testid="reminder-date"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                {t('time')} *
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none"
                required
                data-testid="reminder-time-input"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                {t('repeat')}
              </label>
              <div className="flex gap-2">
                {['none', 'daily', 'weekly', 'monthly'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewReminder({ ...newReminder, repeat: r })}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      newReminder.repeat === r
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                    data-testid={`repeat-${r}`}
                  >
                    {r === 'none' ? t('once') : r === 'daily' ? t('daily') : r === 'weekly' ? t('weekly') : t('monthly')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 bg-white text-slate-900 border border-slate-200 rounded-md font-medium hover:bg-slate-50 transition-colors"
                data-testid="cancel-reminder-button"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={!selectedDate}
                className="flex-1 px-4 py-2.5 bg-[#002FA7] text-white rounded-md font-semibold hover:bg-[#001A7A] transition-colors disabled:opacity-50"
                data-testid="save-reminder-button"
              >
                {t('createReminder')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reminders;
