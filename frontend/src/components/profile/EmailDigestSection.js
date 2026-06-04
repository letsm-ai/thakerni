import { Envelope, Calendar, Eye } from '@phosphor-icons/react';

export default function EmailDigestSection({
  digestSchedule, emailPrefs, sendingDigest, previewHtml,
  onTogglePref, onPreview, onSend, onClosePreview,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6" data-testid="email-digest-section">
      <div className="flex items-center gap-3 mb-4">
        <Envelope size={22} className="text-violet-600" weight="fill" />
        <h3 className="font-semibold text-slate-900">Weekly Email Digest</h3>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Receive a weekly summary of your productivity stats, completed tasks, and upcoming items every Sunday.
      </p>

      {digestSchedule?.next_run && (
        <div className="flex items-center gap-2 p-3 bg-violet-50 border border-violet-200 rounded-lg mb-4 text-sm" data-testid="digest-schedule-info">
          <Calendar size={16} className="text-violet-600 flex-shrink-0" />
          <span className="text-violet-800">
            Next automated digest: <strong>{new Date(digestSchedule.next_run).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
          </span>
        </div>
      )}

      <div className="space-y-3 mb-4">
        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer">
          <div>
            <span className="text-sm font-medium text-slate-700">Weekly Digest</span>
            <p className="text-xs text-slate-500">Sunday morning summary email</p>
          </div>
          <button
            onClick={() => onTogglePref('weekly_digest')}
            className={`relative w-11 h-6 rounded-full transition-colors ${emailPrefs.weekly_digest ? 'bg-violet-600' : 'bg-slate-300'}`}
            data-testid="toggle-weekly-digest"
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailPrefs.weekly_digest ? 'left-[22px]' : 'left-0.5'}`}></span>
          </button>
        </label>
        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer">
          <div>
            <span className="text-sm font-medium text-slate-700">Reminder Alerts</span>
            <p className="text-xs text-slate-500">Email when reminders are due</p>
          </div>
          <button
            onClick={() => onTogglePref('reminder_alerts')}
            className={`relative w-11 h-6 rounded-full transition-colors ${emailPrefs.reminder_alerts ? 'bg-violet-600' : 'bg-slate-300'}`}
            data-testid="toggle-reminder-alerts"
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailPrefs.reminder_alerts ? 'left-[22px]' : 'left-0.5'}`}></span>
          </button>
        </label>
      </div>

      <div className="flex gap-3">
        <button onClick={onPreview}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
          data-testid="preview-digest-button">
          <Eye size={16} />Preview Digest
        </button>
        <button onClick={onSend} disabled={sendingDigest}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
          data-testid="send-digest-button">
          {sendingDigest ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Envelope size={16} weight="fill" />
          )}
          Send Now
        </button>
      </div>

      {previewHtml && (
        <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden" data-testid="digest-preview">
          <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-b">
            <span className="text-xs font-medium text-slate-500">Digest Preview</span>
            <button onClick={onClosePreview} className="text-xs text-slate-400 hover:text-slate-600">Close</button>
          </div>
          <iframe
            srcDoc={previewHtml}
            title="Digest Preview"
            className="w-full h-[500px] border-0"
            sandbox="allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}
