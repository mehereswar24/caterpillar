import React from 'react';
import { Fuel, AlertTriangle, CheckCircle, Clock, Navigation } from 'lucide-react';

export default function FuelStatusCard({
  fuelPct = 41,
  fuelAvailableL = 168,
  runtimeMin = 70,
  bunkDistKm = 1.4,
  travelTimeMin = 16.8,
  cannotReachFuel = false,
  onAdjustFuel,
}) {
  const isCriticalLow = fuelPct <= 15;
  const isAlerting = cannotReachFuel || isCriticalLow;
  const isSafe = !isAlerting;

  return (
    <div className={`rounded-2xl p-4 border transition-all ${
      isAlerting
        ? 'bg-red-950/40 border-red-500/80 shadow-lg shadow-red-950/50'
        : 'bg-[#141414] border-[#292929]'
    }`}>
      {/* Title & Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Fuel size={17} className={isAlerting ? 'text-red-400' : 'text-[#FFB81C]'} />
          <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
            Fuel Reachability Status
          </h3>
        </div>

        {/* Immediate verdict badge */}
        {isSafe ? (
          <span className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle size={12} /> SAFE TO REACH
          </span>
        ) : (
          <span className="bg-red-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
            <AlertTriangle size={12} /> {cannotReachFuel ? 'CANNOT REACH FUEL BUNK' : 'CRITICAL LOW FUEL (< 15%)'}
          </span>
        )}
      </div>

      {/* Visual Fuel Bar */}
      <div className="my-2.5">
        <div className="flex justify-between items-end mb-1">
          <span className="text-[11px] text-gray-400">Tank Level (410L Tank)</span>
          <span className="text-base font-extrabold font-mono text-white">
            {fuelPct}% <span className="text-xs font-normal text-gray-400">({fuelAvailableL} L)</span>
          </span>
        </div>
        <div className="w-full bg-[#222] rounded-full h-3 overflow-hidden border border-[#333]">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              isAlerting
                ? 'bg-red-500 shadow-[0_0_12px_#ef4444]'
                : fuelPct < 25
                ? 'bg-amber-500'
                : 'bg-[#FFB81C]'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, fuelPct))}%` }}
          />
        </div>
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-b border-[#242424] font-mono">
        <div>
          <span className="text-gray-500 block text-[10px]">Estimated Runtime:</span>
          <span className={`font-bold ${isAlerting ? 'text-red-400 text-sm' : 'text-white'}`}>
            {runtimeMin.toFixed(0)} min
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-[10px]">Nearest Fuel Bunk:</span>
          <span className="text-white font-bold">
            {bunkDistKm} km
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-[10px]">Travel Time to Bunk:</span>
          <span className={`font-bold ${isAlerting ? 'text-amber-300' : 'text-gray-300'}`}>
            {travelTimeMin.toFixed(1)} min
          </span>
        </div>
        <div>
          <span className="text-gray-500 block text-[10px]">Reachability Buffer:</span>
          <span className={`font-bold ${isAlerting ? 'text-red-400' : 'text-emerald-400'}`}>
            {(runtimeMin - travelTimeMin).toFixed(0)} min
          </span>
        </div>
      </div>

      {/* Quick Test Slider */}
      {onAdjustFuel && (
        <div className="mt-2.5 pt-1">
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>Test Fuel Level:</span>
            <span className={`font-mono font-bold ${isAlerting ? 'text-red-400' : 'text-[#FFB81C]'}`}>
              {fuelPct}% {isAlerting ? '(ALERT ACTIVE)' : ''}
            </span>
          </div>
          <input
            type="range"
            min="3"
            max="100"
            value={fuelPct}
            onChange={e => onAdjustFuel(parseInt(e.target.value, 10))}
            className="w-full accent-[#FFB81C] bg-[#222] h-1.5 rounded-lg cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
