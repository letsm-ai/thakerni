import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../lib/api';
import { User, EnvelopeSimple, Calendar, PencilSimple, Check } from '@phosphor-icons/react';
import { toast } from 'sonner';

const Profile = () => {
  const { user, setUserData } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

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

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

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
          {/* Avatar */}
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

          {/* Info */}
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
