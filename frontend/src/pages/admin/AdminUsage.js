import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminUsage() {
  const { isRTL } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.getUsage();
        setData(res.data);
      } catch (e) {
        console.error('Usage load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;
  if (!data) return <div className="text-red-500 text-center py-12">{isRTL ? 'فشل التحميل' : 'Failed to load'}</div>;

  const topUsers = data.users.slice(0, 10);
  const chartData = topUsers.map(u => ({
    name: u.name || u.email.split('@')[0],
    messages: u.messages_this_month,
    whatsapp: u.whatsapp_messages_month,
    cost: u.estimated_cost_usd
  }));

  return (
    <div data-testid="admin-usage-page">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{isRTL ? 'استهلاك التوكنات' : 'Token Usage & Costs'}</h1>
      <p className="text-sm text-slate-500 mb-6">{data.month}</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">{isRTL ? 'التكلفة الشهرية التقديرية' : 'Estimated Monthly Cost'}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">${data.total_estimated_cost_usd}</p>
          <p className="text-xs text-slate-400 mt-1">{isRTL ? 'بناءً على الاستخدام الحالي' : 'Based on current usage'}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">{isRTL ? 'المستخدمين النشطين' : 'Active Users'}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{data.users.filter(u => u.messages_this_month > 0).length}</p>
          <p className="text-xs text-slate-400 mt-1">{isRTL ? `من أصل ${data.users.length} مستخدم` : `out of ${data.users.length} total`}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">{isRTL ? 'تكلفة الرسالة الواحدة' : 'Cost Per Message'}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">${data.pricing.cost_per_message}</p>
          <p className="text-xs text-slate-400 mt-1">{isRTL ? `صوتي: $${data.pricing.cost_per_voice}` : `Voice: $${data.pricing.cost_per_voice}`}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-8">
          <h3 className="font-semibold text-slate-800 mb-4">{isRTL ? 'أعلى 10 مستخدمين استهلاكاً' : 'Top 10 Users by Usage'}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="messages" fill="#7c3aed" name={isRTL ? 'رسائل' : 'Messages'} radius={[4, 4, 0, 0]} />
              <Bar dataKey="whatsapp" fill="#22c55e" name={isRTL ? 'واتساب' : 'WhatsApp'} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{isRTL ? 'تفاصيل الاستهلاك لكل مستخدم' : 'Per-User Usage Details'}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="usage-table">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{isRTL ? 'المستخدم' : 'User'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{isRTL ? 'الخطة' : 'Plan'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{isRTL ? 'رسائل اليوم' : 'Today'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{isRTL ? 'رسائل الشهر' : 'This Month'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{isRTL ? 'واتساب' : 'WhatsApp'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{isRTL ? 'التكلفة التقديرية' : 'Est. Cost'}</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.user_id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{u.name || '-'}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      u.subscription === 'business' ? 'bg-indigo-100 text-indigo-700' :
                      u.subscription === 'pro' ? 'bg-violet-100 text-violet-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{u.subscription}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{u.messages_today}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{u.messages_this_month}</td>
                  <td className="px-4 py-3 text-slate-700">{u.whatsapp_messages_month}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${u.estimated_cost_usd > 1 ? 'text-red-600' : u.estimated_cost_usd > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      ${u.estimated_cost_usd}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
