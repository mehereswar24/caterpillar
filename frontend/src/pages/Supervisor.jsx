import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Users, Shield } from 'lucide-react';

const API = 'https://caterpillar-stack.onrender.com';
const HEALTH_COLOR = { good:'text-green-400', warning:'text-orange-400', critical:'text-red-400' };
const SITE_POS = { EXC001:{x:20,y:30}, EXC002:{x:55,y:20}, EXC003:{x:75,y:50}, EXC004:{x:40,y:65}, EXC005:{x:15,y:70} };
const SCENES = ['normal_operation','worker_proximity_breach','excessive_idle','seatbelt_violation_moving','slope_instability'];

const FALLBACK_MACHINES = [
  { machine_id:'EXC001', health_score:88, avg_rpm:1480, avg_hydraulic_bar:218, avg_temp_c:82, avg_fuel_used_l:5.2, latest_engine_hours:2450, latest_fuel_level:72, seatbelt_violations:1, proximity_alerts:0, idle_events:3, fault_codes:[] },
  { machine_id:'EXC002', health_score:62, avg_rpm:1320, avg_hydraulic_bar:195, avg_temp_c:88, avg_fuel_used_l:6.8, latest_engine_hours:4820, latest_fuel_level:48, seatbelt_violations:4, proximity_alerts:2, idle_events:8, fault_codes:['P0100'] },
  { machine_id:'EXC003', health_score:94, avg_rpm:1550, avg_hydraulic_bar:224, avg_temp_c:80, avg_fuel_used_l:4.9, latest_engine_hours:1200, latest_fuel_level:85, seatbelt_violations:0, proximity_alerts:1, idle_events:1, fault_codes:[] },
  { machine_id:'EXC004', health_score:41, avg_rpm:1180, avg_hydraulic_bar:280, avg_temp_c:97, avg_fuel_used_l:9.1, latest_engine_hours:7600, latest_fuel_level:22, seatbelt_violations:8, proximity_alerts:5, idle_events:15, fault_codes:['P0217','P0562'] },
  { machine_id:'EXC005', health_score:76, avg_rpm:1420, avg_hydraulic_bar:208, avg_temp_c:84, avg_fuel_used_l:5.5, latest_engine_hours:3100, latest_fuel_level:61, seatbelt_violations:2, proximity_alerts:1, idle_events:4, fault_codes:[] },
];

export default function Supervisor() {
  const [machines,  setMachines]  = useState(FALLBACK_MACHINES);
  const [operators, setOperators] = useState([]);
  const [alerts,    setAlerts]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);

  const load = async () => {
    setLoading(true);
    const [mRes, oRes, aRes] = await Promise.allSettled([
      fetch(`${API}/api/machines`).then(r=>r.json()),
      fetch(`${API}/api/operators`).then(r=>r.json()),
      fetch(`${API}/api/safety-alerts`).then(r=>r.json()),
    ]);
    if (mRes.status==='fulfilled' && mRes.value.machines?.length) setMachines(mRes.value.machines);
    if (oRes.status==='fulfilled') setOperators(oRes.value.operators||[]);
    if (aRes.status==='fulfilled') setAlerts(aRes.value.alerts||[]);
    setLoading(false);
  };

  useEffect(()=>{ load(); const t=setInterval(load,20000); return ()=>clearInterval(t); },[]);

  const injectScene = async (machineId, scene) => {
    await fetch(`${API}/fleet/scene?machine_id=${machineId}&scene_name=${scene}`,{method:'POST'}).catch(()=>{});
    setTimeout(load,500);
  };

  const ackAlert = async (id) => {
    await fetch(`${API}/api/alerts/${id}/acknowledge`,{method:'POST'}).catch(()=>{});
    setAlerts(a=>a.filter(x=>x.id!==id));
  };

  const totalCritical   = alerts.filter(a=>a.severity==='critical').length;
  const activeMachines  = machines.filter(m=>m.health_score>60).length;
  const selectedM       = machines.find(m=>m.machine_id===selected);

  return (
    <div className="p-8 h-full overflow-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-cat-yellow text-xs font-semibold uppercase tracking-widest mb-1">Live Fleet · 5 Machines</p>
          <h1 className="text-3xl font-bold text-white">Fleet <span className="text-cat-yellow">Supervisor</span></h1>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-gray-400 hover:text-white text-xs transition">
          <RefreshCw size={14} className={loading?'animate-spin':''}/> Refresh
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Machines', value:5,              color:'#FFB81C', Icon:Users },
          { label:'Active',         value:activeMachines, color:'#22c55e', Icon:CheckCircle },
          { label:'Operators',      value:operators.length||5, color:'#60a5fa', Icon:Shield },
          { label:'Active Alerts',  value:totalCritical,  color:'#ef4444', Icon:AlertTriangle },
        ].map(s=>(
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:`${s.color}22`}}>
              <s.Icon size={18} style={{color:s.color}}/>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-gray-500 text-xs">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Site map */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="text-white font-semibold text-sm mb-3">Site Map</div>
          <div className="relative bg-gray-950 rounded-xl border border-gray-800" style={{height:220}}>
            {[25,50,75].map(p=>(
              <React.Fragment key={p}>
                <div className="absolute border-t border-gray-800/40" style={{top:`${p}%`,left:0,right:0}}/>
                <div className="absolute border-l border-gray-800/40" style={{left:`${p}%`,top:0,bottom:0}}/>
              </React.Fragment>
            ))}
            {machines.map(m=>{
              const pos   = SITE_POS[m.machine_id]||{x:50,y:50};
              const hasAlert = alerts.some(a=>a.machine_id===m.machine_id);
              const color = m.health_score>80?'#22c55e':m.health_score>60?'#f97316':'#ef4444';
              return (
                <button key={m.machine_id} onClick={()=>setSelected(selected===m.machine_id?null:m.machine_id)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{left:`${pos.x}%`,top:`${pos.y}%`}}>
                  <div className="relative">
                    {hasAlert && <div className="absolute -inset-2 rounded-full animate-ping opacity-30" style={{background:color}}/>}
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-black transition-transform ${selected===m.machine_id?'scale-125':''}`}
                      style={{background:color,borderColor:color}}>
                      {m.machine_id.slice(-3)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-0.5">{m.machine_id}</div>
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 justify-center">
            {[['#22c55e','Good'],['#f97316','Warning'],['#ef4444','Critical']].map(([c,l])=>(
              <div key={l} className="flex items-center gap-1 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full inline-block" style={{background:c}}/>{l}
              </div>
            ))}
          </div>
        </div>

        {/* Machine detail */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5">
          {!selectedM
            ? <div className="h-full flex items-center justify-center text-gray-600 text-sm">Click a machine on the map</div>
            : <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-white font-bold text-lg">{selectedM.machine_id}</div>
                    <div className={`text-sm font-semibold ${selectedM.health_score>80?'text-green-400':selectedM.health_score>60?'text-orange-400':'text-red-400'}`}>
                      Health Score: {selectedM.health_score}/100
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500 space-y-0.5">
                    <div>Seatbelt violations: <span className="text-white">{selectedM.seatbelt_violations}</span></div>
                    <div>Proximity alerts: <span className="text-white">{selectedM.proximity_alerts}</span></div>
                    <div>Idle events: <span className="text-white">{selectedM.idle_events}</span></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    ['RPM',      selectedM.avg_rpm,           'rpm'],
                    ['Hydraulic',selectedM.avg_hydraulic_bar, 'bar'],
                    ['Temp',     selectedM.avg_temp_c,        '°C'],
                    ['Fuel Used',selectedM.avg_fuel_used_l,   'L'],
                    ['Eng Hours',selectedM.latest_engine_hours,'h'],
                    ['Fuel Lvl', selectedM.latest_fuel_level,  '%'],
                  ].map(([l,v,u])=>(
                    <div key={l} className="bg-gray-800 rounded-xl p-3 text-center">
                      <div className="text-gray-500 text-xs mb-1">{l}</div>
                      <div className="text-white font-bold text-sm">{v??'—'}{u}</div>
                    </div>
                  ))}
                </div>
                {selectedM.fault_codes?.length>0 && (
                  <div className="mb-4 flex gap-2 flex-wrap">
                    {selectedM.fault_codes.map(f=>(
                      <span key={f} className="bg-red-900/30 border border-red-800 text-red-300 text-xs px-2 py-0.5 rounded">{f}</span>
                    ))}
                  </div>
                )}
                <div>
                  <div className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Inject Scenario</div>
                  <div className="flex flex-wrap gap-2">
                    {SCENES.map(s=>(
                      <button key={s} onClick={()=>injectScene(selectedM.machine_id,s)}
                        className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cat-yellow text-gray-300 hover:text-cat-yellow px-2.5 py-1.5 rounded-lg transition-all">
                        {s.replace(/_/g,' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </>
          }
        </div>
      </div>

      {/* Alerts */}
      {alerts.length>0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <div className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-red-400"/> Active Alerts ({alerts.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alerts.slice(0,6).map((a,i)=>(
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${a.severity==='critical'?'bg-red-900/20 border-red-800':a.severity==='high'?'bg-orange-900/20 border-orange-800':'bg-yellow-900/20 border-yellow-800'}`}>
                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${a.severity==='critical'?'bg-red-400':'bg-orange-400'}`}/>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{a.type?.replace(/_/g,' ')}</div>
                  <div className="text-gray-400 truncate">{a.reason}</div>
                  <div className="text-gray-600">{a.machine_id} · {a.operator_id}</div>
                </div>
                {a.id && <button onClick={()=>ackAlert(a.id)} className="text-gray-600 hover:text-gray-400 flex-shrink-0">ACK</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operators table */}
      {operators.length>0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <Users size={15} className="text-cat-yellow"/> Operator Performance
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                {['Operator','Sessions','Safety','Efficiency','Avg Overrun','Violations'].map(h=>(
                  <th key={h} className="text-left py-2 px-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {operators.map(o=>(
                <tr key={o.operator_id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2.5 px-3 text-white font-medium">{o.operator_id}</td>
                  <td className="py-2.5 px-3 text-gray-400">{o.total_sessions}</td>
                  <td className="py-2.5 px-3 font-bold" style={{color:o.safety_score>80?'#22c55e':o.safety_score>60?'#f97316':'#ef4444'}}>{o.safety_score}</td>
                  <td className="py-2.5 px-3 font-bold" style={{color:o.efficiency_score>80?'#22c55e':o.efficiency_score>60?'#f97316':'#ef4444'}}>{o.efficiency_score}</td>
                  <td className="py-2.5 px-3 text-gray-400">{o.avg_overrun_min}m</td>
                  <td className="py-2.5 px-3 text-gray-400">{o.seatbelt_violations} SB · {o.proximity_alerts} PX</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
