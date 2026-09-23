import React, { useState, useEffect, useRef } from 'react';
import { Gauge, Flame, AlertCircle, ShieldAlert, Sparkles, Navigation, Layers } from 'lucide-react';

export default function ExcavatorAnimation({
  mode = 'digging', // 'digging' | 'travelling' | 'idling' | 'slope_alert'
  onModeChange,
  telemetry,
}) {
  const [armAngle, setArmAngle] = useState(0);
  const [bucketAngle, setBucketAngle] = useState(0);
  const [trackOffset, setTrackOffset] = useState(0);
  const [tiltAngle, setTiltAngle] = useState(2.5);

  const animRef = useRef(null);
  const tickRef = useRef(0);

  // Sync tilt or default
  useEffect(() => {
    if (mode === 'slope_alert') {
      setTiltAngle(18.2);
    } else {
      setTiltAngle(telemetry?.tilt || 2.5);
    }
  }, [mode, telemetry?.tilt]);

  // Motion physics loop
  useEffect(() => {
    const loop = () => {
      tickRef.current += 0.035;
      const t = tickRef.current;

      if (mode === 'digging') {
        // Natural periodic digging cycle
        setArmAngle(Math.sin(t * 0.9) * 14);
        setBucketAngle(Math.sin(t * 1.3 + 1.2) * 22);
        setTrackOffset(0);
      } else if (mode === 'travelling') {
        // Boom elevated, tracks moving
        setArmAngle(-12);
        setBucketAngle(10);
        setTrackOffset(prev => (prev + 1.5) % 27);
      } else if (mode === 'idling') {
        // Rest position
        setArmAngle(0);
        setBucketAngle(0);
        setTrackOffset(0);
      } else if (mode === 'slope_alert') {
        // High slope digging struggle
        setArmAngle(Math.sin(t * 1.5) * 8);
        setBucketAngle(Math.sin(t * 1.5) * 12);
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [mode]);

  const rpm = telemetry?.rpm || (mode === 'idling' ? 820 : mode === 'slope_alert' ? 2150 : 1580);
  const hydraulic = telemetry?.hydraulic || (mode === 'slope_alert' ? 295 : 218);
  const speed = mode === 'travelling' ? 5.8 : mode === 'idling' ? 0.0 : 1.2;

  const tiltRad = (tiltAngle - 2) * 0.8;
  const isHighSlope = tiltAngle > 15;

  return (
    <div className="bg-[#121212] border border-[#242424] rounded-2xl overflow-hidden shadow-xl flex flex-col">
      {/* Simulator HUD Header */}
      <div className="px-5 py-3 bg-[#171717] border-b border-[#242424] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFB81C] animate-ping" />
            <h2 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
              Excavator Live Status Animation
            </h2>
          </div>
          <span className="text-[10px] bg-black/60 text-[#FFB81C] border border-[#FFB81C]/40 px-2 py-0.5 rounded font-mono font-semibold">
            CAT 320 HYDRAULIC
          </span>
        </div>

        {/* Operating Mode Buttons */}
        <div className="flex items-center gap-1.5 bg-[#0a0a0a] p-1 rounded-xl border border-[#2c2c2c]">
          {[
            { id: 'digging', label: 'Digging' },
            { id: 'travelling', label: 'In Transit' },
            { id: 'idling', label: 'Idling' },
            { id: 'slope_alert', label: 'Slope Warning' },
          ].map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange?.(m.id)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                mode === m.id
                  ? 'bg-[#FFB81C] text-black shadow-md shadow-[#FFB81C]/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main SVG Visualizer */}
      <div className="relative bg-[#090909] p-4 flex items-center justify-center min-h-[300px] overflow-hidden select-none">
        {/* Sky / Grid Background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#FFB81C_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Slope Warning Glow */}
        {isHighSlope && (
          <div className="absolute inset-0 bg-red-950/20 pointer-events-none border-2 border-red-500/30 animate-pulse" />
        )}

        <svg
          viewBox="0 0 460 270"
          className="w-full h-auto max-h-[340px]"
          style={{
            filter: isHighSlope ? 'drop-shadow(0 0 16px rgba(239,68,68,0.4))' : 'none',
          }}
        >
          <defs>
            {/* Caterpillar Yellow Gradient */}
            <linearGradient id="catYellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFB81C" />
              <stop offset="100%" stopColor="#D99000" />
            </linearGradient>

            {/* Cab Glass Gradient */}
            <linearGradient id="cabGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.4" />
            </linearGradient>

            {/* Ground Soil Gradient */}
            <linearGradient id="groundSoil" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#292524" />
              <stop offset="100%" stopColor="#14110f" />
            </linearGradient>
          </defs>

          {/* Excavation Trench Pit / Ground */}
          <rect x="0" y="215" width="460" height="55" fill="url(#groundSoil)" rx="3" />
          <line x1="0" y1="215" x2="460" y2="215" stroke="#44403c" strokeWidth="2.5" />

          {/* Trench trench marking */}
          <path d="M 330 215 L 360 255 L 430 255 L 440 215" fill="#1c1917" stroke="#332e2b" strokeWidth="2" />
          <text x="375" y="245" fill="#78716c" fontSize="10" fontFamily="monospace">EXCAVATION PIT</text>

          {/* Animated Dust Particles when moving or digging */}
          {mode !== 'idling' && [0, 1, 2, 3].map(i => (
            <circle key={i} cx={70 + i * 35} cy={220 + (i % 2) * 5} r={3 + i} fill="#a8a29e" opacity={0.35}>
              <animate
                attributeName="cx"
                values={`${70 + i * 35};${40 + i * 35};${70 + i * 35}`}
                dur={`${1.2 + i * 0.25}s`}
                repeatCount="indefinite"
              />
              <animate attributeName="opacity" values="0.4;0.05;0.4" dur={`${1.2 + i * 0.25}s`} repeatCount="indefinite" />
            </circle>
          ))}

          {/* Excavator Group with Dynamic Slope Tilt Transformation */}
          <g transform={`translate(210, 215) rotate(${tiltRad}) translate(-210, -215)`}>
            {/* Caterpillar Heavy Tracks Chassis */}
            <rect x="70" y="190" width="240" height="30" rx="15" fill="#1f1d1b" stroke="#FFB81C" strokeWidth="2.5" />

            {/* Moving Track Pad Links */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <rect
                key={i}
                x={78 + i * 26}
                y={192}
                width={18}
                height={26}
                rx={4}
                fill="#FFB81C"
                opacity={0.85}
              >
                {mode === 'travelling' && (
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values="0,0;-26,0"
                    dur="0.65s"
                    repeatCount="indefinite"
                    additive="sum"
                  />
                )}
              </rect>
            ))}

            {/* Rotating Guide Sprockets & Bogies */}
            {[92, 148, 204, 258, 292].map((cx, idx) => (
              <circle
                key={idx}
                cx={cx}
                cy={205}
                r={idx === 0 || idx === 4 ? 14 : 11}
                fill="#111111"
                stroke="#FFB81C"
                strokeWidth="2"
              >
                {mode === 'travelling' && (
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values={`0 ${cx} 205;360 ${cx} 205`}
                    dur="1.1s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
            ))}

            {/* Upper Machine Body */}
            <rect x="110" y="145" width="190" height="52" rx="7" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />
            <line x1="175" y1="145" x2="175" y2="197" stroke="#27272a" strokeWidth="1.5" />
            <line x1="240" y1="145" x2="240" y2="197" stroke="#27272a" strokeWidth="1.5" />

            {/* CAT Triangle & Stencil */}
            <g transform="translate(182, 155)">
              <polygon points="0,32 16,0 32,32" fill="#FFB81C" />
              <text x="36" y="24" fontSize="18" fontWeight="900" fill="#FFB81C" fontFamily="Arial Black, Impact, sans-serif">
                CAT
              </text>
            </g>

            {/* Operator Cab */}
            <rect x="225" y="102" width="95" height="54" rx="7" fill="#27272a" stroke="#52525b" strokeWidth="1.5" />

            {/* Cab Windshield Glass */}
            <rect x="233" y="108" width="40" height="32" rx="3" fill="url(#cabGlass)" />
            <rect x="278" y="108" width="34" height="32" rx="3" fill="url(#cabGlass)" opacity="0.7" />

            {/* Driver Silhouette inside Cab */}
            <circle cx="253" cy="120" r="7" fill="#FFB81C" />
            <rect x="246" y="127" width="14" height="12" rx="3" fill="#eab308" />

            {/* Green Seatbelt Indicator Light */}
            <circle cx="268" cy="130" r="3.5" fill="#22c55e">
              <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite" />
            </circle>

            {/* Exhaust Pipe & Smoke Puffs */}
            <rect x="312" y="85" width="9" height="24" rx="2" fill="#1f1f23" stroke="#52525b" strokeWidth="1" />
            {mode !== 'idling' && [0, 1, 2].map(i => (
              <circle
                key={i}
                cx={316 + i * 2}
                cy={78 - i * 14}
                r={4 + i * 2}
                fill="#71717a"
                opacity={0.35 - i * 0.1}
              >
                <animate attributeName="cy" values={`${78 - i * 14};${55 - i * 14}`} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            ))}

            {/* Counterweight */}
            <rect x="104" y="148" width="34" height="38" rx="4" fill="#09090b" stroke="#3f3f46" strokeWidth="1.5" />
            <text x="108" y="172" fontSize="8" fontWeight="bold" fill="#71717a">320 GC</text>

            {/* Articulated Hydraulic Boom, Stick & Bucket */}
            {/* Pivot at (230, 145) */}
            <g transform={`rotate(${armAngle}, 230, 145)`}>
              {/* Heavy Main Boom */}
              <rect
                x="120"
                y="125"
                width="125"
                height="18"
                rx="7"
                fill="url(#catYellowGrad)"
                stroke="#b45309"
                strokeWidth="1.8"
                transform="rotate(-38 120 125)"
              />
              {/* Hydraulic Cylinder */}
              <rect
                x="135"
                y="128"
                width="75"
                height="7"
                rx="3"
                fill="#404040"
                stroke="#171717"
                strokeWidth="1"
                transform="rotate(-38 120 125)"
              />

              {/* Stick Arm Pivot at (185, 80) */}
              <g transform={`rotate(${bucketAngle}, 185, 80)`}>
                <rect
                  x="165"
                  y="62"
                  width="100"
                  height="14"
                  rx="6"
                  fill="url(#catYellowGrad)"
                  stroke="#b45309"
                  strokeWidth="1.8"
                  transform="rotate(18 165 62)"
                />

                {/* Excavator Tooth Bucket */}
                <g transform="translate(245, 68)">
                  <path d="M 0 0 L 32 0 L 38 32 L -8 32 Z" fill="#4b5563" stroke="#1f2937" strokeWidth="1.8" />
                  <path d="M -8 32 Q 15 44 38 32" fill="none" stroke="#1f2937" strokeWidth="2.5" />
                  {/* Heavy Digging Teeth */}
                  {[0, 1, 2, 3, 4].map(idx => (
                    <rect key={idx} x={-2 + idx * 8} y={32} width={5} height={9} rx={1} fill="#111827" stroke="#374151" strokeWidth="1" />
                  ))}
                </g>
              </g>
            </g>

            {/* Slope Angle Indicator HUD on Machine */}
            {isHighSlope && (
              <g transform="translate(330, 140)">
                <rect x="-10" y="-18" width="80" height="28" rx="6" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
                <text x="30" y="0" fill="#fca5a5" fontSize="11" fontWeight="bold" textAnchor="middle">
                  SLOPE {tiltAngle.toFixed(1)}°
                </text>
              </g>
            )}
          </g>
        </svg>

        {/* Live Gauges Overlay at the Bottom of Animation */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="flex gap-2">
            <div className="bg-[#141414]/90 backdrop-blur border border-[#2e2e2e] px-3 py-1.5 rounded-xl flex items-center gap-2">
              <Gauge size={13} className="text-[#FFB81C]" />
              <span className="text-[10px] text-gray-400">ENGINE:</span>
              <span className="text-xs font-mono font-bold text-white">{rpm} RPM</span>
            </div>

            <div className="bg-[#141414]/90 backdrop-blur border border-[#2e2e2e] px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-[10px] text-gray-400">HYD:</span>
              <span className="text-xs font-mono font-bold text-sky-400">{hydraulic} bar</span>
            </div>

            <div className="bg-[#141414]/90 backdrop-blur border border-[#2e2e2e] px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className="text-[10px] text-gray-400">TILT:</span>
              <span className={`text-xs font-mono font-bold ${isHighSlope ? 'text-red-400' : 'text-emerald-400'}`}>
                {tiltAngle.toFixed(1)}°
              </span>
            </div>
          </div>

          <div className="bg-[#141414]/90 backdrop-blur border border-[#2e2e2e] px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-gray-300 font-mono font-semibold">
              SEATBELT SECURED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
