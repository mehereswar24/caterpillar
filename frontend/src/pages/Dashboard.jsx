import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, AlertTriangle, Clock, Activity, Fuel, CheckCircle } from 'lucide-react';
import TruckSimulator from '../components/TruckSimulator';
import VoiceAgent     from '../components/VoiceAgent';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { API } from '../api.js';

export default function Dashboard({ onTelemetryChange }) {
  const [dash, setDash] = useState(null);
  const [time, setTime] = useState(new Date());
  const [fuel, setFuel] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/dashboard`).then(r=>r.json()).then(setDash).catch(()=>{});
    fetch(`${API}/api/fuel/status?fuel_level_pct=62&task_duration_est_min=90`).then(r=>r.json()).then(setFuel).catch(()=>{});
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const stats = [
    { label:'Machines Active', value: dash?.summary?.total_machines ?? 5,  color:'#FFB81C', icon:Activity,      bg:'bg-cat-yellow/10' },
    { label:'Tasks Today',     value: dash?.summary?.tasks_today    ?? 24,  color:'#22c55e', icon:Clock,         bg:'bg-green-500/10'  },
    { label:'Completed',       value: dash?.summary?.completed       ?? 18,  color:'#60a5fa', icon:CheckCircle,   bg:'bg-blue-500/10'   },
    { label:'Active Alerts',   value: dash?.summary?.active_alerts   ?? 3,   color:'#ef4444', icon:AlertTriangle, bg:'bg-red-500/10'    },
  ];

  const fuelData = dash?.fuel_by_machine ?? [
    {machine_id:'EXC001',fuel_used_l:42},{machine_id:'EXC002',fuel_used_l:38},
    {machine_id:'EXC003',fuel_used_l:55},{machine_id:'EXC004',fuel_used_l:29},{machine_id:'EXC005',fuel_used_l:47},
  ];
  const effData = [
    {time:'08:00',score:82},{time:'09:00',score:85},{time:'10:00',score:91},
    {time:'11:00',score:88},{time:'12:00',score:94},{time:'13:00',score:89},
  ];

  return (
    <div className="cat-page">
      {/* CAT stripe top */}
      <div className="cat-stripe-bar rounded-full mb-1"/>

      {/* Header */}
      <div className="cat-header">
        <div>
          <div className="cat-label mb-1">Live Operations · EXC001</div>
          <h1 className="cat-title">Smart Operator <span className="text-cat-yellow">Dashboard</span></h1>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-light text-white tabular-nums">{time.toLocaleTimeString()}</div>
          <div className="text-gray-600 text-xs mt-0.5">{time.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div>
        </div>
      </div>

      {/* Fuel alert banner */}
      {fuel?.alert && (
        <div className="flex items-center gap-3 bg-orange-900/30 border border-orange-700 rounded-xl px-4 py-3 animate-slide-up">
          <Fuel size={16} className="text-orange-400 flex-shrink-0"/>
          <span className="text-orange-200 text-sm font-medium">{fuel.message}</span>
          <span className="ml-auto text-xs text-orange-400 font-bold px-2 py-0.5 bg-orange-900/50 rounded-full">{fuel.risk_level}</span>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="cat-card hover-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
              <s.icon size={18} style={{color:s.color}}/>
            </div>
            <div>
              <div className="text-2xl font-bold text-white tabular-nums">{s.value}</div>
              <div className="text-gray-600 text-xs mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Simulator */}
      <TruckSimulator onTelemetryChange={onTelemetryChange}/>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-5">
        <div className="cat-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-cat-yellow"/>
            <span className="text-white font-semibold text-sm">Fuel Usage by Machine (L)</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={fuelData} barSize={24}>
              <XAxis dataKey="machine_id" stroke="#222" tick={{fill:'#555',fontSize:11}}/>
              <YAxis stroke="#222" tick={{fill:'#555',fontSize:11}}/>
              <Tooltip contentStyle={{background:'#111',border:'1px solid #333',borderRadius:8}} itemStyle={{color:'#FFB81C'}}/>
              <Bar dataKey="fuel_used_l" radius={[4,4,0,0]}>
                {fuelData.map((_,i)=><Cell key={i} fill={i===2?'#ef4444':'#FFB81C'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="cat-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-cat-yellow"/>
            <span className="text-white font-semibold text-sm">Efficiency Score</span>
          </div>
          <div className="text-4xl font-light text-white mb-2 tabular-nums">91 <span className="text-gray-600 text-base">/ 100</span></div>
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={effData}>
              <defs>
                <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FFB81C" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#FFB81C" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{background:'#111',border:'1px solid #333',borderRadius:8}} itemStyle={{color:'#FFB81C'}}/>
              <Area type="monotone" dataKey="score" stroke="#FFB81C" strokeWidth={2} fill="url(#effGrad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Voice agent */}
      <VoiceAgent/>
    </div>
  );
}
