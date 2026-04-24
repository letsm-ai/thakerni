import React, { useState, useEffect, useRef, useCallback } from 'react';
import { whatsappApi } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { WhatsappLogo, QrCode, CheckCircle, XCircle, ArrowClockwise, Link, LinkBreak, Copy, UserCircle } from '@phosphor-icons/react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';

const WhatsApp = () => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Admin: Bot connection state
  const [botStatus, setBotStatus] = useState({ connected: false, initializing: false });
  const [qrCode, setQrCode] = useState(null);
  const [connecting, setConnecting] = useState(false);

  // User: Linking state
  const [linkStatus, setLinkStatus] = useState({ linked: false, phone_number: null });
  const [linkCode, setLinkCode] = useState(null);
  const [codeExpiry, setCodeExpiry] = useState(null);

  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  // ── Admin: Fetch bot connection status ──
  const fetchBotStatus = useCallback(async () => {
    try {
      const [statusRes, qrRes] = await Promise.all([
        whatsappApi.getStatus(),
        whatsappApi.getQR()
      ]);
      setBotStatus(statusRes.data);
      if (!statusRes.data.connected && qrRes.data.qr) {
        setQrCode(qrRes.data.qr);
      } else if (statusRes.data.connected) {
        setQrCode(null);
      }
    } catch (err) {
      console.error('Bot status error:', err);
    }
  }, []);

  // ── User: Fetch link status ──
  const fetchLinkStatus = useCallback(async () => {
    try {
      const res = await whatsappApi.getLinkStatus();
      setLinkStatus(res.data);
    } catch (err) {
      console.error('Link status error:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (isAdmin) await fetchBotStatus();
      await fetchLinkStatus();
      setLoading(false);
    };
    init();

    // Poll for updates
    pollRef.current = setInterval(() => {
      if (isAdmin) fetchBotStatus();
    }, 5000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isAdmin, fetchBotStatus, fetchLinkStatus]);

  // ── Admin: Connect bot ──
  const handleConnect = async () => {
    setConnecting(true);
    try {
      await whatsappApi.connect();
      await fetchBotStatus();
    } catch (err) {
      toast.error('Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await whatsappApi.disconnect();
      setBotStatus({ connected: false });
      setQrCode(null);
      toast.success(isRTL ? 'تم قطع الاتصال' : 'Bot disconnected');
    } catch (err) {
      toast.error('Failed to disconnect');
    }
  };

  // ── User: Generate link code ──
  const handleGenerateCode = async () => {
    try {
      const res = await whatsappApi.generateLinkCode();
      setLinkCode(res.data.code);
      setCodeExpiry(res.data.expires_in_minutes);
      toast.success(isRTL ? 'تم إنشاء الكود!' : 'Link code generated!');
    } catch (err) {
      toast.error(isRTL ? 'فشل إنشاء الكود' : 'Failed to generate code');
    }
  };

  const handleCopyCode = () => {
    if (linkCode) {
      navigator.clipboard.writeText(linkCode);
      toast.success(isRTL ? 'تم نسخ الكود!' : 'Code copied!');
    }
  };

  const handleUnlink = async () => {
    try {
      await whatsappApi.unlinkWhatsApp();
      setLinkStatus({ linked: false, phone_number: null });
      setLinkCode(null);
      toast.success(isRTL ? 'تم إلغاء الربط' : 'WhatsApp unlinked');
    } catch (err) {
      toast.error('Failed to unlink');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto" data-testid="whatsapp-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">{t('whatsAppIntegration')}</h1>
        <p className="text-slate-500 mt-1">{t('connectWhatsApp')}</p>
      </div>

      {/* ═══ ADMIN SECTION: Bot Management ═══ */}
      {isAdmin && (
        <div className="mb-8 p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl" data-testid="admin-bot-section">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <WhatsappLogo size={24} weight="fill" className="text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">{isRTL ? 'إدارة بوت واتساب (أدمن)' : 'WhatsApp Bot Management (Admin)'}</h2>
              <p className="text-xs text-slate-500">{isRTL ? 'ربط رقم البوت البزنس' : 'Connect the bot business number'}</p>
            </div>
            <div className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${
              botStatus.connected ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {botStatus.connected ? (isRTL ? 'متصل' : 'Connected') : (isRTL ? 'غير متصل' : 'Not Connected')}
            </div>
          </div>

          {botStatus.connected ? (
            <div className="bg-white rounded-xl p-4 border border-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle size={24} weight="fill" className="text-green-500" />
                  <div>
                    <p className="font-semibold text-green-700">{isRTL ? 'البوت متصل ويعمل' : 'Bot is connected and running'}</p>
                    <p className="text-xs text-slate-500">{botStatus.user?.name || botStatus.user?.id || ''}</p>
                  </div>
                </div>
                <button onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  data-testid="disconnect-bot-btn">
                  {isRTL ? 'قطع الاتصال' : 'Disconnect'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 border border-green-100 text-center">
              {qrCode ? (
                <div>
                  <p className="text-sm text-slate-600 mb-4">
                    {isRTL ? 'امسح الكود من واتساب البزنس على رقم البوت' : 'Scan with WhatsApp Business on the bot phone'}
                  </p>
                  <div className="inline-block p-4 bg-white rounded-xl shadow-sm border">
                    <QRCode value={qrCode} size={200} data-testid="bot-qr-code" />
                  </div>
                  <div className="mt-3 flex justify-center">
                    <button onClick={fetchBotStatus}
                      className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                      <ArrowClockwise size={14} /> {isRTL ? 'تحديث' : 'Refresh'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <QrCode size={48} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 mb-4">
                    {isRTL ? 'اضغط لإنشاء QR Code لربط رقم البوت' : 'Click to generate QR Code for the bot number'}
                  </p>
                  <button onClick={handleConnect} disabled={connecting}
                    className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                    data-testid="connect-bot-btn">
                    {connecting ? (isRTL ? 'جاري الاتصال...' : 'Connecting...') : (isRTL ? 'إنشاء QR Code' : 'Generate QR Code')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ USER SECTION: Link WhatsApp Number ═══ */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl" data-testid="user-link-section">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <UserCircle size={24} weight="fill" className="text-violet-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">{isRTL ? 'ربط واتسابك بالمساعد' : 'Link Your WhatsApp'}</h2>
            <p className="text-xs text-slate-500">{isRTL ? 'اربط رقمك عشان تراسل المساعد الذكي' : 'Link your number to chat with the AI assistant'}</p>
          </div>
        </div>

        {linkStatus.linked ? (
          /* ── Linked State ── */
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle size={28} weight="fill" className="text-green-500" />
                <div>
                  <p className="font-semibold text-green-800">{isRTL ? 'واتسابك مربوط!' : 'WhatsApp Linked!'}</p>
                  <p className="text-sm text-green-600 font-mono">{linkStatus.phone_number}</p>
                </div>
              </div>
              <button onClick={handleUnlink}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                data-testid="unlink-btn">
                <LinkBreak size={16} /> {isRTL ? 'إلغاء الربط' : 'Unlink'}
              </button>
            </div>
            <div className="mt-4 bg-white rounded-lg p-4 border border-green-100">
              <p className="text-sm text-slate-700">
                {isRTL
                  ? '✅ الآن أرسل أي رسالة (نصية أو صوتية) لرقم المساعد على واتساب وسيرد عليك!'
                  : '✅ Now send any message (text or voice) to the assistant\'s WhatsApp number and it will reply!'}
              </p>
            </div>
          </div>
        ) : (
          /* ── Not Linked State ── */
          <div>
            {linkCode ? (
              /* ── Code Generated ── */
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-4">
                  {isRTL
                    ? 'أرسل هذا الكود لرقم المساعد على واتساب:'
                    : 'Send this code to the assistant\'s WhatsApp number:'}
                </p>
                <div className="inline-flex items-center gap-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl px-8 py-5">
                  <span className="text-3xl font-mono font-bold text-slate-900 tracking-wider" data-testid="link-code">{linkCode}</span>
                  <button onClick={handleCopyCode}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors" data-testid="copy-code-btn">
                    <Copy size={20} className="text-slate-500" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-3">
                  {isRTL ? `ينتهي خلال ${codeExpiry} دقائق` : `Expires in ${codeExpiry} minutes`}
                </p>

                <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-right max-w-md mx-auto">
                  <p className="text-sm font-semibold text-blue-800 mb-2">{isRTL ? 'الخطوات:' : 'Steps:'}</p>
                  <ol className="text-sm text-blue-700 space-y-1" dir="auto">
                    <li>{isRTL ? '1. انسخ الكود أعلاه' : '1. Copy the code above'}</li>
                    <li>{isRTL ? '2. افتح واتساب وراسل رقم المساعد' : '2. Open WhatsApp and message the assistant number'}</li>
                    <li>{isRTL ? '3. أرسل الكود كرسالة' : '3. Send the code as a message'}</li>
                    <li>{isRTL ? '4. ستتلقى رسالة تأكيد الربط!' : '4. You\'ll receive a confirmation!'}</li>
                  </ol>
                </div>

                <button onClick={handleGenerateCode}
                  className="mt-4 text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mx-auto">
                  <ArrowClockwise size={14} /> {isRTL ? 'إنشاء كود جديد' : 'Generate new code'}
                </button>
              </div>
            ) : (
              /* ── No Code Yet ── */
              <div className="text-center py-4">
                <WhatsappLogo size={56} weight="fill" className="text-green-400 mx-auto mb-4" />
                <p className="text-slate-600 mb-2">
                  {isRTL
                    ? 'اربط رقم واتسابك عشان تقدر تراسل المساعد الذكي'
                    : 'Link your WhatsApp number to chat with the AI assistant'}
                </p>
                <p className="text-xs text-slate-400 mb-6">
                  {isRTL ? 'ستحصل على كود ترسله لرقم المساعد' : 'You\'ll get a code to send to the assistant\'s number'}
                </p>
                <button onClick={handleGenerateCode}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
                  data-testid="generate-link-code-btn">
                  <Link size={20} weight="bold" />
                  {isRTL ? 'ربط واتساب' : 'Link WhatsApp'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsApp;
