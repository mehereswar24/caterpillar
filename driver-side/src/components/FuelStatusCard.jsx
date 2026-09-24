import React from 'react';
import { Fuel, AlertTriangle, CheckCircle } from 'lucide-react';

export default function FuelStatusCard({
  fuelPct = 41,
  fuelAvailableL = 168,
  runtimeMin = 70,
  bunkDistKm = 1.4,
  travelTimeMin = 16.8,
  cannotReachFuel = false,
  onAdjustFuel,
  showControls = false,
  compact = false,   // slimmer layout for under the radar
}) {
  const isAlerting = cannotReachFuel || fuelPct <= 15;
  const buffer = runtimeMin - travelTimeMin;

  const stats = [
    { label: 'Runtime left', value: `${runtimeMin.toFixed(0)} min`, warn: isAlerting },
    { label: 'Nearest bunk', value: `${bunkDistKm} km` },
    { label: 'Travel to bunk', value: `${travelTimeMin.toFixed(0)} min` },
    { label: 'Buffer', value: `${buffer.toFixed(0)} min`, warn: buffer < 0 || isAlerting },
  ];

  if (compact) {
    return (
      <div className={`rounded-2xl px-4 py-3 border ${isAlerting ? 'bg-red-50 border-red-500/70' : 'bg-[#ffffff] border-[#e6e6e1]'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel size={15} className={isAlerting ? 'text-red-600' : 'text-neutral-900'} />
            <h3 className="text-xs font-medium text-neutral-600 tracking-wide">Fuel</h3>
          </div>
          {isAlerting ? (
            <span className="text-[11px] font-bold text-red-700 flex items-center gap-1 whitespace-nowrap"><AlertTriangle size={12} /> {cannotReachFuel ? 'Cannot reach bunk' : 'Critically low'}</span>
          ) : (
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 whitespace-nowrap"><CheckCircle size={12} /> Bunk reachable</span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <span className="text-2xl font-bold font-mono text-neutral-900 leading-none">{fuelPct}%</span>
          <div className="flex-1 h-2 rounded-full bg-[#f0f0ec] overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${isAlerting ? 'bg-red-500' : fuelPct < 25 ? 'bg-amber-500' : 'bg-[#FFCD11]'}`} style={{ width: `${Math.min(100, Math.max(0, fuelPct))}%` }} />
          </div>
          <span className="text-[11px] text-neutral-500 font-mono whitespace-nowrap">{fuelAvailableL} L</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {stats.map(s => (
            <div key={s.label} className="min-w-0">
              <div className="text-[10px] text-neutral-500 truncate">{s.label}</div>
              <div className={`text-[13px] font-mono font-bold ${s.warn ? 'text-red-600' : 'text-neutral-900'}`}>{s.value}</div>
            </div>
          ))}
        </div>
        {showControls && onAdjustFuel && (
          <input type="range" min="3" max="100" value={fuelPct} onChange={e => onAdjustFuel(parseInt(e.target.value, 10))} title="Demo: fuel level" className="w-full accent-[#FFCD11] h-1.5 cursor-pointer mt-2" />
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl p-4 border ${isAlerting ? 'bg-red-50 border-red-500/70' : 'bg-[#ffffff] border-[#e6e6e1]'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fuel size={15} className={isAlerting ? 'text-red-600' : 'text-neutral-900'} />
          <h3 className="text-xs font-medium text-neutral-600 tracking-wide">Fuel</h3>
        </div>
        {isAlerting ? (
          <span className="text-[11px] font-bold text-red-700 flex items-center gap-1 whitespace-nowrap">
            <AlertTriangle size={12} /> {cannotReachFuel ? 'Cannot reach bunk' : 'Critically low'}
          </span>
        ) : (
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 whitespace-nowrap">
            <CheckCircle size={12} /> Bunk reachable
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-3xl font-bold font-mono text-neutral-900 leading-none">{fuelPct}%</span>
        <span className="text-xs text-neutral-500 font-mono">{fuelAvailableL} L of 410 L</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-[#f0f0ec] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isAlerting ? 'bg-red-500' : fuelPct < 25 ? 'bg-amber-500' : 'bg-[#FFCD11]'}`}
          style={{ width: `${Math.min(100, Math.max(0, fuelPct))}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3">
        {stats.map(s => (
          <div key={s.label}>
            <div className="text-[11px] text-neutral-500">{s.label}</div>
            <div className={`text-sm font-mono font-bold ${s.warn ? 'text-red-600' : 'text-neutral-900'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {showControls && onAdjustFuel && (
        <div className="mt-3 pt-2 border-t border-[#e6e6e1]">
          <div className="text-[11px] text-neutral-600 mb-1">Demo: fuel level</div>
          <input
            type="range"
            min="3"
            max="100"
            value={fuelPct}
            onChange={e => onAdjustFuel(parseInt(e.target.value, 10))}
            className="w-full accent-[#FFCD11] h-1.5 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
