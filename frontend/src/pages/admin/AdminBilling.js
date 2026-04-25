import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminBilling() {
  const { isRTL } = useLanguage();
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const [pay, rev] = await Promise.all([
        adminApi.getPayments(params),
        adminApi.getRevenueChart(30),
      ]);
      setPayments(pay.data.payments);
      setTotal(pay.data.total);
      setPages(pay.data.pages);
      setRevenue(rev.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const totalRevenue = revenue.reduce((a, d) => a + d.revenue, 0);
  const totalTx = revenue.reduce((a, d) => a + d.transactions, 0);

  return (
    <div data-testid="admin-billing-page">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{isRTL ? 'الفواتير والمدفوعات' : 'Billing & Payments'}</h1>

      {/* Revenue cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <span className="text-sm text-slate-500">30-Day Revenue</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <span className="text-sm text-slate-500">Transactions</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalTx}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <span className="text-sm text-slate-500">Avg Transaction</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">${totalTx ? (totalRevenue / totalTx).toFixed(2) : '0.00'}</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6" data-testid="revenue-chart">
        <h3 className="font-semibold text-slate-800 mb-4">Revenue (30 days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={revenue}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
            <Bar dataKey="revenue" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Payments table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="payments-table">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Payment History</h3>
          <div className="flex gap-1.5">
            {['', 'completed', 'pending', 'failed'].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${statusFilter === s ? 'bg-violet-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >{s || 'All'}</button>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-4 py-2.5 font-medium">User ID</th>
              <th className="px-4 py-2.5 font-medium">Amount</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Session</th>
              <th className="px-4 py-2.5 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">No payments found</td></tr>
            ) : payments.map((p) => (
              <tr key={p.transaction_id || p.session_id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{p.user_id}</td>
                <td className="px-4 py-2.5 font-medium text-slate-800">${p.amount?.toFixed(2) || '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    p.status === 'completed' ? 'bg-green-50 text-green-700' :
                    p.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>{p.status}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-400 max-w-[150px] truncate">{p.session_id || '—'}</td>
                <td className="px-4 py-2.5 text-slate-500">{p.created_at ? new Date(p.created_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
}
