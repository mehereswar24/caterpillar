import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { fetchLogs, AuthError } from '../services/supervisorApi';

const POLL_MS = 3000;
const SEV = {
  CRITICAL: 'text-red-700 bg-red-500/10 border-red-500/30',
  WARNING: 'text-neutral-900 bg-amber-500/10 border-amber-500/30',
  INFO: 'text-neutral-600 bg-[#ffffff] border-[#e6e6e1]',
};
const CAT = { SAFETY: 'text-emerald-600', FUEL: 'text-neutral-900', TASK: 'text-purple-600', AUTH: 'text-sky-600', SYSTEM: 'text-neutral-600' };

const fmtTime = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// Activity log of every driver (or one, when `operatorId` is fixed). Used as a tab and inside the operator dashboard.
export default function DriverLogsPanel({ operators = [], operatorId = null, onAuthError, compact = false }) {
  const [logs, setLogs] = useState(null);
  const [who, setWho] = useState('');
  const [severity, setSeverity] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const target = operatorId || who;
  const names = useMemo(() => Object.fromEntries(operators.map(o => [o.operator_id, o.name])), [operators]);

  const load = useCallback(async () => {
    try { setLogs(await fetchLogs({ operatorId: target || undefined, severity: severity || undefined, limit: 300 })); setError(''); }
    catch (e) { if (e instanceof AuthError) onAuthError?.(); else setError(e.message); }
  }, [target, severity, onAuthError]);

  useEffect(() => {
    setLogs(null);
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const rows = useMemo(() => {
    if (!logs) return [];
    const needle = q.trim().toLowerCase();
    return needle ? logs.filter(l => (l.message + ' ' + (names[l.operator_id] || l.operator_id) + ' ' + l.category).toLowerCase().includes(needle)) : logs;
  }, [logs, q, names]);

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = ['time,driver,machine,category,severity,message', ...rows.map(l => [l.ts, names[l.operator_id] || l.operator_id, l.machine_id, l.category, l.severity, l.message].map(esc).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `driver-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const field = 'bg-[#f5f5f2] border border-[#e6e6e1] focus:border-[#FFCD11] outline-none rounded-lg px-2.5 py-1.5 text-xs text-neutral-900';

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex flex-wrap items-center gap-2 mb-3 flex-shrink-0">
        {!operatorId && (
          <select className={field} value={who} onChange={e => setWho(e.target.value)} aria-label="Driver">
            <option value="">All drivers</option>
            {operators.map(o => <option key={o.operator_id} value={o.operator_id}>{o.name}</option>)}
          </select>
        )}
        <select className={field} value={severity} onChange={e => setSeverity(e.target.value)} aria-label="Severity">
          <option value="">All severities</option>
          <option value="INFO">Info</option><option value="WARNING">Warning</option><option value="CRITICAL">Critical</option>
        </select>
        <input className={`${field} flex-1 min-w-[120px]`} placeholder="Search logs…" value={q} onChange={e => setQ(e.target.value)} />
        <button type="button" onClick={exportCsv} disabled={!rows.length} title="Download as CSV"
          className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 disabled:opacity-30 px-2 py-1.5"><Download size={13} />CSV</button>
      </div>

      {error && <div className="text-xs text-red-700 mb-2">{error}</div>}

      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-[#e6e6e1] bg-[#ffffff]">
        {logs === null ? (
          <p className="p-4 text-sm text-neutral-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading logs…</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">No log entries yet. They appear as drivers work.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#ffffff] text-[10px] text-neutral-500 border-b border-[#e6e6e1]">
              <tr>
                <th className="px-3 py-2 font-medium">Time</th>
                {!operatorId && <th className="px-3 py-2 font-medium">Driver</th>}
                {!compact && <th className="px-3 py-2 font-medium">Machine</th>}
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Level</th>
                <th className="px-3 py-2 font-medium w-full">Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e6e1]">
              {rows.map(l => (
                <tr key={l.id} className="align-top">
                  <td className="px-3 py-2 text-[11px] font-mono text-neutral-500 whitespace-nowrap">{fmtTime(l.ts)}</td>
                  {!operatorId && <td className="px-3 py-2 text-xs text-neutral-800 whitespace-nowrap">{names[l.operator_id] || l.operator_id}</td>}
                  {!compact && <td className="px-3 py-2 text-[11px] font-mono text-neutral-500">{l.machine_id || '—'}</td>}
                  <td className={`px-3 py-2 text-[11px] font-medium ${CAT[l.category] || 'text-neutral-600'}`}>{l.category || '—'}</td>
                  <td className="px-3 py-2"><span className={`text-[10px] px-2 py-0.5 rounded-full border ${SEV[l.severity] || SEV.INFO}`}>{l.severity}</span></td>
                  <td className="px-3 py-2 text-xs text-neutral-700">{l.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
