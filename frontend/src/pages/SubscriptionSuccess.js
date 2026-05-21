import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { subscriptionApi, thawaniApi } from '../lib/api';
import { CheckCircle, XCircle, ArrowClockwise, Sparkle } from '@phosphor-icons/react';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const provider = searchParams.get('provider') || 'stripe';
  const [status, setStatus] = useState('checking');
  const [paymentData, setPaymentData] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const pollStatus = useCallback(async () => {
    if (!sessionId || attempts >= 10) {
      if (attempts >= 10) setStatus('timeout');
      return;
    }

    try {
      const res = provider === 'thawani'
        ? await thawaniApi.verifySession(sessionId)
        : await subscriptionApi.checkPaymentStatus(sessionId);
      const data = res.data;
      setPaymentData(data);

      if (data.payment_status === 'paid') {
        setStatus('success');
      } else if (data.status === 'expired' || data.payment_status === 'cancelled') {
        setStatus(data.payment_status === 'cancelled' ? 'cancelled' : 'expired');
      } else {
        setStatus('processing');
        setAttempts(prev => prev + 1);
      }
    } catch (err) {
      setStatus('error');
    }
  }, [sessionId, attempts, provider]);

  useEffect(() => {
    if (status === 'checking' || status === 'processing') {
      const timer = setTimeout(pollStatus, status === 'checking' ? 500 : 2000);
      return () => clearTimeout(timer);
    }
  }, [status, pollStatus]);

  if (!sessionId) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center">
        <p className="text-slate-500">No session found. Please try subscribing again.</p>
        <button
          onClick={() => navigate('/dashboard/profile')}
          className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-lg"
          data-testid="back-to-profile"
        >
          Go to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-lg mx-auto" data-testid="subscription-success-page">
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        {(status === 'checking' || status === 'processing') && (
          <>
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowClockwise size={32} className="text-blue-500 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Processing Payment</h2>
            <p className="text-slate-500 text-sm">Please wait while we confirm your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" weight="fill" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
            <p className="text-slate-500 text-sm mb-4">
              You've been upgraded to the <strong className="text-slate-900 capitalize">{paymentData?.plan_id}</strong> plan.
            </p>
            <div className="flex items-center justify-center gap-2 text-green-600 text-sm font-medium mb-6">
              <Sparkle size={16} weight="fill" />
              <span>All premium features are now active</span>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              data-testid="go-to-dashboard"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} className="text-amber-500" weight="fill" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Session Expired</h2>
            <p className="text-slate-500 text-sm mb-4">The payment session has expired. Please try again.</p>
            <button
              onClick={() => navigate('/dashboard/profile')}
              className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              data-testid="try-again-button"
            >
              Try Again
            </button>
          </>
        )}

        {(status === 'error' || status === 'timeout') && (
          <>
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} className="text-red-500" weight="fill" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-500 text-sm mb-4">
              We couldn't verify your payment. If you were charged, your subscription will be updated automatically.
            </p>
            <button
              onClick={() => navigate('/dashboard/profile')}
              className="px-6 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              data-testid="back-to-profile-error"
            >
              Go to Profile
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
