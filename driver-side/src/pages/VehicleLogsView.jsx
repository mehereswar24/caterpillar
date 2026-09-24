import React, { useState, useEffect } from 'react';
import { subscribeLogs, LOG_CATEGORIES, LOG_SEVERITY } from '../services/logger';
import { FileText, Search, Filter, ShieldAlert, AlertTriangle, Info, Clock } from 'lucide-react';

export default function VehicleLogsView({ machineId = 'CAT 320 • EXC001' }) {
  const [logs, setLogs] = useState([]);
  const [activeCategory, setActiveCategory] = useState(LOG_CATEGORIES.ALL);
  const [activeSeverity, setActiveSeverity] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    return subscribeLogs(setLogs);
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchCat = activeCategory === LOG_CATEGORIES.ALL || log.category === activeCategory;
    const matchSev = activeSeverity === 'ALL' || log.severity === activeSeverity;
    const matchSearch = !searchTerm || log.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSev && matchSearch;
  });

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case LOG_SEVERITY.CRITICAL:
        return <span className="bg-red-50 text-red-600 border border-red-500/40 text-[9px] font-black px-2 py-0.5 rounded">CRITICAL</span>;
      case LOG_SEVERITY.WARNING:
        return <span className="bg-amber-50 text-amber-600 border border-amber-500/40 text-[9px] font-black px-2 py-0.5 rounded">WARNING</span>;
      default:
        return <span className="bg-[#f0f0ec] text-neutral-600 border border-[#e6e6e1] text-[9px] font-medium px-2 py-0.5 rounded">INFO</span>;
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'MACHINE': return 'text-sky-600';
      case 'SAFETY': return 'text-emerald-600';
      case 'FUEL': return 'text-neutral-900';
      case 'PROXIMITY': return 'text-red-600';
      case 'TASK': return 'text-purple-600';
      case 'VOICE': return 'text-neutral-900';
      default: return 'text-neutral-700';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Title & Machine ID */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#e6e6e1] gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <FileText size={18} className="text-neutral-900" />
            <h1 className="text-xl font-black text-neutral-900 uppercase tracking-tight">
              Vehicle Operational Logs
            </h1>
          </div>
          <span className="text-xs text-neutral-600 font-mono">{machineId} · REAL-TIME TELEMETRY BUFFER</span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            className="w-full bg-[#ffffff] border border-[#e6e6e1] text-xs text-neutral-900 pl-9 pr-3 py-2 rounded-xl outline-none focus:border-[#FFCD11]"
          />
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#ffffff] p-3 rounded-xl border border-[#e6e6e1]">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-neutral-500 uppercase font-bold mr-1">Category:</span>
          {Object.values(LOG_CATEGORIES).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition ${
                activeCategory === cat
                  ? 'bg-neutral-900 text-white shadow-md'
                  : 'bg-[#f0f0ec] text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-neutral-500 uppercase font-bold mr-1">Severity:</span>
          {['ALL', 'INFO', 'WARNING', 'CRITICAL'].map(sev => (
            <button
              key={sev}
              type="button"
              onClick={() => setActiveSeverity(sev)}
              className={`text-xs px-2 py-0.5 rounded-md font-bold transition ${
                activeSeverity === sev
                  ? 'bg-neutral-900 text-white'
                  : 'bg-[#f0f0ec] text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table / Feed */}
      <div className="bg-[#ffffff] border border-[#e6e6e1] rounded-2xl overflow-hidden shadow-xl">
        <div className="divide-y divide-[#e6e6e1]">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-xs">
              No log events matching selected filters.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="p-3.5 hover:bg-[#f0f0ec] transition flex items-center justify-between gap-4 font-mono text-xs">
                {/* Timestamp & Category */}
                <div className="flex items-center gap-3 flex-shrink-0 w-52">
                  <span className="text-neutral-500 flex items-center gap-1 text-[11px]">
                    <Clock size={11} /> {log.timestamp}
                  </span>
                  <span className={`font-bold tracking-wider text-[11px] ${getCategoryColor(log.category)}`}>
                    {log.category}
                  </span>
                </div>

                {/* Message */}
                <div className="flex-1 text-neutral-800 truncate font-sans text-xs">
                  {log.message}
                </div>

                {/* Severity Badge */}
                <div className="flex-shrink-0">
                  {getSeverityBadge(log.severity)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
