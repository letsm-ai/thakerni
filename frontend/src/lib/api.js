import axios from 'axios';
import { tokenStore } from './tokenStore';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Chat API
export const chatApi = {
  sendMessage: (message, conversationId) =>
    api.post('/chat/message', { message, conversation_id: conversationId }),
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (conversationId) => api.get(`/chat/conversations/${conversationId}/messages`),
  deleteConversation: (conversationId) => api.delete(`/chat/conversations/${conversationId}`),
};

// Tasks API
export const tasksApi = {
  getTasks: () => api.get('/tasks'),
  createTask: (task) => api.post('/tasks', task),
  updateTask: (taskId, updates) => api.put(`/tasks/${taskId}`, updates),
  deleteTask: (taskId) => api.delete(`/tasks/${taskId}`),
};

// Reminders API
export const remindersApi = {
  getReminders: () => api.get('/reminders'),
  createReminder: (reminder) => api.post('/reminders', reminder),
  deleteReminder: (reminderId) => api.delete(`/reminders/${reminderId}`),
};

// Calendar API
export const calendarApi = {
  getEvents: () => api.get('/calendar/events'),
  createEvent: (event) => api.post('/calendar/events', event),
  deleteEvent: (eventId) => api.delete(`/calendar/events/${eventId}`),
};

// Google Calendar API
export const googleCalendarApi = {
  getStatus: () => api.get('/calendar/google/status'),
  connect: () => api.get('/calendar/google/connect'),
  disconnect: () => api.post('/calendar/google/disconnect'),
  getEvents: (params) => api.get('/calendar/google/events', { params }),
  createEvent: (event) => api.post('/calendar/google/events', event),
  deleteEvent: (eventId) => api.delete(`/calendar/google/events/${eventId}`),
  syncPush: () => api.post('/calendar/google/sync/push'),
  syncPull: () => api.post('/calendar/google/sync/pull'),
};

// WhatsApp API
export const whatsappApi = {
  getStatus: () => api.get('/whatsapp/status'),
  getQR: () => api.get('/whatsapp/qr'),
  connect: () => api.post('/whatsapp/connect'),
  disconnect: () => api.post('/whatsapp/disconnect'),
  getLinkStatus: () => api.get('/whatsapp/link-status'),
  generateLinkCode: () => api.post('/whatsapp/generate-link-code'),
  unlinkWhatsApp: () => api.post('/whatsapp/unlink'),
};

// Notifications API
export const notificationsApi = {
  getNotifications: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (notificationId) => api.delete(`/notifications/${notificationId}`),
  checkReminders: () => api.get('/notifications/check-reminders'),
};

// Statistics API
export const statsApi = {
  getOverview: () => api.get('/stats/overview'),
  getActivity: (days = 7) => api.get(`/stats/activity?days=${days}`),
  getStreaks: () => api.get('/stats/streaks'),
};

// User API
export const userApi = {
  updateProfile: (data) => api.put('/users/profile', data),
};

// Subscription API
export const subscriptionApi = {
  getPlans: () => api.get('/subscription/plans'),
  getStatus: () => api.get('/subscription/status'),
  createCheckout: (planId) => api.post('/subscription/checkout', {
    plan_id: planId,
    origin_url: window.location.origin
  }),
  checkPaymentStatus: (sessionId) => api.get(`/subscription/checkout/status/${sessionId}`),
};

// Thawani Pay (Omani payment gateway) API
export const thawaniApi = {
  getConfig: () => api.get('/payments/thawani/config'),
  createSession: (planId, billingCycle = 'monthly') =>
    api.post('/payments/thawani/create-session', { plan_id: planId, billing_cycle: billingCycle }),
  verifySession: (sessionId) => api.get(`/payments/thawani/verify/${sessionId}`),
};

// Export API
export const exportApi = {
  exportTasks: (format = 'json') => api.get('/export/tasks', { params: { format }, ...(format === 'csv' ? { responseType: 'blob' } : {}) }),
  exportReminders: (format = 'json') => api.get('/export/reminders', { params: { format }, ...(format === 'csv' ? { responseType: 'blob' } : {}) }),
  exportConversations: (format = 'json') => api.get('/export/conversations', { params: { format }, ...(format === 'csv' ? { responseType: 'blob' } : {}) }),
  exportAll: (format = 'json') => api.get('/export/all', { params: { format }, ...(format === 'csv' ? { responseType: 'blob' } : {}) }),
};

// Email API
export const emailApi = {
  getPreferences: () => api.get('/email/preferences'),
  updatePreferences: (prefs) => api.put('/email/preferences', prefs),
  sendDigest: () => api.post('/email/send-digest'),
  previewDigest: () => api.post('/email/preview-digest'),
  getSchedule: () => api.get('/email/digest-schedule'),
  getConfig: () => api.get('/email/config'),
  updateConfig: (data) => api.post('/email/config', data),
};

// Admin API
export const adminApi = {
  getOverview: () => api.get('/admin/overview'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  updateUserStatus: (id, suspended) => api.put(`/admin/users/${id}/status`, { suspended }),
  updateUserSubscription: (id, planId, billingCycle = 'monthly', durationDays = null) =>
    api.put(`/admin/users/${id}/subscription`, {
      plan_id: planId,
      billing_cycle: billingCycle,
      ...(durationDays != null ? { duration_days: durationDays } : {}),
    }),
  getSignupTrends: (days = 30) => api.get('/admin/analytics/signups', { params: { days } }),
  getActivityTrends: (days = 30) => api.get('/admin/analytics/activity', { params: { days } }),
  getCountryStats: () => api.get('/admin/analytics/countries'),
  getPayments: (params) => api.get('/admin/billing/payments', { params }),
  getRevenueChart: (days = 30) => api.get('/admin/billing/revenue', { params: { days } }),
  getSystemHealth: () => api.get('/admin/system/health'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  exportAuditLogs: (params) => api.get('/admin/audit-logs/export', { params, responseType: 'blob' }),
  // WhatsApp Cloud API admin
  waCloudStatus: () => api.get('/whatsapp/cloud/status'),
  waCloudGetSettings: () => api.get('/whatsapp/cloud/settings'),
  waCloudUpdateSettings: (payload) => api.put('/whatsapp/cloud/settings', payload),
  waCloudListMessages: (limit = 50) => api.get('/whatsapp/cloud/messages', { params: { limit } }),
  waCloudSendTest: (to, body) => api.post('/whatsapp/cloud/send', { to, body }),
  getRoles: () => api.get('/admin/roles'),
  getUsage: () => api.get('/admin/usage'),
};

// Team API
export const teamApi = {
  getMyTeam: () => api.get('/teams/my-team'),
  createTeam: (name) => api.post('/teams/create', { name }),
  updateTeam: (data) => api.put('/teams/update', data),
  invite: (email, role) => api.post('/teams/invite', { email, role }),
  getInvitations: () => api.get('/teams/invitations'),
  acceptInvite: (id) => api.post(`/teams/invitations/${id}/accept`),
  declineInvite: (id) => api.post(`/teams/invitations/${id}/decline`),
  removeMember: (id) => api.delete(`/teams/members/${id}`),
  changeMemberRole: (id, role) => api.put(`/teams/members/${id}/role`, { role }),
  leaveTeam: () => api.post('/teams/leave'),
  // Shared workspace
  getTasks: () => api.get('/teams/tasks'),
  createTask: (data) => api.post('/teams/tasks', data),
  updateTask: (id, data) => api.put(`/teams/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/teams/tasks/${id}`),
  getReminders: () => api.get('/teams/reminders'),
  createReminder: (data) => api.post('/teams/reminders', data),
  deleteReminder: (id) => api.delete(`/teams/reminders/${id}`),
  getMessages: (page) => api.get('/teams/messages', { params: { page } }),
  sendMessage: (content, conversation_id) => api.post('/teams/messages', { content, conversation_id }),
  getAnalytics: () => api.get('/teams/analytics'),
  getCalendar: (params) => api.get('/teams/calendar', { params }),
};

export default api;
