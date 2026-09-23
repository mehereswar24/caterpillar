import React from 'react';

export default function ProximityRadar({ distance }) {
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-green-500/20 animate-[ping_3s_linear_infinite]"></div>
      <div className="absolute inset-4 rounded-full border border-green-500/30"></div>
      <div className="absolute inset-12 rounded-full border border-green-500/40"></div>
      <div className="absolute inset-20 rounded-full border border-green-500/50 bg-green-500/5"></div>
      
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_70%,rgba(34,197,94,0.3)_100%)] animate-[spin_4s_linear_infinite]"></div>
      
      <div className="absolute w-4 h-4 bg-cat-yellow rounded-sm shadow-[0_0_10px_#FFB81C] z-10"></div>
      
      <div className="absolute w-4 h-4 bg-red-500 rounded-full shadow-[0_0_15px_#EF4444] animate-pulse z-20" style={{ top: '25%', right: '35%' }}></div>
      
      <div className="absolute -bottom-8 bg-red-500/20 border border-red-500 text-red-500 px-3 py-1 rounded-full text-sm font-bold shadow-[0_0_10px_rgba(239,68,68,0.3)]">
        ALERT: {distance}m
      </div>
    </div>
  );
}
