import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { EnvelopeSimple, Lock, User, Eye, EyeSlash, GoogleLogo, ChatCircle, CheckCircle, Bell, CalendarBlank } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register, loginWithGoogleCredential } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || (isRTL ? 'حدث خطأ' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleSuccess = async (resp) => {
    setError('');
    try {
      await loginWithGoogleCredential(resp.credential);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || (isRTL ? 'فشل تسجيل الدخول بقوقل' : 'Google sign-in failed'));
    }
  };

  const handleGoogleError = () => {
    setError(isRTL ? 'تعذّر إكمال تسجيل الدخول بقوقل' : 'Could not complete Google sign-in');
  };

  const features = [
    { icon: ChatCircle, text: isRTL ? 'محادثات ذكية بالعربي والإنجليزي' : 'Smart AI conversations' },
    { icon: CheckCircle, text: isRTL ? 'إدارة المهام والتذكيرات' : 'Task & reminder management' },
    { icon: Bell, text: isRTL ? 'رسائل صوتية وواتساب' : 'Voice messages & WhatsApp' },
    { icon: CalendarBlank, text: isRTL ? 'تقويم وجدولة ذكية' : 'Smart calendar & scheduling' },
  ];

  return (
    <div className="min-h-screen flex" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ═══ Left Panel — Brand Showcase ═══ */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a2e] via-[#1a1a4e] to-[#0d2847]" />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-violet-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          {/* Top — Logo */}
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <img src="/logo.jpeg" alt="AI by Let's M" className="h-12 w-auto rounded-xl shadow-lg shadow-cyan-500/20" />
              <span className="text-white font-bold text-xl">Let's M <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">AI</span></span>
            </Link>
          </div>

          {/* Middle — Value prop */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight font-heading">
                {isRTL ? 'مساعدك الذكي\nالشخصي' : 'Your Personal\nAI Assistant'}
              </h2>
              <p className="mt-4 text-slate-300 text-lg leading-relaxed max-w-sm">
                {isRTL 
                  ? 'أدر مهامك، جدولك، وإنتاجيتك من خلال المحادثة الطبيعية'
                  : 'Manage tasks, schedules, and productivity through natural conversation'}
              </p>
            </div>

            {/* Features list */}
            <div className="space-y-4">
              {features.map((f, i) => (
                <motion.div
                  key={f.text}
                  initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                    <f.icon size={20} weight="fill" className="text-cyan-400" />
                  </div>
                  <span className="text-white/80 text-sm">{f.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom — Social proof */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2 rtl:space-x-reverse">
              {['bg-cyan-400', 'bg-blue-400', 'bg-violet-400', 'bg-emerald-400'].map((c, i) => (
                <div key={c} className={`w-8 h-8 rounded-full ${c} border-2 border-[#0a0a2e] flex items-center justify-center text-white text-xs font-bold`}>
                  {['M', 'A', 'S', 'K'][i]}
                </div>
              ))}
            </div>
            <div>
              <p className="text-white/70 text-sm">{isRTL ? 'انضم لمستخدمينا' : 'Join our users'}</p>
              <p className="text-cyan-400 text-xs font-medium">{isRTL ? 'ابدأ مجاناً اليوم' : 'Start free today'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Right Panel — Auth Form ═══ */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-8 lg:p-16 bg-slate-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center justify-center">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo.jpeg" alt="AI by Let's M" className="h-12 w-auto rounded-xl" />
              <span className="font-bold text-xl text-slate-900">Let's M <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">AI</span></span>
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            {/* Header */}
            <div className="mb-7">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-heading" data-testid="auth-title">
                {isLogin 
                  ? (isRTL ? 'مرحباً بعودتك' : 'Welcome back') 
                  : (isRTL ? 'إنشاء حساب' : 'Create account')}
              </h1>
              <p className="mt-2 text-slate-500 text-sm">
                {isLogin 
                  ? (isRTL ? 'سجّل دخولك للمتابعة' : 'Sign in to continue to your dashboard')
                  : (isRTL ? 'ابدأ مجاناً مع Let\'s M AI' : 'Get started free with Let\'s M AI')}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm" data-testid="error-message">
                {error}
              </div>
            )}

            {/* Google Login — Top for quick access (direct GIS, no Emergent wrapper) */}
            <div className="w-full flex justify-center" data-testid="google-login-container">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text={isLogin ? 'signin_with' : 'signup_with'}
                shape="pill"
                size="large"
                width="320"
                useOneTap={false}
                logo_alignment="left"
                locale={isRTL ? 'ar' : 'en'}
              />
            </div>

            {/* Fallback styled button hint for users without GIS support */}
            <noscript>
              <button className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 border border-slate-200 rounded-xl px-6 py-3 font-medium mt-3">
                <GoogleLogo size={20} weight="bold" />
                {isRTL ? 'المتابعة مع Google' : 'Continue with Google'}
              </button>
            </noscript>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-slate-200"></div>
              <span className="px-4 text-xs text-slate-400 uppercase tracking-wider">{isRTL ? 'أو' : 'or'}</span>
              <div className="flex-1 border-t border-slate-200"></div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    {isRTL ? 'الاسم الكامل' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <User className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={18} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:bg-white outline-none transition-all text-sm`}
                      placeholder={isRTL ? 'أدخل اسمك' : 'Enter your name'}
                      required={!isLogin}
                      dir="auto"
                      data-testid="name-input"
                    />
                  </div>
                </div>
              )}

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
                    data-testid="email-input"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {isRTL ? 'كلمة المرور' : 'Password'}
                  </label>
                  {isLogin && (
                    <Link
                      to="/forgot-password"
                      className="text-xs bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent font-semibold hover:underline"
                      data-testid="forgot-password-link"
                    >
                      {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                    </Link>
                  )}
                </div>
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
                    data-testid="password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors`}
                    data-testid="toggle-password"
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl px-6 py-3 font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                data-testid="submit-button"
              >
                {loading 
                  ? (isRTL ? 'جاري التحميل...' : 'Loading...') 
                  : isLogin 
                    ? (isRTL ? 'تسجيل الدخول' : 'Sign In')
                    : (isRTL ? 'إنشاء حساب' : 'Create Account')}
              </button>
            </form>

            {/* Toggle */}
            <p className="mt-6 text-center text-slate-500 text-sm">
              {isLogin 
                ? (isRTL ? 'ما عندك حساب؟ ' : "Don't have an account? ")
                : (isRTL ? 'عندك حساب؟ ' : 'Already have an account? ')}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent font-semibold hover:underline"
                data-testid="toggle-auth-mode"
              >
                {isLogin 
                  ? (isRTL ? 'سجّل الآن' : 'Sign up')
                  : (isRTL ? 'سجّل دخول' : 'Sign in')}
              </button>
            </p>
          </div>

          {/* Back to home */}
          <p className="mt-6 text-center">
            <Link to="/" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
              {isRTL ? '← العودة للصفحة الرئيسية' : '← Back to home'}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
