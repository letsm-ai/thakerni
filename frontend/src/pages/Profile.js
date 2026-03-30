import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi, subscriptionApi } from '../lib/api';
import { User, EnvelopeSimple, Calendar, PencilSimple, Check, CrownSimple, Lightning, ArrowRight } from '@phosphor-icons/react';
import { toast } from 'sonner';

const Profile = () => {
  const { user, setUserData } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const [subRes, plansRes] = await Promise.all([
        subscriptionApi.getStatus(),
        subscriptionApi.getPlans()
      ]);
      setSubscription(subRes.data);
      setPlans(plansRes.data.plans || []);
    } catch (err) {
      // Subscription might not be set yet
      setSubscription({ plan_id: 'free', plan_name: 'Free' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await userApi.updateProfile({ name });
      setUserData(response.data);
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async (planId) => {
    setCheckoutLoading(planId);
    try {
      const res = await subscriptionApi.createCheckout(planId);
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (error) {
      toast.error('Failed to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const currentPlanId = subscription?.plan_id || 'free';

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto" data-testid="profile-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">Profile</h1>
        <p className="text-slate-500 mt-1">Manage your account settings</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                <User size={32} className="text-slate-400" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              {editing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xl font-semibold text-slate-900 bg-white border border-slate-200 rounded-md px-3 py-1 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none"
                  data-testid="name-input"
                />
              ) : (
                <h2 className="text-xl font-semibold text-slate-900 font-heading">{user?.name}</h2>
              )}

              {editing ? (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-[#002FA7] text-white rounded-md px-4 py-2 text-sm font-semibold hover:bg-[#001A7A] transition-colors disabled:opacity-50"
                  data-testid="save-profile-button"
                >
                  <Check size={16} weight="bold" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-50 transition-colors"
                  data-testid="edit-profile-button"
                >
                  <PencilSimple size={16} />
                  Edit
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

        {/* Current Plan Badge */}
        <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-lg">
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            currentPlanId === 'business' ? 'bg-violet-100 text-violet-700' :
            currentPlanId === 'pro' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-200 text-slate-600'
          }`}>
            {subscription?.plan_name || 'Free'}
          </div>
          <span className="text-sm text-slate-500">
            {currentPlanId === 'free' ? 'Upgrade to unlock all features' : 'Active subscription'}
          </span>
        </div>

        {/* Plan Cards */}
        <div className="space-y-3">
          {plans.filter(p => p.plan_id !== 'free').map((plan) => {
            const isCurrent = plan.plan_id === currentPlanId;
            const isUpgrade = plans.findIndex(p => p.plan_id === plan.plan_id) > plans.findIndex(p => p.plan_id === currentPlanId);

            return (
              <div
                key={plan.plan_id}
                className={`border rounded-lg p-4 transition-all ${
                  isCurrent ? 'border-violet-300 bg-violet-50/50' : 'border-slate-200 hover:border-slate-300'
                }`}
                data-testid={`plan-card-${plan.plan_id}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                      {isCurrent && (
                        <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full">Current</span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      ${plan.price}<span className="text-sm font-normal text-slate-500">/mo</span>
                    </p>
                  </div>

                  {isCurrent ? (
                    <div className="text-sm text-violet-600 font-medium">Active</div>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => handleUpgrade(plan.plan_id)}
                      disabled={checkoutLoading === plan.plan_id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
                      data-testid={`upgrade-${plan.plan_id}-button`}
                    >
                      {checkoutLoading === plan.plan_id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Lightning size={16} weight="fill" />
                          Upgrade
                        </>
                      )}
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {plan.features.slice(0, 3).map((feat, i) => (
                    <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                      {feat}
                    </span>
                  ))}
                  {plan.features.length > 3 && (
                    <span className="text-xs text-slate-400">+{plan.features.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
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
