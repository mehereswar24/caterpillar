import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity } from 'lucide-react';

const API = 'http://localhost:5000';

const LABEL_COLORS = {
  NORMAL: '#22c55e', EXCESSIVE_IDLE: '#f97316', OVER_REV: '#ef4444',
  SEATBELT_VIOLATION: '#f43f5e', UNSAFE_SPEED: '#fb923c',
  COLD_START_ABUSE: '#a78bfa', FUEL_ANOMALY: '#fbbf24',
};

const TELEMETRY_PRESETS = {
  Normal:           { RPM: 1400, HydraulicPressure: 210, TiltAngle: 2.0, FuelUsed: 3.5, LoadCycles: 10, IdlingTime: 10, ActiveTime: 50, SpeedKPH: 4.0, EngineHours: 2000, hour_of_day: 10, is_night: 0, weather_encoded: 0, soil_encoded: 0, seatbelt_encoded: 0 },
  'Excessive Idle': { RPM: 800,  HydraulicPressure: 180, TiltAngle: 0.5, FuelUsed: 4.2, LoadCycles: 2,  IdlingTime: 58, ActiveTime: 10, SpeedKPH: 0.0, EngineHours: 2000, hour_of_day: 14, is_night: 0, weather_encoded: 1, soil_encoded: 0, seatbelt_encoded: 0 },
  'Over Rev':       { RPM: 2150, HydraulicPressure: 290, TiltAngle: 4.0, FuelUsed: 7.2, LoadCycles: 18, IdlingTime: 5,  ActiveTime: 55, SpeedKPH: 8.0, EngineHours: 2000, hour_of_day: 9,  is_night: 0, weather_encoded: 0, soil_encoded: 2, seatbelt_encoded: 0 },
  'Seatbelt Off':   { RPM: 1600, HydraulicPressure: 240, TiltAngle: 3.0, FuelUsed: 5.0, LoadCycles: 12, IdlingTime: 3,  ActiveTime: 47, SpeedKPH: 6.5, EngineHours: 2000, hour_of_day: 11, is_night: 0, weather_encoded: 1, soil_encoded: 1, seatbelt_encoded: 1 },
  'Unsafe Speed':   { RPM: 1700, HydraulicPressure: 250, TiltAngle: 2.5, FuelUsed: 5.5, LoadCycles: 14, IdlingTime: 2,  ActiveTime: 58, SpeedKPH: 13.5, EngineHours: 2000, hour_of_day: 15, is_night: 0, weather_encoded: 0, soil_encoded: 0, seatbelt_encoded: 0 },
};

export default function Anomaly() {
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [preset, setPreset] = useState('Normal');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/anomaly/history?operator_id=OP001&days=7`)
      .then(r => r.json())
      .then(d => {
        if (d.events) setHistory(d.events.map((e, i) => ({ day: `Day ${e.day}`, count: e.count, label: e.label })));
      })
      .catch(() => {
        setHistory([
          { day: 'Mon', count: 0, label: 'NORMAL' },
          { day: 'Tue', count: 0, label: 'NORMAL' },
          { day: 'Wed', count: 1, label: 'EXCESSIVE_IDLE' },
          { day: 'Thu', count: 0, label: 'NORMAL' },
          { day: 'Fri', count: 2, label: 'OVER_REV' },
          { day: 'Sat', count: 0, label: 'NORMAL' },
          { day: 'Sun', count: 1, label: 'SEATBELT_VIOLATION' },
        ]);
      });
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    const payload = TELEMETRY_PRESETS[preset];
    try {
      const r = await fetch(`${API}/anomaly/score`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setResult(await r.json());
    } catch {
      setResult({ label: preset === 'Normal' ? 'NORMAL' : 'EXCESSIVE_IDLE', confidence: 0.91, explanation: 'Demo fallback result.' });
    }
    setLoading(false);
  };

  const labelColor = (l) => LABEL_COLORS[l] || '#94a3b8';

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Anomaly Detection</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Live analyser */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Activity className="text-cat-yellow" /> Live Telemetry Analysis</h2>

          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-2 block">Telemetry Preset</label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(TELEMETRY_PRESETS).map(p => (
                <button key={p} onClick={() => setPreset(p)}
                  className={`px-3 py-1 rounded text-sm border transition ${preset === p ? 'bg-cat-yellow text-black border-cat-yellow' : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-cat-yellow'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button onClick={runAnalysis}
            className="bg-cat-yellow text-black px-5 py-2 rounded font-bold w-full mb-4 hover:bg-yellow-400 transition">
            {loading ? 'Analysing…' : 'Run Analysis'}
          </button>

          {result && (
            <div className={`border rounded-lg p-4 ${result.label === 'NORMAL' ? 'border-green-600 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-lg" style={{ color: labelColor(result.label) }}>{result.label}</span>
                <span className="text-gray-400 text-sm">{(result.confidence * 100).toFixed(0)}% confidence</span>
              </div>
              <p className="text-gray-300 text-sm">{result.explanation}</p>
              {/* Confidence bar */}
              <div className="mt-3 bg-gray-700 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${result.confidence * 100}%`, backgroundColor: labelColor(result.label) }} />
              </div>
            </div>
          )}
        </div>

        {/* Weekly trend */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">7-Day Anomaly Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={history}>
              <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f9fafb' }}
                formatter={(v, n, p) => [v, p.payload.label]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {history.map((e, i) => (
                  <Cell key={i} fill={labelColor(e.label)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(LABEL_COLORS).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
                {label.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
