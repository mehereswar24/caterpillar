import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, Camera, Eye, Loader } from 'lucide-react';
import { API } from '../api.js';
import ProximityRadar from '../components/ProximityRadar';

function Gauge({ label, value, min, max, unit, warn, danger, icon }) {
  const pct   = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const color = value >= danger ? '#ef4444' : value >= warn ? '#f97316' : '#22c55e';
  return (
    <div className="bg-gray-800 rounded-xl p-3 border border-gray-700/50">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-gray-400 text-xs flex items-center gap-1">{icon} {label}</span>
        <span className="font-bold text-sm" style={{ color }}>{value}{unit}</span>
      </div>
      <div className="bg-gray-700 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width:`${pct}%`, background:color }}/>
      </div>
    </div>
  );
}

function VisionCard({ title, icon, endpoint, fields }) {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [image,   setImage]   = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImage(ev.target.result.split(',')[1]);
    reader.readAsDataURL(file);
  };

  const run = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/vision/${endpoint}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ image: image || 'demo' }),
      });
      setResult(await r.json());
    } catch { setResult({ error:'Vision model unavailable' }); }
    setLoading(false);
  };

  return (
    <div className="bg-gray-800 border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span>{icon}</span>
        <span className="text-white font-medium text-xs">{title}</span>
      </div>
      <div className="flex gap-2 mb-3">
        <label className="flex-1 bg-gray-900 border border-dashed border-gray-700 hover:border-cat-yellow rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:text-cat-yellow cursor-pointer transition-all text-center">
          {image ? '✓ Loaded' : 'Upload image'}
          <input type="file" accept="image/*" onChange={handleFile} className="hidden"/>
        </label>
        <button onClick={run} disabled={loading}
          className="bg-cat-yellow text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-yellow-400 transition-all disabled:opacity-50 flex items-center gap-1">
          {loading ? <Loader size={11} className="animate-spin"/> : <Eye size={11}/>}
          {loading ? '' : 'Scan'}
        </button>
      </div>
      {result && !result.error && (
        <div className="space-y-1.5">
          {fields.map(({ key, label, good }) => {
            const val = result[key];
            const isGood = typeof val === 'boolean' ? val === good
                         : typeof val === 'number' ? val === good
                         : val === good;
            return (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{label}</span>
                <span className={`font-semibold ${isGood?'text-green-400':'text-red-400'}`}>
                  {typeof val === 'boolean' ? (val?'Yes':'No') : (val??'—')}
                </span>
              </div>
            );
          })}
          {result.description && (
            <p className="text-gray-500 text-xs mt-2 leading-relaxed">{result.description.slice(0,80)}</p>
          )}
        </div>
      )}
      {result?.error && <p className="text-red-400 text-xs">{result.error}</p>}
    </div>
  );
}

export default function Safety({ liveData }) {
  const t      = liveData?.telemetry || { rpm:1480, hydraulic:218, fuel:72, temp:82, tilt:2.1, seatbelt:true, workers:0, speed:4.2 };
  const alerts = liveData?.alerts    || [];
  const criticals = alerts.filter(a => ['#ef4444','#f43f5e'].includes(a.color));

  return (
    <div className="p-8 h-full overflow-auto">
      <div className="mb-8">
        <p className="text-green-400 font-semibold tracking-widest text-xs uppercase mb-1 flex items-center gap-2">
          <ShieldCheck size={14}/> System Active · EXC001
        </p>
        <h1 className="text-3xl font-bold text-white">Safety <span className="text-cat-yellow">Monitor</span></h1>
      </div>

      {criticals.length > 0 && (
        <div className="mb-6 space-y-2">
          {criticals.map((a,i) => (
            <div key={i} className="flex gap-3 items-center p-3.5 rounded-xl border"
              style={{ background:`${a.color}18`, borderColor:`${a.color}55` }}>
              <AlertTriangle size={16} style={{color:a.color}} className="flex-shrink-0"/>
              <span className="font-bold text-sm" style={{color:a.color}}>{a.type}</span>
              <span className="text-gray-400 text-xs">— Immediate action required</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Gauges */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="text-white font-semibold text-xs uppercase tracking-wider mb-4">Live Telemetry</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Gauge label="Engine RPM"  value={t.rpm}       min={600} max={2500} unit="rpm" warn={1900} danger={2100} icon="⚙️"/>
              <Gauge label="Hydraulic"   value={t.hydraulic} min={100} max={320}  unit="bar" warn={250}  danger={280}  icon="💧"/>
              <Gauge label="Eng. Temp"   value={t.temp}      min={30}  max={110}  unit="°C"  warn={90}   danger={100}  icon="🌡"/>
              <Gauge label="Fuel Level"  value={t.fuel}      min={0}   max={100}  unit="%"   warn={20}   danger={10}   icon="⛽"/>
              <Gauge label="Tilt Angle"  value={t.tilt}      min={0}   max={25}   unit="°"   warn={12}   danger={15}   icon="📐"/>
              <Gauge label="Speed"       value={t.speed}     min={0}   max={20}   unit="kph" warn={10}   danger={15}   icon="💨"/>
            </div>
          </div>

          {/* Seatbelt + workers */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-2xl p-5 border text-center ${t.seatbelt?'bg-green-900/20 border-green-800':'bg-red-900/20 border-red-700 animate-pulse'}`}>
              <div className="text-3xl mb-2">🪑</div>
              <div className={`font-bold text-sm ${t.seatbelt?'text-green-400':'text-red-400'}`}>
                {t.seatbelt ? 'Seatbelt Fastened' : 'SEATBELT OFF'}
              </div>
              <div className="text-gray-500 text-xs mt-1">{t.seatbelt?'Operator secured':'Stop machine immediately'}</div>
            </div>
            <div className={`rounded-2xl p-5 border text-center ${t.workers===0?'bg-green-900/20 border-green-800':'bg-red-900/20 border-red-700 animate-pulse'}`}>
              <div className="text-3xl mb-2">👷</div>
              <div className={`font-bold text-sm ${t.workers===0?'text-green-400':'text-red-400'}`}>
                {t.workers===0?'Zone Clear':`${t.workers} In Zone`}
              </div>
              <div className="text-gray-500 text-xs mt-1">{t.workers===0?'No personnel':'Halt — proximity breach'}</div>
            </div>
          </div>

          {/* Vision AI */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Camera size={15} className="text-cat-yellow"/>
              <span className="text-white font-semibold text-sm">Vision AI — Qwen2.5-VL:7b</span>
              <span className="ml-auto text-xs bg-cat-yellow/10 text-cat-yellow border border-cat-yellow/20 px-2 py-0.5 rounded-full">upload image → scan</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <VisionCard title="Seatbelt Check" icon="🪑" endpoint="seatbelt"
                fields={[{key:'seatbelt_fastened',label:'Fastened',good:true},{key:'operator_visible',label:'Operator visible',good:true}]}/>
              <VisionCard title="Proximity Scan" icon="👷" endpoint="proximity"
                fields={[{key:'workers_in_frame',label:'Workers',good:0},{key:'breach',label:'Zone breach',good:false}]}/>
              <VisionCard title="Fatigue Detection" icon="😴" endpoint="fatigue"
                fields={[{key:'fatigue_signs',label:'Fatigue',good:false},{key:'operator_alert',label:'Alert',good:true}]}/>
              <VisionCard title="Pre-Shift Inspect" icon="🔍" endpoint="preshift"
                fields={[{key:'pass',label:'Pass',good:true}]}/>
              <VisionCard title="Full Scene Scan" icon="📷" endpoint="analyze"
                fields={[{key:'hazard_detected',label:'Hazard',good:false},{key:'workers_in_zone',label:'Workers in zone',good:0}]}/>
              <VisionCard title="Face Auth Check" icon="🔐" endpoint="seatbelt"
                fields={[{key:'operator_visible',label:'Face detected',good:true}]}/>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="text-white font-semibold text-sm mb-4">Proximity Radar</div>
            <ProximityRadar distance={t.workers>0?'1.8':'8.0'}/>
            <div className="mt-4 bg-gray-800 rounded-xl p-3">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-400">Nearest Worker</span>
                <span className={`font-bold ${t.workers>0?'text-red-400':'text-green-400'}`}>{t.workers>0?'1.8m':'> 8m'}</span>
              </div>
              <div className="bg-gray-700 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${t.workers>0?'bg-red-500':'bg-green-500'}`} style={{width:t.workers>0?'85%':'10%'}}/>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Camera size={13} className="text-gray-500"/>
              <span className="text-white font-medium text-sm">Cab Camera</span>
            </div>
            <div className="bg-black rounded-xl border border-gray-800 flex items-center justify-center relative" style={{minHeight:140}}>
              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">REC</div>
              <p className="text-gray-700 font-mono text-xs">Camera Offline</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
