import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, AlertTriangle, Clock, Activity } from 'lucide-react';
import TruckSimulator from '../components/TruckSimulator';
import VoiceAgent from '../components/VoiceAgent';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';

const API = 'https://caterpillar-stack.onrender.com';

export default function Dashboard({ onTelemetryChange }) {
  const [dash, setDash]   = useState(null);
  const [time, setTime]   = useState(new Date());

  useEffect(() => {
    fetch(`${API}/api/dashboard`).then(r => r.json()).then(setDash).catch(() => {});
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const stats = [
    { label: 'Machines',     value: dash?.summary?.total_machines ?? 5,    color: '#FFB81C', icon: Activity },
    { label: 'Tasks Today',  value: dash?.summary?.tasks_today    ?? 24,   color: '#22c55e', icon: Clock },
    { label: 'Completed',    value: dash?.summary?.completed       ?? 18,   color: '#60a5fa', icon: TrendingUp },
    { label: 'Active Alerts',value: dash?.summary?.active_alerts   ?? 3,   color: '#ef4444', icon: AlertTriangle },
  ];

  const fuelData = dash?.fuel_by_machine ?? [
    { machine_id:'EXC001', fuel_used_l:42 },{ machine_id:'EXC002', fuel_used_l:38 },
    { machine_id:'EXC003', fuel_used_l:55 },{ machine_id:'EXC004', fuel_used_l:29 },
    { machine_id:'EXC005', fuel_used_l:47 },
  ];

  const effData = [
    { time:'08:00', score:82 },{ time:'09:00', score:85 },{ time:'10:00', score:91 },
    { time:'11:00', score:88 },{ time:'12:00', score:94 },{ time:'13:00', score:89 },
  ];

  return (
    <div className="p-8 h-full flex flex-col gap-6 overflow-auto">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-cat-yellow font-semibold tracking-widest text-xs uppercase mb-1">Live Operations · EXC001</p>
          <h1 className="text-3xl font-bold text-white">Smart Operator <span className="text-cat-yellow">Dashboard</span></h1>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono text-white">{time.toLocaleTimeString()}</div>
          <div className="text-gray-500 text-xs">{time.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:`${s.color}22` }}>
              <s.icon size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-gray-500 text-xs">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Simulator */}
      <TruckSimulator onTelemetryChange={onTelemetryChange} />

      {/* Charts */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-cat-yellow" />
            <span className="text-white font-medium text-sm">Fuel Usage by Machine (L)</span>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={fuelData} barSize={26}>
              <XAxis dataKey="machine_id" stroke="#374151" tick={{fill:'#6b7280',fontSize:11}} />
              <YAxis stroke="#374151" tick={{fill:'#6b7280',fontSize:11}} />
              <Tooltip contentStyle={{background:'#111',border:'1px solid #374151',borderRadius:8}} itemStyle={{color:'#FFB81C'}} />
              <Bar dataKey="fuel_used_l" radius={[5,5,0,0]}>
                {fuelData.map((_,i)=><Cell key={i} fill={i===2?'#ef4444':'#FFB81C'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-cat-yellow" />
            <span className="text-white font-medium text-sm">Efficiency Score (Today)</span>
          </div>
          <div className="text-3xl font-light text-white mb-2">91 <span className="text-gray-500 text-base">/ 100</span></div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={effData}>
              <defs>
                <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FFB81C" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FFB81C" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip contentStyle={{background:'#111',border:'1px solid #374151',borderRadius:8}} itemStyle={{color:'#FFB81C'}} />
              <Area type="monotone" dataKey="score" stroke="#FFB81C" strokeWidth={2.5} fill="url(#effGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Voice agent */}
      <VoiceAgent />
    </div>
  );
}
