import React from 'react';
import { Compass, Fuel, Building2, Users, Truck, Volume2, VolumeX, Target } from 'lucide-react';

const RADAR_RANGE_M = 15; // dynamic targets are plotted out to this distance
const BREACH_M = { human: 3.0, vehicle: 3.5 };

// Polar -> CSS position inside the circle (0° = north, clockwise). Centre is 50%/50%.
function polar(angleDeg = 0, distanceM = 0) {
  const r = Math.min(distanceM / RADAR_RANGE_M, 1) * 42;
  const rad = (angleDeg * Math.PI) / 180;
  return { left: `${50 + r * Math.sin(rad)}%`, top: `${50 - r * Math.cos(rad)}%` };
}

const NONE = { displayDistance: '—', etaDisplay: '—' };

export default function ProximityRadar360({
  staticTargets = [],
  dynamicTargets = [],
  alertState = {},
  audioMuted = false,
  onToggleAudio,
  onUpdateTargetDistance,
  showControls = false,
}) {
  const { proximity = {}, fuel = {} } = alertState;
  const isHumanHazard = proximity.triggered;
  const isFuelDeficit = fuel.triggered;

  const nearest = dynamicTargets.slice().sort((a, b) => a.distanceM - b.distanceM)[0] || null;
  const fuelBunk = staticTargets.find(t => t.category === 'fuel') || NONE;
  const site = staticTargets.find(t => t.category === 'site' || t.category === 'destination') || NONE;
  const parking = staticTargets.find(t => t.category === 'parking') || null;

  const fixedPoints = [
    { key: 'fuel', icon: Fuel, color: 'text-amber-600', label: 'Fuel station', t: fuelBunk },
    { key: 'site', icon: Target, color: 'text-emerald-600', label: 'Work zone', t: site },
    ...(parking ? [{ key: 'park', icon: Building2, color: 'text-sky-600', label: 'Parking bay', t: parking }] : []),
  ];

  return (
    <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-2xl p-4 flex flex-col h-full min-h-0 overflow-hidden gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass size={15} className="text-neutral-900" />
          <h3 className="text-xs font-medium text-neutral-600 tracking-wide">360° Proximity Radar</h3>
        </div>
        <button
          type="button"
          onClick={onToggleAudio}
          className="text-[11px] text-neutral-600 hover:text-neutral-900 flex items-center gap-1.5"
          title={audioMuted ? 'Unmute warning alarm' : 'Mute warning alarm'}
        >
          {audioMuted ? <VolumeX size={13} className="text-red-600" /> : <Volume2 size={13} className="text-emerald-600" />}
          {audioMuted ? 'Muted' : 'Alarm on'}
        </button>
      </div>

      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {/* Radar disc */}
        <div className="flex-1 min-h-0 flex justify-center">
          <div
            style={{ height: '100%', aspectRatio: '1 / 1', maxWidth: '100%' }}
            className={`relative rounded-full bg-[#f5f5f2] border overflow-hidden ${
              isHumanHazard ? 'border-red-500/70' : 'border-emerald-200'
            }`}
          >
            {[6.25, 21, 35.5, 50 - 0.01].map((inset, i) => (
              <div key={i} style={{ inset: `${inset}%` }} className="absolute rounded-full border border-emerald-500/15" />
            ))}
            <div className="absolute inset-x-0 top-1/2 h-px bg-emerald-500/15" />
            <div className="absolute inset-y-0 left-1/2 w-px bg-emerald-500/15" />
            <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-emerald-500/70">N</span>
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-emerald-500/70">S</span>
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-emerald-500/70">W</span>
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-emerald-500/70">E</span>

            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_75%,rgba(16,185,129,0.3)_100%)] animate-radar-sweep pointer-events-none" />

            <div className="absolute z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-md bg-[#FFCD11] flex items-center justify-center">
              <span className="text-[8px] font-bold text-black">CAT</span>
            </div>

            {dynamicTargets.map(t => {
              const human = t.type === 'human';
              const breach = t.distanceM < (BREACH_M[t.type] ?? 3);
              return (
                <div
                  key={t.id}
                  style={polar(t.angle ?? t.bearingDeg, t.distanceM)}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                  title={`${t.name || t.label}: ${t.distanceM.toFixed(1)} m`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                      breach
                        ? 'bg-red-600 border-red-200 text-white animate-pulse'
                        : human
                        ? 'bg-[#f0f0ec] border-yellow-400 text-neutral-900'
                        : 'bg-[#f0f0ec] border-indigo-400 text-indigo-700'
                    }`}
                  >
                    {human ? <Users size={12} /> : <Truck size={12} />}
                  </div>
                  <span className={`text-[9px] font-mono font-bold mt-0.5 ${breach ? 'text-red-700' : 'text-neutral-700'}`}>
                    {t.distanceM.toFixed(1)}m
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Readouts */}
        <div className="grid grid-cols-2 gap-6 min-w-0">
          <div>
            <div className="text-[11px] font-medium text-neutral-500 mb-1.5">Destinations</div>
            <div className="divide-y divide-[#e6e6e1]">
              {fixedPoints.map(({ key, icon: Icon, color, label, t }) => (
                <div key={key} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="flex items-center gap-2 text-neutral-700">
                    <Icon size={14} className={`${color} ${key === 'fuel' && isFuelDeficit ? 'animate-pulse' : ''}`} />
                    {label}
                  </span>
                  <span className="font-mono text-neutral-900 font-semibold">
                    {t.displayDistance}
                    <span className="text-neutral-500 text-xs font-normal ml-2">{t.etaDisplay}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-neutral-500 mb-1.5">Nearby</div>
            {dynamicTargets.length === 0 ? (
              <p className="text-sm text-neutral-500 py-1">Area clear — no people or vehicles detected</p>
            ) : (
              <div className="divide-y divide-[#e6e6e1]">
                {dynamicTargets.slice(0, 3).map(t => {
                  const human = t.type === 'human';
                  const breach = t.distanceM < (BREACH_M[t.type] ?? 3);
                  return (
                    <div key={t.id} className="flex items-center justify-between py-1.5 text-sm">
                      <span className={`flex items-center gap-2 truncate ${breach ? 'text-red-700' : 'text-neutral-700'}`}>
                        {human ? <Users size={14} className="text-amber-600" /> : <Truck size={14} className="text-indigo-600" />}
                        <span className="truncate">{t.name || t.label}</span>
                      </span>
                      <span className={`font-mono font-semibold ml-2 ${breach ? 'text-red-600' : 'text-neutral-900'}`}>
                        {t.distanceM.toFixed(1)}m
                        <span className="text-neutral-500 text-xs font-normal ml-2">{t.bearingDeg ?? t.angle}°</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showControls && (
        <div className="pt-2 border-t border-[#e6e6e1]">
          <div className="flex justify-between text-[11px] text-neutral-600 mb-1">
            <span>Demo: nearest person distance</span>
            <span className={`font-mono font-bold ${isHumanHazard ? 'text-red-600' : 'text-emerald-600'}`}>
              {nearest ? `${nearest.distanceM.toFixed(1)}m` : '—'} {isHumanHazard ? '(BREACH)' : ''}
            </span>
          </div>
          <input
            type="range"
            min="0.8"
            max="8.0"
            step="0.2"
            value={nearest ? nearest.distanceM : 2.3}
            onChange={e => onUpdateTargetDistance?.(parseFloat(e.target.value))}
            className="w-full accent-[#FFCD11] h-1.5 cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
