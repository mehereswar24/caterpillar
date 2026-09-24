import React from 'react';
import { LayoutDashboard, FileText, AlertTriangle, Bot, GraduationCap, AlertOctagon, LogOut } from 'lucide-react';
import CatLogo from './CatLogo';

export const TABS = {
  COCKPIT: 'COCKPIT',
  TASKS: 'TASKS',
  LOGS: 'LOGS',
  ALERTS: 'ALERTS',
  ASSISTANT: 'ASSISTANT',
  LEARNING: 'LEARNING',
};

const TAB_LIST = [
  { id: TABS.COCKPIT, label: 'Cockpit', icon: LayoutDashboard },
  { id: TABS.LOGS, label: 'Vehicle logs', icon: FileText },
  { id: TABS.ALERTS, label: 'Alert history', icon: AlertTriangle },
  { id: TABS.ASSISTANT, label: 'AI assistant', icon: Bot },
  { id: TABS.LEARNING, label: 'Learning hub', icon: GraduationCap },
];

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
    <header className="border-b border-[#e6e6e1] px-4 md:px-6 py-2.5 select-none sticky top-0 z-40 bg-[#f5f5f2]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand + safety state */}
        <div className="flex items-center gap-3">
          <CatLogo height={30} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900 text-sm tracking-tight">SmartOperator</span>
              <span className="text-[11px] text-neutral-500 font-mono">{machineId}</span>
            </div>
            {isCriticalAlert ? (
              <div className="flex items-center gap-1.5 text-red-600 text-[11px] font-medium animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Safety critical — action required
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-600 text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                All systems normal
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1">
          {TAB_LIST.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={`relative flex items-center gap-2 px-3 py-2 text-[13px] font-medium transition ${
                  active ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Icon size={14} className={id === TABS.ALERTS && isCriticalAlert ? 'text-red-500' : active ? 'text-neutral-900' : ''} />
                <span>{label}</span>
                {id === TABS.ALERTS && alertCount > 0 && (
                  <span className={`text-[10px] px-1.5 rounded-full font-mono font-bold ${isCriticalAlert ? 'bg-red-600 text-white' : 'bg-[#FFCD11]/20 text-neutral-900'}`}>
                    {alertCount}
                  </span>
                )}
                {active && <span className="absolute left-3 right-3 -bottom-[11px] h-0.5 bg-[#FFCD11] rounded-full" />}
              </button>
            );
          })}
        </nav>

        {/* Emergency, operator, logout */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onEmergencyClick}
            className="text-red-600 hover:bg-red-500/10 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-500/50 flex items-center gap-1.5 active:scale-95 transition"
          >
            <AlertOctagon size={14} />
            <span>Emergency</span>
          </button>

          <span className="text-[13px] font-medium text-neutral-700 hidden sm:block">{operatorName}</span>

          <button
            type="button"
            onClick={onLogout}
            title="Log out / lock cockpit"
            className="text-neutral-500 hover:text-red-600 p-1.5 rounded-lg transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
