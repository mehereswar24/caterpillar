import React from 'react';

export default function TelemetryStrip({
  rpm = 1502,
  hydraulicBar = 219,
  fuelPct = 41,
  engineTempC = 78,
  tiltDeg = 2.3,
}) {
  // Determine if abnormal
  const isRpmAbnormal = rpm > 2100 || rpm < 650;
  const isHydAbnormal = hydraulicBar > 280;
  const isFuelLow = fuelPct < 20;
  const isTempHigh = engineTempC > 95;
  const isTiltHigh = tiltDeg > 15.0;

  const items = [
    {
      label: 'ENGINE',
      value: `${rpm} RPM`,
      abnormal: isRpmAbnormal,
      colorClass: isRpmAbnormal ? 'text-red-400' : 'text-gray-100',
      dotClass: isRpmAbnormal ? 'bg-red-500 animate-ping' : 'bg-emerald-400',
    },
    {
      label: 'HYDRAULIC',
      value: `${hydraulicBar} bar`,
      abnormal: isHydAbnormal,
      colorClass: isHydAbnormal ? 'text-amber-400' : 'text-gray-100',
      dotClass: isHydAbnormal ? 'bg-amber-400' : 'bg-emerald-400',
    },
    {
      label: 'FUEL',
      value: `${fuelPct}%`,
      abnormal: isFuelLow,
      colorClass: isFuelLow ? 'text-red-400 font-black' : 'text-gray-100',
      dotClass: isFuelLow ? 'bg-red-500' : 'bg-emerald-400',
    },
    {
      label: 'TEMP',
      value: `${engineTempC}°C`,
      abnormal: isTempHigh,
      colorClass: isTempHigh ? 'text-red-400' : 'text-gray-100',
      dotClass: isTempHigh ? 'bg-red-500' : 'bg-emerald-400',
    },
    {
      label: 'TILT',
      value: `${tiltDeg.toFixed(1)}°`,
      abnormal: isTiltHigh,
      colorClass: isTiltHigh ? 'text-red-400 font-black' : 'text-gray-100',
      dotClass: isTiltHigh ? 'bg-red-500 animate-pulse' : 'bg-emerald-400',
    },
  ];

  return (
    <div className="bg-[#111111] border border-[#262626] rounded-xl px-4 py-2.5 shadow-md">
      <div className="grid grid-cols-5 divide-x divide-[#222] text-center">
        {items.map((item, idx) => (
          <div key={idx} className="px-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
              {item.label}
            </span>
            <div className={`text-xs sm:text-sm font-mono font-bold mt-0.5 ${item.colorClass}`}>
              {item.value}
            </div>
            <div className="flex justify-center mt-1">
              <span className={`w-2 h-2 rounded-full ${item.dotClass}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
