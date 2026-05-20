import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../context/LanguageContext';
import { EnvelopeSimple, ArrowLeft, CheckCircle } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ForgotPassword = () => {
  const { isRTL } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || (isRTL ? 'حدث خطأ، حاول مرة أخرى' : 'Something went wrong'));
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
          {submitted ? (
            <div className="text-center" data-testid="forgot-success">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle size={32} weight="fill" className="text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2" data-testid="forgot-success-title">
                {isRTL ? 'تحقق من بريدك' : 'Check your inbox'}
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                {isRTL
                  ? 'إذا كان لديك حساب فستصلك رسالة فيها رابط لإعادة تعيين كلمة المرور. الرابط صالح لمدة ساعة واحدة.'
                  : "If an account exists for that email, you'll receive a reset link shortly. The link expires in 1 hour."}
              </p>
              <Link
                to="/login"
                className="inline-block mt-6 text-sm bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent font-semibold hover:underline"
                data-testid="forgot-success-back-link"
              >
                {isRTL ? 'العودة لتسجيل الدخول' : 'Back to sign in'}
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-heading" data-testid="forgot-title">
                {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
              </h1>
              <p className="mt-2 text-slate-500 text-sm">
                {isRTL
                  ? 'أدخل بريدك الإلكتروني وراح نرسل لك رابط لإعادة التعيين.'
                  : "Enter the email associated with your account and we'll send you a reset link."}
              </p>

              {error && (
                <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm" data-testid="forgot-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <EnvelopeSimple className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:bg-white outline-none transition-all text-sm`}
                      placeholder={isRTL ? 'example@email.com' : 'you@example.com'}
                      required
                      data-testid="forgot-email-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl px-6 py-3 font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="forgot-submit-button"
                >
                  {loading
                    ? (isRTL ? 'جاري الإرسال...' : 'Sending...')
                    : (isRTL ? 'إرسال رابط إعادة التعيين' : 'Send reset link')}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
