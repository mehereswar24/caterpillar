import React from 'react';
import { ListChecks, Check, MapPin, Clock, Flag } from 'lucide-react';
import { withStartOffsets } from '../services/upcomingTasks';

// Every task for the shift: the one in progress, what's next, and what's already done.
export default function TasksPanel({ tasks = [], progressPct = 0, elapsedMin = 0 }) {
  const pending = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  const current = pending[0];
  const remaining = current ? Math.max(0, current.estimatedMin - elapsedMin) : 0;
  const upNext = withStartOffsets(pending.slice(1), remaining);

  return (
    <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-2xl p-4 flex flex-col min-h-0 h-full">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <ListChecks size={15} className="text-neutral-900" />
          <h3 className="text-xs font-medium text-neutral-600 tracking-wide">Tasks</h3>
        </div>
        <span className="text-[11px] text-neutral-500 font-mono">{done.length} of {tasks.length} done</span>
      </div>

      <div className="mt-3 flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
        {/* In progress */}
        {current ? (
          <div className="rounded-xl bg-[#ffffff] border border-[#FFCD11]/40 p-3">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-neutral-900 font-medium">In progress · {current.id}</span>
              {current.supervisor && <span className="text-neutral-900">From supervisor</span>}
            </div>
            <div className="text-sm font-semibold text-neutral-900 leading-snug">{current.name}</div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-600">
              <span className="flex items-center gap-1"><MapPin size={11} />{current.zone}</span>
              <span className="flex items-center gap-1"><Clock size={11} />{remaining} min left</span>
            </div>
            <div className="mt-2.5 h-1.5 rounded-full bg-[#f0f0ec] overflow-hidden">
              <div className="h-full bg-[#FFCD11] transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="text-right text-[10px] font-mono text-neutral-500 mt-1">{Math.round(progressPct)}%</div>
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-700">All tasks complete. Nice work.</div>
        )}

        {/* Up next */}
        {upNext.length > 0 && (
          <div>
            <div className="text-[11px] font-medium text-neutral-500 mb-1.5">Up next · {upNext.length}</div>
            <ol className="divide-y divide-[#e6e6e1]">
              {upNext.map((t, i) => (
                <li key={t.id} className="py-2 flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#f0f0ec] text-[10px] font-mono text-neutral-600 flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-neutral-800 leading-snug">{t.name}</div>
                    <div className="text-[11px] text-neutral-500 flex flex-wrap items-center gap-x-2">
                      <span>{t.estimatedMin} min · {t.zone}</span>
                      <span className="text-neutral-900">in ~{Math.round(t.startsInMin)}m</span>
                      {t.supervisor && <span className="text-neutral-900 font-medium">Supervisor</span>}
                      {t.priority === 'high' && <span className="flex items-center gap-0.5 text-red-600 font-medium"><Flag size={10} />High priority</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Completed */}
        {done.length > 0 && (
          <div>
            <div className="text-[11px] font-medium text-neutral-500 mb-1.5">Completed · {done.length}</div>
            <ul className="space-y-1.5">
              {done.map(t => (
                <li key={t.id} className="flex items-center gap-2 text-[12px] text-neutral-500">
                  <Check size={13} className="text-emerald-600 flex-shrink-0" />
                  <span className="line-through decoration-emerald-500/60 truncate" title={t.name}>{t.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
