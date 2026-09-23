import React from 'react';
import { AlertOctagon, AlertTriangle } from 'lucide-react';

export default function CriticalPerimeterAlert({ isCritical = false, alertTitle = 'PERIMETER HAZARD DETECTED' }) {
  if (!isCritical) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden select-none"
      style={{ isolation: 'isolate' }}
    >
      {/* Explicit Inline CSS Keyframe to Guarantee Zero Bundler Dependency */}
      <style>{`
        @keyframes cockpit-red-perimeter-pulse {
          0%, 100% {
            opacity: 0.35;
            box-shadow: inset 0 0 40px 15px rgba(239, 68, 68, 0.5), inset 0 0 100px 30px rgba(185, 28, 28, 0.3);
          }
          50% {
            opacity: 1.0;
            box-shadow: inset 0 0 75px 25px rgba(239, 68, 68, 0.9), inset 0 0 150px 50px rgba(220, 38, 38, 0.6);
          }
        }
        .cockpit-perimeter-strobe {
          animation: cockpit-red-perimeter-pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* 1. Viewport Perimeter Pulsing Border & Inset Vignette */}
      <div className="absolute inset-0 border-4 border-red-600 cockpit-perimeter-strobe" />

      {/* 2. Four Edge Heavy Gradient Bars (Top, Bottom, Left, Right) */}
      {/* Top Edge */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-red-600 via-red-500/80 to-transparent cockpit-perimeter-strobe" />
      {/* Bottom Edge */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-red-600 via-red-500/80 to-transparent cockpit-perimeter-strobe" />
      {/* Left Edge */}
      <div className="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-r from-red-600 via-red-500/80 to-transparent cockpit-perimeter-strobe" />
      {/* Right Edge */}
      <div className="absolute top-0 bottom-0 right-0 w-4 bg-gradient-to-l from-red-600 via-red-500/80 to-transparent cockpit-perimeter-strobe" />

      {/* 3. Four L-Bracket High-Intensity Corner Accents */}
      {/* Top Left */}
      <div
        className="absolute top-1 left-1 w-12 h-12 border-t-4 border-l-4 border-red-400"
        style={{ filter: 'drop-shadow(0 0 12px #ef4444)' }}
      />
      {/* Top Right */}
      <div
        className="absolute top-1 right-1 w-12 h-12 border-t-4 border-r-4 border-red-400"
        style={{ filter: 'drop-shadow(0 0 12px #ef4444)' }}
      />
      {/* Bottom Left */}
      <div
        className="absolute bottom-1 left-1 w-12 h-12 border-b-4 border-l-4 border-red-400"
        style={{ filter: 'drop-shadow(0 0 12px #ef4444)' }}
      />
      {/* Bottom Right */}
      <div
        className="absolute bottom-1 right-1 w-12 h-12 border-b-4 border-r-4 border-red-400"
        style={{ filter: 'drop-shadow(0 0 12px #ef4444)' }}
      />

      {/* 4. Top Emergency Warning Beacon Pill */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-red-600 border-2 border-red-300 text-white px-5 py-1.5 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-2 shadow-[0_0_30px_rgba(239,68,68,0.9)] animate-pulse">
        <AlertOctagon size={16} className="text-white animate-spin-slow" />
        <span>⚠ HAZARD ALERT: PERIMETER ACTIVE</span>
      </div>
    </div>
  );
}
