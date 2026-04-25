import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { CheckCircle, XCircle, AlertCircle, Database } from 'lucide-react';

const StatusBadge = ({ ok, label }) => (
  <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
    {ok ? <CheckCircle size={18} className="text-green-600" /> : <XCircle size={18} className="text-red-500" />}
    <span className={`text-sm font-medium ${ok ? 'text-green-800' : 'text-red-700'}`}>{label}</span>
  </div>
);

export default function AdminSystem() {
  const { isRTL } = useLanguage();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.getSystemHealth();
        setHealth(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">{isRTL ? 'جاري التحميل...' : 'Loading system health...'}</div>;
  if (!health) return <div className="text-red-500 text-center py-12">{isRTL ? 'فشل التحميل' : 'Failed to load'}</div>;

  return (
    <div data-testid="admin-system-page">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{isRTL ? 'صحة النظام' : 'System Health'}</h1>

      {/* Service statuses */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6" data-testid="services-status">
        <h3 className="font-semibold text-slate-800 mb-4">Service Status</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatusBadge ok={health.services.openai_llm} label="OpenAI GPT-5.2" />
          <StatusBadge ok={health.services.stripe} label="Stripe Payments" />
          <StatusBadge ok={health.services.resend_email} label="Resend Email" />
          <StatusBadge ok={health.services.whatsapp} label="WhatsApp" />
        </div>
      </div>

      {/* WhatsApp details */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="font-semibold text-slate-800 mb-3">WhatsApp Service</h3>
        <div className="text-sm space-y-2">
          <div className="flex items-center gap-2">
            {health.whatsapp?.connected
              ? <CheckCircle size={16} className="text-green-600" />
              : <AlertCircle size={16} className="text-amber-500" />
            }
            <span className="text-slate-600">
              {health.whatsapp?.connected ? 'Connected' : health.whatsapp?.error || 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Database stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6" data-testid="db-stats">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Database size={18} className="text-slate-500" />
          Database Collections
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(health.database).map(([col, count]) => (
            <div key={col} className="bg-slate-50 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm text-slate-600 capitalize">{col.replace('_', ' ')}</span>
              <span className="text-sm font-bold text-slate-800">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Last digest */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-3">Last Email Digest</h3>
        {health.last_digest ? (
          <div className="text-sm space-y-1 text-slate-600">
            <p>Sent: <strong>{health.last_digest.sent}</strong> | Failed: <strong>{health.last_digest.failed}</strong></p>
            <p>Time: {new Date(health.last_digest.timestamp).toLocaleString()}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No digest has been sent yet</p>
        )}
      </div>
    </div>
  );
}
