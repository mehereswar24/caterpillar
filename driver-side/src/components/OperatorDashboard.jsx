import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, ScrollText, ListPlus, X, WifiOff } from 'lucide-react';
import CockpitView from '../pages/CockpitView';
import DriverLogsPanel from './DriverLogsPanel';
import { CamView, CabReadout } from './OperatorCamCard';
import { fetchOperatorLive, AuthError } from '../services/supervisorApi';

const POLL_MS = 1000;
const NOOP = () => {};

// The supervisor's view of one operator: the same cockpit the operator sees, rebuilt from their live snapshot.
export default function OperatorDashboard({ operatorId, operators, onBack, onAssign, onAuthError }) {
  const [live, setLive] = useState(null);
  const [error, setError] = useState('');
  const [showLog, setShowLog] = useState(false);

  const load = useCallback(async () => {
    try { setLive(await fetchOperatorLive(operatorId)); setError(''); }
    catch (e) { if (e instanceof AuthError) onAuthError(); else setError(e.message); }
  }, [operatorId, onAuthError]);

  useEffect(() => {
    setLive(null);
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const op = live?.operator || operators.find(o => o.operator_id === operatorId);
  const snap = live?.snapshot;
  const online = !!live?.online;
  const camOperator = { ...(op || { operator_id: operatorId, name: '' }), online, has_frame: !!live?.has_frame, last_seen: live?.last_seen };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-2 border-b border-[#e6e6e1] flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition">
            <ArrowLeft size={15} /> All operators
          </button>
          <span className="text-neutral-300">/</span>
          <div className="min-w-0 truncate">
            <span className="text-sm font-semibold text-neutral-900">{op?.name || operatorId}</span>
            <span className="text-[11px] text-neutral-500 font-mono ml-2">{operatorId}{live?.status?.machine_id ? ` · ${live.status.machine_id}` : ''}</span>
          </div>
          <span className={`flex items-center gap-1.5 text-[11px] font-medium ${online ? 'text-emerald-600' : 'text-neutral-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
            {online ? 'Live' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button type="button" onClick={() => onAssign(operatorId)} className="flex items-center gap-1.5 text-xs font-medium text-neutral-900 border border-[#FFCD11]/30 hover:bg-[#FFCD11]/10 rounded-lg px-3 py-1.5 transition">
            <ListPlus size={14} /> Assign task
          </button>
          <button type="button" onClick={() => setShowLog(v => !v)}
            className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 border transition ${showLog ? 'bg-neutral-900 text-white border-[#FFCD11]' : 'text-neutral-700 border-[#e6e6e1] hover:text-neutral-900'}`}>
            <ScrollText size={14} /> Driver log
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border-b border-red-500/30 text-red-700 text-sm px-6 py-2">{error} — retrying…</div>}
      {live && !online && (
        <div className="flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-800 text-sm px-6 py-2">
          <WifiOff size={14} /> {op?.name || 'This operator'} is offline{snap ? ' — showing the last state their cockpit reported.' : '. No cockpit data yet.'}
        </div>
      )}

      <div className="flex-1 min-h-0 relative p-2 flex gap-3">
        <div className="flex-1 min-w-0 min-h-0">
        {!live ? (
          <p className="text-sm text-neutral-500 p-4">Loading…</p>
        ) : !snap ? (
          <div className="h-full flex items-center justify-center text-sm text-neutral-500 text-center px-6">
            {op?.name || 'This operator'} hasn&apos;t opened a cockpit yet. Their dashboard appears here as soon as they sign in.
          </div>
        ) : (
          <CockpitView
            readOnly
            task={snap.task}
            operatingMode={snap.operatingMode}
            telemetry={snap.telemetry}
            staticTargets={snap.staticTargets}
            dynamicTargets={snap.dynamicTargets}
            alertState={snap.alertState}
            audioMuted
            currentPhaseIndex={snap.currentPhaseIndex}
            idleMin={snap.idleMin}
            groundSpeed={snap.groundSpeed}
            secondsUntilNext={snap.secondsUntilNext}
            onModeChange={NOOP}
            onUpdateTargetDistance={NOOP}
          />
        )}
        </div>

        {/* Operator's cab camera */}
        {snap && (
          <aside className="w-60 flex-shrink-0 self-start rounded-xl overflow-hidden border border-[#e6e6e1] bg-[#ffffff]">
            <div className="text-xs font-medium text-neutral-700 px-3 py-2">Cab camera</div>
            <CamView operator={camOperator} />
            {online && <CabReadout status={live?.status} className="px-2.5 py-2" />}
          </aside>
        )}

        {showLog && (
          <aside className="absolute top-2 right-2 bottom-2 w-full max-w-lg bg-[#f5f5f2] border border-[#e6e6e1] rounded-2xl p-4 shadow-2xl shadow-black/10 z-20 flex flex-col">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h2 className="text-sm font-semibold text-neutral-900">{op?.name || operatorId} · driver log</h2>
              <button type="button" onClick={() => setShowLog(false)} className="text-neutral-500 hover:text-neutral-900 p-1" title="Close"><X size={16} /></button>
            </div>
            <div className="flex-1 min-h-0"><DriverLogsPanel operators={operators} operatorId={operatorId} onAuthError={onAuthError} compact /></div>
          </aside>
        )}
      </div>
    </div>
  );
}
