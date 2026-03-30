import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
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

// WhatsApp API
export const whatsappApi = {
  getStatus: () => api.get('/whatsapp/status'),
  getQR: () => api.get('/whatsapp/qr'),
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

export default api;
