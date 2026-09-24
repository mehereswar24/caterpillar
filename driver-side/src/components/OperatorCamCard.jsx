import React, { useEffect, useRef, useState } from 'react';
import { CameraOff, Fuel, Thermometer, Gauge, ListPlus, Maximize2, LayoutDashboard, ScanFace } from 'lucide-react';
import { fetchFrameUrl } from '../services/supervisorApi';
import CabMetricsPanel from './CabMetrics';

const FRAME_POLL_MS = 1000;

// Polls the operator's latest cab frame while `active`. Returns an object URL (or null).
export function useLiveFrame(operatorId, active) {
  const [url, setUrl] = useState(null);
  const urlRef = useRef(null);

  useEffect(() => {
    const set = (next) => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = next;
      setUrl(next);
    };
    if (!active) { set(null); return; }
    let stopped = false, busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        const next = await fetchFrameUrl(operatorId);
        if (stopped) { if (next) URL.revokeObjectURL(next); return; }
        set(next);
      } catch { /* keep the last frame; the parent handles auth errors on its own poll */ }
      finally { busy = false; }
    };
    tick();
    const id = setInterval(tick, FRAME_POLL_MS);
    return () => { stopped = true; clearInterval(id); if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; } };
  }, [operatorId, active]);

  return url;
}

const SEVERITY = { critical: 'bg-red-500/15 text-red-700 border-red-500/40', warning: 'bg-amber-500/15 text-neutral-900 border-amber-500/40' };
const label = (t) => t.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

function ago(iso) {
  if (!iso) return 'never seen';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`;
}

export function CamView({ operator, className = '' }) {
  const frame = useLiveFrame(operator.operator_id, operator.online && operator.has_frame);
  return (
    <div className={`relative bg-black aspect-[4/3] overflow-hidden ${className}`}>
      {frame ? (
        <img src={frame} alt={`${operator.name} cab camera`} className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-neutral-400 text-xs">
          <CameraOff size={22} />
          {operator.online ? 'Waiting for camera…' : `Offline · ${ago(operator.last_seen)}`}
        </div>
      )}
    </div>
  );
}

// The operator's cab-monitor readout as reported by their cockpit (same parameters they see).
export function CabReadout({ status, className }) {
  const cab = status?.cab;
  return <CabMetricsPanel reporting={!!cab} m={cab?.m} sem={cab?.sem} latency={cab?.latency} vlmStatus={cab?.vlmStatus} trackStatus={cab?.trackStatus} className={className} />;
}

export default function OperatorCamCard({ operator, onAssign, onExpand, onOpen, onEnroll }) {
  const { status: s } = operator;
  const alerts = s?.alerts || [];
  const critical = alerts.some(a => a.severity === 'critical');

  return (
    <div className={`bg-[#ffffff] border rounded-2xl overflow-hidden flex flex-col ${critical ? 'border-red-500/60' : 'border-[#e6e6e1]'}`}>
      <div className="relative">
        <CamView operator={operator} />
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur rounded-full pl-2 pr-2.5 py-0.5 text-[11px] font-medium text-white">
          <span className={`w-1.5 h-1.5 rounded-full ${operator.online ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
          {operator.online ? 'Live' : 'Offline'}
        </div>
        {operator.online && operator.has_frame && (
          <button type="button" onClick={() => onExpand(operator)} title="Enlarge"
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-neutral-700 hover:text-white">
            <Maximize2 size={13} />
          </button>
        )}
      </div>

      {operator.online && <CabReadout status={s} className="px-3 py-2 border-b border-[#e6e6e1]" />}

      <div className="p-3 space-y-2.5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-neutral-900 truncate">{operator.name}</div>
            <div className="text-[11px] text-neutral-500 font-mono">{operator.operator_id} · <span className="capitalize">{operator.skill_level}</span></div>
          </div>
          <div className="text-right text-[11px] text-neutral-600 flex-shrink-0">
            <div className="font-mono text-neutral-700">{s?.machine_id || operator.assigned_machines?.split(',')[0] || '—'}</div>
            <div className="capitalize">{s?.mode ? s.mode.replace('_', ' ') : 'Not on shift'}</div>
          </div>
        </div>

        {operator.online ? (
          <>
            <div>
              <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
                <span className="truncate pr-2">{s.task || 'No task'}</span>
                <span className="font-mono text-neutral-700">{Math.round(s.task_progress_pct)}%</span>
              </div>
              <div className="h-1 rounded-full bg-[#f0f0ec] overflow-hidden">
                <div className="h-full bg-[#FFCD11] transition-all" style={{ width: `${s.task_progress_pct}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-700">
              <span className={`flex items-center gap-1 ${s.telemetry.fuel < 20 ? 'text-red-600' : ''}`}><Fuel size={12} className="text-neutral-500" />{Math.round(s.telemetry.fuel)}%</span>
              <span className={`flex items-center gap-1 ${s.telemetry.temp > 95 ? 'text-red-600' : ''}`}><Thermometer size={12} className="text-neutral-500" />{Math.round(s.telemetry.temp)}°C</span>
              <span className="flex items-center gap-1"><Gauge size={12} className="text-neutral-500" />{Math.round(s.telemetry.rpm)} rpm</span>
            </div>
            <div className="flex flex-wrap gap-1 min-h-[22px]">
              {alerts.length === 0
                ? <span className="text-[11px] text-emerald-600">No active alerts</span>
                : alerts.map((a, i) => (
                    <span key={i} title={a.message} className={`text-[10px] px-2 py-0.5 rounded-full border ${SEVERITY[a.severity] || SEVERITY.warning}`}>{label(a.type)}</span>
                  ))}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-neutral-400">Not signed in on a cab. Last seen {ago(operator.last_seen)}.</p>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2">
          <button type="button" onClick={() => onOpen(operator.operator_id)}
            className="flex items-center justify-center gap-1.5 text-xs font-medium bg-neutral-900 hover:bg-black text-white rounded-lg py-1.5 transition">
            <LayoutDashboard size={14} /> Dashboard
          </button>
          <button type="button" onClick={() => onAssign(operator.operator_id)}
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-900 hover:bg-[#FFCD11]/10 border border-[#FFCD11]/30 rounded-lg py-1.5 transition">
            <ListPlus size={14} /> Assign{operator.pending_tasks ? ` · ${operator.pending_tasks}` : ''}
          </button>
          {onEnroll && (
            <button type="button" onClick={() => onEnroll(operator.operator_id)}
              className={`col-span-2 flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-lg py-1 transition border ${
                operator.face_samples ? 'text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/10' : 'text-amber-700 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20'}`}>
              <ScanFace size={13} /> {operator.face_samples ? `Face ID enrolled · ${operator.face_samples} samples — re-enroll` : 'Face ID not enrolled — enroll now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
