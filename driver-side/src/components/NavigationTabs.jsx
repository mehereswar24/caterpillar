import React from 'react';
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  Bot,
  ShieldCheck,
  ShieldAlert,
  HardHat,
  Bell,
  AlertOctagon,
  LogOut
} from 'lucide-react';

export const TABS = {
  COCKPIT: 'COCKPIT',
  LOGS: 'LOGS',
  ALERTS: 'ALERTS',
  ASSISTANT: 'ASSISTANT',
};

export default function NavigationTabs({
  activeTab = TABS.COCKPIT,
  onTabChange,
  isCriticalAlert = false,
  alertCount = 0,
  machineId = 'EXC001',
  operatorName = 'Rajan Kumar',
  onEmergencyClick,
  onLogout,
}) {
  return (
    <header className="bg-[#111111] border-b border-[#242424] px-4 md:px-6 py-2.5 shadow-xl select-none sticky top-0 z-40">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Branding & Global Safety State Indicator */}
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-[#FFB81C] flex items-center justify-center font-black text-black text-lg shadow-[0_0_15px_rgba(255,184,28,0.3)] flex-shrink-0">
            C
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm tracking-tight">CAT SmartOperator</span>
              <span className="text-[10px] bg-[#1f1f1f] text-gray-300 font-mono px-2 py-0.5 rounded border border-[#333]">
                {machineId}
              </span>
            </div>

            {/* Global Safety State */}
            <div className="flex items-center gap-1.5 mt-0.5">
              {isCriticalAlert ? (
                <div className="flex items-center gap-1.5 bg-red-950/80 border border-red-500 text-red-300 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  🚨 SAFETY CRITICAL — ACTION REQUIRED
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-mono font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  SYSTEM STATUS: NORMAL
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: 4 Primary Operational Tabs */}
        <nav className="flex items-center gap-1.5 bg-[#0a0a0a] p-1 rounded-xl border border-[#262626]">
          <button
            type="button"
            onClick={() => onTabChange(TABS.COCKPIT)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === TABS.COCKPIT
                ? 'bg-[#FFB81C] text-black shadow-md shadow-[#FFB81C]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <LayoutDashboard size={14} />
            <span>COCKPIT</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange(TABS.LOGS)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === TABS.LOGS
                ? 'bg-[#FFB81C] text-black shadow-md shadow-[#FFB81C]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileText size={14} />
            <span>VEHICLE LOGS</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange(TABS.ALERTS)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition relative ${
              activeTab === TABS.ALERTS
                ? 'bg-[#FFB81C] text-black shadow-md shadow-[#FFB81C]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <AlertTriangle size={14} className={isCriticalAlert ? 'text-red-500 animate-bounce' : ''} />
            <span>ALERT HISTORY</span>
            {alertCount > 0 && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                isCriticalAlert ? 'bg-red-600 text-white' : 'bg-[#FFB81C]/30 text-[#FFB81C]'
              }`}>
                {alertCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange(TABS.ASSISTANT)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === TABS.ASSISTANT
                ? 'bg-[#FFB81C] text-black shadow-md shadow-[#FFB81C]/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bot size={14} />
            <span>AI ASSISTANT</span>
          </button>
        </nav>

        {/* Right: Emergency Stop & Operator Pill */}
        <div className="flex items-center gap-3">
          {/* Emergency Action Button */}
          <button
            type="button"
            onClick={onEmergencyClick}
            className="bg-red-600/90 hover:bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-xl border border-red-500 flex items-center gap-1.5 shadow-lg shadow-red-950/60 active:scale-95 transition"
          >
            <AlertOctagon size={14} />
            <span>EMERGENCY</span>
          </button>

          {/* Operator ID Pill */}
          <div className="flex items-center gap-2 bg-[#161616] border border-[#2b2b2b] px-2.5 py-1 rounded-xl">
            <div className="w-6 h-6 rounded-lg bg-[#FFB81C]/20 text-[#FFB81C] flex items-center justify-center font-bold text-xs">
              <HardHat size={12} />
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-white block leading-tight">
                {operatorName}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            title="Log Out / Lock Cockpit"
            className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
