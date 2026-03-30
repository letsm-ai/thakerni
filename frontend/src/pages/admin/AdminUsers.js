import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../lib/api';
import { Search, ChevronLeft, ChevronRight, Shield, UserX, UserCheck, Eye } from 'lucide-react';

const ROLES = ['user', 'viewer', 'operations', 'developer', 'admin'];
const PLANS = ['all', 'free', 'pro', 'business'];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (planFilter !== 'all') params.plan = planFilter;
      const res = await adminApi.getUsers(params);
      setUsers(res.data.users);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, planFilter]);

  useEffect(() => { load(); }, [load]);

  const viewUser = async (userId) => {
    try {
      const res = await adminApi.getUser(userId);
      setUserDetail(res.data);
      setSelected(userId);
    } catch (e) { console.error(e); }
  };

  const updateRole = async (userId, role) => {
    try {
      await adminApi.updateUserRole(userId, role);
      load();
      if (selected === userId && userDetail) {
        setUserDetail({ ...userDetail, user: { ...userDetail.user, role } });
      }
    } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };

  const toggleSuspend = async (userId, current) => {
    try {
      await adminApi.updateUserStatus(userId, !current);
      load();
    } catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };

  return (
    <div data-testid="admin-users-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <span className="text-sm text-slate-400">{total} total</span>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            data-testid="users-search-input"
          />
        </div>
        <div className="flex gap-1.5">
          {PLANS.map(p => (
            <button key={p} onClick={() => { setPlanFilter(p); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${planFilter === p ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              data-testid={`filter-plan-${p}`}
            >{p}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Users table */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="users-table">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-left">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">No users found</td></tr>
              ) : users.map(u => (
                <tr key={u.user_id} className={`hover:bg-slate-50 cursor-pointer ${selected === u.user_id ? 'bg-violet-50' : ''}`}
                    onClick={() => viewUser(u.user_id)} data-testid={`user-row-${u.user_id}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{u.name || '—'}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      u.subscription_plan === 'pro' ? 'bg-violet-100 text-violet-700' :
                      u.subscription_plan === 'business' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{u.subscription_plan || 'free'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                      u.role === 'admin' ? 'bg-red-100 text-red-700' :
                      u.role === 'developer' ? 'bg-blue-100 text-blue-700' :
                      u.role === 'operations' ? 'bg-amber-100 text-amber-700' :
                      u.role === 'viewer' ? 'bg-green-100 text-green-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>{u.role || 'user'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.geo?.country || '—'}</td>
                  <td className="px-4 py-3">
                    {u.suspended
                      ? <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Suspended</span>
                      : <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => viewUser(u.user_id)} className="p-1.5 hover:bg-slate-100 rounded-md" title="View"><Eye size={14} /></button>
                      <button onClick={() => toggleSuspend(u.user_id, u.suspended)} className="p-1.5 hover:bg-slate-100 rounded-md" title={u.suspended ? 'Activate' : 'Suspend'}>
                        {u.suspended ? <UserCheck size={14} className="text-green-600" /> : <UserX size={14} className="text-red-500" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
              <span className="text-xs text-slate-400">Page {page} of {pages}</span>
              <div className="flex gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronLeft size={16} /></button>
                <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>

        {/* User detail panel */}
        {userDetail && (
          <div className="w-80 bg-white rounded-xl border border-slate-200 p-5 h-fit sticky top-20" data-testid="user-detail-panel">
            <h3 className="font-semibold text-slate-800 mb-3">{userDetail.user.name || 'No Name'}</h3>
            <p className="text-sm text-slate-500 mb-4">{userDetail.user.email}</p>

            <div className="space-y-3 text-sm mb-5">
              <div className="flex justify-between"><span className="text-slate-400">User ID</span><span className="text-slate-700 font-mono text-xs">{userDetail.user.user_id}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Joined</span><span className="text-slate-700">{new Date(userDetail.user.created_at).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Plan</span><span className="capitalize text-slate-700">{userDetail.user.subscription_plan || 'free'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Country</span><span className="text-slate-700">{userDetail.user.geo?.country || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">City</span><span className="text-slate-700">{userDetail.user.geo?.city || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Last Login</span><span className="text-slate-700">{userDetail.user.last_login_at ? new Date(userDetail.user.last_login_at).toLocaleString() : '—'}</span></div>
            </div>

            {/* Role selector */}
            <div className="mb-5">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Role</label>
              <div className="flex flex-wrap gap-1.5" data-testid="role-selector">
                {ROLES.map(r => (
                  <button key={r} onClick={() => updateRole(userDetail.user.user_id, r)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium capitalize transition-colors ${
                      (userDetail.user.role || 'user') === r ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    data-testid={`role-btn-${r}`}
                  >{r}</button>
                ))}
              </div>
            </div>

            {/* Activity stats */}
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Activity</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Tasks', val: userDetail.stats.tasks },
                  { label: 'Reminders', val: userDetail.stats.reminders },
                  { label: 'Conversations', val: userDetail.stats.conversations },
                  { label: 'Messages', val: userDetail.stats.messages },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-lg p-2.5 text-center">
                    <div className="text-lg font-bold text-slate-800">{s.val}</div>
                    <div className="text-xs text-slate-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment history */}
            {userDetail.payments?.length > 0 && (
              <div className="mt-5">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Payments</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {userDetail.payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-slate-600">${p.amount}</span>
                      <span className={`font-medium ${p.status === 'completed' ? 'text-green-600' : 'text-amber-600'}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
