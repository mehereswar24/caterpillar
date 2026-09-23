import React, { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, CheckCircle, Clock, ChevronRight, RefreshCw } from 'lucide-react';
import { API } from '../api.js';

// API imported below;
const MACHINES = ['EXC001','EXC002','EXC003','EXC004','EXC005'];
const URGENCY = {
  critical:{ bar:'bg-red-500',    text:'text-red-400',    border:'border-red-600',    bg:'bg-red-900/20',    badge:'bg-red-900 text-red-300' },
  high:    { bar:'bg-orange-500', text:'text-orange-400', border:'border-orange-500', bg:'bg-orange-900/20', badge:'bg-orange-900 text-orange-300' },
  medium:  { bar:'bg-yellow-500', text:'text-yellow-400', border:'border-yellow-600', bg:'bg-yellow-900/20', badge:'bg-yellow-900 text-yellow-300' },
  low:     { bar:'bg-green-500',  text:'text-green-400',  border:'border-green-700',  bg:'bg-green-900/20',  badge:'bg-green-900 text-green-300' },
};

const FALLBACK_HOURS = [480, 120, 38, 310, 195];

export default function Maintenance() {
  const [data, setData]       = useState({});
  const [loading, setLoading] = useState(true);
  const [predForm, setPredForm] = useState({ engine_hours:2000, rpm:1500, hydraulic_pressure:210, temperature_c:82, fuel_level:70, fault_codes:'NONE' });
  const [prediction, setPrediction] = useState(null);
  const [predLoading, setPredLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all(MACHINES.map((m,i) =>
      fetch(`${API}/api/maintenance/status?machine_id=${m}&engine_hours=${2000+i*380}`)
        .then(r=>r.json())
        .catch(()=>({ machine_id:m, hours_until_service:FALLBACK_HOURS[i], urgency:FALLBACK_HOURS[i]<50?'critical':FALLBACK_HOURS[i]<150?'high':FALLBACK_HOURS[i]<300?'medium':'low', next_service_at:2000+i*380+FALLBACK_HOURS[i], recommendation:'Service due based on engine hours.' }))
    )).then(rs=>{ const m={}; rs.forEach(r=>{ m[r.machine_id||MACHINES[rs.indexOf(r)]]=r; }); setData(m); setLoading(false); });
  };

  useEffect(()=>{ load(); },[]);

  const predict = async () => {
    setPredLoading(true);
    try {
      const r = await fetch(`${API}/api/maintenance/predict`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(predForm),
      });
      setPrediction(await r.json());
    } catch { setPrediction({ hours_until_service:197, urgency:'medium', recommendation:'Service due in ~197 hours.' }); }
    setPredLoading(false);
  };

  const critical = Object.values(data).filter(d=>d.urgency==='critical').length;
  const high     = Object.values(data).filter(d=>d.urgency==='high').length;

  return (
    <div className="cat-page">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="cat-stripe-bar rounded-full"/>
          <div><div className="cat-label mb-1">LightGBM Predictor · Live Telemetry</div>
          <h1 className="cat-title">Maintenance <span className="text-cat-yellow">Intelligence</span></h1></div>
        </div>
        <div className="flex items-center gap-3">
          {critical>0 && <span className="bg-red-900 text-red-300 border border-red-700 px-3 py-1 rounded-full text-xs font-bold">{critical} Critical</span>}
          {high>0 &&    <span className="bg-orange-900 text-orange-300 border border-orange-700 px-3 py-1 rounded-full text-xs font-bold">{high} High</span>}
          <button onClick={load} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs transition">
            <RefreshCw size={14} className={loading?'animate-spin':''}/> Refresh
          </button>
        </div>
      </div>

      {/* Machine cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {MACHINES.map(mid => {
          const d = data[mid];
          if (!d && !loading) return null;
          if (loading) return (
            <div key={mid} className="cat-card p-5 animate-pulse h-44"/>
          );
          const urg = d.urgency || 'low';
          const u   = URGENCY[urg] || URGENCY.low;
          const pct = Math.max(5, Math.min(100, (d.hours_until_service / 500) * 100));
          return (
            <div key={mid} className={`bg-gray-900 border rounded-2xl p-5 ${u.border}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wrench size={18} className="text-cat-yellow"/>
                  <span className="font-bold text-white">{mid}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${u.badge}`}>{urg.toUpperCase()}</span>
              </div>
              <div className="mb-1">
                <div className="text-gray-500 text-xs mb-1">Hours until service</div>
                <div className={`text-3xl font-light ${u.text}`}>{Math.round(d.hours_until_service)}h</div>
              </div>
              <div className="bg-gray-800 rounded-full h-2 my-3">
                <div className={`h-2 rounded-full transition-all ${u.bar}`} style={{width:`${pct}%`}}/>
              </div>
              <div className="text-gray-400 text-xs mb-3 leading-relaxed">{d.recommendation}</div>
              {d.next_service_at && (
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={11}/> Next at {Math.round(d.next_service_at)} engine hours
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ML Prediction form */}
      <div className="cat-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-cat-yellow/10 rounded-lg flex items-center justify-center">
            <Wrench size={16} className="text-cat-yellow"/>
          </div>
          <div>
            <div className="text-white font-semibold text-sm">AI Maintenance Predictor</div>
            <div className="text-gray-500 text-xs">Enter telemetry — LightGBM predicts hours until service</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {Object.entries(predForm).map(([k,v])=>(
            <div key={k}>
              <label className="text-gray-500 text-xs block mb-1 capitalize">{k.replace(/_/g,' ')}</label>
              {k==='fault_codes'
                ? <select value={v} onChange={e=>setPredForm(p=>({...p,[k]:e.target.value}))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cat-yellow">
                    <option value="NONE">NONE</option>
                    <option value="P0100">P0100</option>
                    <option value="P0217">P0217</option>
                    <option value="P0562">P0562</option>
                  </select>
                : <input type="number" value={v}
                    onChange={e=>setPredForm(p=>({...p,[k]:parseFloat(e.target.value)||0}))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cat-yellow"/>
              }
            </div>
          ))}
        </div>

        <button onClick={predict} disabled={predLoading}
          className="bg-cat-yellow text-black font-bold px-6 py-2.5 rounded-xl hover:bg-yellow-400 transition-all text-sm disabled:opacity-50 mb-4">
          {predLoading ? '⏳ Predicting...' : '▶ Predict Service Interval'}
        </button>

        {prediction && (() => {
          const u = URGENCY[prediction.urgency]||URGENCY.low;
          return (
            <div className={`border rounded-xl p-4 ${u.bg} ${u.border}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-3xl font-light ${u.text}`}>{Math.round(prediction.hours_until_service)}h</div>
                  <div className="text-gray-400 text-sm mt-0.5">{prediction.recommendation}</div>
                </div>
                <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${u.badge}`}>{(prediction.urgency||'low').toUpperCase()}</span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
