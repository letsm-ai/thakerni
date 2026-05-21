import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from '@phosphor-icons/react';
import { useLanguage } from '../context/LanguageContext';

const SubscriptionCancel = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();

  return (
    <div className="p-8 max-w-lg mx-auto" dir={isRTL ? 'rtl' : 'ltr'} data-testid="subscription-cancel-page">
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle size={32} className="text-amber-500" weight="fill" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {isRTL ? 'تم إلغاء الدفع' : 'Payment Cancelled'}
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          {isRTL
            ? 'لم يتم خصم أي مبلغ. يمكنك المحاولة مرة أخرى وقتما تشاء.'
            : 'No amount was charged. You can try again anytime.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate('/dashboard/profile')}
            className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            data-testid="back-to-profile"
          >
            {isRTL ? 'العودة للملف الشخصي' : 'Back to Profile'}
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
            data-testid="back-to-dashboard"
          >
            {isRTL ? 'لوحة التحكم' : 'Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCancel;
