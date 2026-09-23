import React from 'react';

export default function ProximityRadar({ distance, workers = 0, alert = false }) {
  const hasWorkers = workers > 0;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      {/* Rings */}
      {[1, 0.66, 0.33].map((scale, i) => (
        <div key={i} className={`absolute rounded-full border ${alert && i === 2 ? 'border-red-500' : 'border-gray-600'}`}
          style={{ width: 200 * scale, height: 200 * scale, opacity: 0.4 + i * 0.2 }} />
      ))}

      {/* Distance labels on rings */}
      <span className="absolute text-gray-600 text-xs" style={{ top: 6, left: '50%', transform: 'translateX(-50%)' }}>10m</span>
      <span className="absolute text-gray-600 text-xs" style={{ top: 38, left: '50%', transform: 'translateX(-50%)' }}>5m</span>
      <span className="absolute text-gray-600 text-xs" style={{ top: 72, left: '50%', transform: 'translateX(-50%)' }}>2m</span>

      {/* Sweep animation */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div className={`absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left ${alert ? 'bg-red-400' : 'bg-cat-yellow'} opacity-60`}
          style={{ animation: 'spin 3s linear infinite', transformOrigin: '0 50%' }} />
      </div>

      {/* Worker blips */}
      {hasWorkers && (
        <>
          <div className="absolute w-3 h-3 bg-red-500 rounded-full animate-ping"
            style={{ top: '22%', left: '28%' }} />
          <div className="absolute w-3 h-3 bg-red-500 rounded-full animate-ping"
            style={{ top: '30%', left: '65%', animationDelay: '0.3s' }} />
        </>
      )}

      {/* Machine icon in centre */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${alert ? 'bg-red-900 border-2 border-red-500' : 'bg-gray-700 border-2 border-cat-yellow'}`}>
        <span className="text-lg">🚜</span>
      </div>

      {/* Distance readout */}
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className={`text-sm font-bold ${alert ? 'text-red-400' : 'text-cat-yellow'}`}>
          {distance !== '--' ? `${distance}m` : 'Clear'}
        </span>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
