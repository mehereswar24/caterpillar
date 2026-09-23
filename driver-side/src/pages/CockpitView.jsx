import React from 'react';
import TaskHeroCard from '../components/TaskHeroCard';
import SequenceController from '../components/SequenceController';
import ExcavatorAnimation from '../components/ExcavatorAnimation';
import TelemetryStrip from '../components/TelemetryStrip';
import FuelStatusCard from '../components/FuelStatusCard';
import ProximityRadar360 from '../components/ProximityRadar360';
import EnvironmentBar from '../components/EnvironmentBar';

export default function CockpitView({
  task,
  operatingMode,
  onModeChange,
  telemetry,
  staticTargets,
  dynamicTargets,
  alertState,
  audioMuted,
  onToggleAudio,
  onUpdateTargetDistance,
  onAdjustFuel,
  // Sequence props
  currentPhaseIndex,
  onPhaseChange,
  isAutoPlay,
  onToggleAutoPlay,
  secondsUntilNext,
}) {
  const fuelMetrics = alertState.fuel?.metrics || {};
  const cannotReachFuel = alertState.fuel?.triggered || false;

  return (
    <div className="max-w-[1700px] mx-auto space-y-4">
      {/* 1. DOMINANT TASK HERO SECTION: Answers "What am I doing, and how much longer?" */}
      <TaskHeroCard
        taskName={task?.task_type || 'DEEP TRENCHING PIPELINE B'}
        sector={task?.site_zone || 'Sector 4B — South Valley'}
        targetDepth="2.5 m"
        progressPct={task?.progressPct || 21}
        estimatedTimeMin={task?.estimated_time || 120}
        elapsedMinutes={task?.elapsedMin || 25}
        operatingMode={operatingMode}
      />

      {/* 2. REAL-TIME SEQUENCE CONTROLLER STRIP */}
      <SequenceController
        currentPhaseIndex={currentPhaseIndex}
        onPhaseChange={onPhaseChange}
        isAutoPlay={isAutoPlay}
        onToggleAutoPlay={onToggleAutoPlay}
        secondsUntilNext={secondsUntilNext}
      />

      {/* 3. MIDDLE TWO-COLUMN GRID: Machine View + Operational Radar & Fuel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Machine Live Animation + Giant Telemetry Strip */}
        <div className="xl:col-span-7 space-y-3">
          {/* Excavator Live Status Animation */}
          <ExcavatorAnimation
            mode={operatingMode}
            onModeChange={onModeChange}
            telemetry={telemetry}
          />

          {/* Machine Status Telemetry Strip (Thin, with colored abnormal values only) */}
          <TelemetryStrip
            rpm={telemetry.rpm}
            hydraulicBar={telemetry.hydraulic}
            fuelPct={telemetry.fuel}
            engineTempC={telemetry.temp || 78}
            tiltDeg={telemetry.tilt}
          />
        </div>

        {/* Right Column (5 cols): 360° Safety Radar & Standalone Prominent Fuel Card */}
        <div className="xl:col-span-5 space-y-4">
          {/* 360° Operational Radar */}
          <ProximityRadar360
            staticTargets={staticTargets}
            dynamicTargets={dynamicTargets}
            alertState={alertState}
            audioMuted={audioMuted}
            onToggleAudio={onToggleAudio}
            onUpdateTargetDistance={onUpdateTargetDistance}
          />

          {/* Prominent Standalone Fuel Reachability Card */}
          <FuelStatusCard
            fuelPct={telemetry.fuel}
            fuelAvailableL={fuelMetrics.fuelAvailableL || 168}
            runtimeMin={fuelMetrics.fuelRunoutTimeMin || 70}
            bunkDistKm={fuelMetrics.distanceToBunkKm || 1.4}
            travelTimeMin={fuelMetrics.travelTimeToStationMin || 16.8}
            cannotReachFuel={cannotReachFuel}
            onAdjustFuel={onAdjustFuel}
          />
        </div>
      </div>

      {/* 4. ENVIRONMENTAL STATUS ROW: Weather & Ground Soil */}
      <EnvironmentBar />
    </div>
  );
}
