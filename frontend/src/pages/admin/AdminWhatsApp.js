import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../lib/api';
import { useLanguage } from '../../context/LanguageContext';
import { CheckCircle, XCircle, Send, RefreshCw, MessageSquare, ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react';

function StatusRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${ok ? 'text-green-600' : 'text-red-500'}`}>
        {ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
        {value || (ok ? 'OK' : 'Missing')}
      </span>
    </div>
  );
}

export default function AdminWhatsApp() {
  const { isRTL } = useLanguage();
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ total: 0, inbound: 0, outbound: 0 });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Test send
  const [testTo, setTestTo] = useState('');
  const [testBody, setTestBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, st, m] = await Promise.all([
        adminApi.waCloudStatus(),
        adminApi.waCloudGetSettings(),
        adminApi.waCloudListMessages(50),
      ]);
      setStatus(s.data);
      setSettings(st.data);
      setMessages(m.data.messages || []);
      setStats(m.data.stats || { total: 0, inbound: 0, outbound: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleAutoReply = async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const r = await adminApi.waCloudUpdateSettings({ auto_reply_enabled: !settings.auto_reply_enabled });
      setSettings(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendTest = async () => {
    if (!testTo.trim() || !testBody.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const r = await adminApi.waCloudSendTest(testTo.trim(), testBody.trim());
      setSendResult({ success: true, msg_id: r.data.message_id });
      setTestBody('');
      load();
    } catch (e) {
      setSendResult({ success: false, error: e.response?.data?.detail || e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div data-testid="admin-whatsapp-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isRTL ? 'واتساب Cloud API' : 'WhatsApp Cloud API'}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isRTL
              ? 'اربط رقم المساعد الذكي مباشرة بـ Meta — لا حاجة لمسح QR من الهاتف.'
              : 'Connect your AI assistant phone number directly to Meta — no phone QR scan required.'}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200"
          data-testid="wa-refresh-button"
        >
          <RefreshCw size={14} /> {isRTL ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs uppercase tracking-widest text-slate-400 mb-1">{isRTL ? 'إجمالي الرسائل' : 'Total Messages'}</div>
          <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1"><ArrowDownLeft size={12} /> {isRTL ? 'واردة' : 'Incoming'}</div>
          <div className="text-3xl font-bold text-green-600">{stats.inbound}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1"><ArrowUpRight size={12} /> {isRTL ? 'صادرة (AI)' : 'Sent (AI)'}</div>
          <div className="text-3xl font-bold text-violet-600">{stats.outbound}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Configuration status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5" data-testid="wa-config-status">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <MessageSquare size={18} className="text-green-600" />
            {isRTL ? 'حالة الإعدادات' : 'Configuration Status'}
          </h3>
          {loading || !status ? (
            <p className="text-sm text-slate-400">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : (
            <>
              <StatusRow label={isRTL ? 'رمز التحقق من Webhook' : 'Webhook Verify Token'} ok={status.has_verify_token} />
              <StatusRow label={isRTL ? 'سر التطبيق (App Secret)' : 'App Secret'} ok={status.has_app_secret} />
              <StatusRow label={isRTL ? 'رمز الوصول الدائم' : 'Permanent Access Token'} ok={status.has_access_token} />
              <StatusRow label="Phone Number ID" value={status.phone_number_id} ok={!!status.phone_number_id} />
              <div className={`mt-4 p-3 rounded-lg text-sm ${status.configured ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                {status.configured
                  ? (isRTL ? 'الإعدادات مكتملة — جاهز للعمل!' : 'Configuration complete — ready to operate!')
                  : (isRTL ? 'الإعدادات ناقصة. راجع الدليل أدناه لإضافة المتغيرات في ملف .env على VPS.' : 'Configuration incomplete. See guide below to add env vars on VPS.')}
              </div>
            </>
          )}
        </div>

        {/* Auto-reply toggle + test send */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3">{isRTL ? 'الرد التلقائي بالـ AI' : 'AI Auto-Reply'}</h3>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-4">
            <div>
              <div className="text-sm font-medium text-slate-700">{isRTL ? 'تفعيل الرد التلقائي' : 'Enable Auto-Reply'}</div>
              <p className="text-xs text-slate-500 mt-0.5">{isRTL ? 'يرد المساعد على الرسائل الواردة تلقائياً' : 'AI assistant replies to incoming messages'}</p>
            </div>
            <button
              onClick={toggleAutoReply}
              disabled={savingSettings || !settings}
              className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${settings?.auto_reply_enabled ? 'bg-violet-600' : 'bg-slate-300'}`}
              data-testid="wa-auto-reply-toggle"
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings?.auto_reply_enabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </div>

          <h3 className="font-semibold text-slate-900 mb-2 mt-4">{isRTL ? 'إرسال رسالة اختبار' : 'Send Test Message'}</h3>
          <div className="space-y-2">
            <input
              type="text"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder={isRTL ? 'رقم المستقبل (E.164، مثل: 96812345678)' : 'To (E.164, e.g. 96812345678)'}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              data-testid="wa-test-to"
            />
            <textarea
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              rows={3}
              placeholder={isRTL ? 'نص الرسالة' : 'Message body'}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
              data-testid="wa-test-body"
            />
            <button
              onClick={handleSendTest}
              disabled={sending || !testTo.trim() || !testBody.trim() || !status?.configured}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
              data-testid="wa-test-send-button"
            >
              <Send size={14} />
              {sending ? (isRTL ? 'جاري الإرسال...' : 'Sending...') : (isRTL ? 'إرسال' : 'Send')}
            </button>
            {sendResult && (
              <div className={`p-2 rounded text-xs ${sendResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {sendResult.success
                  ? (isRTL ? `تم الإرسال — ${sendResult.msg_id}` : `Sent — ${sendResult.msg_id}`)
                  : `Error: ${sendResult.error}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent messages */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6" data-testid="wa-recent-messages">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{isRTL ? 'آخر الرسائل' : 'Recent Messages'}</h3>
          <span className="text-xs text-slate-400">{messages.length}</span>
        </div>
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-400">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : messages.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">{isRTL ? 'لا توجد رسائل بعد. تأكد أن webhook متصل في Meta.' : 'No messages yet. Make sure your webhook is connected in Meta.'}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-2 font-medium">{isRTL ? 'الاتجاه' : 'Direction'}</th>
                <th className="px-4 py-2 font-medium">{isRTL ? 'الطرف' : 'Party'}</th>
                <th className="px-4 py-2 font-medium">{isRTL ? 'المحتوى' : 'Body'}</th>
                <th className="px-4 py-2 font-medium">{isRTL ? 'الوقت' : 'Time'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {messages.map((m, i) => (
                <tr key={m.message_id || i} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${m.direction === 'inbound' ? 'bg-green-50 text-green-700' : 'bg-violet-50 text-violet-700'}`}>
                      {m.direction === 'inbound' ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                      {m.direction}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-600">{m.from || m.to || '—'}</td>
                  <td className="px-4 py-2 text-slate-700 max-w-md truncate">{m.body || '—'}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{m.received_at || m.sent_at ? new Date(m.received_at || m.sent_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Setup guide */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-5" data-testid="wa-setup-guide">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <ExternalLink size={16} /> {isRTL ? 'دليل الإعداد السريع' : 'Quick Setup Guide'}
        </h3>
        <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside marker:text-violet-600 marker:font-semibold">
          <li>{isRTL ? 'افتح ' : 'Open '}<a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-violet-700 underline">Meta for Developers</a>{isRTL ? ' وأنشئ تطبيقاً نوع "Business".' : ' and create a Business-type app.'}</li>
          <li>{isRTL ? 'أضف منتج WhatsApp → API Setup → اختر رقمك أو سجّل رقماً جديداً.' : 'Add WhatsApp product → API Setup → choose or register a phone number.'}</li>
          <li>{isRTL ? 'انسخ ' : 'Copy '}<code className="bg-slate-200 px-1 rounded">Phone Number ID</code>{isRTL ? ' و' : ' and '}<code className="bg-slate-200 px-1 rounded">Temporary Access Token</code> {isRTL ? '— أو الأفضل أنشئ System User Token دائم من Business Settings.' : ' — or better, create a permanent System User Token in Business Settings.'}</li>
          <li>{isRTL ? 'في ' : 'Under '}<strong>WhatsApp → Configuration → Webhook</strong>{isRTL ? '، اضبط:' : ', set:'}
            <ul className="ml-6 mt-1 space-y-0.5 text-xs">
              <li>Callback URL: <code className="bg-slate-200 px-1 rounded">https://letsm.ai/api/whatsapp/cloud/webhook</code></li>
              <li>Verify Token: {isRTL ? '(أي قيمة سرية تختارها)' : '(any secret string you choose)'}</li>
              <li>{isRTL ? 'اشترك في حقل ' : 'Subscribe to '}<code className="bg-slate-200 px-1 rounded">messages</code></li>
            </ul>
          </li>
          <li>{isRTL ? 'انسخ ' : 'Copy '}<code className="bg-slate-200 px-1 rounded">App Secret</code>{isRTL ? ' من Settings → Basic.' : ' from Settings → Basic.'}</li>
          <li>{isRTL ? 'على VPS، أضف هذي المتغيرات في ' : 'On the VPS, add these to '}<code className="bg-slate-200 px-1 rounded">backend/.env</code>:
            <pre className="mt-2 bg-slate-900 text-slate-100 text-xs p-3 rounded overflow-x-auto">{`META_WEBHOOK_VERIFY_TOKEN=<your_secret>
META_APP_SECRET=<from_step_5>
META_PERMANENT_ACCESS_TOKEN=<from_step_3>
META_PHONE_NUMBER_ID=<from_step_3>`}</pre>
          </li>
          <li>{isRTL ? 'أعد تشغيل الـ backend container، ثم اضغط ' : 'Restart the backend container, then click '}<strong>Refresh</strong>{isRTL ? ' أعلاه.' : ' above.'}</li>
        </ol>
      </div>
    </div>
  );
}
