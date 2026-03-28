import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ChatCircle,
  CheckSquare,
  Bell,
  Calendar,
  WhatsappLogo,
  User,
  SignOut,
  List
} from '@phosphor-icons/react';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';

const navItems = [
  { path: '/dashboard', icon: ChatCircle, label: 'AI Chat' },
  { path: '/dashboard/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/dashboard/reminders', icon: Bell, label: 'Reminders' },
  { path: '/dashboard/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/dashboard/whatsapp', icon: WhatsappLogo, label: 'WhatsApp' },
  { path: '/dashboard/profile', icon: User, label: 'Profile' },
];

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

      {/* Main Content */}
      <div className="flex-1 overflow-auto md:pt-0 pt-16">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
