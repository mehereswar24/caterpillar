import React, { useEffect, useState, useCallback } from 'react';
import { Fuel, Thermometer, Gauge, Wrench, MapPin, User, Loader2 } from 'lucide-react';
import { fetchMachines, AuthError } from '../services/supervisorApi';

const POLL_MS = 3000;
const label = (t) => t.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

function Spec({ k, children, warn }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-neutral-500">{k}</div>
      <div className={`text-[13px] font-mono truncate ${warn ? 'text-red-600 font-semibold' : 'text-neutral-800'}`}>{children}</div>
    </div>
  );
}

function MachineCard({ m, onOpenOperator }) {
  const inUse = m.status === 'in_use';
  const t = m.live?.telemetry;
  const alerts = m.live?.alerts || [];
  const serviceSoon = m.service_overdue || m.service_due_in_h <= 50;

  return (
    <div className={`bg-[#ffffff] border rounded-2xl p-4 space-y-3 ${alerts.some(a => a.severity === 'critical') ? 'border-red-500/60' : 'border-[#e6e6e1]'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-neutral-900 font-mono">{m.machine_id}</div>
          <div className="text-[11px] text-neutral-500">{m.model} · {m.year}</div>
        </div>
        <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${inUse ? 'text-emerald-700 bg-emerald-500/10 border-emerald-500/30' : 'text-neutral-600 bg-[#ffffff] border-[#e6e6e1]'}`}>
          {inUse ? 'In use' : 'Idle'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <Spec k="Engine hours">{m.engine_hours.toLocaleString()} h</Spec>
        <Spec k="Next service" warn={serviceSoon}>{m.service_overdue ? 'Overdue' : `in ${m.service_due_in_h} h`}</Spec>
        <Spec k="Last service">{m.last_service}</Spec>
        <Spec k="Fuel tank">{m.tank_l} L</Spec>
        <div className="col-span-2 min-w-0">
          <div className="text-[10px] text-neutral-500">Serial</div>
          <div className="text-[12px] font-mono text-neutral-600 truncate">{m.serial}</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[12px] text-neutral-600"><MapPin size={12} className="text-neutral-400" />{m.zone}</div>

      <div className="text-[12px]">
        <div className="text-[10px] text-neutral-500 mb-1">Authorised operators</div>
        <div className="flex flex-wrap gap-1">
          {m.assigned_operators.length === 0 ? <span className="text-neutral-400">None</span> : m.assigned_operators.map(o => (
            <button key={o.operator_id} type="button" onClick={() => onOpenOperator(o.operator_id)}
              className="px-2 py-0.5 rounded-md bg-[#ffffff] border border-[#e6e6e1] text-neutral-700 hover:border-[#FFCD11]/50 hover:text-neutral-900 transition">{o.name}</button>
          ))}
        </div>
      </div>

      {inUse ? (
        <div className="pt-3 border-t border-[#e6e6e1] space-y-2">
          <div className="flex items-center justify-between text-[12px]">
            <button type="button" onClick={() => onOpenOperator(m.operator.operator_id)} className="flex items-center gap-1.5 text-neutral-900 hover:underline">
              <User size={12} />{m.operator.name}
            </button>
            <span className="text-neutral-500 capitalize">{m.live.mode?.replace('_', ' ')}</span>
          </div>
          <div className="text-[12px] text-neutral-600 truncate" title={m.live.task}>{m.live.task || 'No task'}</div>
          <div className="flex items-center gap-3 text-[12px] font-mono text-neutral-700 flex-wrap">
            <span className={`flex items-center gap-1 ${t.fuel < 20 ? 'text-red-600' : ''}`}><Fuel size={12} className="text-neutral-500" />{Math.round(t.fuel)}%</span>
            <span className={`flex items-center gap-1 ${t.temp > 95 ? 'text-red-600' : ''}`}><Thermometer size={12} className="text-neutral-500" />{Math.round(t.temp)}°C</span>
            <span className="flex items-center gap-1"><Gauge size={12} className="text-neutral-500" />{Math.round(t.rpm)} rpm</span>
            <span className={`flex items-center gap-1 ${t.hydraulic > 280 ? 'text-amber-600' : ''}`}><Wrench size={12} className="text-neutral-500" />{Math.round(t.hydraulic)} bar</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {alerts.length === 0 ? <span className="text-[11px] text-emerald-600">No active alerts</span> : alerts.map((a, i) => (
              <span key={i} title={a.message} className={`text-[10px] px-2 py-0.5 rounded-full border ${a.severity === 'critical' ? 'bg-red-500/15 text-red-700 border-red-500/40' : 'bg-amber-500/15 text-neutral-900 border-amber-500/40'}`}>{label(a.type)}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="pt-3 border-t border-[#e6e6e1] text-[12px] text-neutral-400">No operator signed in on this machine.</div>
      )}
    </div>
  );
}

export default function MachinesPanel({ onOpenOperator, onAuthError }) {
  const [machines, setMachines] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try { setMachines(await fetchMachines()); setError(''); }
    catch (e) { if (e instanceof AuthError) onAuthError(); else setError(e.message); }
  }, [onAuthError]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (!machines) return <p className="text-sm text-neutral-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> {error || 'Loading machines…'}</p>;
  const inUse = machines.filter(m => m.status === 'in_use').length;

  return (
    <div>
      <h2 className="text-xs font-medium text-neutral-600 tracking-wide mb-3">Fleet · {machines.length} machines · {inUse} in use</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {machines.map(m => <MachineCard key={m.machine_id} m={m} onOpenOperator={onOpenOperator} />)}
      </div>
    </div>
  );
}
