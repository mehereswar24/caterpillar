import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Clock, AlertCircle, Check } from 'lucide-react';

const INITIAL_ACTIVE_ALERTS = [
  {
    id: 'a-1',
    severity: 'CRITICAL',
    title: 'PROXIMITY BREACH',
    message: 'Worker detected within 2.3m exclusion zone',
    time: '11:52:21',
    actionRequired: 'HALT SWING & LOWER ATTACHMENTS',
  },
  {
    id: 'a-2',
    severity: 'WARNING',
    title: 'FUEL REACHABILITY WARNING',
    message: 'Fuel depletion time approaching travel time to nearest bunk',
    time: '11:48:02',
    actionRequired: 'PLAN REFUEL TRIP WITHIN 30 MIN',
  },
  {
    id: 'a-3',
    severity: 'NOTICE',
    title: 'HIGH SOIL RESISTANCE',
    message: 'Penetration load +18% on rocky basalt layer',
    time: '11:42:17',
    actionRequired: 'ENGAGE HIGH-TORQUE DIGGING MODE',
  },
];

const INITIAL_RESOLVED_ALERTS = [
  {
    id: 'r-1',
    title: 'Worker Proximity Cleared',
    message: 'Worker moved outside 5.0m danger boundary',
    resolvedAt: '11:53:04',
    triggerTime: '11:52:21',
  },
  {
    id: 'r-2',
    title: 'Seatbelt Interlock Cleared',
    message: 'Operator fastened seatbelt harness',
    resolvedAt: '11:51:32',
    triggerTime: '11:51:10',
  },
  {
    id: 'r-3',
    title: 'Engine Warmup Temperature Reached',
    message: 'Coolant temperature normalized above 50°C',
    resolvedAt: '11:32:00',
    triggerTime: '11:25:00',
  },
];

export default function AlertHistoryView() {
  const [activeAlerts, setActiveAlerts] = useState(INITIAL_ACTIVE_ALERTS);
  const [resolvedAlerts, setResolvedAlerts] = useState(INITIAL_RESOLVED_ALERTS);

  const resolveAlert = (id) => {
    const alert = activeAlerts.find(a => a.id === id);
    if (!alert) return;
    setActiveAlerts(prev => prev.filter(a => a.id !== id));
    setResolvedAlerts(prev => [
      {
        id: `r-${Date.now()}`,
        title: `${alert.title} Cleared`,
        message: alert.message,
        resolvedAt: new Date().toTimeString().split(' ')[0],
        triggerTime: alert.time,
      },
      ...prev,
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="pb-3 border-b border-[#e6e6e1]">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={20} className="text-amber-600" />
          <h1 className="text-xl font-black text-neutral-900 uppercase tracking-tight">
            Safety Alert Manager &amp; History
          </h1>
        </div>
        <p className="text-xs text-neutral-600">
          Prioritizes active events requiring immediate operator intervention versus resolved incident records.
        </p>
      </div>

      {/* 1. ACTIVE ALERTS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-red-600 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            Active Alerts Requiring Attention ({activeAlerts.length})
          </h2>
          <span className="text-[10px] text-neutral-500 font-mono">Real-time Safety Telemetry</span>
        </div>

        {activeAlerts.length === 0 ? (
          <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-2xl p-6 text-center text-emerald-600 text-xs flex items-center justify-center gap-2">
            <CheckCircle2 size={16} /> All safety parameters within nominal limits. Zero active alerts.
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border transition-all ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-red-50 border-red-500/80 shadow-lg shadow-red-950/40'
                    : alert.severity === 'WARNING'
                    ? 'bg-amber-50 border-amber-500/60'
                    : 'bg-[#f0f0ec] border-[#e6e6e1]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">
                      {alert.severity === 'CRITICAL' ? '🔴' : alert.severity === 'WARNING' ? '🟠' : '🟡'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                          alert.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-500 text-black'
                        }`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs font-bold text-neutral-900 uppercase">{alert.title}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">({alert.time})</span>
                      </div>
                      <p className="text-xs text-neutral-800 mt-1">{alert.message}</p>
                      <div className="text-[10px] text-neutral-900 font-mono mt-1 font-semibold">
                        ACTION: {alert.actionRequired}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => resolveAlert(alert.id)}
                    className="self-end sm:self-center bg-[#f0f0ec] hover:bg-[#e0e0da] text-neutral-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-[#d2d2cb] transition flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Check size={13} /> Acknowledge / Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. RESOLVED ALERTS SECTION */}
      <div className="space-y-3 pt-4 border-t border-[#e6e6e1]">
        <h2 className="text-xs font-black uppercase tracking-wider text-emerald-600 flex items-center gap-2">
          <CheckCircle2 size={15} />
          Resolved Safety Incidents ({resolvedAlerts.length})
        </h2>

        <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-2xl divide-y divide-[#e6e6e1]">
          {resolvedAlerts.map(r => (
            <div key={r.id} className="p-3.5 flex items-center justify-between gap-4 text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="text-emerald-600 font-bold">✓ RESOLVED</span>
                <div>
                  <span className="text-neutral-800 font-sans font-bold mr-2">{r.title}</span>
                  <span className="text-neutral-600 font-sans text-[11px]">{r.message}</span>
                </div>
              </div>
              <div className="text-right text-[10px] text-neutral-500 flex-shrink-0">
                Triggered: {r.triggerTime} • Cleared: {r.resolvedAt}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
