import React from 'react';
import { Clock, MapPin, SlidersHorizontal } from 'lucide-react';

const MODE_STYLE = {
  digging: { label: 'Digging', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  excavating: { label: 'Excavating', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  travelling: { label: 'In transit', text: 'text-sky-600', dot: 'bg-sky-500' },
  idling: { label: 'Idling', text: 'text-amber-600', dot: 'bg-amber-500' },
  idle: { label: 'Idling', text: 'text-amber-600', dot: 'bg-amber-500' },
  slope_alert: { label: 'Slope alert', text: 'text-red-600', dot: 'bg-red-500' },
};

// Slim banner: the task in progress. The full task list lives in the Tasks panel.
export default function TaskHeroCard({
  taskName = 'Deep Trenching Pipeline B',
  taskId = 'TSK-4092',
  sector = 'Sector 4B',
  targetDepth = '2.5 m',
  progressPct = 21,
  estimatedTimeMin = 120,
  elapsedMinutes = 25,
  operatingMode = 'digging',
  allDone = false,
  fromSupervisor = false,
  showControls = false,
  onToggleControls,
}) {
  const remainingMinutes = Math.max(0, estimatedTimeMin - elapsedMinutes);
  const mode = MODE_STYLE[operatingMode] || { label: 'Active', text: 'text-emerald-600', dot: 'bg-emerald-500' };

  return (
    <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-2xl px-5 py-3">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 mb-0.5">
            <span className="text-neutral-900 font-medium">Current task</span>
            {fromSupervisor && <span className="px-1.5 py-0.5 rounded bg-[#FFCD11]/15 text-neutral-900 text-[10px] font-medium">From supervisor</span>}
            <span className="font-mono">{allDone ? 'Shift queue' : taskId}</span>
            <span className="hidden md:flex items-center gap-1 text-neutral-600">
              <MapPin size={11} /> {sector} · {targetDepth} deep
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-neutral-900 tracking-tight leading-tight truncate capitalize">
            {taskName.toLowerCase()}
          </h1>
        </div>

        <div className="flex items-center gap-5 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 text-neutral-700">
            <Clock size={14} className="text-neutral-500" />
            <span className="font-mono text-sm font-semibold">~{remainingMinutes} min left</span>
          </div>
          <span className="font-mono text-sm font-semibold text-neutral-900">{Math.round(progressPct)}%</span>
          <div className={`flex items-center gap-1.5 text-xs font-medium ${mode.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${mode.dot} animate-pulse`} />
            {mode.label}
          </div>
          {onToggleControls && (
            <button
              type="button"
              onClick={onToggleControls}
              title="Demo controls"
              className={`p-1.5 rounded-lg transition ${showControls ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:text-neutral-900'}`}
            >
              <SlidersHorizontal size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="w-full bg-[#f0f0ec] rounded-full h-1 overflow-hidden mt-2.5">
        <div className="bg-[#FFCD11] h-1 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  );
}
