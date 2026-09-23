import React, { useState, useEffect, useMemo, useRef } from 'react';
import DriverFaceAuth from './components/DriverFaceAuth';
import NavigationTabs, { TABS } from './components/NavigationTabs';
import EmergencyModal from './components/EmergencyModal';
import FloatingVoiceButton from './components/FloatingVoiceButton';
import CriticalPerimeterAlert from './components/CriticalPerimeterAlert';

// Page Views
import CockpitView from './pages/CockpitView';
import VehicleLogsView from './pages/VehicleLogsView';
import AlertHistoryView from './pages/AlertHistoryView';
import AiAssistantView from './pages/AiAssistantView';

// Decoupled Services & Engines
import { resolveOperatorHandoff, subscribeToOperatorAssignments } from './services/handoff';
import { runAlertEngineTick } from './services/alertEngine';
import { computeStaticTargetsWithETA } from './services/radarTargets';
import { logEvent, LOG_CATEGORIES, LOG_SEVERITY } from './services/logger';
import { SEQUENCE_PHASES } from './services/sequenceEngine';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.COCKPIT);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

  // REAL-TIME SEQUENCE STREAM STATE
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [secondsUntilNext, setSecondsUntilNext] = useState(10);

  const activePhase = SEQUENCE_PHASES[currentPhaseIndex];

  // Telemetry & Spatial State dynamically driven by current sequence phase
  const [telemetry, setTelemetry] = useState(activePhase.telemetry);
  const [operatingMode, setOperatingMode] = useState(activePhase.operatingMode);
  const [dynamicTargets, setDynamicTargets] = useState(activePhase.dynamicTargets);
  const [staticTargetsRaw, setStaticTargetsRaw] = useState(activePhase.staticTargets);
  const [travelSpeedKmh, setTravelSpeedKmh] = useState(5.0);

  const [audioMuted, setAudioMuted] = useState(false);
  const lastAlertTimestampRef = useRef(0);

  // 1. Resolve Operator Assignment on Mount + Real-Time Multi-Tab Subscription
  useEffect(() => {
    resolveOperatorHandoff().then(handoffData => {
      setAssignment(handoffData);
    });

    const unsubscribe = subscribeToOperatorAssignments((newAssignment) => {
      setAssignment(newAssignment);
      logEvent(
        LOG_CATEGORIES.TASK,
        `LIVE ASSIGNMENT: Driver ${newAssignment.operatorName} assigned to ${newAssignment.machineId} for ${newAssignment.taskName}`,
        LOG_SEVERITY.INFO
      );
    });

    return unsubscribe;
  }, []);

  // 2. Real-Time Sequence Clock Streamer (Advances chronological phases every 10s if active)
  useEffect(() => {
    if (!authenticated || !isAutoPlay) return;

    const interval = setInterval(() => {
      setSecondsUntilNext(sec => {
        if (sec <= 1) {
          setCurrentPhaseIndex(prev => (prev + 1) % SEQUENCE_PHASES.length);
          return 10;
        }
        return sec - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [authenticated, isAutoPlay]);

  // 3. Synchronize Phase Transitions across Machine, Radar, Telemetry, and Logs
  useEffect(() => {
    const phase = SEQUENCE_PHASES[currentPhaseIndex];
    setTelemetry(phase.telemetry);
    setOperatingMode(phase.operatingMode);
    setDynamicTargets(phase.dynamicTargets);
    setStaticTargetsRaw(phase.staticTargets);
    setTravelSpeedKmh(phase.operatingMode === 'travelling' ? 8.5 : 5.0);

    // Automatically record sequential event log
    logEvent(phase.logCategory, phase.logMessage, phase.logSeverity);
  }, [currentPhaseIndex]);

  // 4. Compute Static Targets with Real-Time ETA
  const staticTargets = useMemo(() => {
    return computeStaticTargetsWithETA(staticTargetsRaw, travelSpeedKmh);
  }, [staticTargetsRaw, travelSpeedKmh]);

  // 5. Headless Alert Engine Tick (Decoupled & Independent of visual UI)
  const alertState = useMemo(() => {
    return runAlertEngineTick({
      dynamicTargets,
      fuelState: {
        fuelLevelPct: telemetry.fuel,
        tankCapacityL: 410,
        hourlyConsumptionL: 24.5,
        distanceToBunkKm: staticTargetsRaw.find(s => s.category === 'fuel')?.distanceKm || 1.4,
        travelSpeedKmh,
      },
    });
  }, [dynamicTargets, telemetry.fuel, staticTargetsRaw, travelSpeedKmh]);

  // Audible Buzzer synthesis when critical alert fires
  useEffect(() => {
    if (audioMuted || !alertState.isCritical) return;
    const now = Date.now();
    if (now - lastAlertTimestampRef.current < 2500) return;
    lastAlertTimestampRef.current = now;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = alertState.proximity.triggered ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(alertState.proximity.triggered ? 900 : 540, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }, [alertState, audioMuted]);

  const handleAuthenticated = (verifiedData) => {
    if (verifiedData?.operator) {
      setAssignment(prev => ({
        ...prev,
        operatorId: verifiedData.operator.id,
        operatorName: verifiedData.operator.name,
        skillLevel: verifiedData.operator.skill,
        machineId: verifiedData.machine_id || prev?.machineId || 'EXC001',
      }));
    }
    logEvent(LOG_CATEGORIES.SAFETY, `Operator ${verifiedData?.operator?.name || 'Rajan Kumar'} authenticated on ${verifiedData?.machine_id || 'EXC001'}`, LOG_SEVERITY.INFO);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    logEvent(LOG_CATEGORIES.SAFETY, `Operator session locked. Cockpit secured.`, LOG_SEVERITY.INFO);
    setAuthenticated(false);
  };

  const handlePhaseChange = (newIdx) => {
    setCurrentPhaseIndex(newIdx);
    setSecondsUntilNext(10);
  };

  const handleUpdateTargetDistance = (newDistM) => {
    setDynamicTargets(prev =>
      prev.map(t => (t.type === 'human' ? { ...t, distanceM: newDistM } : t))
    );
  };

  const handleAdjustFuel = (pct) => {
    setTelemetry(prev => ({ ...prev, fuel: pct }));
  };

  if (!authenticated) {
    return <DriverFaceAuth onAuthenticated={handleAuthenticated} />;
  }

  const currentTaskModel = {
    task_id: assignment?.taskId || 'TSK-4092',
    task_type: assignment?.taskName || 'DEEP TRENCHING PIPELINE B',
    estimated_time: assignment?.estimatedTimeMin || 120,
    site_zone: assignment?.siteZone || 'Sector 4B — South Valley',
    elapsedMin: activePhase.taskProgress.elapsedMin,
    progressPct: activePhase.taskProgress.progressPct,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex flex-col font-sans selection:bg-[#FFB81C] selection:text-black">
      {/* 1. TOP GLOBAL NAVIGATION & DYNAMIC SAFETY STATE BAR */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCriticalAlert={alertState.isCritical}
        alertCount={alertState.alerts.length}
        machineId={assignment?.machineId || 'CAT 320 • EXC001'}
        operatorName={assignment?.operatorName || 'Rajan Kumar'}
        onEmergencyClick={() => setIsEmergencyOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. TABBED CONTENT AREA */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {activeTab === TABS.COCKPIT && (
          <CockpitView
            task={currentTaskModel}
            operatingMode={operatingMode}
            onModeChange={setOperatingMode}
            telemetry={telemetry}
            staticTargets={staticTargets}
            dynamicTargets={dynamicTargets}
            alertState={alertState}
            audioMuted={audioMuted}
            onToggleAudio={() => setAudioMuted(!audioMuted)}
            onUpdateTargetDistance={handleUpdateTargetDistance}
            onAdjustFuel={handleAdjustFuel}
            // Sequence Stream Controls
            currentPhaseIndex={currentPhaseIndex}
            onPhaseChange={handlePhaseChange}
            isAutoPlay={isAutoPlay}
            onToggleAutoPlay={() => setIsAutoPlay(!isAutoPlay)}
            secondsUntilNext={secondsUntilNext}
          />
        )}

        {activeTab === TABS.LOGS && (
          <VehicleLogsView machineId={assignment?.machineId || 'CAT 320 • EXC001'} />
        )}

        {activeTab === TABS.ALERTS && (
          <AlertHistoryView />
        )}

        {activeTab === TABS.ASSISTANT && (
          <AiAssistantView machineId={assignment?.machineId || 'CAT 320 • EXC001'} />
        )}
      </main>

      {/* 3. PERSISTENT FLOATING VOICE ASSISTANT (HOLD TO TALK) */}
      <FloatingVoiceButton
        machineId={assignment?.machineId || 'EXC001'}
        currentTaskName={currentTaskModel.task_type}
      />

      {/* 4. EMERGENCY PROTOCOL MODAL */}
      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        machineId={assignment?.machineId || 'EXC001'}
      />

      {/* 5. PROFESSIONAL EMERGENCY RED PERIMETER STROBE */}
      <CriticalPerimeterAlert
        isCritical={alertState.isCritical || alertState.hasAlerts}
      />
    </div>
  );
}
