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
        return <span className="bg-red-950 text-red-400 border border-red-500/40 text-[9px] font-black px-2 py-0.5 rounded">CRITICAL</span>;
      case LOG_SEVERITY.WARNING:
        return <span className="bg-amber-950 text-amber-400 border border-amber-500/40 text-[9px] font-black px-2 py-0.5 rounded">WARNING</span>;
      default:
        return <span className="bg-[#1f1f1f] text-gray-400 border border-[#333] text-[9px] font-medium px-2 py-0.5 rounded">INFO</span>;
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'MACHINE': return 'text-sky-400';
      case 'SAFETY': return 'text-emerald-400';
      case 'FUEL': return 'text-[#FFB81C]';
      case 'PROXIMITY': return 'text-red-400';
      case 'TASK': return 'text-purple-400';
      case 'VOICE': return 'text-amber-300';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Title & Machine ID */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#222] gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <FileText size={18} className="text-[#FFB81C]" />
            <h1 className="text-xl font-black text-white uppercase tracking-tight">
              Vehicle Operational Logs
            </h1>
          </div>
          <span className="text-xs text-gray-400 font-mono">{machineId} · REAL-TIME TELEMETRY BUFFER</span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            className="w-full bg-[#141414] border border-[#2b2b2b] text-xs text-white pl-9 pr-3 py-2 rounded-xl outline-none focus:border-[#FFB81C]"
          />
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111111] p-3 rounded-xl border border-[#222]">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-gray-500 uppercase font-bold mr-1">Category:</span>
          {Object.values(LOG_CATEGORIES).map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition ${
                activeCategory === cat
                  ? 'bg-[#FFB81C] text-black shadow-md'
                  : 'bg-[#181818] text-gray-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 uppercase font-bold mr-1">Severity:</span>
          {['ALL', 'INFO', 'WARNING', 'CRITICAL'].map(sev => (
            <button
              key={sev}
              type="button"
              onClick={() => setActiveSeverity(sev)}
              className={`text-xs px-2 py-0.5 rounded-md font-bold transition ${
                activeSeverity === sev
                  ? 'bg-white text-black'
                  : 'bg-[#181818] text-gray-400 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table / Feed */}
      <div className="bg-[#121212] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
        <div className="divide-y divide-[#1e1e1e]">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              No log events matching selected filters.
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="p-3.5 hover:bg-[#181818] transition flex items-center justify-between gap-4 font-mono text-xs">
                {/* Timestamp & Category */}
                <div className="flex items-center gap-3 flex-shrink-0 w-52">
                  <span className="text-gray-500 flex items-center gap-1 text-[11px]">
                    <Clock size={11} /> {log.timestamp}
                  </span>
                  <span className={`font-bold tracking-wider text-[11px] ${getCategoryColor(log.category)}`}>
                    {log.category}
                  </span>
                </div>

                {/* Message */}
                <div className="flex-1 text-gray-200 truncate font-sans text-xs">
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
