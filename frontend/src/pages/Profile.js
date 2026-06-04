import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { userApi, subscriptionApi, exportApi, emailApi, thawaniApi } from '../lib/api';
import { User, EnvelopeSimple, Calendar, PencilSimple, Check, CrownSimple, Lightning } from '@phosphor-icons/react';
import { toast } from 'sonner';
import NotificationsSection from '../components/profile/NotificationsSection';
import EmailDigestSection from '../components/profile/EmailDigestSection';
import EmailConfigSection from '../components/profile/EmailConfigSection';
import DataExportSection from '../components/profile/DataExportSection';
import AccountInfoSection from '../components/profile/AccountInfoSection';

const Profile = () => {
  const { user, setUserData } = useAuth();
  const { t, isRTL } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [exporting, setExporting] = useState(null);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [emailPrefs, setEmailPrefs] = useState({ weekly_digest: true, reminder_alerts: true });
  const [sendingDigest, setSendingDigest] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [digestSchedule, setDigestSchedule] = useState(null);
  const [exportFormat, setExportFormat] = useState('json');
  const [emailConfig, setEmailConfig] = useState(null);
  const [resendKey, setResendKey] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
  const [thawaniEnabled, setThawaniEnabled] = useState(false);

  useEffect(() => { loadSubscription(); loadEmailPrefs(); loadDigestSchedule(); loadEmailConfig(); loadThawaniConfig(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadThawaniConfig = async () => {
    try {
      const res = await thawaniApi.getConfig();
      setThawaniEnabled(res.data.enabled);
    } catch { /* non-critical */ }
  };

  const loadSubscription = async () => {
    try {
      const [subRes, plansRes] = await Promise.all([
        subscriptionApi.getStatus(),
        subscriptionApi.getPlans()
      ]);
      setSubscription(subRes.data);
      setPlans(plansRes.data.plans || []);
    } catch {
      setSubscription({ plan_id: 'free', plan_name: 'Free' });
    }
  };

  const loadEmailPrefs = async () => {
    try {
      const res = await emailApi.getPreferences();
      setEmailPrefs(res.data.preferences);
    } catch { /* defaults are fine */ }
  };

  const loadDigestSchedule = async () => {
    try {
      const res = await emailApi.getSchedule();
      setDigestSchedule(res.data);
    } catch { /* non-critical */ }
  };

  const loadEmailConfig = async () => {
    try {
      const res = await emailApi.getConfig();
      setEmailConfig(res.data);
      if (res.data.sender_email) setSenderEmail(res.data.sender_email);
    } catch { /* non-admin users won't have access */ }
  };

  const handleSaveEmailConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await emailApi.updateConfig({ resend_api_key: resendKey, sender_email: senderEmail });
      setEmailConfig(res.data);
      setResendKey('');
      if (res.data.test_result === 'success') {
        toast.success('Email configured! A test email has been sent to your inbox.');
      } else if (res.data.test_result) {
        toast.error(`Key saved but test failed: ${res.data.test_result}`);
      } else {
        toast.success('Email configuration updated.');
      }
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to save config'); }
    finally { setSavingConfig(false); }
  };

  const toggleEmailPref = async (key) => {
    const updated = { ...emailPrefs, [key]: !emailPrefs[key] };
    setEmailPrefs(updated);
    try {
      await emailApi.updatePreferences(updated);
      toast.success('Email preferences updated');
    } catch { toast.error('Failed to update preferences'); }
  };

  const handleSendDigest = async () => {
    setSendingDigest(true);
    try {
      const res = await emailApi.sendDigest();
      if (res.data.success) toast.success(res.data.message);
      else toast.error(res.data.message);
    } catch { toast.error('Failed to send digest'); }
    finally { setSendingDigest(false); }
  };

  const handlePreviewDigest = async () => {
    try {
      const res = await emailApi.previewDigest();
      setPreviewHtml(res.data.html);
    } catch { toast.error('Failed to load preview'); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await userApi.updateProfile({ name });
      setUserData(response.data);
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch { toast.error('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const handleUpgrade = async (planId) => {
    setCheckoutLoading(planId);
    try {
      const res = await subscriptionApi.createCheckout(planId);
      if (res.data.url) window.location.href = res.data.url;
    } catch { toast.error('Failed to start checkout. Please try again.'); }
    finally { setCheckoutLoading(null); }
  };

  const handleThawaniUpgrade = async (planId) => {
    const key = `thawani_${planId}`;
    setCheckoutLoading(key);
    try {
      const res = await thawaniApi.createSession(planId, billingCycle);
      if (res.data.url) {
        window.location.href = res.data.url;
      } else {
        toast.error(isRTL ? 'تعذّر إنشاء جلسة الدفع' : 'Could not create payment session');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || (isRTL ? 'فشل في إنشاء جلسة الدفع' : 'Failed to start Thawani checkout'));
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleExport = async (type) => {
    setExporting(type);
    try {
      let res;
      if (type === 'tasks') res = await exportApi.exportTasks(exportFormat);
      else if (type === 'reminders') res = await exportApi.exportReminders(exportFormat);
      else if (type === 'conversations') res = await exportApi.exportConversations(exportFormat);
      else res = await exportApi.exportAll(exportFormat);

      let blob, ext;
      if (exportFormat === 'csv') {
        blob = new Blob([res.data], { type: 'text/csv' });
        ext = 'csv';
      } else {
        blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        ext = 'json';
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `letsm-${type}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} exported as ${ext.toUpperCase()}`);
    } catch { toast.error('Export failed. Please try again.'); }
    finally { setExporting(null); }
  };

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      toast.error('Browser notifications not supported');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === 'granted') {
      toast.success('Notifications enabled! You\'ll receive reminder alerts.');
      new Notification('Letsm AI', { body: 'Notifications enabled! We\'ll remind you when tasks are due.', icon: '/favicon.ico' });
    } else {
      toast.error('Notification permission denied');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const currentPlanId = subscription?.plan_id || 'free';

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto" data-testid="profile-page">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">{t('profileTitle')}</h1>
        <p className="text-slate-500 mt-1">{t('manageAccount')}</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                <User size={32} className="text-slate-400" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              {editing ? (
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="text-xl font-semibold text-slate-900 bg-white border border-slate-200 rounded-md px-3 py-1 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none"
                  data-testid="name-input" />
              ) : (
                <h2 className="text-xl font-semibold text-slate-900 font-heading">{user?.name}</h2>
              )}
              {editing ? (
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 bg-[#002FA7] text-white rounded-md px-4 py-2 text-sm font-semibold hover:bg-[#001A7A] transition-colors disabled:opacity-50"
                  data-testid="save-profile-button">
                  <Check size={16} weight="bold" />{saving ? 'Saving...' : 'Save'}
                </button>
              ) : (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
                  data-testid="edit-profile-button">
                  <PencilSimple size={16} />Edit
                </button>
              )}
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 text-slate-600">
                <EnvelopeSimple size={18} className="text-slate-400" />
                <span className="text-sm">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Calendar size={18} className="text-slate-400" />
                <span className="text-sm">Joined {formatDate(user?.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6" data-testid="subscription-section">
        <div className="flex items-center gap-3 mb-4">
          <CrownSimple size={22} className="text-violet-600" weight="fill" />
          <h3 className="font-semibold text-slate-900">{isRTL ? 'خطة الاشتراك' : 'Subscription Plan'}</h3>
        </div>
        <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-lg">
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            currentPlanId === 'business' ? 'bg-violet-100 text-violet-700' :
            currentPlanId === 'pro' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-200 text-slate-600'
          }`}>{subscription?.plan_name || 'Free'}</div>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-slate-500 block">
              {currentPlanId === 'free' ? (isRTL ? 'ارتقِ بحسابك للوصول لجميع المميزات' : 'Upgrade to unlock all features') : (isRTL ? 'اشتراك فعّال' : 'Active subscription')}
            </span>
            {subscription?.expires_at && (
              <span className="text-xs text-slate-400 block mt-0.5" data-testid="subscription-expires-at">
                {isRTL ? 'ينتهي في: ' : 'Expires: '}{new Date(subscription.expires_at).toLocaleDateString(isRTL ? 'ar-OM' : 'en-US')}
              </span>
            )}
          </div>
        </div>

        {/* Billing cycle toggle */}
        {thawaniEnabled && currentPlanId === 'free' && (
          <div className="flex justify-center mb-4">
            <div className="inline-flex bg-slate-100 rounded-full p-1" data-testid="billing-cycle-toggle">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${billingCycle === 'monthly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                data-testid="billing-monthly"
              >{isRTL ? 'شهري' : 'Monthly'}</button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${billingCycle === 'yearly' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                data-testid="billing-yearly"
              >{isRTL ? 'سنوي (وفّر شهرين)' : 'Yearly (save 2 months)'}</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {plans.filter(p => p.plan_id !== 'free').map((plan) => {
            const isCurrent = plan.plan_id === currentPlanId;
            const isUpgrade = plans.findIndex(p => p.plan_id === plan.plan_id) > plans.findIndex(p => p.plan_id === currentPlanId);
            const isYearly = billingCycle === 'yearly';
            const displayPrice = isYearly && plan.price_yearly ? plan.price_yearly : plan.price;
            const cycleSuffix = plan.currency === 'omr'
              ? (isRTL ? (isYearly ? 'ر.ع/سنوياً' : 'ر.ع/شهرياً') : (isYearly ? 'OMR/yr' : 'OMR/mo'))
              : `${plan.currency}/${isYearly ? 'yr' : 'mo'}`;
            return (
              <div key={plan.plan_id}
                className={`border rounded-lg p-4 transition-all ${isCurrent ? 'border-violet-300 bg-violet-50/50' : 'border-slate-200 hover:border-slate-300'}`}
                data-testid={`plan-card-${plan.plan_id}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                      {isCurrent && <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full">{isRTL ? 'الحالي' : 'Current'}</span>}
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{displayPrice} <span className="text-sm font-normal text-slate-500">{cycleSuffix}</span></p>
                  </div>
                  {isCurrent ? (
                    <div className="text-sm text-violet-600 font-medium">{isRTL ? 'فعّال' : 'Active'}</div>
                  ) : isUpgrade ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      {thawaniEnabled && (
                        <button onClick={() => handleThawaniUpgrade(plan.plan_id)} disabled={checkoutLoading === `thawani_${plan.plan_id}`}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                          data-testid={`thawani-upgrade-${plan.plan_id}-button`}>
                          {checkoutLoading === `thawani_${plan.plan_id}` ? (
                            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{isRTL ? 'جارٍ التحويل...' : 'Processing...'}</>
                          ) : (
                            <><Lightning size={16} weight="fill" />{isRTL ? 'اشترك عبر ثواني' : 'Subscribe with Thawani'}</>
                          )}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(isRTL ? plan.features_ar || plan.features : plan.features).slice(0, 3).map((feat) => (
                    <span key={feat} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{feat}</span>
                  ))}
                  {plan.features.length > 3 && <span className="text-xs text-slate-400">+{plan.features.length - 3} {isRTL ? 'أخرى' : 'more'}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      <NotificationsSection
        notifPermission={notifPermission}
        onEnable={requestNotificationPermission}
      />

      {/* Email Digest */}
      <EmailDigestSection
        digestSchedule={digestSchedule}
        emailPrefs={emailPrefs}
        sendingDigest={sendingDigest}
        previewHtml={previewHtml}
        onTogglePref={toggleEmailPref}
        onPreview={handlePreviewDigest}
        onSend={handleSendDigest}
        onClosePreview={() => setPreviewHtml(null)}
      />

      {/* Email Configuration (Admin only) */}
      <EmailConfigSection
        emailConfig={emailConfig}
        resendKey={resendKey}
        senderEmail={senderEmail}
        savingConfig={savingConfig}
        onResendKeyChange={setResendKey}
        onSenderEmailChange={setSenderEmail}
        onSave={handleSaveEmailConfig}
      />

      {/* Data Export */}
      <DataExportSection
        exportFormat={exportFormat}
        exporting={exporting}
        onFormatChange={setExportFormat}
        onExport={handleExport}
      />

      {/* Account Info */}
      <AccountInfoSection user={user} formatDate={formatDate} />
    </div>
  );
};

export default Profile;
