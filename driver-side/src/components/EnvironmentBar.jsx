import React, { useState } from 'react';
import { Sun, CloudRain, Wind, Droplets, Mountain, Eye } from 'lucide-react';

export const WEATHER_PRESETS = [
  { id: 'sunny', label: 'Clear & Sunny', temp: 32, humidity: 38, wind: 12, visibility: 10, icon: Sun, color: '#f59e0b' },
  { id: 'dust', label: 'Dust Storm', temp: 37, humidity: 22, wind: 36, visibility: 2.5, icon: Wind, color: '#d97706' },
  { id: 'rain', label: 'Heavy Rain', temp: 24, humidity: 88, wind: 24, visibility: 4.0, icon: CloudRain, color: '#38bdf8' },
];

export const SOIL_PRESETS = [
  { id: 'rocky', type: 'Rocky Basalt & Clay', hardness: 8.5, friction: 0.88, digResistance: 'High (+18% fuel)', color: '#f97316' },
  { id: 'sandy', type: 'Loose Sandy Loam', hardness: 3.2, friction: 0.65, digResistance: 'Low', color: '#eab308' },
  { id: 'muddy', type: 'Saturated Wet Mud', hardness: 5.0, friction: 0.42, digResistance: 'Medium (slip risk)', color: '#a855f7' },
];

const chip = (active) =>
  `text-[10px] px-2 py-0.5 rounded-md font-semibold transition ${
    active ? 'bg-neutral-900 text-white' : 'bg-[#f0f0ec] text-neutral-600 hover:text-neutral-900'
  }`;

export default function EnvironmentBar({ onEnvironmentChange, showControls = false, horizontal = false }) {
  const [weather, setWeather] = useState(WEATHER_PRESETS[0]);
  const [soil, setSoil] = useState(SOIL_PRESETS[0]);

  const pickWeather = (w) => { setWeather(w); onEnvironmentChange?.({ weather: w, soil }); };
  const pickSoil = (s) => { setSoil(s); onEnvironmentChange?.({ weather, soil: s }); };
  const WeatherIcon = weather.icon;

  return (
    <div className={`bg-[#ffffff] border border-[#e6e6e1] rounded-2xl p-4 min-h-0 ${horizontal ? 'grid grid-cols-2 gap-4 divide-x divide-[#e6e6e1]' : 'divide-y divide-[#e6e6e1]'}`}>
      <div className={horizontal ? 'pr-4' : 'pb-3'}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <WeatherIcon size={20} style={{ color: weather.color }} className="flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-neutral-500">Weather</div>
              <div className="text-sm font-bold text-neutral-900 truncate">{weather.label}</div>
            </div>
          </div>
          <span className="text-2xl font-bold font-mono text-neutral-900">{weather.temp}°</span>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-600">
          <span className="flex items-center gap-1"><Droplets size={12} className="text-sky-600" />{weather.humidity}%</span>
          <span className="flex items-center gap-1"><Wind size={12} className="text-amber-600" />{weather.wind} km/h</span>
          <span className="flex items-center gap-1"><Eye size={12} className="text-emerald-600" />{weather.visibility} km</span>
        </div>
        {showControls && (
          <div className="flex gap-1 mt-2">
            {WEATHER_PRESETS.map(w => (
              <button key={w.id} type="button" onClick={() => pickWeather(w)} className={chip(weather.id === w.id)}>{w.id.toUpperCase()}</button>
            ))}
          </div>
        )}
      </div>

      <div className={horizontal ? '' : 'pt-3'}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Mountain size={20} style={{ color: soil.color }} className="flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] text-neutral-500">Ground</div>
              <div className="text-sm font-bold text-neutral-900 truncate">{soil.type}</div>
            </div>
          </div>
          <span className="text-2xl font-bold font-mono text-amber-600">{soil.hardness}<span className="text-xs text-neutral-500">/10</span></span>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-600">
          <span>{(soil.friction * 100).toFixed(0)}% grip</span>
          <span className="text-neutral-900 truncate">{soil.digResistance}</span>
        </div>
        {showControls && (
          <div className="flex gap-1 mt-2">
            {SOIL_PRESETS.map(s => (
              <button key={s.id} type="button" onClick={() => pickSoil(s)} className={chip(soil.id === s.id)}>{s.id.toUpperCase()}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
