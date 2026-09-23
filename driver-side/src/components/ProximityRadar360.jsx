import React from 'react';
import {
  Compass,
  AlertTriangle,
  Fuel,
  Building2,
  Users,
  Truck,
  Volume2,
  VolumeX,
  Target,
  ShieldAlert,
  ArrowUpRight,
  MapPin
} from 'lucide-react';

export default function ProximityRadar360({
  staticTargets = [],
  dynamicTargets = [],
  alertState = {},
  audioMuted = false,
  onToggleAudio,
  onUpdateTargetDistance,
}) {
  const { hasAlerts, isCritical, proximity = {}, fuel = {} } = alertState;
  const isHumanHazard = proximity.triggered;
  const isFuelReachabilityDeficit = fuel.triggered;

  // Find nearest dynamic target
  const nearestDynamic = dynamicTargets.slice().sort((a, b) => a.distanceM - b.distanceM)[0] || null;

  // Find static targets
  const warehouse = staticTargets.find(t => t.category === 'parking') || { displayDistance: '240 m', etaDisplay: '2.9 min' };
  const fuelBunk = staticTargets.find(t => t.category === 'fuel') || { displayDistance: '1.4 km', etaDisplay: '16.8 min' };
  const taskSite = staticTargets.find(t => t.category === 'destination') || { displayDistance: '45 m', etaDisplay: '0.5 min' };

  return (
    <div className="bg-[#121212] border border-[#242424] rounded-2xl p-4 shadow-xl flex flex-col justify-between">
      {/* Radar HUD Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-3">
        <div className="flex items-center gap-2">
          <Compass size={16} className="text-[#FFB81C] animate-spin-slow" />
          <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
            360° Driver Spatial Radar
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleAudio}
            className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 bg-[#1a1a1a] px-2 py-0.5 rounded-lg border border-[#333]"
            title={audioMuted ? 'Unmute Audio Warning' : 'Mute Warning Alarm'}
          >
            {audioMuted ? <VolumeX size={12} className="text-red-400" /> : <Volume2 size={12} className="text-emerald-400" />}
            {audioMuted ? 'Muted' : 'Sound ON'}
          </button>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
            LiDAR &amp; SENSORS ONLINE
          </span>
        </div>
      </div>

      {/* DUAL ALERT NOTIFICATIONS (Driven entirely by decoupled alertEngine) */}
      <div className="space-y-2 mb-3">
        {/* Proximity Alert */}
        {isHumanHazard && proximity.activeAlert && (
          <div className="bg-red-950/80 border-2 border-red-500 text-red-200 px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 animate-pulse shadow-lg shadow-red-950/50">
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={20} className="text-red-400 flex-shrink-0 animate-bounce" />
              <div>
                <div className="text-xs font-black text-red-100 tracking-wide uppercase">
                  {proximity.activeAlert.title}
                </div>
                <div className="text-[11px] text-red-300">
                  {proximity.activeAlert.message}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-1 rounded">
              {proximity.activeAlert.action}
            </span>
          </div>
        )}

        {/* Fuel Reachability Deficit Alert */}
        {isFuelReachabilityDeficit && fuel.activeAlert && (
          <div className="bg-amber-950/80 border-2 border-amber-500 text-amber-100 px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 shadow-lg shadow-amber-950/50">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 animate-pulse" />
              <div>
                <div className="text-xs font-black text-amber-300 tracking-wide uppercase">
                  {fuel.activeAlert.title}
                </div>
                <div className="text-[11px] text-amber-200 font-mono">
                  {fuel.activeAlert.message}
                </div>
                <div className="text-[10px] text-amber-300/80 mt-0.5">
                  Excavator will exhaust fuel before reaching refill bunk! Reroute immediately.
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-amber-500 text-black px-2 py-1 rounded uppercase">
              REFUEL NOW
            </span>
          </div>
        )}
      </div>

      {/* Visual Radar & Targets Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* 360-Degree Circular Radar Visualization */}
        <div className="md:col-span-6 flex justify-center py-2">
          <div className="relative w-64 h-64 rounded-full bg-[#0a0f0a] border-2 border-emerald-900/60 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex items-center justify-center overflow-hidden">
            {/* Concentric distance rings */}
            <div className="absolute inset-4 rounded-full border border-emerald-500/20" />
            <div className="absolute inset-12 rounded-full border border-emerald-500/30" />
            <div className="absolute inset-20 rounded-full border border-emerald-500/40" />
            <div className="absolute inset-28 rounded-full border border-emerald-500/50" />

            {/* Crosshairs */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-[1px] bg-emerald-500/20" />
              <div className="h-full w-[1px] bg-emerald-500/20 absolute" />
            </div>

            {/* Cardinal Points */}
            <span className="absolute top-1 text-[9px] font-mono font-bold text-emerald-400">N (0°)</span>
            <span className="absolute right-1.5 text-[9px] font-mono font-bold text-emerald-400">E (90°)</span>
            <span className="absolute bottom-1 text-[9px] font-mono font-bold text-emerald-400">S (180°)</span>
            <span className="absolute left-1.5 text-[9px] font-mono font-bold text-emerald-400">W (270°)</span>

            {/* Rotating Radar Sweep Cone */}
            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_75%,rgba(16,185,129,0.35)_100%)] animate-radar-sweep pointer-events-none" />

            {/* Center: Excavator Anchor */}
            <div className="relative z-10 w-5 h-5 rounded-md bg-[#FFB81C] flex items-center justify-center shadow-[0_0_12px_#FFB81C]">
              <span className="text-[9px] font-black text-black">CAT</span>
            </div>

            {/* Static Target: Warehouse / Parking Bay (Bearing ~45° NE) */}
            <div
              className="absolute z-20 flex flex-col items-center group cursor-pointer"
              style={{ top: '24%', right: '22%' }}
              title={`Warehouse / Parking Bay: ${warehouse.displayDistance}`}
            >
              <div className="w-6 h-6 rounded-lg bg-sky-950 border border-sky-400 text-sky-300 flex items-center justify-center shadow-[0_0_10px_#38bdf8]">
                <Building2 size={13} />
              </div>
              <span className="text-[8px] font-mono text-sky-300 font-bold bg-black/80 px-1 rounded mt-0.5">
                {warehouse.displayDistance}
              </span>
            </div>

            {/* Static Target: Fuel Refill Bunk (Bearing ~190° S) */}
            <div
              className="absolute z-20 flex flex-col items-center group cursor-pointer"
              style={{ bottom: '15%', left: '42%' }}
              title={`Fuel Refill Bunk: ${fuelBunk.displayDistance}`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center border shadow-md transition ${
                  isFuelReachabilityDeficit
                    ? 'bg-amber-950 border-amber-400 text-amber-300 shadow-amber-500 animate-pulse'
                    : 'bg-emerald-950 border-emerald-400 text-emerald-300 shadow-emerald-500'
                }`}
              >
                <Fuel size={13} />
              </div>
              <span className="text-[8px] font-mono text-amber-300 font-bold bg-black/80 px-1 rounded mt-0.5">
                {fuelBunk.displayDistance}
              </span>
            </div>

            {/* Dynamic Target 1: Ground Worker (Bearing ~125° SE) */}
            {dynamicTargets.find(t => t.type === 'human') && (
              <div
                className="absolute z-20 flex flex-col items-center group cursor-pointer"
                style={{ bottom: '30%', right: '28%' }}
                title="Nearest Ground Personnel"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition ${
                    isHumanHazard
                      ? 'bg-red-600 border-red-200 text-white shadow-[0_0_15px_#ef4444] animate-ping'
                      : 'bg-[#222] border-yellow-400 text-yellow-300'
                  }`}
                >
                  <Users size={12} />
                </div>
                <span
                  className={`text-[8px] font-mono font-bold px-1 rounded mt-0.5 ${
                    isHumanHazard ? 'bg-red-950 text-red-300 border border-red-500' : 'bg-black/80 text-yellow-300'
                  }`}
                >
                  {dynamicTargets.find(t => t.type === 'human').distanceM.toFixed(1)}m
                </span>
              </div>
            )}

            {/* Dynamic Target 2: Nearby Vehicle (Bearing ~285° WNW) */}
            {dynamicTargets.find(t => t.type === 'vehicle') && (
              <div
                className="absolute z-20 flex flex-col items-center group cursor-pointer"
                style={{ top: '38%', left: '18%' }}
                title="Nearest Heavy Vehicle"
              >
                <div className="w-6 h-6 rounded-lg flex items-center justify-center border bg-indigo-950 border-indigo-400 text-indigo-300">
                  <Truck size={12} />
                </div>
                <span className="text-[8px] font-mono text-indigo-300 font-bold bg-black/80 px-1 rounded mt-0.5">
                  {dynamicTargets.find(t => t.type === 'vehicle').distanceM.toFixed(1)}m
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Separated Targets Architecture Cards */}
        <div className="md:col-span-6 space-y-2.5">
          {/* 1. STATIC TARGETS SECTION (Distance + ETA) */}
          <div className="bg-[#161616] border border-[#2b2b2b] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase font-bold tracking-wider pb-1.5 border-b border-[#242424]">
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-sky-400" /> Static Known Targets
              </span>
              <span className="text-sky-400 font-mono">Distance + ETA</span>
            </div>

            {/* Warehouse / Parking */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-sky-400" />
                <span className="text-gray-300 font-medium">Warehouse Parking Bay</span>
              </div>
              <div className="text-right font-mono">
                <span className="text-white font-bold">{warehouse.displayDistance}</span>
                <span className="text-gray-500 text-[10px] ml-1.5">(ETA: {warehouse.etaDisplay})</span>
              </div>
            </div>

            {/* Fuel Bunk */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#222]">
              <div className="flex items-center gap-2">
                <Fuel size={14} className="text-amber-400" />
                <span className="text-gray-300 font-medium">Fuel Refill Station</span>
              </div>
              <div className="text-right font-mono">
                <span className="text-white font-bold">{fuelBunk.displayDistance}</span>
                <span className="text-gray-500 text-[10px] ml-1.5">(ETA: {fuelBunk.etaDisplay})</span>
              </div>
            </div>

            {/* Task Destination */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#222]">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-emerald-400" />
                <span className="text-gray-300 font-medium">Task Trench Pit</span>
              </div>
              <div className="text-right font-mono">
                <span className="text-white font-bold">{taskSite.displayDistance}</span>
                <span className="text-gray-500 text-[10px] ml-1.5">(ETA: {taskSite.etaDisplay})</span>
              </div>
            </div>
          </div>

          {/* 2. DYNAMIC TARGETS SECTION (Distance + Bearing) */}
          <div className="bg-[#161616] border border-[#2b2b2b] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase font-bold tracking-wider pb-1.5 border-b border-[#242424]">
              <span className="flex items-center gap-1.5">
                <Users size={12} className="text-[#FFB81C]" /> Dynamic Targets
              </span>
              <span className="text-[#FFB81C] font-mono">Distance + Bearing</span>
            </div>

            <div className="space-y-1.5">
              {dynamicTargets.slice(0, 3).map(target => {
                const isHuman = target.type === 'human';
                const isBreach = target.distanceM < (isHuman ? 3.0 : 3.5);
                return (
                  <div
                    key={target.id}
                    className={`flex items-center justify-between text-xs p-1.5 rounded-lg border transition ${
                      isBreach
                        ? 'bg-red-950/40 border-red-600/70 text-red-200'
                        : 'bg-[#1a1a1a] border-[#292929] text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isHuman ? <Users size={12} className="text-yellow-400" /> : <Truck size={12} className="text-indigo-400" />}
                      <span className="truncate">{target.name}</span>
                    </div>
                    <div className="text-right font-mono flex-shrink-0 ml-2">
                      <span className={`font-bold ${isBreach ? 'text-red-400' : 'text-white'}`}>
                        {target.distanceM.toFixed(1)}m
                      </span>
                      <span className="text-gray-500 text-[10px] ml-1.5">
                        ({target.bearingDeg}°)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Controls */}
      <div className="mt-3 pt-3 border-t border-[#222222] bg-[#161616] p-3 rounded-xl">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Test Alert Engine Conditions</span>
          <span className="text-[#FFB81C] font-mono text-[9px]">Adjust to test triggers</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Slider: Nearest Worker Distance */}
          <div>
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Nearest Human Distance:</span>
              <span className={`font-mono font-bold ${isHumanHazard ? 'text-red-400' : 'text-emerald-400'}`}>
                {nearestDynamic ? `${nearestDynamic.distanceM.toFixed(1)}m` : '3.0m'} {isHumanHazard ? '(BREACH)' : ''}
              </span>
            </div>
            <input
              type="range"
              min="0.8"
              max="8.0"
              step="0.2"
              value={nearestDynamic ? nearestDynamic.distanceM : 2.3}
              onChange={e => onUpdateTargetDistance?.(parseFloat(e.target.value))}
              className="w-full accent-[#FFB81C] bg-[#333] h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Fuel Engine Metrics Summary */}
          <div className="bg-[#121212] border border-[#272727] rounded-lg p-2 flex items-center justify-between text-[11px] font-mono">
            <div>
              <span className="text-gray-500 block text-[10px]">Fuel Depletion:</span>
              <span className={`font-bold ${isFuelReachabilityDeficit ? 'text-red-400' : 'text-emerald-400'}`}>
                {fuel.metrics?.fuelRunoutTimeMin ?? 45} min
              </span>
            </div>
            <div className="text-right">
              <span className="text-gray-500 block text-[10px]">Travel Time to Bunk:</span>
              <span className="text-white font-bold">
                {fuel.metrics?.travelTimeToStationMin ?? 16} min
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
