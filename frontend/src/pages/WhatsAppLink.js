import { useState, useEffect, useCallback, useRef } from 'react';
import { whatsappLinkApi } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { WhatsappLogo, Copy, Check, ArrowsClockwise, Link, LinkBreak } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function WhatsAppLink() {
  const { isRTL } = useLanguage();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [unlinking, setUnlinking] = useState(false);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const r = await whatsappLinkApi.getStatus();
      setStatus(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // Countdown for the active code
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!code?.expires_at) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(code.expires_at) - new Date()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) clearInterval(timerRef.current);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [code]);

  // Poll status while a code is active so we auto-detect link success
  useEffect(() => {
    clearInterval(pollRef.current);
    if (!code || status?.linked) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await whatsappLinkApi.getStatus();
        if (r.data.linked) {
          setStatus(r.data);
          setCode(null);
          toast.success(isRTL ? 'تم ربط واتساب بنجاح!' : 'WhatsApp linked successfully!');
          clearInterval(pollRef.current);
        }
      } catch (e) { /* ignore */ }
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [code, status?.linked, isRTL]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const r = await whatsappLinkApi.generateCode();
      setCode(r.data);
      setCopied(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to generate code');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code.code);
    setCopied(true);
    toast.success(isRTL ? 'تم نسخ الكود' : 'Code copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUnlink = async () => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد من إلغاء ربط واتساب؟' : 'Unlink WhatsApp?')) return;
    setUnlinking(true);
    try {
      await whatsappLinkApi.unlink();
      toast.success(isRTL ? 'تم إلغاء الربط' : 'Unlinked');
      loadStatus();
    } catch (e) {
      toast.error('Failed to unlink');
    } finally {
      setUnlinking(false);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const businessNumber = status?.business_number || '+968 7154 7480';
  const waLink = code ? `https://wa.me/${businessNumber.replace(/[^\d]/g, '')}?text=${encodeURIComponent(code.code)}` : '#';

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        {isRTL ? 'جاري التحميل...' : 'Loading...'}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" data-testid="whatsapp-link-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <WhatsappLogo size={28} weight="fill" className="text-green-600" />
          {isRTL ? 'ربط واتساب' : 'Link WhatsApp'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isRTL
            ? 'اربط رقم واتساب الخاص بك ليتذكّر المساعد سياق محادثاتك.'
            : 'Link your WhatsApp so the assistant remembers your conversation context.'}
        </p>
      </div>

      {status?.linked ? (
        // ── Already linked ──
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6" data-testid="wa-linked-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <Check size={24} weight="bold" className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-green-800">
                {isRTL ? 'واتساب مربوط' : 'WhatsApp Linked'}
              </h2>
              <p className="text-sm text-green-700">
                {isRTL ? 'يمكنك الآن المراسلة بحرية' : 'You can now chat freely'}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">
              {isRTL ? 'الرقم المربوط' : 'Linked phone'}
            </div>
            <div className="font-mono text-slate-800">+{status.phone}</div>
            {status.linked_at && (
              <div className="text-xs text-slate-400 mt-2">
                {isRTL ? 'تم الربط:' : 'Linked on:'} {new Date(status.linked_at).toLocaleString()}
              </div>
            )}
          </div>
          <button
            onClick={handleUnlink}
            disabled={unlinking}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50"
            data-testid="wa-unlink-button"
          >
            <LinkBreak size={14} />
            {unlinking ? (isRTL ? 'جاري...' : 'Unlinking...') : (isRTL ? 'إلغاء الربط' : 'Unlink')}
          </button>
        </div>
      ) : code ? (
        // ── Code generated, waiting for user to send it ──
        <div className="bg-white border-2 border-violet-200 rounded-2xl p-6 text-center" data-testid="wa-code-card">
          <div className="text-xs uppercase tracking-wider text-violet-500 mb-2">
            {isRTL ? 'كودك السري' : 'Your secret code'}
          </div>
          <div
            className="text-4xl font-bold font-mono text-violet-700 tracking-widest mb-2 select-all cursor-pointer"
            onClick={handleCopy}
            data-testid="wa-code-display"
          >
            {code.code}
          </div>
          <div className="text-sm text-slate-500 mb-4">
            {isRTL
              ? `صالح لمدة ${formatTime(secondsLeft)}`
              : `Expires in ${formatTime(secondsLeft)}`}
          </div>

          <div className="flex gap-2 justify-center mb-6">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200"
              data-testid="wa-copy-code"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? (isRTL ? 'تم النسخ' : 'Copied') : (isRTL ? 'نسخ' : 'Copy')}
            </button>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700"
              data-testid="wa-open-button"
            >
              <WhatsappLogo size={14} weight="fill" />
              {isRTL ? 'فتح واتساب' : 'Open WhatsApp'}
            </a>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="font-medium text-slate-800 mb-2">
              {isRTL ? 'خطوات الربط:' : 'How to link:'}
            </div>
            <ol className="space-y-1 list-decimal list-inside text-slate-600">
              <li>
                {isRTL ? 'انسخ الكود ' : 'Copy the code '}
                <span className="font-mono font-bold text-violet-700">{code.code}</span>
              </li>
              <li>
                {isRTL ? 'افتح واتساب وأرسل الكود إلى ' : 'Open WhatsApp and send it to '}
                <span className="font-mono font-bold">{businessNumber}</span>
              </li>
              <li>
                {isRTL ? 'انتظر تأكيد الربط (سيظهر هنا تلقائياً)' : 'Wait for confirmation (auto-detected)'}
              </li>
            </ol>
          </div>

          {secondsLeft === 0 && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50"
              data-testid="wa-regenerate-button"
            >
              <ArrowsClockwise size={14} />
              {isRTL ? 'توليد كود جديد' : 'Generate New Code'}
            </button>
          )}
        </div>
      ) : (
        // ── No active code — show CTA to start linking ──
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center" data-testid="wa-link-cta">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <WhatsappLogo size={32} weight="fill" className="text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {isRTL ? 'لم يتم ربط واتساب بعد' : 'WhatsApp not linked yet'}
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            {isRTL
              ? 'احصل على كود مؤقت لربط رقمك بحسابك. يحفظ المساعد تاريخ محادثاتك ويتذكّرك في كل رسالة.'
              : 'Get a one-time code to link your phone to your account. The assistant will remember your conversation history.'}
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
            data-testid="wa-generate-button"
          >
            <Link size={16} weight="bold" />
            {generating
              ? (isRTL ? 'جاري التوليد...' : 'Generating...')
              : (isRTL ? 'الحصول على كود الربط' : 'Get Linking Code')}
          </button>
        </div>
      )}

      {/* Info card */}
      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
        <div className="font-medium mb-1">
          {isRTL ? 'ماذا يحدث بعد الربط؟' : 'What happens after linking?'}
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-blue-800">
          <li>{isRTL ? 'المساعد يعرف من أنت في كل رسالة' : 'The assistant knows who you are in every message'}</li>
          <li>{isRTL ? 'يحفظ سياق محادثاتك السابقة' : 'Saves your conversation context'}</li>
          <li>{isRTL ? 'يرسل تذكيراتك ومهامك على واتساب' : 'Sends your reminders & tasks to WhatsApp'}</li>
          <li>{isRTL ? 'يمكنك إلغاء الربط في أي وقت' : 'You can unlink anytime'}</li>
        </ul>
      </div>
    </div>
  );
}
