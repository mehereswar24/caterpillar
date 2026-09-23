import React, { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:5000';

const SCENES = [
  { id: 'normal_operation',          label: 'Normal',       color: '#22c55e' },
  { id: 'excessive_idle',            label: 'Idle',         color: '#f97316' },
  { id: 'worker_proximity_breach',   label: 'Proximity',    color: '#ef4444' },
  { id: 'seatbelt_violation_moving', label: 'Seatbelt Off', color: '#f43f5e' },
  { id: 'slope_instability',         label: 'Slope Alert',  color: '#ef4444' },
  { id: 'operator_fatigue',          label: 'Fatigue',      color: '#a78bfa' },
  { id: 'cold_start_abuse',          label: 'Cold Start',   color: '#fb923c' },
];

export const SCENE_TELEMETRY = {
  normal_operation:          { rpm: 1480, hydraulic: 218, fuel: 72, temp: 82,  tilt: 2.1,  seatbelt: true,  workers: 0, idle: 8,  speed: 4.2 },
  excessive_idle:            { rpm: 820,  hydraulic: 170, fuel: 68, temp: 75,  tilt: 0.5,  seatbelt: true,  workers: 0, idle: 58, speed: 0   },
  worker_proximity_breach:   { rpm: 1400, hydraulic: 210, fuel: 65, temp: 80,  tilt: 2.0,  seatbelt: true,  workers: 2, idle: 4,  speed: 3.0 },
  seatbelt_violation_moving: { rpm: 1600, hydraulic: 235, fuel: 70, temp: 83,  tilt: 3.0,  seatbelt: false, workers: 0, idle: 2,  speed: 6.5 },
  slope_instability:         { rpm: 1350, hydraulic: 205, fuel: 60, temp: 78,  tilt: 18.5, seatbelt: true,  workers: 0, idle: 3,  speed: 1.5 },
  operator_fatigue:          { rpm: 1200, hydraulic: 190, fuel: 55, temp: 77,  tilt: 2.5,  seatbelt: true,  workers: 0, idle: 20, speed: 2.0 },
  cold_start_abuse:          { rpm: 2210, hydraulic: 288, fuel: 98, temp: 45,  tilt: 1.0,  seatbelt: true,  workers: 0, idle: 1,  speed: 1.0 },
};

export function getAlerts(t, scene) {
  const alerts = [];
  if (!t.seatbelt && t.speed > 1)       alerts.push({ type: 'SEATBELT VIOLATION',                   color: '#f43f5e', icon: '🪑' });
  if (t.workers > 0)                     alerts.push({ type: `${t.workers} WORKER${t.workers > 1 ? 'S' : ''} IN ZONE`, color: '#ef4444', icon: '👷' });
  if (t.tilt > 15)                       alerts.push({ type: `SLOPE ${t.tilt.toFixed(1)}° — DANGER`, color: '#ef4444', icon: '⚠️' });
  if (t.idle > 30)                       alerts.push({ type: `EXCESSIVE IDLE ${t.idle}min`,           color: '#f97316', icon: '⏱' });
  if (t.rpm > 2000)                      alerts.push({ type: `OVER-REV ${t.rpm}rpm`,                  color: '#fb923c', icon: '🔴' });
  if (t.hydraulic > 270)                 alerts.push({ type: `HIGH HYD PRESSURE ${t.hydraulic}bar`,  color: '#fb923c', icon: '💧' });
  if (t.temp < 50 && t.rpm > 1800)      alerts.push({ type: 'COLD START ABUSE',                      color: '#fb923c', icon: '🌡' });
  if (scene === 'operator_fatigue')      alerts.push({ type: 'FATIGUE DETECTED',                      color: '#a78bfa', icon: '😴' });
  return alerts;
}

function ExcavatorSVG({ tilt, armAngle, bucketAngle, alerts, scene }) {
  const hasAlert = alerts.length > 0;
  const critical = alerts.some(a => ['#ef4444', '#f43f5e'].includes(a.color));
  const bodyColor  = critical ? '#7f1d1d' : '#1c1917';
  const cabColor   = critical ? '#991b1b' : '#292524';
  const trackColor = '#facc15';
  const tiltRad    = (tilt - 2) * 0.8;

  return (
    <svg viewBox="0 0 420 260" className="w-full h-full"
      style={{ filter: hasAlert ? 'drop-shadow(0 0 12px rgba(239,68,68,0.5))' : 'none' }}>
      {/* Ground */}
      <rect x="0" y="210" width="420" height="50" fill="#292524" rx="4"/>
      <line x1="0" y1="210" x2="420" y2="210" stroke="#44403c" strokeWidth="2"/>

      {/* Dust particles */}
      {scene !== 'excessive_idle' && [0,1,2].map(i => (
        <circle key={i} cx={60+i*30} cy={215+i*3} r={3+i} fill="#78716c" opacity={0.4}>
          <animate attributeName="cx" values={`${60+i*30};${40+i*30};${60+i*30}`} dur={`${1.2+i*0.3}s`} repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.4;0;0.4" dur={`${1.2+i*0.3}s`} repeatCount="indefinite"/>
        </circle>
      ))}

      <g transform={`translate(200,210) rotate(${tiltRad}) translate(-200,-210)`}>
        {/* Tracks */}
        <rect x="60" y="185" width="230" height="28" rx="14" fill="#292524" stroke={trackColor} strokeWidth="2"/>
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i} x={68+i*27} y={187} width={20} height={24} rx={4} fill={trackColor} opacity={0.85}>
            <animateTransform attributeName="transform" type="translate" values="0,0;-27,0" dur="0.8s" repeatCount="indefinite" additive="sum"/>
          </rect>
        ))}
        {[85,155,225,270].map((cx,i) => (
          <circle key={i} cx={cx} cy={199} r={i===0||i===3?16:13} fill="#1c1917" stroke={trackColor} strokeWidth="2">
            <animateTransform attributeName="transform" type="rotate" values={`0 ${cx} 199;360 ${cx} 199`} dur="1.2s" repeatCount="indefinite"/>
          </circle>
        ))}

        {/* Body */}
        <rect x="100" y="145" width="180" height="50" rx="6" fill={bodyColor} stroke="#44403c" strokeWidth="1.5"/>
        <line x1="160" y1="145" x2="160" y2="195" stroke="#44403c" strokeWidth="1" opacity="0.5"/>
        <line x1="220" y1="145" x2="220" y2="195" stroke="#44403c" strokeWidth="1" opacity="0.5"/>
        <text x="175" y="175" fontSize="16" fontWeight="bold" fill="#facc15" fontFamily="Arial">CAT</text>

        {/* Cab */}
        <rect x="210" y="105" width="90" height="50" rx="6" fill={cabColor} stroke="#57534e" strokeWidth="1.5"/>
        <rect x="218" y="112" width="35" height="28" rx="3" fill="#0ea5e9" opacity={0.7}/>
        <rect x="258" y="112" width="28" height="28" rx="3" fill="#0ea5e9" opacity={0.5}/>
        <line x1="222" y1="114" x2="228" y2="124" stroke="white" strokeWidth="1" opacity="0.4"/>
        <circle cx="235" cy="122" r="6" fill="#78716c"/>
        <rect x="230" y="128" width="10" height="10" rx="2" fill="#78716c"/>

        {/* Seatbelt LED */}
        {!alerts.find(a => a.type.includes('SEATBELT'))
          ? <circle cx="248" cy="130" r="4" fill="#22c55e" opacity="0.9"/>
          : <circle cx="248" cy="130" r="4" fill="#f43f5e">
              <animate attributeName="opacity" values="1;0.2;1" dur="0.5s" repeatCount="indefinite"/>
            </circle>
        }

        {/* Exhaust */}
        <rect x="295" y="90" width="8" height="20" rx="2" fill="#292524" stroke="#44403c" strokeWidth="1"/>
        {[0,1,2].map(i => (
          <ellipse key={i} cx={299+i*2} cy={80-i*12} rx={4+i*2} ry={3+i} fill="#57534e" opacity={0.4-i*0.1}/>
        ))}

        {/* Boom arm */}
        <g transform={`rotate(${armAngle}, 215, 145)`}>
          <rect x="110" y="125" width="115" height="16" rx="6" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" transform="rotate(-35 110 125)"/>
          <rect x="120" y="128" width="70"  height="8"  rx="3" fill="#d97706" opacity="0.8"  transform="rotate(-35 110 125)"/>
          <g transform={`rotate(${bucketAngle}, 175, 85)`}>
            <rect x="155" y="68" width="90" height="13" rx="5" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" transform="rotate(15 155 68)"/>
            <g transform="translate(232,72)">
              <path d="M0,0 L25,0 L30,25 L-5,25 Z" fill="#78716c" stroke="#57534e" strokeWidth="1.5"/>
              <path d="M-5,25 Q12,35 30,25" fill="none" stroke="#57534e" strokeWidth="2"/>
              {[0,1,2,3].map(i => <rect key={i} x={2+i*7} y={25} width={4} height={7} rx={1} fill="#44403c"/>)}
            </g>
          </g>
        </g>

        {/* Counterweight */}
        <rect x="95" y="148" width="30" height="35" rx="4" fill="#1c1917" stroke="#44403c" strokeWidth="1.5"/>
        <text x="98" y="170" fontSize="7" fill="#57534e">CW</text>

        {/* Worker blips */}
        {alerts.find(a => a.type.includes('WORKER')) && [{x:50,y:165},{x:370,y:170}].map((p,i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={12} fill="#ef4444" opacity={0.2}>
              <animate attributeName="r" values="12;20;12" dur="1s" repeatCount="indefinite"/>
            </circle>
            <text x={p.x-5} y={p.y+5} fontSize="14">👷</text>
          </g>
        ))}

        {/* Tilt indicator */}
        {tilt > 5 && (
          <g>
            <line x1="320" y1="145" x2={320+Math.sin(tiltRad*Math.PI/180)*30} y2={145-Math.cos(tiltRad*Math.PI/180)*30} stroke="#ef4444" strokeWidth="2"/>
            <text x="325" y="140" fontSize="10" fill="#ef4444">{tilt.toFixed(1)}°</text>
          </g>
        )}
      </g>

      {/* Critical flash */}
      {critical && (
        <rect x="0" y="0" width="420" height="260" fill="#ef4444" opacity={0.04}>
          <animate attributeName="opacity" values="0.04;0;0.04" dur="0.6s" repeatCount="indefinite"/>
        </rect>
      )}
    </svg>
  );
}

export default function TruckSimulator({ onTelemetryChange }) {
  const [scene, setScene]           = useState('normal_operation');
  const [telemetry, setTelemetry]   = useState(SCENE_TELEMETRY.normal_operation);
  const [alerts, setAlerts]         = useState([]);
  const [armAngle, setArmAngle]     = useState(0);
  const [bucketAngle, setBucketAngle] = useState(0);
  const [anomalyResult, setAnomalyResult] = useState(null);
  const [loading, setLoading]       = useState(false);
  const animRef  = useRef(null);
  const tickRef  = useRef(0);

  // Arm animation
  useEffect(() => {
    const animate = () => {
      tickRef.current += 0.03;
      const t = tickRef.current;
      const isIdle = scene === 'excessive_idle';
      setArmAngle(isIdle ? 0 : Math.sin(t * 0.7) * 12);
      setBucketAngle(isIdle ? 0 : Math.sin(t * 1.1 + 1) * 18);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [scene]);

  // Live telemetry noise + propagate to parent (Safety page)
  useEffect(() => {
    const base = SCENE_TELEMETRY[scene];
    const interval = setInterval(() => {
      const noisy = {
        ...base,
        rpm:       Math.round(base.rpm + (Math.random() - 0.5) * 60),
        hydraulic: Math.round(base.hydraulic + (Math.random() - 0.5) * 10),
        temp:      Math.round(base.temp + (Math.random() - 0.5) * 3),
        fuel:      parseFloat((base.fuel - Math.random() * 0.05).toFixed(1)),
        speed:     parseFloat((base.speed + (Math.random() - 0.5) * 0.5).toFixed(1)),
      };
      setTelemetry(noisy);
      const newAlerts = getAlerts(noisy, scene);
      setAlerts(newAlerts);
      onTelemetryChange?.({ telemetry: noisy, alerts: newAlerts, scene });
    }, 800);
    return () => clearInterval(interval);
  }, [scene]);

  const loadScene = async (sceneId) => {
    setScene(sceneId);
    setLoading(true);
    setAnomalyResult(null);
    try {
      await fetch(`${API}/fleet/scene?machine_id=EXC001&scene_name=${sceneId}`, { method: 'POST' });
      const t = SCENE_TELEMETRY[sceneId];
      const r = await fetch(`${API}/anomaly/score`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          RPM: t.rpm, HydraulicPressure: t.hydraulic, TiltAngle: t.tilt,
          FuelUsed: 3.5, LoadCycles: 10, IdlingTime: t.idle, ActiveTime: 50,
          SpeedKPH: t.speed, EngineHours: 2000, hour_of_day: 10, is_night: 0,
          weather_encoded: 1, soil_encoded: 0, seatbelt_encoded: t.seatbelt ? 0 : 1,
        }),
      });
      setAnomalyResult(await r.json());
    } catch {}
    setLoading(false);
  };

  const criticalAlerts = alerts.filter(a => ['#ef4444','#f43f5e'].includes(a.color));
  const warnAlerts     = alerts.filter(a => !['#ef4444','#f43f5e'].includes(a.color));

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-cat-yellow font-bold text-lg">🚜 Live Machine Simulator</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            criticalAlerts.length > 0 ? 'bg-red-900 text-red-300 animate-pulse' :
            warnAlerts.length > 0     ? 'bg-orange-900 text-orange-300' :
                                        'bg-green-900 text-green-300'
          }`}>
            {criticalAlerts.length > 0 ? '⚠ ALERT' : warnAlerts.length > 0 ? '! WARNING' : '✓ NORMAL'}
          </span>
        </div>
        <span className="text-gray-400 text-xs">EXC001 · {new Date().toLocaleTimeString()}</span>
      </div>

      <div className="flex gap-0">
        {/* SVG canvas — takes most of the width */}
        <div className="relative bg-gray-950 p-4 flex-1" style={{ minHeight: 280 }}>
          <ExcavatorSVG
            tilt={telemetry.tilt}
            armAngle={armAngle}
            bucketAngle={bucketAngle}
            alerts={alerts}
            scene={scene}
          />

          {/* Alert overlays */}
          <div className="absolute top-3 left-3 space-y-1.5 max-w-xs">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm"
                style={{ background:`${a.color}22`, border:`1px solid ${a.color}`, color:a.color }}>
                <span>{a.icon}</span>
                <span>{a.type}</span>
                {['#ef4444','#f43f5e'].includes(a.color) && <span className="ml-auto animate-pulse">●</span>}
              </div>
            ))}
          </div>

          {/* AI anomaly badge */}
          {anomalyResult && anomalyResult.label !== 'NORMAL' && (
            <div className="absolute bottom-3 right-3 bg-gray-900/90 border border-orange-500 rounded-lg px-3 py-2 text-xs max-w-[200px]">
              <div className="text-orange-400 font-bold mb-0.5">AI: {anomalyResult.label}</div>
              <div className="text-gray-400 leading-snug">{anomalyResult.explanation?.slice(0,80)}…</div>
            </div>
          )}
        </div>

        {/* Scene selector — right strip */}
        <div className="border-l border-gray-700 p-4 flex flex-col justify-center gap-2 w-36">
          <div className="text-gray-500 text-xs mb-1 uppercase tracking-wider">Scenarios</div>
          {SCENES.map(s => (
            <button key={s.id} onClick={() => loadScene(s.id)}
              className="text-xs py-1.5 px-2 rounded font-medium border transition-all text-left"
              style={{
                background:   scene === s.id ? `${s.color}22` : 'transparent',
                borderColor:  scene === s.id ? s.color : '#374151',
                color:        scene === s.id ? s.color : '#9ca3af',
              }}>
              {loading && scene === s.id ? '…' : s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
