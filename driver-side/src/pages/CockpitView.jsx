import React, { useState } from 'react';
import SiteHero from '../components/SiteHero';
import StatStrip from '../components/StatStrip';
import SequenceController from '../components/SequenceController';
import EnvironmentBar, { WEATHER_PRESETS, SOIL_PRESETS } from '../components/EnvironmentBar';

const SCENARIOS = [
  { id: 'proximity', label: 'Proximity', hint: 'Worker in safety radius' },
  { id: 'seatbelt', label: 'Seatbelt off', hint: 'Moving unfastened' },
  { id: 'slope', label: 'Slope alert', hint: '18.5° slope incline' },
  { id: 'fatigue', label: 'Fatigue', hint: 'Cabin gaze distraction' },
  { id: 'coldstart', label: 'Cold start', hint: '2210 RPM on cold engine' },
  { id: 'hydraulics', label: 'Hydraulic leak', hint: 'Boom cylinder defect' },
  { id: 'track', label: 'Track fault', hint: 'Undercarriage defect' },
  { id: 'bucket', label: 'Bucket wear', hint: 'Teeth worn beyond limit' },
  { id: 'engine', label: 'Engine fault', hint: 'Code E-117, turbo pressure' },
];

// The operator's dashboard: the task + machine + proximity radar hero, and a strip of machine/site readings.
// `readOnly` renders the same dashboard for the supervisor (no demo controls, no handlers).
export default function CockpitView({
  task,
  readOnly = false,
  operatingMode,
  onModeChange,
  telemetry,
  staticTargets = [],
  dynamicTargets = [],
  alertState,
  audioMuted,
  onToggleAudio,
  onUpdateTargetDistance,
  onAdjustFuel,
  scenario = null,
  onScenario,
  idleMin = 0,
  groundSpeed = 0,
  // Sequence props
  currentPhaseIndex,
  onPhaseChange,
  isAutoPlay,
  onToggleAutoPlay,
  secondsUntilNext,
}) {
  const [showControls, setShowControls] = useState(false);
  const [env, setEnv] = useState({ weather: WEATHER_PRESETS[0], soil: SOIL_PRESETS[0] });
  const controls = showControls && !readOnly;
  const fuelMetrics = alertState.fuel?.metrics || {};
  const cannotReachFuel = alertState.fuel?.metrics?.canReachBunk === false;
  const nearestHuman = dynamicTargets.filter(t => t.type === 'human').sort((a, b) => a.distanceM - b.distanceM)[0];

  return (
    <div className="max-w-[1700px] mx-auto h-full min-h-[520px] flex flex-col gap-3">
      <div className="flex-1 min-h-0">
        <SiteHero
          task={task}
          operatingMode={operatingMode}
          telemetry={telemetry}
          alerts={alertState.alerts}
          faults={alertState.faults}
          staticTargets={staticTargets}
          dynamicTargets={dynamicTargets}
          audioMuted={audioMuted}
          onToggleAudio={onToggleAudio}
          readOnly={readOnly}
          showControls={controls}
          onToggleControls={() => setShowControls(v => !v)}
          nearest={nearestHuman?.distanceM}
          onUpdateTargetDistance={onUpdateTargetDistance}
        />
      </div>

      {controls && (
        <div className="fixed top-[76px] right-4 bottom-4 w-[430px] z-40 overflow-y-auto space-y-2 p-3 rounded-2xl bg-[#f5f5f2]/95 backdrop-blur border border-[#e6e6e1] shadow-2xl shadow-black/10">
          <SequenceController
            currentPhaseIndex={currentPhaseIndex}
            onPhaseChange={onPhaseChange}
            isAutoPlay={isAutoPlay}
            onToggleAutoPlay={onToggleAutoPlay}
            secondsUntilNext={secondsUntilNext}
          />
          <div className="rounded-xl bg-[#ffffff] border border-[#e6e6e1] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-neutral-600">Scenarios · click one to inject live fault telemetry</span>
              <button type="button" onClick={() => onScenario?.('reset')} className="text-xs font-medium px-3 py-1 rounded-lg bg-[#f0f0ec] text-neutral-700 hover:text-neutral-900 transition">Reset</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SCENARIOS.map(sc => (
                <button key={sc.id} type="button" onClick={() => onScenario?.(sc.id)}
                  className={`text-left rounded-lg px-3 py-2 border transition ${scenario === sc.id ? 'border-red-500/70 bg-red-500/10' : 'border-[#e6e6e1] bg-[#ffffff] hover:border-[#FFCD11]/50'}`}>
                  <div className="text-[13px] font-semibold text-neutral-900">{sc.label}</div>
                  <div className="text-[11px] text-neutral-500">{sc.hint}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-[#ffffff] border border-[#e6e6e1] px-3 py-2">
            <span className="text-xs text-neutral-600 mr-1">Demo: machine mode</span>
            {[['digging', 'Digging'], ['travelling', 'In transit'], ['idling', 'Idling'], ['slope_alert', 'Slope warning']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => onModeChange?.(id)}
                className={`text-xs font-medium px-3 py-1 rounded-lg transition ${operatingMode === id ? 'bg-neutral-900 text-white' : 'bg-[#f0f0ec] text-neutral-600 hover:text-neutral-900'}`}>{label}</button>
            ))}
          </div>
          <div className="space-y-2">
            <EnvironmentBar showControls horizontal onEnvironmentChange={setEnv} />
            <label className="rounded-2xl bg-[#ffffff] border border-[#e6e6e1] p-4 text-xs text-neutral-600 flex flex-col justify-center">
              Demo: fuel level ({telemetry.fuel}%)
              <input type="range" min="1" max="100" value={telemetry.fuel} onChange={e => onAdjustFuel?.(parseInt(e.target.value, 10))}
                className="w-full accent-[#FFCD11] h-1.5 cursor-pointer mt-2" />
            </label>
          </div>
        </div>
      )}

      <StatStrip idleMin={idleMin} groundSpeed={groundSpeed} telemetry={telemetry} fuelMetrics={fuelMetrics} cannotReachFuel={cannotReachFuel} weather={env.weather} soil={env.soil} />
    </div>
  );
}
