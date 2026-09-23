import React, { useState } from 'react';
import { Sun, CloudRain, Wind, Droplets, Mountain, Eye, Compass, Layers, ShieldCheck, Thermometer } from 'lucide-react';

const WEATHER_PRESETS = [
  { id: 'sunny', label: 'Clear & Sunny', temp: 32, humidity: 38, wind: 12, visibility: 10, icon: Sun, color: '#f59e0b' },
  { id: 'dust', label: 'Dust Storm', temp: 37, humidity: 22, wind: 36, visibility: 2.5, icon: Wind, color: '#d97706' },
  { id: 'rain', label: 'Heavy Monsoonal Rain', temp: 24, humidity: 88, wind: 24, visibility: 4.0, icon: CloudRain, color: '#38bdf8' },
];

const SOIL_PRESETS = [
  { id: 'rocky', type: 'Rocky Basalt & Dense Clay', hardness: 8.5, friction: 0.88, digResistance: 'High (+18% fuel)', color: '#f97316' },
  { id: 'sandy', type: 'Loose Sandy Loam', hardness: 3.2, friction: 0.65, digResistance: 'Low (Standard load)', color: '#eab308' },
  { id: 'muddy', type: 'Saturated Wet Mud', hardness: 5.0, friction: 0.42, digResistance: 'Medium (High Slip)', color: '#a855f7' },
];

export default function EnvironmentBar({ onEnvironmentChange }) {
  const [selectedWeather, setSelectedWeather] = useState(WEATHER_PRESETS[0]);
  const [selectedSoil, setSelectedSoil] = useState(SOIL_PRESETS[0]);

  const handleWeatherChange = (preset) => {
    setSelectedWeather(preset);
    onEnvironmentChange?.({ weather: preset, soil: selectedSoil });
  };

  const handleSoilChange = (preset) => {
    setSelectedSoil(preset);
    onEnvironmentChange?.({ weather: selectedWeather, soil: preset });
  };

  const WeatherIcon = selectedWeather.icon;

  return (
    <div className="bg-[#121212] border border-[#242424] rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-3">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-[#FFB81C]" />
          <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
            Site Environmental &amp; Ground Telemetry
          </h3>
        </div>
        <span className="text-[10px] text-gray-400 font-mono">
          Sensors: Barometric + Penetrometer Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weather Conditions Card */}
        <div className="bg-[#161616] border border-[#262626] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${selectedWeather.color}22` }}
              >
                <WeatherIcon size={18} style={{ color: selectedWeather.color }} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
                  Atmospheric Weather
                </span>
                <span className="text-sm font-bold text-white">
                  {selectedWeather.label}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-2xl font-black text-white font-mono leading-none">
                {selectedWeather.temp}°
              </span>
              <span className="text-xs text-gray-400 font-mono">C</span>
            </div>
          </div>

          {/* Weather Sub-metrics */}
          <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-[#242424] text-xs">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Droplets size={12} className="text-sky-400" />
              <span>{selectedWeather.humidity}% Hum</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Wind size={12} className="text-amber-400" />
              <span>{selectedWeather.wind} km/h</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Eye size={12} className="text-emerald-400" />
              <span>{selectedWeather.visibility} km Vis</span>
            </div>
          </div>

          {/* Quick preset selector */}
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Simulate:</span>
            {WEATHER_PRESETS.map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => handleWeatherChange(w)}
                className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition ${
                  selectedWeather.id === w.id
                    ? 'bg-[#FFB81C] text-black font-bold'
                    : 'bg-[#222] text-gray-400 hover:text-white'
                }`}
              >
                {w.id.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Soil Condition Card */}
        <div className="bg-[#161616] border border-[#262626] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${selectedSoil.color}22` }}
              >
                <Mountain size={18} style={{ color: selectedSoil.color }} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block leading-tight">
                  Ground Soil Profile
                </span>
                <span className="text-sm font-bold text-white">
                  {selectedSoil.type}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase text-gray-400 block leading-tight">Hardness</span>
              <span className="text-xl font-black text-amber-400 font-mono leading-none">
                {selectedSoil.hardness}
              </span>
              <span className="text-[10px] text-gray-500 font-mono"> /10</span>
            </div>
          </div>

          {/* Soil Sub-metrics */}
          <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-[#242424] text-xs">
            <div className="text-gray-400">
              <span className="text-gray-500 block text-[10px]">Traction Factor:</span>
              <span className="text-white font-mono font-semibold">
                {(selectedSoil.friction * 100).toFixed(0)}% Grip Index
              </span>
            </div>
            <div className="text-gray-400">
              <span className="text-gray-500 block text-[10px]">Excavation Load:</span>
              <span className="text-[#FFB81C] font-mono font-semibold">
                {selectedSoil.digResistance}
              </span>
            </div>
          </div>

          {/* Quick soil selector */}
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 uppercase font-semibold">Simulate:</span>
            {SOIL_PRESETS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSoilChange(s)}
                className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition ${
                  selectedSoil.id === s.id
                    ? 'bg-[#FFB81C] text-black font-bold'
                    : 'bg-[#222] text-gray-400 hover:text-white'
                }`}
              >
                {s.id.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
