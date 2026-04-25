import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { Users, CheckSquare, MessageSquare, Bell, DollarSign, CreditCard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
    </div>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
  </div>
);

export default function AdminOverview() {
  const { isRTL } = useLanguage();
  const [data, setData] = useState(null);
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [overview, trends] = await Promise.all([
          adminApi.getOverview(),
          adminApi.getSignupTrends(14),
        ]);
        setData(overview.data);
        setSignups(trends.data.data);
      } catch (e) {
        console.error('Admin overview error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;
  if (!data) return <div className="text-red-500 text-center py-12">{isRTL ? 'فشل تحميل البيانات' : 'Failed to load admin data'}</div>;

  const { users, subscriptions, content, revenue } = data;

  return (
    <div data-testid="admin-overview-page">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{isRTL ? 'نظرة عامة على لوحة التحكم' : 'Dashboard Overview'}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label={isRTL ? 'إجمالي المستخدمين' : 'Total Users'} value={users.total} sub={`+${users.new_this_week} ${isRTL ? 'هذا الأسبوع' : 'this week'}`} color="bg-violet-100 text-violet-600" />
        <StatCard icon={CheckSquare} label={isRTL ? 'المهام' : 'Tasks'} value={content.tasks} color="bg-emerald-100 text-emerald-600" />
        <StatCard icon={MessageSquare} label={isRTL ? 'المحادثات' : 'Conversations'} value={content.conversations} sub={`${content.messages} ${isRTL ? 'رسالة' : 'messages'}`} color="bg-blue-100 text-blue-600" />
        <StatCard icon={Bell} label={isRTL ? 'التذكيرات' : 'Reminders'} value={content.reminders} color="bg-amber-100 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <StatCard icon={DollarSign} label={isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'} value={`${revenue.total_revenue.toFixed(2)} ${isRTL ? 'ر.ع' : 'OMR'}`} sub={`${revenue.total_payments} ${isRTL ? 'عملية دفع' : 'payments'}`} color="bg-green-100 text-green-600" />
        <StatCard icon={CreditCard} label={isRTL ? 'مشتركين برو' : 'Pro Subscribers'} value={subscriptions.pro} color="bg-violet-100 text-violet-600" />
        <StatCard icon={CreditCard} label={isRTL ? 'مشتركين بزنس' : 'Business Subscribers'} value={subscriptions.business} color="bg-indigo-100 text-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="subscription-breakdown">
          <h3 className="font-semibold text-slate-800 mb-4">{isRTL ? 'توزيع الاشتراكات' : 'Subscription Breakdown'}</h3>
          <div className="space-y-3">
            {[
              { plan: isRTL ? 'مجاني' : 'Free', count: subscriptions.free, color: 'bg-slate-200' },
              { plan: isRTL ? 'برو' : 'Pro', count: subscriptions.pro, color: 'bg-violet-500' },
              { plan: isRTL ? 'بزنس' : 'Business', count: subscriptions.business, color: 'bg-indigo-500' },
            ].map(({ plan, count, color }) => (
              <div key={plan} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-20">{plan}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${users.total ? (count / users.total) * 100 : 0}%` }} />
                </div>
                <span className="text-sm font-medium text-slate-700 w-8 text-end">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="signup-trend-chart">
          <h3 className="font-semibold text-slate-800 mb-4">{isRTL ? 'التسجيلات (14 يوم)' : 'Signups (14 days)'}</h3>
          {signups.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={signups}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="signups" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm">{isRTL ? 'لا توجد بيانات بعد' : 'No data yet'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
