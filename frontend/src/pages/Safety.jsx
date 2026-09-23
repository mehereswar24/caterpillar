import React from 'react';
import { AlertTriangle, ShieldCheck, Camera } from 'lucide-react';
import ProximityRadar from '../components/ProximityRadar';

export default function Safety() {
  return (
    <div className="p-10 h-full flex flex-col">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <p className="text-green-500 font-semibold tracking-wider text-sm uppercase mb-1 flex items-center gap-2"><ShieldCheck size={16} /> System Active</p>
          <h1 className="text-4xl font-light tracking-tight text-white">Safety Monitor</h1>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-3xl shadow-[0_0_30px_rgba(239,68,68,0.05)] flex gap-6 items-start backdrop-blur-md">
            <div className="bg-red-500 p-4 rounded-2xl shadow-[0_0_15px_rgba(239,68,68,0.5)]">
              <AlertTriangle className="text-black w-8 h-8" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-red-500 mb-2 tracking-tight">SEATBELT_VIOLATION</h3>
              <p className="text-red-200/70 text-lg">Seatbelt unfastened while moving. Please stop the vehicle immediately.</p>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Camera className="text-gray-400" />
              <h3 className="text-xl font-medium">Live Camera Feed</h3>
            </div>
            <div className="flex-1 bg-black rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden min-h-[300px]">
               <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">REC</div>
               <p className="text-gray-600 font-mono">Cabin Camera Feed Offline</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl">
          <h3 className="text-xl font-medium text-white mb-10 w-full text-left">Proximity Radar</h3>
          <div className="flex-1 flex items-center justify-center w-full">
            <ProximityRadar distance="1.8" />
          </div>
          <div className="w-full mt-10 bg-black/50 p-4 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Nearest Worker</span>
              <span className="text-red-500 font-bold">1.8m</span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div className="bg-red-500 h-full w-[85%]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
