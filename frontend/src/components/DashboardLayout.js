import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../lib/api';
import {
  ChatCircle,
  CheckSquare,
  Bell,
  Calendar,
  WhatsappLogo,
  User,
  SignOut,
  List,
  X
} from '@phosphor-icons/react';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';

const navItems = [
  { path: '/dashboard', icon: ChatCircle, label: 'AI Chat' },
  { path: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/dashboard/reminders', icon: Bell, label: 'Reminders' },
  { path: '/dashboard/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/dashboard/whatsapp', icon: WhatsappLogo, label: 'WhatsApp' },
  { path: '/dashboard/profile', icon: User, label: 'Profile' },
];

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsApi.getNotifications(),
        notificationsApi.getUnreadCount()
      ]);
      setNotifications(notifRes.data.slice(0, 10));
      setUnreadCount(countRes.data.count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  const checkReminders = useCallback(async () => {
    try {
      await notificationsApi.checkReminders();
      fetchNotifications();
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
    checkReminders();
    
    // Check for reminders every minute
    const interval = setInterval(() => {
      checkReminders();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchNotifications, checkReminders]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await notificationsApi.deleteNotification(notificationId);
      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
          data-testid="notification-bell"
        >
          <Bell size={22} className="text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#002FA7] text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-slate-200 p-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-[#002FA7] hover:underline"
              data-testid="mark-all-read"
            >
              Mark all read
            </button>
          )}
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              No notifications
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.notification_id}
                onClick={() => handleMarkAsRead(notif.notification_id)}
                className={`p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${
                  !notif.read ? 'bg-blue-50/50' : ''
                }`}
                data-testid={`notification-${notif.notification_id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                    <p className="text-sm text-slate-600 truncate">{notif.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatTime(notif.created_at)}</p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(notif.notification_id, e)}
                    className="p-1 hover:bg-slate-200 rounded"
                  >
                    <X size={14} className="text-slate-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const Sidebar = ({ onItemClick }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 border-r border-slate-200">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200">
        <Link to="/dashboard" className="flex items-center gap-3" data-testid="sidebar-logo">
          <img
            src="https://static.prod-images.emergentagent.com/jobs/9d301dcd-e3e4-482d-9d3a-1c2d6b41093f/images/7432755b702d2a2a26f7a6ef3b6c0c1c2e834acae24098a23273963d9cd5719c.png"
            alt="Letsm AI"
            className="h-8 w-auto"
          />
          <span className="font-bold text-slate-900 font-heading text-lg">Letsm AI</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onItemClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-white border border-slate-200 shadow-sm text-slate-900'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 px-4 py-3">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
              <User size={16} className="text-slate-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 mt-2 text-slate-600 hover:bg-white hover:text-red-600 rounded-lg transition-colors"
          data-testid="logout-button"
        >
          <SignOut size={20} />
          <span className="font-medium text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

const DashboardLayout = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="h-screen flex bg-white">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-50">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img
            src="https://static.prod-images.emergentagent.com/jobs/9d301dcd-e3e4-482d-9d3a-1c2d6b41093f/images/7432755b702d2a2a26f7a6ef3b6c0c1c2e834acae24098a23273963d9cd5719c.png"
            alt="Letsm AI"
            className="h-7 w-auto"
          />
          <span className="font-bold text-slate-900 font-heading">Letsm AI</span>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="p-2 hover:bg-slate-100 rounded-lg" data-testid="mobile-menu-button">
                <List size={24} className="text-slate-700" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar onItemClick={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Notification Bell - Top Right */}
      <div className="hidden md:block fixed top-4 right-6 z-40">
        <NotificationBell />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto md:pt-0 pt-16">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
