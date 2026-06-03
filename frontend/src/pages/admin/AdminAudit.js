import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react';

export default function AdminAudit() {
  const { isRTL } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [actionTypes, setActionTypes] = useState([]);

  // Filters
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const buildParams = useCallback(() => {
    const params = { page, limit: 20 };
    if (actionFilter !== 'all') params.action = actionFilter;
    if (search.trim()) params.search = search.trim();
    if (fromDate) params.from_date = new Date(fromDate).toISOString();
    if (toDate) {
      // Include the entire end date
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      params.to_date = end.toISOString();
    }
    return params;
  }, [page, actionFilter, search, fromDate, toDate]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAuditLogs(buildParams());
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setPages(res.data.pages || Math.ceil(res.data.total / 20));
      if (res.data.action_types) setActionTypes(res.data.action_types);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [buildParams]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change (except page itself)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [actionFilter, search, fromDate, toDate]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { page: _p, limit: _l, ...filterParams } = buildParams();
      const res = await adminApi.exportAuditLogs(filterParams);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.detail || 'Failed to export');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setActionFilter('all');
    setSearch('');
    setFromDate('');
    setToDate('');
  };

  const hasFilters = actionFilter !== 'all' || search || fromDate || toDate;

  const actionColor = (action) => {
    if (action === 'suspend') return 'bg-red-50 text-red-700';
    if (action === 'activate') return 'bg-green-50 text-green-700';
    if (action === 'role_change') return 'bg-blue-50 text-blue-700';
    if (action === 'subscription_change') return 'bg-violet-50 text-violet-700';
    return 'bg-slate-50 text-slate-600';
  };

  const renderDetails = (log) => {
    if (log.action === 'subscription_change') {
      const fromP = log.from_plan || log.details?.from_plan || 'free';
      const toP = log.to_plan || log.details?.to_plan || '—';
      const cycle = log.billing_cycle || log.details?.billing_cycle;
      const expires = log.expires_at || log.details?.expires_at;
      return (
        <div className="text-xs text-slate-600 space-y-0.5">
          <div>
            <span className="font-medium capitalize text-slate-500">{fromP}</span>
            <span className="mx-1 text-slate-300">→</span>
            <span className="font-semibold capitalize text-violet-700">{toP}</span>
            {cycle && <span className="ml-1 text-slate-400">({cycle})</span>}
          </div>
          {log.target_email && <div className="text-slate-400 truncate max-w-xs">{log.target_email}</div>}
          {expires && toP !== 'free' && (
            <div className="text-slate-400">
              {isRTL ? 'ينتهي:' : 'expires:'} {new Date(expires).toLocaleDateString()}
            </div>
          )}
        </div>
      );
    }
    if (log.action === 'role_change' && log.details?.new_role) {
      return <span className="text-xs text-slate-600 capitalize">→ {log.details.new_role}</span>;
    }
    if (log.details) {
      return <span className="text-xs text-slate-600">{JSON.stringify(log.details)}</span>;
    }
    return <span className="text-xs text-slate-400">—</span>;
  };

  return (
    <div data-testid="admin-audit-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{isRTL ? 'سجل المراجعة' : 'Audit Logs'}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">{total} {isRTL ? 'سجل' : 'entries'}</span>
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="flex items-center gap-2 px-3 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="audit-export-csv-button"
          >
            <Download size={14} />
            {exporting ? (isRTL ? 'جاري التصدير...' : 'Exporting...') : (isRTL ? 'تصدير CSV' : 'Export CSV')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4" data-testid="audit-filters">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={isRTL ? 'بحث بالبريد أو المعرف...' : 'Search by email or ID...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              data-testid="audit-search-input"
            />
          </div>

          {/* Action filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white capitalize"
            data-testid="audit-action-filter"
          >
            <option value="all">{isRTL ? 'كل الإجراءات' : 'All actions'}</option>
            {actionTypes.map((a) => (
              <option key={a} value={a} className="capitalize">{a.replace('_', ' ')}</option>
            ))}
          </select>

          {/* From date */}
          <div className="relative">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder={isRTL ? 'من تاريخ' : 'From'}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              data-testid="audit-from-date"
            />
            {!fromDate && (
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                {isRTL ? 'من تاريخ' : 'From date'}
              </span>
            )}
          </div>

          {/* To date */}
          <div className="relative">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder={isRTL ? 'إلى تاريخ' : 'To'}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              data-testid="audit-to-date"
            />
            {!toDate && (
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                {isRTL ? 'إلى تاريخ' : 'To date'}
              </span>
            )}
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {isRTL ? `عرض ${total} نتيجة بعد التصفية` : `${total} results match the filters`}
            </span>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
              data-testid="audit-clear-filters"
            >
              <X size={12} /> {isRTL ? 'مسح الفلاتر' : 'Clear filters'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="audit-table">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left">
              <th className="px-4 py-2.5 font-medium">{isRTL ? 'الإجراء' : 'Action'}</th>
              <th className="px-4 py-2.5 font-medium">{isRTL ? 'المسؤول' : 'Actor'}</th>
              <th className="px-4 py-2.5 font-medium">{isRTL ? 'المستخدم' : 'Target'}</th>
              <th className="px-4 py-2.5 font-medium">{isRTL ? 'التفاصيل' : 'Details'}</th>
              <th className="px-4 py-2.5 font-medium">{isRTL ? 'الوقت' : 'Time'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">{isRTL ? 'جاري التحميل...' : 'Loading...'}</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">{isRTL ? 'لا توجد سجلات' : 'No audit logs match the filters'}</td></tr>
            ) : logs.map((log) => (
              <tr key={log.log_id || log.timestamp} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${actionColor(log.action)}`}>{log.action?.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{log.actor_id}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{log.target_id || '—'}</td>
                <td className="px-4 py-2.5">{renderDetails(log)}</td>
                <td className="px-4 py-2.5 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-400">Page {page} of {pages}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1 rounded hover:bg-slate-200 disabled:opacity-30" data-testid="audit-prev-page"><ChevronLeft size={16} /></button>
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="p-1 rounded hover:bg-slate-200 disabled:opacity-30" data-testid="audit-next-page"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
