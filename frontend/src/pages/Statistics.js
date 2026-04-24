import React, { useState, useEffect } from 'react';
import { statsApi } from '../lib/api';
import { 
  ChartBar, 
  CheckCircle, 
  Clock, 
  Lightning, 
  TrendUp,
  CalendarCheck,
  ChatCircle,
  Bell,
  Fire
} from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-bold text-slate-900 mt-2 font-heading">{value}</p>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
        color === 'blue' ? 'bg-[#002FA7]/10' :
        color === 'green' ? 'bg-green-100' :
        color === 'yellow' ? 'bg-yellow-100' :
        color === 'red' ? 'bg-red-100' :
        'bg-slate-100'
      }`}>
        <Icon size={24} className={
          color === 'blue' ? 'text-[#002FA7]' :
          color === 'green' ? 'text-green-600' :
          color === 'yellow' ? 'text-yellow-600' :
          color === 'red' ? 'text-red-600' :
          'text-slate-600'
        } weight="duotone" />
      </div>
    </div>
  </motion.div>
);

const ActivityBar = ({ day, tasks_completed, messages_sent, maxValue }) => {
  const taskHeight = maxValue > 0 ? (tasks_completed / maxValue) * 100 : 0;
  const messageHeight = maxValue > 0 ? (messages_sent / maxValue) * 100 : 0;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-32 w-8 bg-slate-100 rounded-lg overflow-hidden flex flex-col-reverse relative">
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${taskHeight}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-[#002FA7] w-full absolute bottom-0"
        />
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${messageHeight}%` }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-green-500 w-full absolute bottom-0 opacity-50"
          style={{ bottom: `${taskHeight}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 font-medium">{day}</span>
    </div>
  );
};

const Statistics = () => {
  const { t, isRTL } = useLanguage();
  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState([]);
  const [streaks, setStreaks] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [overviewRes, activityRes, streaksRes] = await Promise.all([
        statsApi.getOverview(),
        statsApi.getActivity(7),
        statsApi.getStreaks()
      ]);
      setOverview(overviewRes.data);
      setActivity(activityRes.data.daily_activity);
      setStreaks(streaksRes.data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#002FA7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading statistics...</p>
        </div>
      </div>
    );
  }

  const maxActivityValue = Math.max(
    ...activity.map(d => Math.max(d.tasks_completed, d.messages_sent)),
    1
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto" data-testid="statistics-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">{t('statisticsTitle')}</h1>
        <p className="text-slate-500 mt-1">{t('trackProductivity')}</p>
      </div>

      {/* Streak Banner */}
      {streaks && streaks.current_streak > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Fire size={32} weight="fill" />
            </div>
            <div>
              <p className="text-white/80 font-medium">Current Streak</p>
              <p className="text-4xl font-bold font-heading">{streaks.current_streak} days</p>
              <p className="text-white/60 text-sm mt-1">Best: {streaks.max_streak} days</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={CheckCircle}
          title={t('tasksCompleted')}
          value={overview?.tasks?.completed || 0}
          subtitle={`${overview?.tasks?.completion_rate || 0}% ${t('completionRate')}`}
          color="green"
          delay={0}
        />
        <StatCard
          icon={Clock}
          title={t('pendingTasks')}
          value={overview?.tasks?.pending || 0}
          subtitle={`${overview?.tasks?.high_priority_pending || 0} ${t('highPriority')}`}
          color="yellow"
          delay={0.1}
        />
        <StatCard
          icon={ChatCircle}
          title={t('aiConversations')}
          value={overview?.conversations?.total || 0}
          subtitle={`${overview?.conversations?.messages_this_week || 0} ${t('messagesThisWeek')}`}
          color="blue"
          delay={0.2}
        />
        <StatCard
          icon={Bell}
          title={t('activeReminders')}
          value={overview?.reminders?.active || 0}
          subtitle={`${overview?.reminders?.total || 0} ${t('totalSet')}`}
          color="red"
          delay={0.3}
        />
      </div>

      {/* Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 font-heading">{t('weeklyActivity')}</h2>
              <p className="text-sm text-slate-500">Tasks completed and messages sent</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#002FA7] rounded"></div>
                <span className="text-slate-600">Tasks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded opacity-50"></div>
                <span className="text-slate-600">Messages</span>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 h-48">
            {activity.map((day, index) => (
              <ActivityBar
                key={day.date}
                day={day.day_name}
                tasks_completed={day.tasks_completed}
                messages_sent={day.messages_sent}
                maxValue={maxActivityValue}
              />
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 font-heading mb-4">Quick Stats</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendUp size={20} className="text-green-600" />
                <span className="text-sm text-slate-700">Completed This Week</span>
              </div>
              <span className="font-bold text-slate-900">{overview?.tasks?.completed_this_week || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CalendarCheck size={20} className="text-[#002FA7]" />
                <span className="text-sm text-slate-700">Upcoming Events</span>
              </div>
              <span className="font-bold text-slate-900">{overview?.calendar?.upcoming_events || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ChatCircle size={20} className="text-purple-600" />
                <span className="text-sm text-slate-700">Total Messages</span>
              </div>
              <span className="font-bold text-slate-900">{overview?.conversations?.total_messages || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Lightning size={20} className="text-yellow-600" />
                <span className="text-sm text-slate-700">Productivity Score</span>
              </div>
              <span className="font-bold text-slate-900">{overview?.tasks?.completion_rate || 0}%</span>
            </div>
          </div>

          {/* Motivational Message */}
          <div className="mt-6 p-4 bg-[#002FA7]/5 rounded-lg border border-[#002FA7]/10">
            <p className="text-sm text-[#002FA7] font-medium">
              {overview?.tasks?.completion_rate >= 80 
                ? "🎉 Amazing! You're crushing it!" 
                : overview?.tasks?.completion_rate >= 50 
                ? "💪 Great progress! Keep going!" 
                : "🚀 Every task counts. You got this!"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
