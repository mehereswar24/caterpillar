import React from 'react';
import { Clock, FileText, MapPin, ArrowDownToLine, Volume2, VolumeX, SlidersHorizontal } from 'lucide-react';
import { HazardCard } from './CriticalPerimeterAlert';
import SiteSimulation from './SiteSimulation';

const RADAR_RANGE_M = 15;             // dynamic targets are plotted out to this distance
const BREACH_M = { human: 3.0, vehicle: 3.5 };

const MODE_STYLE = {
  digging: 'Digging', excavating: 'Digging', travelling: 'In transit', idling: 'Idle', idle: 'Idle', slope_alert: 'Slope alert',
};
const MODE_DOT = { slope_alert: 'bg-red-500', travelling: 'bg-sky-400', digging: 'bg-emerald-400', excavating: 'bg-emerald-400' };

// Polar -> CSS position inside the disc (0° = north, clockwise). Centre is 50% / 50%.
function polar(angleDeg = 0, distanceM = 0) {
  const r = Math.min(distanceM / RADAR_RANGE_M, 1) * 42;
  const rad = (angleDeg * Math.PI) / 180;
  return { left: `${50 + r * Math.sin(rad)}%`, top: `${50 - r * Math.cos(rad)}%` };
}

// Static points have no bearing in the data, so they sit at fixed spots on the disc.
const STATIC_SPOT = { fuel: { angle: 190, r: 0.62 }, site: { angle: 45, r: 0.5 }, parking: { angle: 320, r: 0.7 }, destination: { angle: 45, r: 0.5 } };
const staticPos = (t, i) => {
  const s = STATIC_SPOT[t.category] || { angle: 120 + i * 70, r: 0.6 };
  const rad = (s.angle * Math.PI) / 180;
  return { left: `${50 + s.r * 42 * Math.sin(rad)}%`, top: `${50 - s.r * 42 * Math.cos(rad)}%` };
};

function Radar({ staticTargets, dynamicTargets, hazardHuman }) {
  return (
    <div
      className={`relative rounded-full bg-[#ffffff] border overflow-hidden ${hazardHuman ? 'border-red-500/70' : 'border-emerald-700/50'}`}
      style={{ width: 'min(100cqw, 100cqh)', aspectRatio: '1 / 1' }}
    >
      {[6, 21, 36, 50].map((inset, i) => (
        <div key={i} style={{ inset: `${Math.min(inset, 49.9)}%` }} className="absolute rounded-full border border-emerald-500/20" />
      ))}
      <div className="absolute inset-x-0 top-1/2 h-px bg-emerald-500/20" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-emerald-500/20" />
      <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-semibold text-emerald-600">N</span>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-semibold text-emerald-600">S</span>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600">W</span>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-emerald-600">E</span>

      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_78%,rgba(16,185,129,0.32)_100%)] animate-radar-sweep pointer-events-none" />

      {staticTargets.map((t, i) => (
        <span key={t.id || i} style={staticPos(t, i)} title={`${t.label || t.category}: ${t.displayDistance || ''}`}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gray-500/80" />
      ))}

      {dynamicTargets.map(t => {
        const human = t.type === 'human';
        const breach = t.distanceM < (BREACH_M[t.type] ?? 3);
        const color = breach ? 'bg-red-500' : human ? 'bg-emerald-400' : 'bg-[#FFCD11]';
        return (
          <div key={t.id} style={polar(t.angle ?? t.bearingDeg, t.distanceM)} className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            title={`${t.name || t.label}: ${t.distanceM.toFixed(1)} m`}>
            <span className={`w-3.5 h-3.5 rounded-full ${color} ${breach ? 'animate-pulse shadow-[0_0_10px_2px_rgba(239,68,68,0.7)]' : ''}`} />
            <span className={`text-[10px] font-mono mt-0.5 ${breach ? 'text-red-700' : 'text-neutral-700'}`}>{t.distanceM.toFixed(1)}m</span>
          </div>
        );
      })}

      <div className="absolute z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[#FFCD11] flex items-center justify-center shadow-[0_0_18px_rgba(255,205,17,0.55)]">
        <span className="text-[11px] font-black text-black">CAT</span>
      </div>
    </div>
  );
}

/**
 * The dashboard hero card: task header, the machine in its trench, and the proximity radar.
 * The scene is a live simulation (SiteSimulation) that follows the operating mode.
 */
export default function SiteHero({
  task, operatingMode, telemetry, alerts = [], faults = [], staticTargets = [], dynamicTargets = [],
  audioMuted, onToggleAudio, readOnly = false, showControls = false, onToggleControls,
  nearest, onUpdateTargetDistance,
}) {
  const progress = Math.round(task?.progressPct ?? 0);
  const estimated = task?.estimated_time ?? 0;
  const left = Math.max(0, estimated - (task?.elapsedMin ?? 0));
  const modeLabel = MODE_STYLE[operatingMode] || 'Active';
  const slope = operatingMode === 'slope_alert';

  const persons = dynamicTargets.filter(t => t.type === 'human').length;
  const vehicles = dynamicTargets.filter(t => t.type === 'vehicle').length;
  const obstacles = dynamicTargets.filter(t => t.distanceM < (BREACH_M[t.type] ?? 3)).length;
  const hazardHuman = dynamicTargets.some(t => t.type === 'human' && t.distanceM < BREACH_M.human);
  const seatbeltOn = telemetry?.seatbelt !== false;
  const status = alerts.some(a => a.severity === 'critical')
    ? { label: '✕ Critical', cls: 'border-red-500/60 text-red-700 bg-red-500/10' }
    : alerts.length
    ? { label: '! Warning', cls: 'border-amber-500/60 text-neutral-900 bg-amber-500/10' }
    : { label: '✓ Nominal', cls: 'border-emerald-500/50 text-emerald-700 bg-emerald-500/10' };

  return (
    <section className="relative h-full min-h-0 rounded-2xl border border-[#e6e6e1] bg-[#f5f5f2] overflow-hidden">
      {/* Scene: live simulation, faded into the card on its right edge */}
      <SiteSimulation
        mode={operatingMode}
        alerts={alerts}
        faults={faults}
        dynamicTargets={dynamicTargets}
        tilt={telemetry?.tilt}
        className="absolute left-0 bottom-0 pointer-events-none"
        style={{
          width: '72%', height: '84%',
          WebkitMaskImage: 'linear-gradient(to right, #000 68%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 24%)',
          maskImage: 'linear-gradient(to right, #000 68%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 24%)',
          WebkitMaskComposite: 'source-in',
          maskComposite: 'intersect',
        }}
      />
      {slope && <div className="absolute inset-0 pointer-events-none bg-red-50" />}

      {/* Header */}
      <div className="relative z-10 flex items-start justify-between gap-6 px-7 pt-6">
        <div className="min-w-0">
          <h2 className="text-[30px] leading-tight font-semibold text-neutral-900 tracking-tight truncate">
            {task?.allDone ? 'All tasks complete' : (task?.task_type ?? 'Deep Trenching Pipeline B').replace(/\b(\w)(\w*)/g, (_, a, b) => a.toUpperCase() + b.toLowerCase())}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[15px] text-neutral-700">
            <span className="flex items-center gap-2"><FileText size={16} className="text-neutral-600" />{task?.task_id ?? 'TSK-4092'}</span>
            <span className="flex items-center gap-2"><MapPin size={16} className="text-neutral-600" />{task?.site_zone ?? 'Sector 4B — South Valley'}</span>
            <span className="flex items-center gap-2"><ArrowDownToLine size={16} className="text-neutral-600" />2.5 m deep</span>
            {task?.fromSupervisor && <span className="px-2 py-0.5 rounded bg-[#FFCD11]/15 text-neutral-900 text-xs font-medium">From supervisor</span>}
          </div>
        </div>

        <div className="flex items-center gap-5 flex-shrink-0 pt-1">
          <span className="hidden xl:flex items-center gap-2.5 text-neutral-800 text-lg"><Clock size={22} className="text-neutral-600" />~{left} min left</span>
          <span className="hidden xl:block w-px h-7 bg-[#f0f0ec]" />
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold text-neutral-900">{progress}%</span>
            <div className="w-32 xl:w-44 h-2.5 rounded-full bg-[#f0f0ec] overflow-hidden">
              <div className="h-full rounded-full bg-[#FFCD11] transition-all duration-700" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <span className="flex items-center gap-2.5 h-11 px-5 rounded-xl bg-[#ffffff] text-neutral-900 text-base font-medium">
            <span className={`w-2.5 h-2.5 rounded-full ${MODE_DOT[operatingMode] || 'bg-[#FFCD11]'}`} />{modeLabel}
          </span>
          {!readOnly && onToggleControls && (
            <button type="button" onClick={onToggleControls} title="Demo controls"
              className={`p-2 rounded-lg transition ${showControls ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:text-neutral-900'}`}>
              <SlidersHorizontal size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Simulator status, like the reference: seatbelt, zone, overall state */}
      <div className="absolute z-10 left-7 top-[104px] flex items-center gap-2 text-[12px]">
        <span className={`px-2.5 py-1 rounded-full font-semibold border ${status.cls}`}>{status.label}</span>
        <span className={`px-2.5 py-1 rounded-full border ${seatbeltOn ? 'border-[#e6e6e1] text-neutral-700' : 'border-red-500/50 text-red-700 bg-red-500/10'}`}>Seatbelt: {seatbeltOn ? 'ON' : 'OFF'}</span>
        <span className={`px-2.5 py-1 rounded-full border ${hazardHuman ? 'border-red-500/50 text-red-700 bg-red-500/10' : 'border-[#e6e6e1] text-neutral-700'}`}>Zone: {hazardHuman ? 'Worker inside' : 'Clear'}</span>
      </div>

      {/* Active hazard: over the soil at the foot of the scene */}
      {alerts.length > 0 && (
        <div className="absolute z-20 left-7 bottom-5 w-[min(440px,58%)]">
          <HazardCard alerts={alerts} />
        </div>
      )}

      {/* Radar + legend */}
      <div className="absolute z-10 right-6 top-[104px] bottom-4 w-[31%] min-w-[260px] flex flex-col items-center gap-3">
        <div className="flex-1 min-h-0 w-full flex items-center justify-center" style={{ containerType: 'size' }}>
          <Radar staticTargets={staticTargets} dynamicTargets={dynamicTargets} hazardHuman={hazardHuman} />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-neutral-700 flex-shrink-0">
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-gray-500" />No object</span>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-[#FFCD11]" />Vehicle ({vehicles})</span>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-emerald-400" />Person ({persons})</span>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-red-500" />Obstacle ({obstacles})</span>
          {!readOnly && onToggleAudio && (
            <button type="button" onClick={onToggleAudio} title={audioMuted ? 'Unmute warning alarm' : 'Mute warning alarm'}
              className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition">
              {audioMuted ? <VolumeX size={14} className="text-red-600" /> : <Volume2 size={14} className="text-emerald-600" />}
            </button>
          )}
        </div>
        {showControls && !readOnly && (
          <label className="w-full max-w-xs text-[11px] text-neutral-600">
            Demo: nearest person {nearest != null ? `${nearest.toFixed(1)} m` : '—'}
            <input type="range" min="0.8" max="8" step="0.2" value={nearest ?? 2.3}
              onChange={e => onUpdateTargetDistance?.(parseFloat(e.target.value))} className="w-full accent-[#FFCD11] h-1.5 cursor-pointer" />
          </label>
        )}
      </div>
    </section>
  );
}
