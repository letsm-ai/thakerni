import { Export, DownloadSimple } from '@phosphor-icons/react';

const ITEMS = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'conversations', label: 'Conversations' },
  { key: 'all', label: 'All Data' },
];

export default function DataExportSection({ exportFormat, exporting, onFormatChange, onExport }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6" data-testid="export-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Export size={22} className="text-emerald-600" weight="fill" />
          <h3 className="font-semibold text-slate-900">Export Your Data</h3>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-0.5" data-testid="export-format-toggle">
          <button onClick={() => onFormatChange('json')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${exportFormat === 'json' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            data-testid="export-format-json">JSON</button>
          <button onClick={() => onFormatChange('csv')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${exportFormat === 'csv' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            data-testid="export-format-csv">CSV</button>
        </div>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Download your data as {exportFormat.toUpperCase()} files. You own your data.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {ITEMS.map((item) => (
          <button key={item.key} onClick={() => onExport(item.key)} disabled={exporting === item.key}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 text-sm font-medium text-slate-700"
            data-testid={`export-${item.key}-button`}>
            {exporting === item.key ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <DownloadSimple size={16} />
            )}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
