export default function AccountInfoSection({ user, formatDate }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Account Information</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">User ID</label>
          <p className="text-sm text-slate-700 mt-1 font-mono">{user?.user_id}</p>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Email Address</label>
          <p className="text-sm text-slate-700 mt-1">{user?.email}</p>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Account Created</label>
          <p className="text-sm text-slate-700 mt-1">{formatDate(user?.created_at)}</p>
        </div>
      </div>
    </div>
  );
}
