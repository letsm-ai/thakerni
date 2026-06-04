import { BellRinging, Check } from '@phosphor-icons/react';

export default function NotificationsSection({ notifPermission, onEnable }) {
  return (
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
          <button onClick={onEnable}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            data-testid="enable-notifications-button">
            <BellRinging size={16} weight="fill" />
            Enable Notifications
          </button>
        )}
      </div>
    </div>
  );
}
