import React, { useState } from 'react';
import { AlertCircle, ChevronDown, LogOut } from 'lucide-react';
import { Avatar } from './Sidebar';

export default function TopBar({ title = 'Dashboard', operatorName = 'Operator', onEmergencyClick, onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="h-[68px] flex-shrink-0 flex items-center justify-between px-6 border-b border-[#e6e6e1]">
      <h1 className="text-[26px] font-semibold text-neutral-900 tracking-tight">{title}</h1>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onEmergencyClick}
          className="flex items-center gap-2.5 h-11 px-5 rounded-xl border border-red-500/70 bg-red-500/[0.06] text-red-600 hover:bg-red-500/15 active:scale-95 transition font-medium"
        >
          <AlertCircle size={20} className="text-red-500" />
          Emergency
        </button>

        <span className="w-px h-8 bg-[#f0f0ec]" aria-hidden />

        <div className="relative">
          <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Account menu"
            className="flex items-center gap-2 rounded-full hover:bg-black/[0.05] pr-2 transition">
            <Avatar name={operatorName} size={44} />
            <ChevronDown size={16} className="text-neutral-600" />
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#ffffff] border border-[#e6e6e1] rounded-xl p-1 shadow-xl shadow-black/10 z-30">
              <div className="px-3 py-2 text-xs text-neutral-500">Signed in as <span className="text-neutral-700">{operatorName}</span></div>
              <button type="button" onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-neutral-700 hover:bg-black/[0.05] hover:text-red-600 transition">
                <LogOut size={15} /> Lock cockpit &amp; sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
