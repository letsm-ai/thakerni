import { EnvelopeSimple } from '@phosphor-icons/react';

export default function EmailConfigSection({
  emailConfig, resendKey, senderEmail, savingConfig,
  onResendKeyChange, onSenderEmailChange, onSave,
}) {
  if (emailConfig === null) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6" data-testid="email-config-section">
      <div className="flex items-center gap-3 mb-4">
        <EnvelopeSimple size={22} className="text-blue-600" weight="fill" />
        <h3 className="font-semibold text-slate-900">Email Service Configuration</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${emailConfig.configured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          {emailConfig.configured ? 'Connected' : 'Not Configured'}
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Configure your Resend API key to enable email delivery (weekly digests, notifications). Get your API key at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-violet-600 underline">resend.com</a>.
      </p>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Resend API Key</label>
          <input type="password" value={resendKey} onChange={(e) => onResendKeyChange(e.target.value)}
            placeholder={emailConfig.configured ? '••••••••••• (configured)' : 're_xxxxxxxxxx'}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            data-testid="resend-key-input" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Sender Email</label>
          <input type="email" value={senderEmail} onChange={(e) => onSenderEmailChange(e.target.value)}
            placeholder="support@letsm.ai"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            data-testid="sender-email-input" />
        </div>
        <button onClick={onSave} disabled={savingConfig || (!resendKey && !senderEmail)}
          className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          data-testid="save-email-config-btn">
          {savingConfig ? 'Saving...' : 'Save & Test'}
        </button>
      </div>
    </div>
  );
}
