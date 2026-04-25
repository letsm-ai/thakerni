import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminAudit() {
  const { isRTL } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs({ page, limit: 20 });
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setPages(Math.ceil(res.data.total / 20));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const actionColor = (action) => {
    if (action === 'suspend') return 'bg-red-50 text-red-700';
    if (action === 'activate') return 'bg-green-50 text-green-700';
    if (action === 'role_change') return 'bg-blue-50 text-blue-700';
    return 'bg-slate-50 text-slate-600';
  };

  return (
    <div data-testid="admin-audit-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{isRTL ? 'سجل المراجعة' : 'Audit Logs'}</h1>
        <span className="text-sm text-slate-400">{total} entries</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="audit-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-4 py-2.5 font-medium">Action</th>
              <th className="px-4 py-2.5 font-medium">Actor</th>
              <th className="px-4 py-2.5 font-medium">Target</th>
              <th className="px-4 py-2.5 font-medium">Details</th>
              <th className="px-4 py-2.5 font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">No audit logs yet</td></tr>
            ) : logs.map((log) => (
              <tr key={log.log_id || log.timestamp} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${actionColor(log.action)}`}>{log.action?.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{log.actor_id}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{log.target_id || '—'}</td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{log.details ? JSON.stringify(log.details) : '—'}</td>
                <td className="px-4 py-2.5 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
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
