import React, { useState, useEffect } from 'react';
import { Clock, HardHat, Gauge, ChevronRight, Activity, Calendar, ShieldCheck, LogOut } from 'lucide-react';

export default function TaskHeader({ task, operator, machineId, onLogout }) {
  const [time, setTime] = useState(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(24 * 60 + 15); // e.g. 24m 15s in shift

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setElapsedSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const totalMinutes = task?.estimated_time || 120;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const remainingMinutes = Math.max(0, totalMinutes - elapsedMinutes);
  const progressPct = Math.min(100, Math.round((elapsedMinutes / totalMinutes) * 100));

  const formatTimer = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="bg-[#ffffff] border-b border-[#e6e6e1] px-5 py-3 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Brand & Machine Status Badge */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center font-black text-white text-xl shadow-[0_0_20px_rgba(255,205,17,0.35)] flex-shrink-0">
            C
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-900 text-base tracking-tight">SmartOperator</span>
              <span className="text-[10px] bg-[#FFCD11]/15 border border-[#FFCD11]/40 text-neutral-900 px-2 py-0.5 rounded-full font-mono font-semibold uppercase">
                Driver Cockpit
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-600 mt-0.5 font-mono">
              <span className="text-neutral-700 font-bold">{machineId || 'CAT 320 · EXC001'}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* Current Task & Expected Time Banner (PRIMARY REQUIREMENT) */}
        <div className="flex-1 max-w-2xl bg-[#ffffff] border border-[#e6e6e1] rounded-xl px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-900 bg-[#FFCD11]/10 px-2 py-0.5 rounded">
                Current Assigned Task
              </span>
              <span className="text-[10px] text-neutral-600 font-mono">ID: {task?.task_id || 'TSK-4092'}</span>
            </div>
            <div className="text-sm font-bold text-neutral-900 truncate flex items-center gap-1.5">
              <span>{task?.task_type || 'Deep Trenching Pipeline B'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:border-l sm:border-[#e6e6e1] sm:pl-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-600 flex items-center gap-1">
                <Clock size={11} className="text-neutral-900" /> Expected Time
              </div>
              <div className="text-base font-extrabold text-neutral-900 font-mono leading-tight">
                {totalMinutes} <span className="text-xs text-neutral-600 font-normal">min</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-600">Remaining</div>
              <div className="text-base font-extrabold text-emerald-600 font-mono leading-tight">
                ~{remainingMinutes} <span className="text-xs text-neutral-600 font-normal">min</span>
              </div>
            </div>

            <div className="w-20 hidden md:block">
              <div className="flex justify-between text-[10px] text-neutral-600 mb-1">
                <span>Progress</span>
                <span className="text-neutral-900 font-semibold">{progressPct}%</span>
              </div>
              <div className="w-full bg-[#f0f0ec] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#FFCD11] h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Driver Badge & Clock */}
        <div className="flex items-center gap-3 justify-end">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono font-bold text-neutral-900">{time.toLocaleTimeString()}</div>
            <div className="text-[10px] text-neutral-500">
              Shift: {formatTimer(elapsedSeconds)}
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#f0f0ec] border border-[#e6e6e1] pl-2 pr-3 py-1.5 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-[#FFCD11]/20 border border-[#FFCD11]/40 text-neutral-900 flex items-center justify-center font-bold text-xs">
              <HardHat size={14} />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-neutral-900 leading-tight">
                {operator?.name || 'Rajan Kumar'}
              </div>
              <div className="text-[10px] text-neutral-600 capitalize">
                {operator?.skill || 'Expert'} Driver
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Lock & Exit Cockpit"
            className="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200 transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
