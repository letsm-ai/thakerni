import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi, subscriptionApi, exportApi, emailApi } from '../lib/api';
import { User, EnvelopeSimple, Calendar, PencilSimple, Check, CrownSimple, Lightning, DownloadSimple, BellRinging, Export, Envelope, Eye } from '@phosphor-icons/react';
import { toast } from 'sonner';

const Profile = () => {
  const { user, setUserData } = useAuth();
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

  useEffect(() => { loadSubscription(); loadEmailPrefs(); loadDigestSchedule(); }, []);

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

  const handleExport = async (type) => {
    setExporting(type);
    try {
      let res;
      if (type === 'tasks') res = await exportApi.exportTasks();
      else if (type === 'reminders') res = await exportApi.exportReminders();
      else if (type === 'conversations') res = await exportApi.exportConversations();
      else res = await exportApi.exportAll();

      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `letsm-${type}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully`);
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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">Profile</h1>
        <p className="text-slate-500 mt-1">Manage your account settings</p>
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
          <h3 className="font-semibold text-slate-900">Subscription Plan</h3>
        </div>
        <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-lg">
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            currentPlanId === 'business' ? 'bg-violet-100 text-violet-700' :
            currentPlanId === 'pro' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-200 text-slate-600'
          }`}>{subscription?.plan_name || 'Free'}</div>
          <span className="text-sm text-slate-500">
            {currentPlanId === 'free' ? 'Upgrade to unlock all features' : 'Active subscription'}
          </span>
        </div>
        <div className="space-y-3">
          {plans.filter(p => p.plan_id !== 'free').map((plan) => {
            const isCurrent = plan.plan_id === currentPlanId;
            const isUpgrade = plans.findIndex(p => p.plan_id === plan.plan_id) > plans.findIndex(p => p.plan_id === currentPlanId);
            return (
              <div key={plan.plan_id}
                className={`border rounded-lg p-4 transition-all ${isCurrent ? 'border-violet-300 bg-violet-50/50' : 'border-slate-200 hover:border-slate-300'}`}
                data-testid={`plan-card-${plan.plan_id}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                      {isCurrent && <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full">Current</span>}
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-1">${plan.price}<span className="text-sm font-normal text-slate-500">/mo</span></p>
                  </div>
                  {isCurrent ? (
                    <div className="text-sm text-violet-600 font-medium">Active</div>
                  ) : isUpgrade ? (
                    <button onClick={() => handleUpgrade(plan.plan_id)} disabled={checkoutLoading === plan.plan_id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                      data-testid={`upgrade-${plan.plan_id}-button`}>
                      {checkoutLoading === plan.plan_id ? (
                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Processing...</>
                      ) : (
                        <><Lightning size={16} weight="fill" />Upgrade</>
                      )}
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plan.features.slice(0, 3).map((feat, i) => (
                    <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{feat}</span>
                  ))}
                  {plan.features.length > 3 && <span className="text-xs text-slate-400">+{plan.features.length - 3} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notifications Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6" data-testid="notifications-section">
        <div className="flex items-center gap-3 mb-4">
          <BellRinging size={22} className="text-blue-600" weight="fill" />
          <h3 className="font-semibold text-slate-900">Browser Notifications</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Get browser alerts when your reminders are due and tasks need attention.
        </p>
        <div className="flex items-center gap-3">
          {notifPermission === 'granted' ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <Check size={16} className="text-green-600" weight="bold" />
              <span className="text-sm font-medium text-green-700">Notifications enabled</span>
            </div>
          ) : notifPermission === 'denied' ? (
            <div className="text-sm text-slate-500">
              Notifications are blocked. Please enable them in your browser settings.
            </div>
          ) : (
            <button onClick={requestNotificationPermission}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              data-testid="enable-notifications-button">
              <BellRinging size={16} weight="fill" />
              Enable Notifications
            </button>
          )}
        </div>
      </div>

      {/* Email Digest Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6" data-testid="email-digest-section">
        <div className="flex items-center gap-3 mb-4">
          <Envelope size={22} className="text-violet-600" weight="fill" />
          <h3 className="font-semibold text-slate-900">Weekly Email Digest</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Receive a weekly summary of your productivity stats, completed tasks, and upcoming items every Sunday.
        </p>

        {digestSchedule?.next_run && (
          <div className="flex items-center gap-2 p-3 bg-violet-50 border border-violet-200 rounded-lg mb-4 text-sm" data-testid="digest-schedule-info">
            <Calendar size={16} className="text-violet-600 flex-shrink-0" />
            <span className="text-violet-800">
              Next automated digest: <strong>{new Date(digestSchedule.next_run).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
            </span>
          </div>
        )}

        <div className="space-y-3 mb-4">
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer">
            <div>
              <span className="text-sm font-medium text-slate-700">Weekly Digest</span>
              <p className="text-xs text-slate-500">Sunday morning summary email</p>
            </div>
            <button
              onClick={() => toggleEmailPref('weekly_digest')}
              className={`relative w-11 h-6 rounded-full transition-colors ${emailPrefs.weekly_digest ? 'bg-violet-600' : 'bg-slate-300'}`}
              data-testid="toggle-weekly-digest"
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailPrefs.weekly_digest ? 'left-[22px]' : 'left-0.5'}`}></span>
            </button>
          </label>
          <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer">
            <div>
              <span className="text-sm font-medium text-slate-700">Reminder Alerts</span>
              <p className="text-xs text-slate-500">Email when reminders are due</p>
            </div>
            <button
              onClick={() => toggleEmailPref('reminder_alerts')}
              className={`relative w-11 h-6 rounded-full transition-colors ${emailPrefs.reminder_alerts ? 'bg-violet-600' : 'bg-slate-300'}`}
              data-testid="toggle-reminder-alerts"
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailPrefs.reminder_alerts ? 'left-[22px]' : 'left-0.5'}`}></span>
            </button>
          </label>
        </div>

        <div className="flex gap-3">
          <button onClick={handlePreviewDigest}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            data-testid="preview-digest-button">
            <Eye size={16} />Preview Digest
          </button>
          <button onClick={handleSendDigest} disabled={sendingDigest}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
            data-testid="send-digest-button">
            {sendingDigest ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Envelope size={16} weight="fill" />
            )}
            Send Now
          </button>
        </div>

        {/* Digest Preview */}
        {previewHtml && (
          <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden" data-testid="digest-preview">
            <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-b">
              <span className="text-xs font-medium text-slate-500">Digest Preview</span>
              <button onClick={() => setPreviewHtml(null)} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
            </div>
            <iframe
              srcDoc={previewHtml}
              title="Digest Preview"
              className="w-full h-[500px] border-0"
              sandbox="allow-same-origin"
            />
          </div>
        )}
      </div>

      {/* Data Export Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6" data-testid="export-section">
        <div className="flex items-center gap-3 mb-4">
          <Export size={22} className="text-emerald-600" weight="fill" />
          <h3 className="font-semibold text-slate-900">Export Your Data</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Download your data as JSON files. You own your data.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'tasks', label: 'Tasks' },
            { key: 'reminders', label: 'Reminders' },
            { key: 'conversations', label: 'Conversations' },
            { key: 'all', label: 'All Data' }
          ].map(item => (
            <button key={item.key} onClick={() => handleExport(item.key)} disabled={exporting === item.key}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 text-sm font-medium text-slate-700"
              data-testid={`export-${item.key}-button`}>
              {exporting === item.key ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <DownloadSimple size={16} />
              )}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Account Information</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">User ID</label>
            <p className="text-sm text-slate-700 mt-1 font-mono">{user?.user_id}</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Email Address</label>
            <p className="text-sm text-slate-700 mt-1">{user?.email}</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Account Created</label>
            <p className="text-sm text-slate-700 mt-1">{formatDate(user?.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
