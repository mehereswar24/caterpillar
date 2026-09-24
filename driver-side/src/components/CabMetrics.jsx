import React from 'react';

// The cab-monitor readout: on-device face metrics (driver / eyes / head / yawns) and the vision-model
// checks (belt / hat / phone / smoke). Shared by the operator's cab camera card and the supervisor
// console, so both show exactly the same parameters.
//
// props (all from the operator's CabCameraCard): m, sem, latency, vlmStatus, trackStatus
// `reporting=false` shows a placeholder for a supervisor looking at an operator whose monitor is off.

// ok: true = fine, false = problem, null = unknown / not measured yet
const Row = ({ label, value, ok }) => (
  <div className={`flex items-center justify-between gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wide ${
    ok === null ? 'text-neutral-500 border-black/10'
    : ok ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10'
         : 'text-red-600 border-red-500/40 bg-red-500/10'
  }`}>
    <span className="text-neutral-600 font-semibold">{label}</span><span className="truncate">{value}</span>
  </div>
);

const pct = (x) => `${Math.round(x * 100)}%`;
const deg = (x) => `${x > 0 ? '+' : ''}${Math.round(x)}°`;

export default function CabMetricsPanel({ m, sem, latency, vlmStatus, trackStatus, reporting = true, className = 'px-2 py-1.5' }) {
  if (!reporting) {
    return <div className={`${className} text-[10px] text-neutral-500 uppercase tracking-wider font-bold`}>Cab monitor not reporting</div>;
  }
  const face = m && m.driverPresent;
  const fastReady = trackStatus === 'ready' && m;
  const semVal = (ok, good, bad, unknown = '?') => (sem ? (ok === null ? unknown : ok ? good : bad) : '…');
  const beltKnown = sem && sem.seatbelt !== 'unseen';

  return (
    <div className={`${className} space-y-1`}>
      {trackStatus === 'error' && <div className="text-[9px] text-red-600 font-bold uppercase">Face tracker failed to load</div>}
      {/* fast, on-device */}
      <div className="grid grid-cols-2 gap-1">
        <Row label="Driver" value={fastReady ? (face ? 'Present' : 'ABSENT') : '…'} ok={fastReady ? face : null} />
        <Row label="Eyes"   value={fastReady && face ? (m.eyesClosed ? 'SHUT' : `Open·${pct(m.perclos)}`) : '…'} ok={fastReady && face ? !m.eyesClosed && m.perclos < 0.2 : null} />
        <Row label="Head"   value={fastReady && face && !m.calibrating ? `${deg(m.pitch)}/${deg(m.yaw)}` : '…'} ok={fastReady && face && !m.calibrating ? m.pitch < 22 && Math.abs(m.yaw) < 35 : null} />
        <Row label="Yawns"  value={fastReady && face ? `${m.yawns}/5m${m.yawning ? ' · now' : ''}` : '…'} ok={fastReady && face ? m.yawns < 3 : null} />
      </div>
      {/* slow, vision model */}
      <div className="grid grid-cols-2 gap-1">
        <Row label="Belt"  value={semVal(beltKnown ? sem.seatbelt === 'on' : null, 'On', 'OFF', 'Not seen')} ok={beltKnown ? sem.seatbelt === 'on' : null} />
        <Row label="Hat"   value={semVal(sem ? sem.hardhat === 'on' : null, 'On', 'OFF')} ok={sem ? sem.hardhat === 'on' : null} />
        <Row label="Phone" value={semVal(sem ? !sem.phone : null, 'No', 'IN USE')} ok={sem ? !sem.phone : null} />
        <Row label="Smoke" value={semVal(sem ? !sem.smoking : null, 'No', 'YES')} ok={sem ? !sem.smoking : null} />
      </div>
      <div className="text-[10px] text-neutral-500 leading-tight truncate" title={sem?.description}>
        {vlmStatus === 'offline' ? <span className="text-amber-600">Vision AI offline — belt/phone/hat checks paused</span>
          : <>{sem?.eating ? 'Eating/drinking · ' : ''}{m?.passenger ? '2nd person in cab · ' : ''}{sem?.description || '…'}{latency ? ` · ${(latency / 1000).toFixed(1)}s` : ''}</>}
      </div>
    </div>
  );
}
