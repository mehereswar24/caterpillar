import React from 'react';
import { Clock, MapPin, Gauge, CheckCircle, ChevronRight, Activity } from 'lucide-react';

export default function TaskHeroCard({
  taskName = 'DEEP TRENCHING PIPELINE B',
  sector = 'Sector 4B',
  targetDepth = '2.5 m',
  progressPct = 21,
  estimatedTimeMin = 120,
  elapsedMinutes = 25,
  operatingMode = 'digging', // 'digging' | 'travelling' | 'idling' | 'slope_alert'
}) {
  const remainingMinutes = Math.max(0, estimatedTimeMin - elapsedMinutes);

  const modeBadge = {
    digging: { label: 'DIGGING', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-500' },
    travelling: { label: 'IN TRANSIT', color: 'bg-sky-500/20 text-sky-400 border-sky-500/40', dot: 'bg-sky-500' },
    idling: { label: 'IDLING', color: 'bg-amber-500/20 text-amber-400 border-amber-500/40', dot: 'bg-amber-500' },
    slope_alert: { label: 'SLOPE ALERT', color: 'bg-red-500/20 text-red-400 border-red-500/40', dot: 'bg-red-500' },
  }[operatingMode] || { label: 'ACTIVE', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', dot: 'bg-emerald-500' };

  return (
    <div className="bg-[#121212] border-2 border-[#2b2b2b] rounded-2xl p-5 shadow-2xl shadow-black/60 relative overflow-hidden">
      {/* Background Accent glow */}
      <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#FFB81C]/5 to-transparent pointer-events-none" />

      {/* Top Header line */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#FFB81C] bg-[#FFB81C]/15 px-2.5 py-0.5 rounded border border-[#FFB81C]/30">
            CURRENT TASK
          </span>
          <span className="text-xs text-gray-500 font-mono">ID: TSK-4092</span>
        </div>

        {/* Operating status badge right beside */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-black uppercase tracking-wider ${modeBadge.color}`}>
          <span className={`w-2 h-2 rounded-full ${modeBadge.dot} animate-pulse`} />
          <span>● {modeBadge.label}</span>
        </div>
      </div>

      {/* Dominant Task Name — Largest Text Element on Page */}
      <div className="my-2">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight uppercase font-sans">
          {taskName}
        </h1>
      </div>

      {/* Metadata strip: Sector, Depth, Progress */}
      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs md:text-sm text-gray-300 font-medium my-2">
        <span className="flex items-center gap-1.5 text-white font-semibold">
          <MapPin size={15} className="text-[#FFB81C]" />
          {sector}
        </span>
        <span className="text-gray-600">•</span>
        <span>
          Target depth: <strong className="text-white">{targetDepth}</strong>
        </span>
        <span className="text-gray-600">•</span>
        <span>
          Progress: <strong className="text-[#FFB81C] font-mono">{progressPct}%</strong>
        </span>
      </div>

      {/* Progress Bar & Expected Time Footer */}
      <div className="mt-4 pt-3 border-t border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <div className="w-full bg-[#202020] rounded-full h-2.5 overflow-hidden border border-[#333]">
            <div
              className="bg-gradient-to-r from-[#FFB81C] to-yellow-300 h-2.5 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(255,184,28,0.5)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-gray-200">
          <Clock size={18} className="text-[#FFB81C]" />
          <span>Expected completion:</span>
          <span className="text-emerald-400 font-mono text-base sm:text-lg">
            ~{remainingMinutes} min remaining
          </span>
        </div>
      </div>
    </div>
  );
}
