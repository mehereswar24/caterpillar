import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { LogOut, ListPlus, X, Trash2, Loader2, Users, Radio, AlertTriangle, Camera, Truck, ScrollText } from 'lucide-react';
import CatLogo from '../components/CatLogo';
import OperatorCamCard, { CamView, CabReadout } from '../components/OperatorCamCard';
import OperatorDashboard from '../components/OperatorDashboard';
import FaceEnrollModal from '../components/FaceEnrollModal';
import MachinesPanel from '../components/MachinesPanel';
import DriverLogsPanel from '../components/DriverLogsPanel';
import { fetchOperators, fetchTasks, assignTask, cancelTask, supervisorLogout, AuthError } from '../services/supervisorApi';

const POLL_MS = 2000;
const STATUS_STYLE = {
  pending: 'text-neutral-900 bg-amber-500/10 border-amber-500/30',
  done: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30',
  cancelled: 'text-neutral-500 bg-[#ffffff] border-[#e6e6e1]',
};

const VIEWS = [
  { id: 'operators', label: 'Operators', icon: Camera },
  { id: 'machines', label: 'Machines', icon: Truck },
  { id: 'logs', label: 'Driver logs', icon: ScrollText },
];

const EMPTY_FORM = { operator_id: '', name: '', zone: '', estimated_min: 60, priority: 'normal' };

export default function SupervisorView({ username = 'supervisor', onLogout }) {
  const [operators, setOperators] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [netError, setNetError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState(null);       // { ok, text }
  const [expanded, setExpanded] = useState(null);     // operator shown large
  const [view, setView] = useState('operators');
  const [openOperator, setOpenOperator] = useState(null);   // operator whose full dashboard is open
  const [enrollId, setEnrollId] = useState(null);           // operator whose face is being enrolled

  const handleError = useCallback((err) => {
    if (err instanceof AuthError) { onLogout(); return; }
    setNetError(err.message || 'Cannot reach the server.');
  }, [onLogout]);

  const refresh = useCallback(async () => {
    try {
      const [ops, ts] = await Promise.all([fetchOperators(), fetchTasks()]);
      setOperators(ops); setTasks(ts); setNetError(''); setLoaded(true);
    } catch (err) { handleError(err); }
  }, [handleError]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const byId = useMemo(() => Object.fromEntries(operators.map(o => [o.operator_id, o])), [operators]);
  const online = operators.filter(o => o.online).length;
  const alertCount = operators.reduce((n, o) => n + (o.status?.alerts?.length || 0), 0);
  // keep the enlarged view in sync with the latest poll
  const expandedOp = expanded ? byId[expanded] : null;

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setFormMsg(null);
    try {
      const t = await assignTask({ ...form, estimated_min: Number(form.estimated_min) });
      setFormMsg({ ok: true, text: `Assigned "${t.name}" to ${byId[t.operator_id]?.name || t.operator_id}.` });
      setForm(f => ({ ...EMPTY_FORM, operator_id: f.operator_id }));
      refresh();
    } catch (err) {
      if (err instanceof AuthError) { onLogout(); return; }
      setFormMsg({ ok: false, text: err.message });
    } finally { setSaving(false); }
  };

  const cancel = async (id) => {
    try { await cancelTask(id); refresh(); } catch (err) { handleError(err); }
  };

  const signOut = async () => { await supervisorLogout(); onLogout(); };

  const field = 'w-full bg-[#f5f5f2] border border-[#e6e6e1] focus:border-[#FFCD11] outline-none rounded-lg px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition';

  return (
    <div className="h-screen overflow-hidden bg-[#f5f5f2] text-neutral-900 flex flex-col">
      <header className="border-b border-[#e6e6e1] px-4 md:px-6 py-2.5 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <CatLogo height={34} />
          <div>
            <div className="font-semibold text-neutral-900 text-sm tracking-tight">SmartOperator <span className="text-neutral-500 font-normal">· Supervisor</span></div>
            <div className="text-[11px] text-neutral-500">Signed in as {username}</div>
          </div>
        </div>
        <nav className="flex items-center gap-1" aria-label="Supervisor sections">
          {VIEWS.map(({ id, label, icon: Icon }) => {
            const active = !openOperator && view === id;
            return (
              <button key={id} type="button" onClick={() => { setOpenOperator(null); setView(id); }}
                className={`relative flex items-center gap-2 px-3 py-2 text-[13px] font-medium transition ${active ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'}`}>
                <Icon size={14} className={active ? 'text-neutral-900' : ''} />{label}
                {active && <span className="absolute left-3 right-3 -bottom-[11px] h-0.5 bg-[#FFCD11] rounded-full" />}
              </button>
            );
          })}
        </nav>
        <div className="hidden lg:flex items-center gap-5 text-sm">
          <span className="flex items-center gap-1.5 text-neutral-700"><Users size={14} className="text-neutral-500" /><b className="font-mono">{operators.length}</b> operators</span>
          <span className="flex items-center gap-1.5 text-emerald-600"><Radio size={14} /><b className="font-mono">{online}</b> live</span>
          <span className={`flex items-center gap-1.5 ${alertCount ? 'text-red-600' : 'text-neutral-500'}`}><AlertTriangle size={14} /><b className="font-mono">{alertCount}</b> alerts</span>
        </div>
        <button type="button" onClick={signOut} className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-red-600 transition">
          <LogOut size={15} /> Sign out
        </button>
      </header>

      {netError && <div className="bg-red-500/10 border-b border-red-500/30 text-red-700 text-sm px-6 py-2">{netError} — retrying…</div>}

      {openOperator ? (
        <OperatorDashboard
          operatorId={openOperator}
          operators={operators}
          onBack={() => setOpenOperator(null)}
          onAssign={(id) => { setForm(f => ({ ...f, operator_id: id })); setFormMsg(null); setOpenOperator(null); setView('operators'); }}
          onAuthError={onLogout}
        />
      ) : view === 'machines' ? (
        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
          <MachinesPanel onOpenOperator={setOpenOperator} onAuthError={onLogout} />
        </main>
      ) : view === 'logs' ? (
        <main className="flex-1 min-h-0 flex flex-col p-4 md:p-6">
          <h2 className="text-xs font-medium text-neutral-600 tracking-wide mb-3 flex-shrink-0">Driver logs · every driver, newest first</h2>
          <div className="flex-1 min-h-0"><DriverLogsPanel operators={operators} onAuthError={onLogout} /></div>
        </main>
      ) : (
      <main className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4 p-4 md:p-6">
        {/* Camera wall */}
        <section className="xl:col-span-8 min-h-0 overflow-y-auto pr-1" aria-label="Operators and cab cameras">
          <h2 className="text-xs font-medium text-neutral-600 tracking-wide mb-3">All operators · live cab cameras</h2>
          {!loaded ? (
            <p className="text-sm text-neutral-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading operators…</p>
          ) : operators.length === 0 ? (
            <p className="text-sm text-neutral-500">No operators registered.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
              {operators.map(o => (
                <OperatorCamCard key={o.operator_id} operator={o} onExpand={op => setExpanded(op.operator_id)} onOpen={setOpenOperator} onEnroll={setEnrollId}
                  onAssign={(id) => { setForm(f => ({ ...f, operator_id: id })); setFormMsg(null); document.getElementById('assign-name')?.focus(); }} />
              ))}
            </div>
          )}
        </section>

        {/* Assign + queue */}
        <aside className="xl:col-span-4 min-h-0 overflow-y-auto space-y-4 pr-1">
          <form onSubmit={submit} className="bg-[#ffffff] border border-[#e6e6e1] rounded-2xl p-4 space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900"><ListPlus size={16} className="text-neutral-900" /> Assign a task</h2>

            <label className="block">
              <span className="text-xs text-neutral-600">Operator</span>
              <select className={`${field} mt-1`} value={form.operator_id} onChange={set('operator_id')} required>
                <option value="">Select operator…</option>
                {operators.map(o => <option key={o.operator_id} value={o.operator_id}>{o.name} ({o.operator_id}){o.online ? ' · live' : ''}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-neutral-600">Task</span>
              <input id="assign-name" className={`${field} mt-1`} value={form.name} onChange={set('name')} maxLength={120} required placeholder="e.g. Excavate trench section C" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-neutral-600">Site zone</span>
                <input className={`${field} mt-1`} value={form.zone} onChange={set('zone')} maxLength={80} placeholder="Sector 3" />
              </label>
              <label className="block">
                <span className="text-xs text-neutral-600">Expected (min)</span>
                <input className={`${field} mt-1`} type="number" min={5} max={960} value={form.estimated_min} onChange={set('estimated_min')} required />
              </label>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-600">Priority</span>
              {['normal', 'high'].map(p => (
                <button key={p} type="button" onClick={() => setForm(f => ({ ...f, priority: p }))}
                  className={`px-2.5 py-1 rounded-md capitalize font-medium transition ${form.priority === p ? (p === 'high' ? 'bg-red-500/20 text-red-700' : 'bg-neutral-900 text-white') : 'bg-[#f0f0ec] text-neutral-600 hover:text-neutral-900'}`}>{p}</button>
              ))}
            </div>

            {formMsg && <div role="status" className={`text-sm rounded-lg px-3 py-2 border ${formMsg.ok ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30' : 'text-red-700 bg-red-500/10 border-red-500/30'}`}>{formMsg.text}</div>}

            <button type="submit" disabled={saving || !form.operator_id || !form.name.trim()}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-black disabled:opacity-40 text-white font-semibold text-sm py-2.5 rounded-lg transition">
              {saving && <Loader2 size={15} className="animate-spin" />} Assign task
            </button>
            <p className="text-[11px] text-neutral-400">The operator's cockpit picks it up within a few seconds and shows it after their current task.</p>
          </form>

          <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-neutral-900 mb-3">Assigned tasks</h2>
            {tasks.length === 0 ? (
              <p className="text-sm text-neutral-500">Nothing assigned yet.</p>
            ) : (
              <ul className="divide-y divide-[#e6e6e1]">
                {tasks.map(t => (
                  <li key={t.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-neutral-900 truncate">{t.name}</div>
                      <div className="text-[11px] text-neutral-500">
                        {byId[t.operator_id]?.name || t.operator_id} · {t.estimated_min} min{t.zone ? ` · ${t.zone}` : ''}{t.priority === 'high' ? ' · ' : ''}
                        {t.priority === 'high' && <span className="text-red-600">High priority</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLE[t.status] || STATUS_STYLE.cancelled}`}>{t.status}</span>
                      {t.status === 'pending' && (
                        <button type="button" onClick={() => cancel(t.id)} title="Cancel task" className="text-neutral-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>
      )}

      {enrollId && byId[enrollId] && (
        <FaceEnrollModal operator={byId[enrollId]} onClose={() => setEnrollId(null)} onAuthError={onLogout}
          onChanged={() => fetchOperators().then(setOperators).catch(() => {})} />
      )}

      {expandedOp && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setExpanded(null)}>
          <div className="w-full max-w-3xl bg-[#ffffff] border border-[#e6e6e1] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e6e6e1]">
              <div className="text-sm font-semibold text-neutral-900">{expandedOp.name} <span className="text-neutral-500 font-mono font-normal text-xs">· {expandedOp.status?.machine_id || expandedOp.operator_id}</span></div>
              <button type="button" onClick={() => setExpanded(null)} className="text-neutral-600 hover:text-neutral-900 p-1" title="Close"><X size={16} /></button>
            </div>
            <CamView operator={expandedOp} />
            {expandedOp.online && <CabReadout status={expandedOp.status} className="px-4 py-3" />}
          </div>
        </div>
      )}
    </div>
  );
}
