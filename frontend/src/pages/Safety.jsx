import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, Camera } from 'lucide-react';
import ProximityRadar from '../components/ProximityRadar';

// Gauge widget (moved from TruckSimulator)
function Gauge({ label, value, min, max, unit, warn, danger, icon }) {
  const pct   = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const color = value >= danger ? '#ef4444' : value >= warn ? '#f97316' : '#22c55e';
  return (
    <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
      <div className="flex justify-between items-center mb-1">
        <span className="text-gray-400 text-xs flex items-center gap-1">{icon} {label}</span>
        <span className="font-bold text-sm" style={{ color }}>{value}{unit}</span>
      </div>
      <div className="bg-gray-700 rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }}/>
      </div>
    </div>
  );
}

export default function Safety({ liveData }) {
  // liveData is { telemetry, alerts, scene } pushed from Dashboard via TruckSimulator's onTelemetryChange
  const t      = liveData?.telemetry || { rpm:1480, hydraulic:218, fuel:72, temp:82, tilt:2.1, seatbelt:true, workers:0, speed:4.2 };
  const alerts = liveData?.alerts    || [];

  const criticalAlerts = alerts.filter(a => ['#ef4444','#f43f5e'].includes(a.color));

  return (
    <div className="p-10 h-full flex flex-col">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <p className="text-green-500 font-semibold tracking-wider text-sm uppercase mb-1 flex items-center gap-2">
            <ShieldCheck size={16}/> System Active
          </p>
          <h1 className="text-4xl font-light tracking-tight text-white">Safety Monitor</h1>
        </div>
        <span className="text-gray-400 text-xs">EXC001 · live telemetry</span>
      </header>

      {/* Active alerts banner */}
      {criticalAlerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {criticalAlerts.map((a, i) => (
            <div key={i} className="flex gap-4 items-start p-4 rounded-2xl border"
              style={{ background:`${a.color}18`, borderColor:`${a.color}55` }}>
              <div className="p-3 rounded-xl" style={{ background: a.color }}>
                <AlertTriangle className="text-black w-6 h-6"/>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-0.5" style={{ color: a.color }}>{a.type}</h3>
                <p className="text-gray-400 text-sm">Live telemetry alert from simulator — immediate action required.</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        {/* Left — gauges + seatbelt/workers */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* 6 live gauges */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Live Telemetry</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Gauge label="Engine RPM"  value={t.rpm}       min={600} max={2500} unit="rpm" warn={1900} danger={2100} icon="⚙️"/>
              <Gauge label="Hydraulic"   value={t.hydraulic} min={100} max={320}  unit="bar" warn={250}  danger={280}  icon="💧"/>
              <Gauge label="Eng. Temp"   value={t.temp}      min={30}  max={110}  unit="°C"  warn={90}   danger={100}  icon="🌡"/>
              <Gauge label="Fuel Level"  value={t.fuel}      min={0}   max={100}  unit="%"   warn={20}   danger={10}   icon="⛽"/>
              <Gauge label="Tilt Angle"  value={t.tilt}      min={0}   max={25}   unit="°"   warn={12}   danger={15}   icon="📐"/>
              <Gauge label="Speed"       value={t.speed}     min={0}   max={20}   unit="kph" warn={10}   danger={15}   icon="💨"/>
            </div>
          </div>

          {/* Seatbelt + workers status */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-2xl p-5 border text-center ${
              t.seatbelt
                ? 'bg-green-900/20 border-green-700'
                : 'bg-red-900/20 border-red-600 animate-pulse'
            }`}>
              <div className="text-3xl mb-2">🪑</div>
              <div className={`font-bold text-lg ${t.seatbelt ? 'text-green-400' : 'text-red-400'}`}>
                {t.seatbelt ? 'Seatbelt Fastened' : 'SEATBELT OFF'}
              </div>
              <div className="text-gray-500 text-xs mt-1">
                {t.seatbelt ? 'Operator secured' : 'Stop machine immediately'}
              </div>
            </div>
            <div className={`rounded-2xl p-5 border text-center ${
              t.workers === 0
                ? 'bg-green-900/20 border-green-700'
                : 'bg-red-900/20 border-red-600 animate-pulse'
            }`}>
              <div className="text-3xl mb-2">👷</div>
              <div className={`font-bold text-lg ${t.workers === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {t.workers === 0 ? 'Zone Clear' : `${t.workers} Worker${t.workers > 1 ? 's' : ''} In Zone`}
              </div>
              <div className="text-gray-500 text-xs mt-1">
                {t.workers === 0 ? 'No personnel detected' : 'Halt — proximity breach'}
              </div>
            </div>
          </div>

          {/* Camera feed */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col flex-1">
            <div className="flex items-center gap-3 mb-4">
              <Camera className="text-gray-400"/>
              <h3 className="text-white font-medium">Live Camera Feed</h3>
            </div>
            <div className="flex-1 bg-black rounded-xl border border-white/5 flex items-center justify-center relative min-h-[200px]">
              <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">REC</div>
              <p className="text-gray-600 font-mono text-sm">Cabin Camera Feed Offline</p>
            </div>
          </div>
        </div>

        {/* Right — proximity radar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
          <h3 className="text-xl font-medium text-white mb-8 w-full text-left">Proximity Radar</h3>
          <div className="flex-1 flex items-center justify-center w-full">
            <ProximityRadar distance={t.workers > 0 ? '1.8' : '8.0'} />
          </div>
          <div className="w-full mt-8 bg-black/50 p-4 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Nearest Worker</span>
              <span className={`font-bold ${t.workers > 0 ? 'text-red-500' : 'text-green-400'}`}>
                {t.workers > 0 ? '1.8m' : '> 8m'}
              </span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${t.workers > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: t.workers > 0 ? '85%' : '10%' }}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
