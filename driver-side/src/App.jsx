import React, { useState, useEffect, useMemo, useRef } from 'react';
import LoginGate from './components/LoginGate';
import SupervisorView from './pages/SupervisorView';
import { TABS } from './components/NavigationTabs';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import EmergencyModal from './components/EmergencyModal';
import FloatingVoiceButton from './components/FloatingVoiceButton';
import CriticalPerimeterAlert from './components/CriticalPerimeterAlert';
import CabCameraCard from './components/CabCameraCard';

// Page Views
import CockpitView from './pages/CockpitView';
import VehicleLogsView from './pages/VehicleLogsView';
import AlertHistoryView from './pages/AlertHistoryView';
import AiAssistantView from './pages/AiAssistantView';
import LearningHubView from './pages/LearningHubView';
import TasksView from './pages/TasksView';

// Decoupled Services & Engines
import { resolveOperatorHandoff, subscribeToOperatorAssignments } from './services/handoff';
import { runAlertEngineTick } from './services/alertEngine';
import { computeStaticTargetsWithETA } from './services/radarTargets';
import { startAlarm, stopAlarm, chime } from './services/alarm';
import { logEvent, LOG_CATEGORIES, LOG_SEVERITY } from './services/logger';
import { SEQUENCE_PHASES } from './services/sequenceEngine';
import { buildTaskList, parseCompletion, mergeAssigned } from './services/taskList';
import { answerLiveQuestion } from './services/liveAnswers';
import { askVoiceAssistant } from './api';
import { startLiveLink, fetchAssignedTasks, markAssignedTaskDone } from './services/liveLink';
import { hasSession } from './services/supervisorApi';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  // 'supervisor' = supervisor console (survives a page refresh while the session token lasts); operators use `authenticated`
  const [role, setRole] = useState(() => (hasSession() ? 'supervisor' : null));
  const [supervisorName, setSupervisorName] = useState('supervisor');
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
  const audioMutedRef = useRef(false);
  audioMutedRef.current = audioMuted;
  const [supervisorNotice, setSupervisorNotice] = useState(null);   // tasks the supervisor just assigned
  useEffect(() => {
    if (!supervisorNotice) return;
    const t = setTimeout(() => setSupervisorNotice(null), 10000);
    return () => clearTimeout(t);
  }, [supervisorNotice]);

  // Alerts raised by the cab-camera vision model (fatigue / seatbelt / phone / absent)
  const [visionAlerts, setVisionAlerts] = useState([]);

  // Task queue — a spoken "task completed" strikes tasks off
  const [tasks, setTasks] = useState(() => buildTaskList(null));
  const tasksRef = useRef(tasks);
  const cockpitRef = useRef(null);   // latest cockpit state, read by the voice assistant
  tasksRef.current = tasks;
  useEffect(() => {
    if (assignment) setTasks(buildTaskList(assignment));
  }, [assignment?.taskId, assignment?.taskName]);

  // Live link to the supervisor console: heartbeat + cab-camera frames, and tasks the supervisor assigns
  const liveRef = useRef(null);
  useEffect(() => {
    if (!authenticated) return;
    return startLiveLink(() => liveRef.current);
  }, [authenticated]);
  useEffect(() => {
    const id = assignment?.operatorId;
    if (!authenticated || !id) return;
    let stopped = false;
    const pull = async () => {
      const list = await fetchAssignedTasks(id);
      if (stopped || !list) return;
      const known = new Set(tasksRef.current.map(t => t.id));
      const fresh = list.filter(a => !known.has(a.id));
      if (fresh.length) {
        setSupervisorNotice(fresh);
        logEvent(LOG_CATEGORIES.TASK, `Supervisor assigned: ${fresh.map(a => a.name).join(', ')}`, LOG_SEVERITY.INFO);
        if (!audioMutedRef.current) chime();
      }
      setTasks(prev => mergeAssigned(prev, list));
    };
    pull();
    const timer = setInterval(pull, 3000);
    return () => { stopped = true; clearInterval(timer); };
  }, [authenticated, assignment?.operatorId]);

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

  const [injectedFaults, setInjectedFaults] = useState([]);   // demo: defects placed on a machine part

  // 5. Headless Alert Engine Tick (Decoupled & Independent of visual UI)
  const engineAlertState = useMemo(() => {
    return runAlertEngineTick({
      dynamicTargets,
      telemetry,
      operatingMode,
      injectedFaults,
      fuelState: {
        fuelLevelPct: telemetry.fuel,
        tankCapacityL: 410,
        hourlyConsumptionL: 24.5,
        distanceToBunkKm: staticTargetsRaw.find(s => s.category === 'fuel')?.distanceKm || 1.4,
        travelSpeedKmh,
      },
    });
  }, [dynamicTargets, telemetry, operatingMode, staticTargetsRaw, travelSpeedKmh, injectedFaults]);

  // Merge vision alerts into the same alert stream (strobe, buzzer, badge count)
  const alertState = useMemo(() => {
    if (!visionAlerts.length) return engineAlertState;
    return {
      ...engineAlertState,
      alerts: [...engineAlertState.alerts, ...visionAlerts],
      isCritical: engineAlertState.isCritical || visionAlerts.some(a => a.severity === 'critical'),
      hasAlerts: true,
    };
  }, [engineAlertState, visionAlerts]);

  // Only update (and log) when the set of active vision alerts actually changes
  const visionAlertsRef = useRef([]);
  const handleVisionAlerts = (next) => {
    const key = a => a.map(x => x.type).sort().join(',');
    const prev = visionAlertsRef.current;
    if (key(prev) === key(next)) return;
    visionAlertsRef.current = next;
    next.filter(n => !prev.some(p => p.type === n.type))
      .forEach(a => logEvent(LOG_CATEGORIES.SAFETY, `CAB CAMERA: ${a.message}`, a.severity === 'critical' ? LOG_SEVERITY.CRITICAL : LOG_SEVERITY.WARNING));
    setVisionAlerts(next);
  };

  // Repeating beep for as long as a critical alert is active (and the alarm isn't muted)
  const alarmKind = authenticated && alertState.isCritical ? (alertState.proximity.triggered ? 'proximity' : 'critical') : null;
  useEffect(() => {
    if (audioMuted || !alarmKind) { stopAlarm(); return; }
    startAlarm(alarmKind);
    return stopAlarm;
  }, [alarmKind, audioMuted]);

  const handleAuthenticated = (verifiedData) => {
    if (verifiedData?.operator) {
      setAssignment(prev => ({
        ...prev,
        operatorId: verifiedData.operator.id,
        operatorName: verifiedData.operator.name,
        skillLevel: verifiedData.operator.skill,
        machineId: verifiedData.machine_id || prev?.machineId || 'EXC001',
        // the shift task shown on the login screen is the one the cockpit starts with
        ...(verifiedData.task ? { taskId: verifiedData.task.id, taskName: verifiedData.task.name, estimatedTimeMin: verifiedData.task.estimatedMin } : {}),
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

  // Voice intent: "task completed" / "mark backfill as done". Returns the reply to speak, or null if not a task command.
  const handleVoiceCommand = (text) => {
    const r = parseCompletion(text, tasksRef.current);
    // not a "task completed" command → try to answer from live telemetry (fuel, temperature, alerts...)
    if (!r) return answerLiveQuestion(text, cockpitRef.current);
    if (r.allDone) return 'All tasks are already completed.';
    if (r.alreadyDone) return `${r.task.name} is already marked complete.`;
    const next = tasksRef.current.find(t => !t.done && t.id !== r.task.id);
    const updated = tasksRef.current.map(t => (t.id === r.task.id ? { ...t, done: true } : t));
    tasksRef.current = updated;   // a second command right away sees this one
    setTasks(updated);
    if (r.task.supervisor && assignment?.operatorId) markAssignedTaskDone(assignment.operatorId, r.task.id);
    logEvent(LOG_CATEGORIES.TASK, `Task completed by voice: ${r.task.name} (${r.task.id})`, LOG_SEVERITY.INFO);
    return `Marked ${r.task.name} as complete.` + (next ? ` Next up: ${next.name}.` : ' All tasks are done.');
  };

  // Demo scenarios: inject a fault into the live telemetry (like the reference simulator); Reset restores the phase
  const [scenario, setScenario] = useState(null);
  const wasAutoPlayRef = useRef(true);
  const applyPhase = () => {
    const phase = SEQUENCE_PHASES[currentPhaseIndex];
    setTelemetry(phase.telemetry);
    setOperatingMode(phase.operatingMode);
    setDynamicTargets(phase.dynamicTargets);
  };
  const handleScenario = (id) => {
    if (id === 'reset') {
      applyPhase();
      setVisionAlerts([]);
      setInjectedFaults([]);
      setScenario(null);
      setIsAutoPlay(wasAutoPlayRef.current);
      logEvent(LOG_CATEGORIES.SYSTEM, 'Demo scenario cleared — telemetry restored.', LOG_SEVERITY.INFO);
      return;
    }
    if (!scenario) wasAutoPlayRef.current = isAutoPlay;
    setIsAutoPlay(false);                      // hold the demo clock so the fault stays put
    applyPhase();
    setVisionAlerts([]);
    setInjectedFaults([]);
    if (id === 'proximity') {
      setDynamicTargets(prev => (prev.some(t => t.type === 'human')
        ? prev.map(t => (t.type === 'human' ? { ...t, distanceM: 2.2 } : t))
        : [...prev, { id: 'inj-human', type: 'human', label: 'Worker (injected)', distanceM: 2.2, angle: 40 }]));
    } else if (id === 'seatbelt') {
      setTelemetry(t => ({ ...t, seatbelt: false }));
      setOperatingMode('travelling');
    } else if (id === 'slope') {
      setTelemetry(t => ({ ...t, tilt: 18.5 }));
      setOperatingMode('slope_alert');
    } else if (id === 'fatigue') {
      setVisionAlerts([{ type: 'LOOKING_AWAY', severity: 'warning', message: 'Operator gaze is off the work area (injected).' }]);
    } else if (id === 'hydraulics') {
      setInjectedFaults([{ part: 'hydraulics', severity: 'critical', label: 'Hydraulic leak at the boom cylinder' }]);
    } else if (id === 'track') {
      setInjectedFaults([{ part: 'undercarriage', severity: 'warning', label: 'Track tension fault — left track' }]);
    } else if (id === 'bucket') {
      setInjectedFaults([{ part: 'bucket', severity: 'warning', label: 'Bucket teeth worn beyond limit' }]);
    } else if (id === 'engine') {
      setInjectedFaults([{ part: 'engine', severity: 'critical', label: 'Engine fault code E-117 (turbo pressure)' }]);
    } else if (id === 'coldstart') {
      setTelemetry(t => ({ ...t, rpm: 2210, temp: 34 }));
    }
    setScenario(id);
    logEvent(LOG_CATEGORIES.SAFETY, `Demo scenario injected: ${id}`, LOG_SEVERITY.WARNING);
  };

  // Idle time (minutes) — counts while the machine is idling
  const [idleSec, setIdleSec] = useState(0);
  useEffect(() => {
    if (!authenticated || (operatingMode !== 'idling' && operatingMode !== 'idle')) return;
    const id = setInterval(() => setIdleSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [authenticated, operatingMode]);
  const groundSpeed = operatingMode === 'travelling' ? travelSpeedKmh : (operatingMode === 'digging' || operatingMode === 'excavating') ? 1.2 : 0;

  const handleAdjustFuel = (pct) => {
    setTelemetry(prev => ({ ...prev, fuel: pct }));
  };

  if (role === 'supervisor') {
    return <SupervisorView username={supervisorName} onLogout={() => setRole(null)} />;
  }

  if (!authenticated) {
    return (
      <LoginGate
        onOperator={handleAuthenticated}
        onSupervisor={(name) => { setSupervisorName(name); setRole('supervisor'); }}
      />
    );
  }

  const pendingTasks = tasks.filter(t => !t.done);
  const curTask = pendingTasks[0];
  const onFirstTask = curTask && curTask.id === tasks[0].id;   // demo phase clock only drives the first task
  const currentTaskModel = {
    task_id: curTask?.id ?? tasks[0].id,
    task_type: curTask?.name ?? 'ALL TASKS COMPLETE',
    estimated_time: curTask?.estimatedMin ?? 0,
    site_zone: curTask?.zone ?? assignment?.siteZone ?? 'Sector 4B — South Valley',
    upcoming: pendingTasks.slice(1),
    completed: tasks.filter(t => t.done),
    allDone: !curTask,
    fromSupervisor: !!curTask?.supervisor,
    elapsedMin: onFirstTask ? activePhase.taskProgress.elapsedMin : 0,
    progressPct: !curTask ? 100 : onFirstTask ? activePhase.taskProgress.progressPct : 0,
  };

  // Snapshot for the voice assistant — real numbers, refreshed every render
  const fuelMetrics = alertState.fuel?.metrics || {};
  const fuelAvailableL = Number(fuelMetrics.fuelAvailableL);
  cockpitRef.current = {
    telemetry, operatingMode, travelSpeedKmh, staticTargets, dynamicTargets,
    alerts: alertState.alerts,
    fuel: {
      fuelAvailableL: Number.isFinite(fuelAvailableL) ? fuelAvailableL : null,
      hoursLeft: Number.isFinite(fuelAvailableL) ? fuelAvailableL / 24.5 : null,   // same burn rate the alert engine uses
      canReachBunk: fuelMetrics.canReachBunk,
    },
    task: currentTaskModel,
  };

  // ONE assistant for both the AI Assistant tab and the voice agent, so they always answer the same way:
  // dashboard commands -> live readings -> the manuals (LLM, falling back to the offline knowledge base).
  const askAssistant = async (question) => {
    const command = handleVoiceCommand(question);
    if (command) return command;
    const tel = telemetry;
    const status = [
      `fuel ${Math.round(tel.fuel)}%`, `coolant ${Math.round(tel.temp)}C`, `hydraulic ${Math.round(tel.hydraulic)} bar`, `machine ${operatingMode}`,
    ].join(', ');
    return askVoiceAssistant(question, {
      machine_id: assignment?.machineId || 'EXC001',
      task_type: currentTaskModel.task_type,
      live_status: status,
    });
  };

  liveRef.current = {
    operator_id: assignment?.operatorId,
    machine_id: assignment?.machineId,
    task: currentTaskModel.task_type,
    task_progress_pct: currentTaskModel.progressPct,
    mode: operatingMode,
    telemetry,
    alerts: alertState.alerts,
    // everything the supervisor needs to render this exact dashboard
    snapshot: {
      task: currentTaskModel, tasks, operatingMode, telemetry, staticTargets, dynamicTargets,
      alertState: { faults: alertState.faults, alerts: alertState.alerts, isCritical: alertState.isCritical, hasAlerts: alertState.hasAlerts, proximity: alertState.proximity, fuel: alertState.fuel },
      currentPhaseIndex, secondsUntilNext, idleMin: Math.floor(idleSec / 60), groundSpeed,
    },
  };

  const TITLES = {
    [TABS.COCKPIT]: 'Dashboard', [TABS.TASKS]: 'Tasks', [TABS.LOGS]: 'Vehicle Logs',
    [TABS.ALERTS]: 'Alert History', [TABS.ASSISTANT]: 'AI Assistant', [TABS.LEARNING]: 'Learning Hub',
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f5f5f2] text-neutral-900 flex font-sans selection:bg-[#FFCD11] selection:text-black">
      {/* 1. SIDEBAR NAVIGATION */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        alertCount={alertState.alerts.length}
        isCritical={alertState.isCritical}
        machineId={assignment?.machineId || 'EXC001'}
        operatorName={assignment?.operatorName || 'Rajan Kumar'}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          title={TITLES[activeTab]}
          operatorName={assignment?.operatorName || 'Rajan Kumar'}
          onEmergencyClick={() => setIsEmergencyOpen(true)}
          onLogout={handleLogout}
        />

      {/* 2. PAGE CONTENT */}
      <main className={`flex-1 min-h-0 overflow-y-auto ${activeTab === TABS.COCKPIT ? 'p-4 pb-16' : 'p-4 md:p-6'}`}>
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
            scenario={scenario}
            onScenario={handleScenario}
            idleMin={Math.floor(idleSec / 60)}
            groundSpeed={groundSpeed}
            // Sequence Stream Controls
            currentPhaseIndex={currentPhaseIndex}
            onPhaseChange={handlePhaseChange}
            isAutoPlay={isAutoPlay}
            onToggleAutoPlay={() => setIsAutoPlay(!isAutoPlay)}
            secondsUntilNext={secondsUntilNext}
          />
        )}

        {activeTab === TABS.TASKS && <TasksView tasks={tasks} task={currentTaskModel} />}

        {activeTab === TABS.LOGS && (
          <VehicleLogsView machineId={assignment?.machineId || 'CAT 320 • EXC001'} />
        )}

        {activeTab === TABS.ALERTS && (
          <AlertHistoryView />
        )}

        {activeTab === TABS.ASSISTANT && (
          <AiAssistantView machineId={assignment?.machineId || 'CAT 320 • EXC001'} onAsk={askAssistant} />
        )}

        {activeTab === TABS.LEARNING && (
          <LearningHubView
            operatorId={assignment?.operatorId || 'OP001'}
            operatorName={assignment?.operatorName || 'Rajan Kumar'}
          />
        )}
      </main>
      </div>

      {/* 3. PERSISTENT FLOATING VOICE ASSISTANT ("HEY CAT" WAKE WORD) */}
      <FloatingVoiceButton
        machineId={assignment?.machineId || 'EXC001'}
        currentTaskName={currentTaskModel.task_type}
        onAsk={askAssistant}
      />

      {/* Live cab camera — vision AI watches the operator */}
      <CabCameraCard onAlerts={handleVisionAlerts} />

      {/* 4. EMERGENCY PROTOCOL MODAL */}
      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        machineId={assignment?.machineId || 'EXC001'}
      />

      {/* 5. PROFESSIONAL EMERGENCY RED PERIMETER STROBE */}
      {supervisorNotice && (
        <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#ffffff] border border-[#FFCD11]/60 rounded-xl pl-4 pr-2 py-2.5 shadow-lg shadow-black/10 animate-slide-up">
          <div>
            <div className="text-[11px] text-neutral-900 font-medium">New task from your supervisor</div>
            <div className="text-sm text-neutral-900 font-semibold">
              {supervisorNotice[0].name}{supervisorNotice.length > 1 ? ` +${supervisorNotice.length - 1} more` : ''}
            </div>
            <div className="text-[11px] text-neutral-500">{supervisorNotice[0].estimated_min} min{supervisorNotice[0].zone ? ` · ${supervisorNotice[0].zone}` : ''} · added to Up next</div>
          </div>
          <button type="button" onClick={() => setSupervisorNotice(null)} className="text-neutral-500 hover:text-neutral-900 px-2 text-lg leading-none" title="Dismiss">×</button>
        </div>
      )}

      <CriticalPerimeterAlert
        alerts={alertState.alerts}
      />
    </div>
  );
}
