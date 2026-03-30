import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChartBar, Users, CreditCard, Activity, Shield, FileText, ArrowLeft } from 'lucide-react';

const ROLE_PERMISSIONS = {
  admin: new Set(["users", "subscriptions", "billing", "analytics", "system", "roles", "audit", "announcements"]),
  developer: new Set(["users", "analytics", "system", "audit"]),
  operations: new Set(["users", "subscriptions", "billing", "analytics", "announcements"]),
  viewer: new Set(["users", "subscriptions", "analytics"]),
};

const NAV = [
  { to: '/admin', label: 'Overview', icon: ChartBar, perm: 'analytics', end: true },
  { to: '/admin/users', label: 'Users', icon: Users, perm: 'users' },
  { to: '/admin/analytics', label: 'Analytics', icon: Activity, perm: 'analytics' },
  { to: '/admin/billing', label: 'Billing', icon: CreditCard, perm: 'billing' },
  { to: '/admin/system', label: 'System', icon: Shield, perm: 'system' },
  { to: '/admin/audit', label: 'Audit Logs', icon: FileText, perm: 'audit' },
];

export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'user';
  const perms = ROLE_PERMISSIONS[role] || new Set();

  if (!ROLE_PERMISSIONS[role]) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center" data-testid="admin-no-access">
          <Shield className="mx-auto mb-4 text-red-400" size={48} />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-500 mb-4">You don't have admin privileges.</p>
          <button onClick={() => navigate('/dashboard')} className="text-violet-600 font-medium hover:underline">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const visibleNav = NAV.filter(n => perms.has(n.perm));

  return (
    <div className="min-h-screen bg-slate-50 flex" data-testid="admin-layout">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col fixed h-full z-30" data-testid="admin-sidebar">
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">L</div>
            <span className="font-semibold text-sm">Letsm Admin</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 capitalize">{role} Panel</div>
        </div>
        <nav className="flex-1 py-4 space-y-0.5 px-3" data-testid="admin-nav">
          {visibleNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-violet-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
              data-testid={`admin-nav-${label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-4">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-3 py-2.5 text-slate-400 hover:text-white text-sm w-full rounded-lg hover:bg-slate-800 transition-colors" data-testid="admin-back-dashboard">
            <ArrowLeft size={18} />
            Back to App
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 sticky top-0 z-20">
          <span className="text-sm text-slate-500">{user?.email}</span>
          <span className="ml-2 text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium capitalize">{role}</span>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
