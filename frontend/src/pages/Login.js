import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EnvelopeSimple, Lock, User, Eye, EyeSlash, GoogleLogo } from '@phosphor-icons/react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register, loginWithGoogle } = useAuth();
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
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-10">
            <img 
              src="https://static.prod-images.emergentagent.com/jobs/9d301dcd-e3e4-482d-9d3a-1c2d6b41093f/images/7432755b702d2a2a26f7a6ef3b6c0c1c2e834acae24098a23273963d9cd5719c.png" 
              alt="Letsm AI" 
              className="h-10 w-auto"
              data-testid="logo"
            />
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-heading">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="mt-2 text-slate-500">
              {isLogin ? 'Sign in to continue to Letsm AI' : 'Get started with Letsm AI'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm" data-testid="error-message">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none transition-all"
                    placeholder="John Doe"
                    required={!isLogin}
                    data-testid="name-input"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                Email Address
              </label>
              <div className="relative">
                <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none transition-all"
                  placeholder="you@example.com"
                  required
                  data-testid="email-input"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900 mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 bg-white border border-slate-200 rounded-md text-slate-900 focus:border-[#002FA7] focus:ring-1 focus:ring-[#002FA7] outline-none transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  data-testid="toggle-password"
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#002FA7] text-white rounded-md px-6 py-2.5 font-semibold tracking-wide hover:bg-[#001A7A] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active-scale"
              data-testid="submit-button"
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="px-4 text-sm text-slate-500">or</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          {/* Google Login */}
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 border border-slate-200 rounded-md px-6 py-2.5 font-medium hover:bg-slate-50 hover:border-slate-300 transition-colors active-scale"
            data-testid="google-login-button"
          >
            <GoogleLogo size={20} weight="bold" className="text-slate-700" />
            Continue with Google
          </button>

          {/* Toggle */}
          <p className="mt-6 text-center text-slate-500">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-[#002FA7] font-semibold hover:underline"
              data-testid="toggle-auth-mode"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      {/* Right Panel - Background */}
      <div 
        className="hidden lg:block lg:w-1/2 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://static.prod-images.emergentagent.com/jobs/9d301dcd-e3e4-482d-9d3a-1c2d6b41093f/images/dd0db0f9b8f8070012fd71ed7d86b5bf320357e1ab28149f982806de691b7953.png)'
        }}
      >
        <div className="h-full w-full bg-[#002FA7]/10 flex items-end p-16">
          <div className="text-white">
            <h2 className="text-3xl font-bold font-heading mb-2">Your AI-Powered Assistant</h2>
            <p className="text-lg opacity-90">Manage tasks, set reminders, and get intelligent assistance.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
