import React from 'react';
import { AlertOctagon, AlertTriangle, Fuel, Flame, Gauge, Mountain, Users, EyeOff, ShieldAlert, Smartphone, UserX, Moon, ArrowDownCircle, Eye, HardHat, Cigarette } from 'lucide-react';

const RED = '239, 68, 68';
const AMBER = '245, 158, 11';

// One entry per alert type raised by services/alertEngine.js.
// `rgb` drives the perimeter strobe and pill colour; `priority` picks the headline when several fire at once.
const HAZARDS = {
  MICROSLEEP: { label: 'OPERATOR FALLING ASLEEP', action: 'STOP MACHINE NOW — WAKE UP', icon: EyeOff, rgb: RED, priority: 0.5 },
  DROWSY: { label: 'OPERATOR DROWSY', action: 'STOP & TAKE A BREAK', icon: Moon, rgb: RED, priority: 1.6 },
  HEAD_DROP: { label: 'HEAD NODDING', action: 'STAY ALERT — STOP IF TIRED', icon: ArrowDownCircle, rgb: AMBER, priority: 5.1 },
  YAWNING: { label: 'REPEATED YAWNING', action: 'FATIGUE SIGN — PLAN A BREAK', icon: Moon, rgb: AMBER, priority: 5.2 },
  LOOKING_AWAY: { label: 'EYES OFF THE WORK AREA', action: 'LOOK AT THE JOB', icon: Eye, rgb: AMBER, priority: 5.3 },
  NO_HARDHAT: { label: 'NO HARD HAT', action: 'WEAR YOUR HARD HAT', icon: HardHat, rgb: AMBER, priority: 5.4 },
  SMOKING: { label: 'SMOKING IN CAB', action: 'PUT IT OUT', icon: Cigarette, rgb: AMBER, priority: 5.5 },
  FATIGUE_DETECTED: { label: 'OPERATOR DROWSY', action: 'STOP MACHINE — TAKE A BREAK', icon: EyeOff, rgb: RED, priority: 1.5 },
  SEATBELT_VIOLATION: { label: 'SEATBELT NOT FASTENED', action: 'FASTEN SEATBELT NOW', icon: ShieldAlert, rgb: RED, priority: 2.5 },
  DISTRACTED: { label: 'PHONE IN USE', action: 'EYES ON THE JOB', icon: Smartphone, rgb: AMBER, priority: 5.5 },
  DRIVER_ABSENT: { label: 'NO OPERATOR IN CAB', action: 'RETURN TO SEAT OR SHUT DOWN', icon: UserX, rgb: AMBER, priority: 5.6 },
  PROXIMITY_BREACH: { label: 'PERSONNEL IN EXCLUSION ZONE', action: 'STOP SWING & TRAVEL', icon: Users, rgb: RED, priority: 1 },
  SLOPE: { label: 'SLOPE LIMIT EXCEEDED', action: 'REDUCE TILT — DRIVE STRAIGHT', icon: Mountain, rgb: RED, priority: 2 },
  OVERHEAT: { label: 'ENGINE OVERHEATING', action: 'REDUCE LOAD & IDLE TO COOL', icon: Flame, rgb: RED, priority: 3 },
  FUEL_CRITICAL: { label: 'CRITICAL FUEL LEVEL', action: 'REFUEL NOW', icon: Fuel, rgb: RED, priority: 4 },
  HIGH_PRESSURE: { label: 'HYDRAULIC PRESSURE HIGH', action: 'EASE OFF CONTROLS', icon: Gauge, rgb: AMBER, priority: 5 },
  MACHINE_FAULT: { label: 'MACHINE DEFECT DETECTED', action: 'SEE THE RED SPOT ON THE MACHINE', icon: AlertTriangle, rgb: RED, priority: 3.5 },
  FUEL_UNREACHABLE: { label: 'CANNOT REACH THE FUEL BUNK', action: 'STOP WORK AND REFUEL NOW', icon: Fuel, rgb: RED, priority: 3.9 },
  COLD_START: { label: 'COLD ENGINE OVER-REVVING', action: 'EASE OFF UNTIL IT WARMS UP', icon: Flame, rgb: AMBER, priority: 5.05 },
  FUEL_LOW: { label: 'LOW FUEL', action: 'PLAN REFUEL', icon: Fuel, rgb: AMBER, priority: 6 },
};
const FALLBACK = { label: 'HAZARD DETECTED', action: 'CHECK MACHINE', icon: AlertTriangle, rgb: RED, priority: 99 };

const sentence = (t) => t.toLowerCase().replace(/^./, c => c.toUpperCase());

// Most urgent alert first, plus the colour/label info its hazard type maps to.
export function rankAlerts(alerts = []) {
  return alerts
    .map(a => ({ ...a, hazard: HAZARDS[a.type] || FALLBACK }))
    .sort((a, b) => a.hazard.priority - b.hazard.priority);
}

// The message card. Rendered inside the Live Status panel.
export function HazardCard({ alerts = [], className = '' }) {
  const ranked = rankAlerts(alerts);
  if (!ranked.length) return null;
  const primary = ranked[0];
  const { label, action, icon: Icon, rgb } = primary.hazard;
  const extra = ranked.length - 1;
  const color = `rgb(${rgb})`;

  return (
    <div
      className={`flex items-center gap-3.5 pl-3 pr-4 py-2.5 rounded-2xl bg-[#ffffff]/95 backdrop-blur text-neutral-900 shadow-lg shadow-black/10 ${className}`}
      style={{ border: `1.5px solid rgba(${rgb}, 0.65)` }}
    >
      <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `rgba(${rgb}, 0.18)`, color }}>
        <Icon size={24} />
      </span>
      <div className="leading-tight min-w-0 flex-1">
        <div className="text-base font-semibold truncate">{sentence(label)}</div>
        <div className="text-sm text-neutral-600 truncate">{sentence(action)}</div>
      </div>
      {extra > 0 && (
        <span className="text-xs font-mono px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `rgba(${rgb}, 0.2)`, color }}>+{extra}</span>
      )}
    </div>
  );
}

// Full-screen frame only: a hairline ring that follows the most urgent alert's colour.
export default function CriticalPerimeterAlert({ alerts = [] }) {
  const ranked = rankAlerts(alerts);
  if (!ranked.length) return null;
  const { rgb } = ranked[0].hazard;
  const isCritical = ranked.some(a => a.severity === 'critical');
  const strobeSeconds = isCritical ? 1.2 : 2.4;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden select-none"
      style={{ isolation: 'isolate' }}
    >
      <style>{`
        @keyframes cockpit-hazard-pulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 1; }
        }
        .cockpit-perimeter-strobe {
          animation: cockpit-hazard-pulse ${strobeSeconds}s ease-in-out infinite;
        }
      `}</style>
      <div
        className="absolute inset-0 cockpit-perimeter-strobe"
        style={{ border: `6px solid rgba(${rgb}, 0.9)`, boxShadow: `inset 0 0 30px 4px rgba(${rgb}, 0.35)` }}
      />
    </div>
  );
}
