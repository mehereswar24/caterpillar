import React, { useState } from 'react';
import { AlertOctagon, X, PhoneCall, Flag, BookOpen, CheckCircle, ShieldAlert } from 'lucide-react';
import { logEvent, LOG_CATEGORIES, LOG_SEVERITY } from '../services/logger';

export default function EmergencyModal({ isOpen, onClose, machineId = 'EXC001' }) {
  const [activeView, setActiveView] = useState('menu'); // 'menu' | 'supervisor' | 'incident' | 'procedure'
  const [incidentNote, setIncidentNote] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleAlertSupervisor = () => {
    logEvent(LOG_CATEGORIES.SAFETY, `EMERGENCY: Supervisor alerted from machine ${machineId}`, LOG_SEVERITY.CRITICAL);
    setSuccessMsg('Priority radio emergency beacon sent to Ground Control & Fleet Supervisor.');
    setTimeout(() => {
      setSuccessMsg('');
      setActiveView('menu');
      onClose();
    }, 2500);
  };

  const handleMarkIncident = () => {
    logEvent(LOG_CATEGORIES.SAFETY, `INCIDENT MARKED at ${new Date().toLocaleTimeString()}: ${incidentNote || 'Site hazard/safety pause'}`, LOG_SEVERITY.WARNING);
    setSuccessMsg('Incident coordinates and black-box telemetry logged.');
    setIncidentNote('');
    setTimeout(() => {
      setSuccessMsg('');
      setActiveView('menu');
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#ffffff] border-2 border-red-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-red-950/80 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-600 hover:text-neutral-900 p-1 rounded-lg"
        >
          <X size={18} />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-600/40">
            <AlertOctagon size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-neutral-900 uppercase tracking-tight">
              Emergency Response Protocol
            </h2>
            <p className="text-xs text-red-700 font-mono">
              MACHINE UNIT: {machineId} · IMMEDIATE CAB SAFETY
            </p>
          </div>
        </div>

        {successMsg ? (
          <div className="bg-emerald-50 border border-emerald-500 rounded-xl p-4 text-center my-6">
            <CheckCircle size={36} className="text-emerald-600 mx-auto mb-2" />
            <div className="text-sm font-bold text-neutral-900 mb-1">Action Dispatched</div>
            <div className="text-xs text-emerald-700">{successMsg}</div>
          </div>
        ) : activeView === 'menu' ? (
          <div className="space-y-3 my-4">
            <p className="text-xs text-neutral-700 mb-2">
              Select response action for immediate hazard mitigation or site pause:
            </p>

            <button
              type="button"
              onClick={handleAlertSupervisor}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-black text-xs py-3.5 px-4 rounded-xl flex items-center justify-between shadow-lg shadow-red-900/40 active:scale-98 transition"
            >
              <div className="flex items-center gap-3">
                <PhoneCall size={18} />
                <div className="text-left">
                  <div className="text-sm">ALERT SUPERVISOR NOW</div>
                  <div className="text-[10px] text-red-100 font-normal">Transmits instant siren beacon &amp; GPS coordinates</div>
                </div>
              </div>
              <span className="text-[10px] bg-black/40 px-2 py-1 rounded">SEND 🚨</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('incident')}
              className="w-full bg-[#f0f0ec] hover:bg-[#f0f0ec] text-neutral-900 font-bold text-xs py-3.5 px-4 rounded-xl flex items-center justify-between border border-amber-500/40 transition"
            >
              <div className="flex items-center gap-3">
                <Flag size={18} className="text-amber-600" />
                <div className="text-left">
                  <div className="text-sm text-neutral-900">MARK SAFETY INCIDENT</div>
                  <div className="text-[10px] text-neutral-600 font-normal">Freeze telemetry log and mark hazard flag</div>
                </div>
              </div>
              <span className="text-neutral-600 text-xs">→</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('procedure')}
              className="w-full bg-[#f0f0ec] hover:bg-[#f0f0ec] text-neutral-800 font-bold text-xs py-3.5 px-4 rounded-xl flex items-center justify-between border border-[#e6e6e1] transition"
            >
              <div className="flex items-center gap-3">
                <BookOpen size={18} className="text-sky-600" />
                <div className="text-left">
                  <div className="text-sm text-neutral-900">SHOW SAFETY PROCEDURES</div>
                  <div className="text-[10px] text-neutral-600 font-normal">ROPS roll-over, underground line strike, fire guidelines</div>
                </div>
              </div>
              <span className="text-neutral-600 text-xs">→</span>
            </button>
          </div>
        ) : activeView === 'incident' ? (
          <div className="space-y-3 my-4">
            <h3 className="text-sm font-bold text-neutral-900">Mark Safety Incident / Site Flag</h3>
            <textarea
              value={incidentNote}
              onChange={e => setIncidentNote(e.target.value)}
              placeholder="Describe hazard (e.g. Unmarked gas pipe detected, unstable embankment soil slide, near-miss with haul truck)..."
              className="w-full bg-[#f5f5f2] border border-[#e6e6e1] text-xs text-neutral-900 rounded-xl p-3 outline-none focus:border-amber-400 h-24"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveView('menu')}
                className="flex-1 bg-[#f0f0ec] hover:bg-[#f0f0ec] text-neutral-700 text-xs py-2 rounded-xl"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleMarkIncident}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs py-2 rounded-xl"
              >
                Confirm Log Flag
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 my-4 text-xs text-neutral-700 max-h-60 overflow-y-auto pr-1">
            <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-xl p-3">
              <span className="font-bold text-neutral-900 block mb-1">1. Rollover / Slope Slip</span>
              <p className="text-[11px] text-neutral-600">Stay in cab. Keep seatbelt fastened. Grip ROPS handlebar. DO NOT attempt to jump from machine.</p>
            </div>
            <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-xl p-3">
              <span className="font-bold text-neutral-900 block mb-1">2. Gas / Power Line Strike</span>
              <p className="text-[11px] text-neutral-600">Halt digging immediately. Do not touch external metallic components. Alert ground control.</p>
            </div>
            <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-xl p-3">
              <span className="font-bold text-neutral-900 block mb-1">3. Fire Evacuation</span>
              <p className="text-[11px] text-neutral-600">Trigger E-Stop, lower attachments to ground, exit cab to windward safety muster point.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('menu')}
              className="w-full bg-[#f0f0ec] hover:bg-[#f0f0ec] text-neutral-700 text-xs py-2 rounded-xl mt-2"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
