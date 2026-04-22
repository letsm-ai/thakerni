import { useState, useEffect, useCallback, useRef } from 'react';
import { teamApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Users, UserPlus, CheckSquare, Bell, ChatCircle, ChartBar,
  Crown, Shield, User, Trash, X, PaperPlaneTilt, Plus, Check
} from '@phosphor-icons/react';

const TABS = [
  { id: 'team', label: 'Team', labelAr: 'الفريق', icon: Users },
  { id: 'tasks', label: 'Tasks', labelAr: 'المهام', icon: CheckSquare },
  { id: 'reminders', label: 'Reminders', labelAr: 'التذكيرات', icon: Bell },
  { id: 'chat', label: 'Chat', labelAr: 'المحادثة', icon: ChatCircle },
  { id: 'analytics', label: 'Analytics', labelAr: 'التحليلات', icon: ChartBar },
];

// ── No Team View ──
const NoTeam = ({ onCreate, invitations, onAccept, onDecline, t }) => {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try { await onCreate(name); } finally { setCreating(false); }
  };

  return (
    <div className="max-w-lg mx-auto py-16 text-center" data-testid="no-team-view">
      <Users size={48} className="mx-auto mb-4 text-slate-300" />
      <h2 className="text-xl font-bold text-slate-800 mb-2">{t('No Team Yet', 'لا يوجد فريق بعد')}</h2>
      <p className="text-sm text-slate-500 mb-6">{t('Create a team or accept an invitation to get started.', 'أنشئ فريقاً أو اقبل دعوة للبدء.')}</p>
      <p className="text-xs text-slate-400 mb-4">{t('Business plan required to create a team.', 'خطة الأعمال مطلوبة لإنشاء فريق.')}</p>

      <div className="flex gap-2 justify-center mb-8">
        <input value={name} onChange={e => setName(e.target.value)} placeholder={t('Team name...', 'اسم الفريق...')}
          className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-violet-300"
          data-testid="team-name-input" dir="auto" />
        <button onClick={handleCreate} disabled={creating || !name.trim()}
          className="px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          data-testid="create-team-btn">{creating ? '...' : t('Create Team', 'إنشاء فريق')}</button>
      </div>

      {invitations.length > 0 && (
        <div className="text-left">
          <h3 className="font-semibold text-slate-700 mb-3">{t('Pending Invitations', 'دعوات معلقة')}</h3>
          {invitations.map(inv => (
            <div key={inv.invite_id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3 mb-2" data-testid={`invite-${inv.invite_id}`}>
              <div>
                <p className="text-sm font-medium text-slate-800">{inv.team_name}</p>
                <p className="text-xs text-slate-400">{t('Role:', 'الدور:')} {inv.role}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onAccept(inv.invite_id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium" data-testid="accept-invite-btn">{t('Accept', 'قبول')}</button>
                <button onClick={() => onDecline(inv.invite_id)} className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-medium" data-testid="decline-invite-btn">{t('Decline', 'رفض')}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Team Management Tab ──
const TeamTab = ({ team, members, membership, onInvite, onRemove, onRoleChange, t }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    try { await onInvite(email, role); setEmail(''); } finally { setInviting(false); }
  };

  const roleIcon = (r) => r === 'owner' ? <Crown size={14} className="text-amber-500" weight="fill" /> : r === 'admin' ? <Shield size={14} className="text-blue-500" weight="fill" /> : <User size={14} className="text-slate-400" />;

  return (
    <div data-testid="team-management-tab">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{team.name}</h2>
          <p className="text-sm text-slate-400">{members.length} {t('members', 'أعضاء')}</p>
        </div>
      </div>

      {/* Invite */}
      {['owner', 'admin'].includes(membership.role) && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6" data-testid="invite-section">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><UserPlus size={16} /> {t('Invite Member', 'دعوة عضو')}</h3>
          <div className="flex gap-2 flex-wrap">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t('Email address...', 'البريد الإلكتروني...')}
              className="flex-1 min-w-[200px] px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" data-testid="invite-email-input" />
            <select value={role} onChange={e => setRole(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white" data-testid="invite-role-select">
              <option value="member">{t('Member', 'عضو')}</option>
              <option value="admin">{t('Admin', 'مشرف')}</option>
            </select>
            <button onClick={handleInvite} disabled={inviting || !email.trim()}
              className="px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              data-testid="send-invite-btn">{inviting ? '...' : t('Invite', 'دعوة')}</button>
          </div>
        </div>
      )}

      {/* Members list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="members-list">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 text-left">
            <th className="px-4 py-3 font-medium">{t('Member', 'العضو')}</th>
            <th className="px-4 py-3 font-medium">{t('Role', 'الدور')}</th>
            <th className="px-4 py-3 font-medium">{t('Status', 'الحالة')}</th>
            <th className="px-4 py-3 font-medium">{t('Actions', 'إجراءات')}</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {members.map(m => (
              <tr key={m.email} className="hover:bg-slate-50" data-testid={`member-row-${m.email}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-xs">
                      {(m.name || m.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{m.name || '—'}</p>
                      <p className="text-xs text-slate-400">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-sm capitalize">{roleIcon(m.role)} {m.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{m.status}</span>
                </td>
                <td className="px-4 py-3">
                  {membership.role === 'owner' && m.role !== 'owner' && m.status === 'active' && (
                    <div className="flex gap-1.5">
                      <button onClick={() => onRoleChange(m.user_id, m.role === 'admin' ? 'member' : 'admin')}
                        className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200" data-testid={`toggle-role-${m.email}`}>
                        {m.role === 'admin' ? t('Demote', 'تخفيض') : t('Promote', 'ترقية')}
                      </button>
                      <button onClick={() => onRemove(m.user_id)}
                        className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100" data-testid={`remove-${m.email}`}>
                        <Trash size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Shared Tasks Tab ──
const TasksTab = ({ members, t }) => {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');

  const load = useCallback(async () => {
    try { const res = await teamApi.getTasks(); setTasks(res.data.tasks); } catch (e) { console.error('Failed to load team tasks:', e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!title.trim()) return;
    await teamApi.createTask({ title, priority, assigned_to: assignedTo || null });
    setTitle(''); load();
  };

  const toggle = async (id, completed) => {
    await teamApi.updateTask(id, { completed: !completed });
    load();
  };

  const remove = async (id) => {
    await teamApi.deleteTask(id);
    load();
  };

  const priColor = (p) => p === 'high' ? 'text-red-500' : p === 'medium' ? 'text-amber-500' : 'text-green-500';

  return (
    <div data-testid="team-tasks-tab">
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('New task...', 'مهمة جديدة...')}
            className="flex-1 min-w-[200px] px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" data-testid="team-task-input" dir="auto" />
          <select value={priority} onChange={e => setPriority(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white">
            <option value="low">{t('Low', 'منخفض')}</option>
            <option value="medium">{t('Medium', 'متوسط')}</option>
            <option value="high">{t('High', 'عالي')}</option>
          </select>
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white" data-testid="task-assign-select">
            <option value="">{t('Unassigned', 'غير محدد')}</option>
            {members.map(m => <option key={m.user_id} value={m.user_id}>{m.name || m.email}</option>)}
          </select>
          <button onClick={create} disabled={!title.trim()} className="px-4 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50" data-testid="add-team-task-btn">
            <Plus size={16} weight="bold" />
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">{t('No team tasks yet', 'لا توجد مهام للفريق بعد')}</p>
        ) : tasks.map(task => (
          <div key={task.task_id} className={`bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 ${task.completed ? 'opacity-60' : ''}`} data-testid={`team-task-${task.task_id}`}>
            <button onClick={() => toggle(task.task_id, task.completed)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${task.completed ? 'bg-violet-600 border-violet-600' : 'border-slate-300'}`}>
              {task.completed && <Check size={14} className="text-white" weight="bold" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`} dir="auto">{task.title}</p>
              <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                <span className={priColor(task.priority)}>{task.priority}</span>
                {task.assigned_to_name && <span>{t('Assigned:', 'مُسند:')} {task.assigned_to_name}</span>}
                <span>{t('By:', 'من:')} {task.created_by_name}</span>
              </div>
            </div>
            <button onClick={() => remove(task.task_id)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Trash size={14} className="text-slate-400" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Shared Reminders Tab ──
const RemindersTab = ({ t }) => {
  const [reminders, setReminders] = useState([]);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');

  const load = useCallback(async () => {
    try { const res = await teamApi.getReminders(); setReminders(res.data.reminders); } catch (e) { console.error('Failed to load team reminders:', e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!title.trim() || !time) return;
    await teamApi.createReminder({ title, reminder_time: new Date(time).toISOString() });
    setTitle(''); setTime(''); load();
  };

  const remove = async (id) => { await teamApi.deleteReminder(id); load(); };

  return (
    <div data-testid="team-reminders-tab">
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('Reminder title...', 'عنوان التذكير...')}
            className="flex-1 min-w-[180px] px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" data-testid="team-reminder-input" dir="auto" />
          <input type="datetime-local" value={time} onChange={e => setTime(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm" data-testid="team-reminder-time" />
          <button onClick={create} disabled={!title.trim() || !time} className="px-4 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50" data-testid="add-team-reminder-btn">
            <Plus size={16} weight="bold" />
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {reminders.length === 0 ? (
          <p className="text-center text-slate-400 py-8 text-sm">{t('No team reminders', 'لا توجد تذكيرات للفريق')}</p>
        ) : reminders.map(rem => (
          <div key={rem.reminder_id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3" data-testid={`team-reminder-${rem.reminder_id}`}>
            <Bell size={18} className="text-amber-500 flex-shrink-0" />
            <div className="flex-1" dir="auto">
              <p className="text-sm font-medium text-slate-800">{rem.title}</p>
              <p className="text-xs text-slate-400">{new Date(rem.reminder_time).toLocaleString()} &middot; {t('By:', 'من:')} {rem.created_by_name}</p>
            </div>
            <button onClick={() => remove(rem.reminder_id)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Trash size={14} className="text-slate-400" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Team Chat Tab ──
const ChatTab = ({ user, t }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const chatRef = useRef(null);

  const load = useCallback(async () => {
    try { const res = await teamApi.getMessages(1); setMessages(res.data.messages); } catch (e) { console.error('Failed to load team messages:', e); }
  }, []);

  useEffect(() => { load(); const i = setInterval(load, 5000); return () => clearInterval(i); }, [load]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try { await teamApi.sendMessage(input); setInput(''); load(); } finally { setSending(false); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col" style={{ height: '500px' }} data-testid="team-chat-tab">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-700">{t('Team Chat', 'محادثة الفريق')}</h3>
      </div>
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">{t('No messages yet. Start the conversation!', 'لا توجد رسائل بعد. ابدأ المحادثة!')}</p>
        ) : messages.map(msg => {
          const isMine = msg.user_id === user?.user_id;
          return (
            <div key={msg.message_id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isMine ? 'bg-violet-600 text-white rounded-2xl rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm'} px-4 py-2.5`}>
                {!isMine && <p className="text-xs font-semibold mb-0.5 opacity-70">{msg.user_name}</p>}
                <p className="text-sm" dir="auto">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMine ? 'text-violet-200' : 'text-slate-400'}`}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-slate-100">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={t('Type a message...', 'اكتب رسالة...')}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" data-testid="team-chat-input" dir="auto" />
          <button onClick={send} disabled={sending || !input.trim()}
            className="w-10 h-10 bg-violet-600 text-white rounded-full flex items-center justify-center hover:bg-violet-700 disabled:opacity-50" data-testid="team-chat-send">
            <PaperPlaneTilt size={16} weight="fill" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Analytics Tab ──
const AnalyticsTab = ({ t }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    teamApi.getAnalytics().then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <p className="text-center text-slate-400 py-8">Loading...</p>;

  return (
    <div data-testid="team-analytics-tab">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: t('Total Tasks', 'إجمالي المهام'), value: data.total_tasks, color: 'bg-violet-100 text-violet-600' },
          { label: t('Completed', 'مكتملة'), value: `${data.completed_tasks} (${data.completion_rate}%)`, color: 'bg-green-100 text-green-600' },
          { label: t('Active Reminders', 'تذكيرات نشطة'), value: data.active_reminders, color: 'bg-amber-100 text-amber-600' },
          { label: t('Messages', 'رسائل'), value: data.total_messages, color: 'bg-blue-100 text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Billing */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6" data-testid="team-billing-info">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('Team Billing', 'فاتورة الفريق')}</h3>
        <div className="flex gap-6 text-sm">
          <div><span className="text-slate-400">{t('Seats', 'مقاعد')}</span><p className="text-lg font-bold text-slate-800">{data.billing.seats}</p></div>
          <div><span className="text-slate-400">{t('Per Seat', 'لكل مقعد')}</span><p className="text-lg font-bold text-slate-800">${data.billing.per_seat_price}/mo</p></div>
          <div><span className="text-slate-400">{t('Monthly Cost', 'التكلفة الشهرية')}</span><p className="text-lg font-bold text-violet-600">${data.billing.monthly_cost.toFixed(2)}/mo</p></div>
        </div>
      </div>

      {/* Member stats */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="member-stats-table">
        <h3 className="text-sm font-semibold text-slate-700 px-5 py-3 border-b border-slate-100">{t('Member Activity', 'نشاط الأعضاء')}</h3>
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-slate-500 text-left">
            <th className="px-4 py-2.5 font-medium">{t('Member', 'العضو')}</th>
            <th className="px-4 py-2.5 font-medium">{t('Role', 'الدور')}</th>
            <th className="px-4 py-2.5 font-medium">{t('Tasks Created', 'مهام أُنشئت')}</th>
            <th className="px-4 py-2.5 font-medium">{t('Tasks Done', 'مهام مكتملة')}</th>
            <th className="px-4 py-2.5 font-medium">{t('Messages', 'رسائل')}</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.members.map(m => (
              <tr key={m.user_id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800">{m.name}</td>
                <td className="px-4 py-2.5 capitalize text-slate-500">{m.role}</td>
                <td className="px-4 py-2.5 text-slate-700">{m.tasks_created}</td>
                <td className="px-4 py-2.5 text-slate-700">{m.tasks_completed}</td>
                <td className="px-4 py-2.5 text-slate-700">{m.messages}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// ══════════════════════════════════════════
//  MAIN TEAM PAGE
// ══════════════════════════════════════════

export default function Team() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = useCallback((en, ar) => language === 'ar' ? ar : en, [language]);

  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [membership, setMembership] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [activeTab, setActiveTab] = useState('team');
  const [loading, setLoading] = useState(true);

  const loadTeam = useCallback(async () => {
    try {
      const [teamRes, invRes] = await Promise.all([
        teamApi.getMyTeam(),
        teamApi.getInvitations(),
      ]);
      setTeam(teamRes.data.team);
      setMembers(teamRes.data.members);
      setMembership(teamRes.data.membership);
      setInvitations(invRes.data.invitations);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const handleCreate = async (name) => {
    try {
      await teamApi.createTeam(name);
      loadTeam();
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to create team');
    }
  };

  const handleInvite = async (email, role) => {
    try {
      await teamApi.invite(email, role);
      loadTeam();
    } catch (e) { alert(e.response?.data?.detail || 'Failed to invite'); }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm(t('Remove this member?', 'إزالة هذا العضو؟'))) return;
    try { await teamApi.removeMember(userId); loadTeam(); }
    catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };

  const handleRoleChange = async (userId, newRole) => {
    try { await teamApi.changeMemberRole(userId, newRole); loadTeam(); }
    catch (e) { alert(e.response?.data?.detail || 'Failed'); }
  };

  const handleAccept = async (id) => { await teamApi.acceptInvite(id); loadTeam(); };
  const handleDecline = async (id) => { await teamApi.declineInvite(id); loadTeam(); };

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;

  if (!team) {
    return <NoTeam onCreate={handleCreate} invitations={invitations} onAccept={handleAccept} onDecline={handleDecline} t={t} />;
  }

  const activeMembers = members.filter(m => m.status === 'active');

  return (
    <div data-testid="team-page">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl overflow-x-auto" data-testid="team-tabs">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <Icon size={16} />
              {language === 'ar' ? tab.labelAr : tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'team' && <TeamTab team={team} members={members} membership={membership} onInvite={handleInvite} onRemove={handleRemove} onRoleChange={handleRoleChange} t={t} />}
      {activeTab === 'tasks' && <TasksTab members={activeMembers} t={t} />}
      {activeTab === 'reminders' && <RemindersTab t={t} />}
      {activeTab === 'chat' && <ChatTab user={user} t={t} />}
      {activeTab === 'analytics' && <AnalyticsTab t={t} />}
    </div>
  );
}
