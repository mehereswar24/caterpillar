import React, { useState } from 'react';
import { Home, ListChecks, FileText, AlertTriangle, Bot, GraduationCap, ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import CatLogo from './CatLogo';
import { TABS } from './NavigationTabs';

const NAV = [
  { id: TABS.COCKPIT, label: 'Dashboard', icon: Home },
  { id: TABS.TASKS, label: 'Tasks', icon: ListChecks },
  { id: TABS.LOGS, label: 'Vehicle Logs', icon: FileText },
  { id: TABS.ALERTS, label: 'Alert History', icon: AlertTriangle },
  { id: TABS.ASSISTANT, label: 'AI Assistant', icon: Bot },
  { id: TABS.LEARNING, label: 'Learning Hub', icon: GraduationCap },
];

export function Avatar({ name = 'Operator', size = 40 }) {
  return (
    <span
      className="rounded-full bg-[#4b5567] text-neutral-900 font-semibold flex items-center justify-center flex-shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export default function Sidebar({
  activeTab,
  onTabChange,
  alertCount = 0,
  isCritical = false,
  machineId = 'EXC001',
  operatorName = 'Operator',
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside className="w-[15rem] flex-shrink-0 h-full flex flex-col bg-[#ffffff] border-r border-[#e6e6e1] select-none">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <CatLogo height={44} />
        <div className="leading-tight min-w-0">
          <div className="text-[17px] font-semibold text-neutral-900 tracking-tight">SmartOperator</div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-mono">
            {isCritical && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="Safety critical" />}
            {machineId}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 mt-1 flex flex-col gap-0.5" aria-label="Main">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          const critical = id === TABS.ALERTS && alertCount > 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex items-center gap-4 h-10 pl-4 pr-3 rounded-xl text-[15px] transition ${
                active
                  ? 'bg-neutral-900 text-white font-medium'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-black/[0.04]'
              }`}
            >
                            <Icon size={20} className={`flex-shrink-0 ${active ? 'text-[#FFCD11]' : ''}`} />
              <span className="flex-1 text-left truncate">{label}</span>
              {critical && (
                <span className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center text-white ${isCritical ? 'bg-red-600' : 'bg-red-500'}`}>
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Signed-in operator */}
      <div className="relative border-t border-[#e6e6e1]">
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#ffffff] border border-[#e6e6e1] rounded-xl p-1 shadow-xl shadow-black/10 z-30">
            <button type="button" onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-700 hover:bg-black/[0.05] hover:text-red-600 transition">
              <LogOut size={15} /> Lock cockpit &amp; sign out
            </button>
          </div>
        )}
        <button type="button" onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen}
          className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-black/[0.03] transition">
          <Avatar name={operatorName} size={44} />
          <div className="leading-tight min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-neutral-900 truncate">{operatorName}</div>
            <div className="text-[13px] text-neutral-500">Operator</div>
          </div>
          {menuOpen ? <ChevronUp size={16} className="text-neutral-500" /> : <ChevronDown size={16} className="text-neutral-500" />}
        </button>
      </div>
    </aside>
  );
}
