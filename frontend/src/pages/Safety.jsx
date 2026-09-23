import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Shield, MapPin } from 'lucide-react';
import ProximityRadar from '../components/ProximityRadar';

const API = 'http://localhost:8000';

const SCENES = [
  'normal_operation', 'worker_proximity_breach', 'seatbelt_violation_moving',
  'excessive_idle', 'slope_instability', 'night_low_visibility',
  'geo_fence_breach', 'cold_start_abuse', 'operator_fatigue',
];

export default function Safety() {
  const [alerts, setAlerts] = useState([]);
  const [proximity, setProximity] = useState({ workers_in_zone: 0, distance_to_nearest_m: 99, alert: false });
  const [incidents, setIncidents] = useState([]);
  const [scene, setScene] = useState('normal_operation');
  const [loading, setLoading] = useState(false);

  const fetchIncidents = () => {
    fetch(`${API}/incidents/list?limit=10`)
      .then(r => r.json())
      .then(d => setIncidents(d.incidents || []))
      .catch(() => {});
  };

  useEffect(() => { fetchIncidents(); }, []);

  const triggerScene = async (sceneName) => {
    setScene(sceneName);
    setLoading(true);
    try {
      // Load scene in simulator
      await fetch(`${API}/fleet/scene?machine_id=EXC001&scene_name=${sceneName}`, { method: 'POST' });

      // Pull telemetry-based alerts from anomaly endpoint
      const telemetryMap = {
        seatbelt_violation_moving: { SpeedKPH: 6.5, seatbelt_encoded: 1, IdlingTime: 5 },
        worker_proximity_breach:   { SpeedKPH: 3, workers_in_zone: 2, distance: 1.8 },
        slope_instability:         { TiltAngle: 18.5, SpeedKPH: 0 },
        excessive_idle:            { IdlingTime: 58, RPM: 800, SpeedKPH: 0 },
        operator_fatigue:          { fatigue_score: 0.78 },
      };

      const base = { RPM: 1400, HydraulicPressure: 220, TiltAngle: 2.1, FuelUsed: 3.5,
                      LoadCycles: 10, IdlingTime: 5, ActiveTime: 45, SpeedKPH: 4.0,
                      EngineHours: 2000, hour_of_day: 10, is_night: 0,
                      weather_encoded: 1, soil_encoded: 0, seatbelt_encoded: 0 };
      const overrides = telemetryMap[sceneName] || {};
      const payload = { ...base, ...overrides };

      const r = await fetch(`${API}/anomaly/score`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();

      const newAlerts = [];
      if (d.label !== 'NORMAL') {
        newAlerts.push({ type: d.label, message: d.explanation, level: 'critical' });
      }

      // Proximity check for worker_proximity_breach
      if (sceneName === 'worker_proximity_breach') {
        setProximity({ workers_in_zone: 2, distance_to_nearest_m: 1.8, alert: true, alert_level: 'critical' });
        newAlerts.push({ type: 'PROXIMITY_BREACH', message: '2 workers within 1.8m of machine. Stop arm movement.', level: 'critical' });
      } else if (sceneName === 'slope_instability') {
        newAlerts.push({ type: 'SLOPE_ALERT', message: 'Tilt angle 18.5° exceeds safe limit of 15°. Relocate immediately.', level: 'critical' });
        setProximity({ workers_in_zone: 0, distance_to_nearest_m: 99, alert: false });
      } else {
        setProximity({ workers_in_zone: 0, distance_to_nearest_m: 99, alert: false });
      }

      setAlerts(newAlerts);
    } catch (e) {
      setAlerts([{ type: 'DEMO', message: `Scene ${sceneName} loaded (backend offline)`, level: 'info' }]);
    }
    setLoading(false);
    fetchIncidents();
  };

  const logIncident = async () => {
    try {
      const r = await fetch(`${API}/incidents/log`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator_id: 'OP001', machine_id: 'EXC001',
          description: `Manual incident log from Safety panel — scene: ${scene}`,
          alert_type: alerts[0]?.type || 'GENERAL' }),
      });
      const d = await r.json();
      alert(`Incident ${d.incident_id} logged.`);
      fetchIncidents();
    } catch { alert('Incident logged (offline fallback).'); }
  };

  const alertColor = (level) =>
    level === 'critical' ? 'border-red-500 bg-red-900/40' :
    level === 'warning'  ? 'border-orange-500 bg-orange-900/40' :
                           'border-blue-500 bg-blue-900/30';

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Live Safety Monitor</h1>

      {/* Scene selector */}
      <div className="mb-6">
        <label className="text-gray-400 text-sm mb-2 block">Simulator Scene</label>
        <div className="flex flex-wrap gap-2">
          {SCENES.map(s => (
            <button key={s} onClick={() => triggerScene(s)}
              className={`px-3 py-1.5 rounded text-sm font-medium border transition-all ${
                scene === s ? 'bg-cat-yellow text-black border-cat-yellow'
                           : 'bg-gray-800 border-gray-700 hover:border-cat-yellow text-gray-300'
              }`}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert feed */}
        <div className="lg:col-span-2 space-y-4">
          {loading && <div className="text-cat-yellow animate-pulse">Analysing scene…</div>}
          {alerts.length === 0 && !loading && (
            <div className="bg-green-900/30 border border-green-500 p-4 rounded-xl flex items-center gap-3">
              <CheckCircle className="text-green-400 w-8 h-8" />
              <div>
                <div className="font-bold text-green-400">All Clear</div>
                <div className="text-sm text-gray-300">No active safety alerts.</div>
              </div>
            </div>
          )}
          {alerts.map((a, i) => (
            <div key={i} className={`border p-5 rounded-xl flex items-start gap-4 ${alertColor(a.level)}`}>
              <AlertTriangle className={`w-8 h-8 mt-0.5 flex-shrink-0 ${a.level === 'critical' ? 'text-red-400' : 'text-orange-400'}`} />
              <div>
                <div className={`text-lg font-bold ${a.level === 'critical' ? 'text-red-400' : 'text-orange-400'}`}>{a.type}</div>
                <div className="text-gray-200 mt-1">{a.message}</div>
              </div>
            </div>
          ))}

          {/* Incident log button */}
          <button onClick={logIncident}
            className="bg-cat-yellow text-black px-5 py-2.5 rounded-lg font-bold hover:bg-yellow-400 transition">
            Log Incident
          </button>

          {/* Recent incidents */}
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-300">Recent Incidents</h3>
            <div className="space-y-2">
              {incidents.slice(0, 5).map(inc => (
                <div key={inc.incident_id} className="bg-gray-800 border border-gray-700 p-3 rounded-lg flex justify-between items-center text-sm">
                  <span className="font-mono text-cat-yellow">{inc.incident_id}</span>
                  <span className="text-gray-300 truncate mx-3 max-w-xs">{inc.description}</span>
                  <span className="text-gray-500 text-xs">{inc.created_at?.slice(11, 19)}</span>
                </div>
              ))}
              {incidents.length === 0 && <div className="text-gray-500 text-sm">No incidents logged yet.</div>}
            </div>
          </div>
        </div>

        {/* Proximity radar */}
        <div className="flex flex-col items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-300">Proximity Radar</h3>
          <ProximityRadar
            distance={proximity.distance_to_nearest_m < 99 ? proximity.distance_to_nearest_m.toFixed(1) : '--'}
            workers={proximity.workers_in_zone}
            alert={proximity.alert}
          />
          <div className="text-center text-sm text-gray-400">
            {proximity.workers_in_zone} worker(s) in zone<br />
            {proximity.distance_to_nearest_m < 99 ? `Nearest: ${proximity.distance_to_nearest_m.toFixed(1)}m` : 'Zone clear'}
          </div>
        </div>
      </div>
    </div>
  );
}
