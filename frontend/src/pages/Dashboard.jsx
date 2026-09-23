import React from 'react';
import { Thermometer, Wind, Zap } from 'lucide-react';
import VoiceBar from '../components/VoiceBar';
import VoiceAgent from '../components/VoiceAgent';
import TaskCard from '../components/TaskCard';
import TruckSimulator from '../components/TruckSimulator';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { time: '08:00', efficiency: 82 },
  { time: '09:00', efficiency: 85 },
  { time: '10:00', efficiency: 91 },
  { time: '11:00', efficiency: 88 },
  { time: '12:00', efficiency: 94 },
];

export default function Dashboard({ onTelemetryChange }) {
  return (
    <div className="p-10 relative h-full flex flex-col">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <p className="text-cat-yellow font-semibold tracking-wider text-sm uppercase mb-1">Live Telemetry</p>
          <h1 className="text-4xl font-light tracking-tight text-white">Machine <span className="font-bold">EXC001</span></h1>
        </div>
        <div className="flex gap-4">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
            <Thermometer className="text-cat-yellow w-5 h-5" />
            <span className="font-medium text-gray-200">22�C</span>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
            <Wind className="text-cat-yellow w-5 h-5" />
            <span className="font-medium text-gray-200">14 km/h</span>
          </div>
        </div>
      </header>
      
      {/* Live Truck Simulator */}
      <div className="mb-8">
        <TruckSimulator onTelemetryChange={onTelemetryChange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <TaskCard 
            title="Trenching - Sector 4"
            eta="52"
            shap="Wet soil (+18m) � Cloudy (+2m)"
            status="In Progress"
            progress={65}
          />
          <TaskCard 
            title="Loading - Sector 2"
            eta="30"
            shap="Dry soil � Normal load"
            status="Scheduled"
            progress={0}
          />
        </div>
        
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="text-cat-yellow w-5 h-5" />
            <h3 className="text-lg font-semibold text-gray-200">Fuel Efficiency</h3>
          </div>
          <div className="flex-1 min-h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFB81C" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FFB81C" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff'}} itemStyle={{color: '#FFB81C'}} />
                <Area type="monotone" dataKey="efficiency" stroke="#FFB81C" strokeWidth={3} fillOpacity={1} fill="url(#colorEff)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <span className="text-3xl font-light text-white">91</span><span className="text-gray-400 text-sm ml-1">Score</span>
          </div>
        </div>
      </div>

      <div className="mt-auto mx-auto w-full max-w-4xl pb-6">
        <VoiceAgent />
      </div>
    </div>
  );
}
