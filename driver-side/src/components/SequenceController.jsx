import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Radio } from 'lucide-react';
import { SEQUENCE_PHASES } from '../services/sequenceEngine';

export default function SequenceController({
  currentPhaseIndex = 0,
  onPhaseChange,
  isAutoPlay = true,
  onToggleAutoPlay,
  secondsUntilNext = 8,
}) {
  const currentPhase = SEQUENCE_PHASES[currentPhaseIndex];

  return (
    <div className="bg-[#141414] border border-[#2b2b2b] rounded-xl px-4 py-2.5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Sequence Live Indicator & Current Phase Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {isAutoPlay && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isAutoPlay ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </span>
          <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <Radio size={13} className="text-[#FFB81C]" />
            Real-Time Sequence Telemetry
          </span>
        </div>

        <span className="hidden sm:inline text-gray-600">|</span>

        <div className="text-xs text-white font-medium truncate">
          <strong className="text-[#FFB81C] font-mono mr-1">[{currentPhaseIndex + 1}/{SEQUENCE_PHASES.length}]</strong>
          <span>{currentPhase.name}</span>
        </div>
      </div>

      {/* Playback Controls & Direct Phase Dropdown */}
      <div className="flex items-center gap-2.5 self-end md:self-center">
        {/* Auto-play toggle */}
        <button
          type="button"
          onClick={onToggleAutoPlay}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
            isAutoPlay
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-[#222] text-gray-400 hover:text-white border border-[#333]'
          }`}
          title={isAutoPlay ? 'Pause sequence auto-advance' : 'Resume live auto-advance'}
        >
          {isAutoPlay ? <Pause size={12} /> : <Play size={12} />}
          <span>{isAutoPlay ? `LIVE (${secondsUntilNext}s)` : 'PAUSED'}</span>
        </button>

        {/* Step Prev */}
        <button
          type="button"
          onClick={() => onPhaseChange(Math.max(0, currentPhaseIndex - 1))}
          disabled={currentPhaseIndex === 0}
          className="p-1.5 bg-[#1f1f1f] hover:bg-[#2b2b2b] text-gray-300 disabled:opacity-30 rounded-lg border border-[#333] transition"
          title="Previous Phase"
        >
          <SkipBack size={13} />
        </button>

        {/* Phase Selector Dropdown */}
        <select
          value={currentPhaseIndex}
          onChange={e => onPhaseChange(parseInt(e.target.value, 10))}
          className="bg-[#1c1c1c] border border-[#333] text-gray-200 text-xs rounded-lg px-2.5 py-1 outline-none focus:border-[#FFB81C] max-w-[210px] truncate"
        >
          {SEQUENCE_PHASES.map((phase, idx) => (
            <option key={phase.id} value={idx}>
              {idx + 1}. {phase.name.split('. ')[1] || phase.name}
            </option>
          ))}
        </select>

        {/* Step Next */}
        <button
          type="button"
          onClick={() => onPhaseChange((currentPhaseIndex + 1) % SEQUENCE_PHASES.length)}
          className="p-1.5 bg-[#1f1f1f] hover:bg-[#2b2b2b] text-gray-300 rounded-lg border border-[#333] transition"
          title="Next Phase"
        >
          <SkipForward size={13} />
        </button>
      </div>
    </div>
  );
}
