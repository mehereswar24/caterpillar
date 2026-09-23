import React, { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, CheckCircle } from 'lucide-react';

const API = 'http://localhost:8000';
const MACHINES = ['EXC001', 'EXC002', 'LDR001', 'LDR002'];
const URGENCY_COLORS = { ok: 'text-green-400', warning: 'text-orange-400', critical: 'text-red-400' };
const URGENCY_BORDERS = { ok: 'border-green-700', warning: 'border-orange-500', critical: 'border-red-500' };

export default function Maintenance() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(
      MACHINES.map(m =>
        fetch(`${API}/maintenance/status?machine_id=${m}`)
          .then(r => r.json())
          .catch(() => ({
            machine_id: m, hours_until_service: 38,
            component_at_risk: 'hydraulic_filter', urgency: 'warning',
            recommendation: 'Hydraulic filter service due in ~38 hours.',
          }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.machine_id] = r; });
      setData(map);
      setLoading(false);
    });
  }, []);

  const totalCritical = Object.values(data).filter(d => d.urgency === 'critical').length;
  const totalWarning = Object.values(data).filter(d => d.urgency === 'warning').length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Machine Health & Maintenance</h1>
        <div className="flex gap-3">
          {totalCritical > 0 && (
            <span className="bg-red-900/50 border border-red-500 text-red-400 px-3 py-1.5 rounded text-sm font-medium">
              {totalCritical} Critical
            </span>
          )}
          {totalWarning > 0 && (
            <span className="bg-orange-900/50 border border-orange-500 text-orange-400 px-3 py-1.5 rounded text-sm font-medium">
              {totalWarning} Warning
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-cat-yellow animate-pulse">Loading machine status…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MACHINES.map(mid => {
            const d = data[mid];
            if (!d) return null;
            const urg = d.urgency || 'ok';
            return (
              <div key={mid} className={`bg-gray-800 p-6 rounded-xl border ${URGENCY_BORDERS[urg]}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Wrench className="text-cat-yellow w-7 h-7" />
                  <h2 className="text-xl font-bold">{mid}</h2>
                  {urg === 'ok'
                    ? <CheckCircle className="text-green-400 ml-auto" size={20} />
                    : <AlertTriangle className={`ml-auto ${URGENCY_COLORS[urg]}`} size={20} />}
                </div>

                <div className="mb-3">
                  <div className="text-gray-400 text-sm mb-1">Next Service Component</div>
                  <div className="text-lg font-semibold capitalize" style={{ color: urg === 'critical' ? '#f87171' : urg === 'warning' ? '#fb923c' : '#4ade80' }}>
                    {(d.component_at_risk || '').replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-gray-400 text-sm mb-1">Hours Remaining</div>
                  <div className="text-3xl font-light">{d.hours_until_service}h</div>
                  {/* Progress bar */}
                  <div className="bg-gray-700 rounded-full h-2 mt-2">
                    <div className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.max(5, Math.min(100, (d.hours_until_service / 500) * 100))}%`,
                        background: urg === 'critical' ? '#ef4444' : urg === 'warning' ? '#f97316' : '#22c55e',
                      }} />
                  </div>
                </div>

                <p className="text-gray-400 text-sm mb-4">{d.recommendation}</p>

                <button className="bg-cat-yellow text-black px-4 py-2 rounded font-bold text-sm hover:bg-yellow-400 transition w-full">
                  Draft Work Order
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
