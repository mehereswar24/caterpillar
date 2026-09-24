import React from 'react';

// One compact row of machine and site readings under the hero. Abnormal values turn red/amber.
export default function StatStrip({ telemetry = {}, fuelMetrics = {}, cannotReachFuel = false, weather, soil, groundSpeed = 0, idleMin = 0 }) {
  const rpm = telemetry.rpm ?? 0;
  const hyd = telemetry.hydraulic ?? 0;
  const fuel = telemetry.fuel ?? 0;
  const temp = telemetry.temp || 78;
  const tilt = telemetry.tilt ?? 2.3;
  const bunkKm = fuelMetrics.distanceToBunkKm ?? 1.4;
  const rangeKm = Number(fuelMetrics.rangeKm ?? 0);
  const runout = fuelMetrics.runoutTimeMin ?? 0;        // minutes the tank lasts at the current burn rate
  const travel = fuelMetrics.travelTimeMin ?? 0;        // minutes to reach the bunk
  const fmtDur = (min) => (!Number.isFinite(min) ? '—' : min >= 90 ? `${(min / 60).toFixed(1)} h` : `${Math.round(min)} min`);

  const fuelBad = cannotReachFuel || fuel <= 15;
  const tiles = [
    { k: 'Engine RPM', v: `${rpm}`, u: 'rpm', tone: rpm >= 2200 || (rpm && rpm < 650) ? 'red' : rpm > 2100 ? 'amber' : '' },
    { k: 'Hydraulic', v: `${hyd}`, u: 'bar', tone: hyd > 280 ? 'amber' : '' },
    { k: 'Coolant temp', v: `${temp}°C`, u: temp < 50 ? 'cold' : '', tone: temp > 95 ? 'red' : temp < 50 ? 'amber' : '' },
    { k: 'Chassis tilt', v: `${Number(tilt).toFixed(1)}°`, u: 'limit 15°', tone: tilt > 15 ? 'red' : '' },
    { k: 'Ground speed', v: `${Number(groundSpeed).toFixed(1)}`, u: 'kph', tone: '' },
    { k: 'Fuel tank', v: `${fuel}%`, u: `range ${rangeKm.toFixed(rangeKm < 10 ? 1 : 0)} km`, tone: fuelBad ? 'red' : fuel < 25 ? 'amber' : '', wide: true, fuel: true },
    { k: 'Idle time', v: `${idleMin}`, u: 'min', tone: '' },
    { k: 'Site', v: weather ? `${weather.temp}°` : '—', u: [weather?.label, soil ? `ground ${soil.hardness}/10` : ''].filter(Boolean).join(' · '), tone: '', wide: true },
  ];
  const TONE = { red: 'text-red-600', amber: 'text-amber-600', '': 'text-neutral-900' };

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))' }}>
      {tiles.map(t => (
        <div key={t.k} className={`rounded-xl bg-[#ffffff] border border-[#e6e6e1] px-3.5 py-2.5 min-w-0 ${t.wide ? 'col-span-3' : 'col-span-2'}`}>
          <div className="text-[11px] text-neutral-500 truncate">{t.k}</div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className={`text-lg font-semibold font-mono leading-tight ${TONE[t.tone]}`}>{t.v}</span>
            <span className="text-[11px] text-neutral-500 truncate">{t.u}</span>
          </div>
          {t.fuel && (
            <div className={`text-[11px] truncate mt-0.5 ${cannotReachFuel ? 'text-red-600 font-semibold' : 'text-neutral-500'}`}>
              lasts {fmtDur(runout)} · bunk {bunkKm} km ({fmtDur(travel)}) · {cannotReachFuel ? 'cannot reach' : 'reachable'}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
