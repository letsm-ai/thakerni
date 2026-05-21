import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CHART_TICK_SM, BAR_RADIUS_SM } from '../../lib/chartConfig';

const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

export default function AdminAnalytics() {
  const { isRTL } = useLanguage();
  const [signups, setSignups] = useState([]);
  const [activity, setActivity] = useState([]);
  const [countries, setCountries] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [s, a, c] = await Promise.all([
          adminApi.getSignupTrends(days),
          adminApi.getActivityTrends(days),
          adminApi.getCountryStats(),
        ]);
        setSignups(s.data.data);
        setActivity(a.data.data);
        setCountries(c.data.countries);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [days]);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading analytics...</div>;

  return (
    <div data-testid="admin-analytics-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{isRTL ? 'التحليلات' : 'Analytics'}</h1>
        <div className="flex gap-1.5">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${days === d ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
              data-testid={`analytics-days-${d}`}
            >{d}d</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Signups chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="signups-chart">
          <h3 className="font-semibold text-slate-800 mb-4">User Signups</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={signups}>
              <defs>
                <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={CHART_TICK_SM} />
              <YAxis allowDecimals={false} tick={CHART_TICK_SM} />
              <Tooltip />
              <Area type="monotone" dataKey="signups" stroke="#7c3aed" fill="url(#signupGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Activity chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="activity-chart">
          <h3 className="font-semibold text-slate-800 mb-4">Daily Activity</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={activity}>
              <XAxis dataKey="date" tick={CHART_TICK_SM} />
              <YAxis allowDecimals={false} tick={CHART_TICK_SM} />
              <Tooltip />
              <Bar dataKey="messages" fill="#7c3aed" radius={BAR_RADIUS_SM} name="Messages" />
              <Bar dataKey="tasks" fill="#10b981" radius={BAR_RADIUS_SM} name="Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="countries-chart">
          <h3 className="font-semibold text-slate-800 mb-4">Users by Country</h3>
          {countries.length > 0 ? (
            <div className="flex items-start gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={countries} dataKey="users" nameKey="country" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {countries.map((c, i) => <Cell key={c.country || `cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 pt-2">
                {countries.map((c, i) => (
                  <div key={c.country} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-700 flex-1">{c.country}</span>
                    <span className="font-medium text-slate-800">{c.users}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm py-8 text-center">No location data yet. Users need to log in to capture their location.</p>
          )}
        </div>

        {/* Quick stats summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="analytics-summary">
          <h3 className="font-semibold text-slate-800 mb-4">Period Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-500">Total Signups</span>
              <span className="text-lg font-bold text-slate-800">{signups.reduce((a, d) => a + d.signups, 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-500">Total Messages</span>
              <span className="text-lg font-bold text-slate-800">{activity.reduce((a, d) => a + d.messages, 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-sm text-slate-500">Total Tasks Created</span>
              <span className="text-lg font-bold text-slate-800">{activity.reduce((a, d) => a + d.tasks, 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-slate-500">Avg Daily Messages</span>
              <span className="text-lg font-bold text-slate-800">{activity.length ? (activity.reduce((a, d) => a + d.messages, 0) / activity.length).toFixed(1) : 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
