import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, MapPin, RefreshCw } from 'lucide-react';

const API = 'http://localhost:5000';
const HEALTH_COLORS = { good: 'text-green-400', warning: 'text-orange-400', critical: 'text-red-400' };
const STATUS_BG = { active: 'bg-green-900/40 border-green-700', idle: 'bg-yellow-900/30 border-yellow-700' };

export default function Supervisor() {
  const [fleet, setFleet] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`${API}/fleet/map`)
      .then(r => r.json())
      .then(d => { setFleet(d); setLoading(false); })
      .catch(() => {
        setFleet({
          total: 4, active: 3, alerts: 2,
          machines: [
            { machine_id: 'EXC001', status: 'active', task: 'Trenching Sector 4', health: 'good', active_alerts: [], fuel_level: 72, telemetry: { seatbelt: true, workers_in_zone: 0, idling_time: 5 } },
            { machine_id: 'EXC002', status: 'idle',   task: 'Grading Sector 2',  health: 'warning', active_alerts: ['EXCESSIVE_IDLE'], fuel_level: 58, telemetry: { seatbelt: true, workers_in_zone: 0, idling_time: 58 } },
            { machine_id: 'LDR001', status: 'active', task: 'Loading Pit A',     health: 'critical', active_alerts: ['PROXIMITY_BREACH'], fuel_level: 44, telemetry: { seatbelt: true, workers_in_zone: 2, idling_time: 3 } },
            { machine_id: 'LDR002', status: 'active', task: 'Idle',              health: 'good', active_alerts: [], fuel_level: 91, telemetry: { seatbelt: true, workers_in_zone: 0, idling_time: 8 } },
          ],
        });
        setLoading(false);
      });
  };

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const setScene = async (machineId, scene) => {
    try {
      await fetch(`${API}/fleet/scene?machine_id=${machineId}&scene_name=${scene}`, { method: 'POST' });
      setTimeout(load, 500);
    } catch {}
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Fleet Supervisor</h1>
        <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary strip */}
      {fleet && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Machines', value: fleet.total, color: 'text-gray-200' },
            { label: 'Active', value: fleet.active, color: 'text-green-400' },
            { label: 'Active Alerts', value: fleet.alerts, color: fleet.alerts > 0 ? 'text-red-400' : 'text-gray-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Machine cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {(fleet?.machines || []).map(m => (
          <div key={m.machine_id} className={`bg-gray-800 p-5 rounded-xl border ${m.active_alerts?.length ? 'border-red-600' : 'border-gray-700'}`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{m.machine_id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${m.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                    {m.status}
                  </span>
                </div>
                <div className="text-gray-400 text-sm mt-0.5">{m.task}</div>
              </div>
              <div className={`font-semibold text-sm ${HEALTH_COLORS[m.health] || 'text-gray-300'}`}>
                {m.health?.toUpperCase()}
              </div>
            </div>

            {/* Telemetry mini-strip */}
            <div className="flex gap-4 text-xs text-gray-400 mb-3">
              <span>⛽ {m.fuel_level}%</span>
              <span className={m.telemetry?.seatbelt ? 'text-green-400' : 'text-red-400'}>
                🪑 {m.telemetry?.seatbelt ? 'Fastened' : 'UNFASTENED'}
              </span>
              <span className={m.telemetry?.workers_in_zone > 0 ? 'text-red-400' : 'text-gray-400'}>
                👷 {m.telemetry?.workers_in_zone || 0} in zone
              </span>
              <span className={m.telemetry?.idling_time > 30 ? 'text-orange-400' : 'text-gray-400'}>
                ⏱ {m.telemetry?.idling_time || 0}m idle
              </span>
            </div>

            {/* Alerts */}
            {m.active_alerts?.length > 0 && (
              <div className="mb-3 space-y-1">
                {m.active_alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded px-3 py-1.5 text-sm">
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                    <span className="text-red-300">{a.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Scene buttons */}
            <div className="flex flex-wrap gap-1.5">
              {['normal_operation', 'worker_proximity_breach', 'excessive_idle', 'seatbelt_violation_moving'].map(s => (
                <button key={s} onClick={() => setScene(m.machine_id, s)}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition">
                  {s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
