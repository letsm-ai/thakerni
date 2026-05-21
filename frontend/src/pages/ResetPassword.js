import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { Lock, Eye, EyeSlash, CheckCircle, ArrowLeft } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ResetPassword = () => {
  const { isRTL } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError(isRTL ? 'رابط غير صالح. اطلب رابطاً جديداً.' : 'Invalid link. Please request a new one.');
      return;
    }
    if (password.length < 6) {
      setError(isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError(isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.detail || (isRTL ? 'الرابط غير صالح أو منتهي الصلاحية' : 'Invalid or expired link'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link to="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6" data-testid="back-to-login">
          <ArrowLeft size={16} />
          {isRTL ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {done ? (
            <div className="text-center" data-testid="reset-success">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={32} weight="fill" className="text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {isRTL ? 'تم تحديث كلمة المرور' : 'Password updated'}
              </h1>
              <p className="text-slate-500 text-sm">
                {isRTL
                  ? 'جاري تحويلك لصفحة تسجيل الدخول...'
                  : 'Redirecting you to sign in...'}
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-heading" data-testid="reset-title">
                {isRTL ? 'تعيين كلمة مرور جديدة' : 'Set a new password'}
              </h1>
              <p className="mt-2 text-slate-500 text-sm">
                {isRTL
                  ? 'اختر كلمة مرور قوية تستخدمها فقط لهذا الحساب.'
                  : 'Choose a strong password you only use for this account.'}
              </p>

              {error && (
                <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm" data-testid="reset-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    {isRTL ? 'كلمة المرور الجديدة' : 'New password'}
                  </label>
                  <div className="relative">
                    <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full ${isRTL ? 'pr-10 pl-12' : 'pl-10 pr-12'} py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:bg-white outline-none transition-all text-sm`}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      data-testid="reset-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
                      data-testid="reset-toggle-password"
                    >
                      {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    {isRTL ? 'تأكيد كلمة المرور' : 'Confirm password'}
                  </label>
                  <div className="relative">
                    <Lock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:bg-white outline-none transition-all text-sm`}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      data-testid="reset-confirm-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl px-6 py-3 font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="reset-submit-button"
                >
                  {loading
                    ? (isRTL ? 'جاري التحديث...' : 'Updating...')
                    : (isRTL ? 'تحديث كلمة المرور' : 'Update password')}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
