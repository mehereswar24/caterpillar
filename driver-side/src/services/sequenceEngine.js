// sequenceEngine.js — Demo phases that auto-advance every 10s
export const SEQUENCE_PHASES = [
  {
    id: 'phase-1', label: 'Site Approach', name: '1. Site Approach',
    operatingMode: 'travelling',
    telemetry: { rpm: 1200, hydraulic: 185, temp: 76, fuel: 88, seatbelt: true, engineLoad: 55 },
    dynamicTargets: [],
    staticTargets: [
      { id: 's1', type: 'fuel_station', label: 'Fuel Bunk A', distanceKm: 1.4, category: 'fuel' },
      { id: 's2', type: 'site', label: 'Work Zone 4B', distanceKm: 0.3, category: 'site' },
    ],
    taskProgress: { elapsedMin: 0, progressPct: 0 },
    logCategory: 'TASK', logMessage: 'Machine travelling to work zone — Site Approach phase active.', logSeverity: 'INFO',
  },
  {
    label: 'Excavation Active', name: '2. Excavation Active', id: 'phase-2',
    operatingMode: 'excavating',
    telemetry: { rpm: 1800, hydraulic: 240, temp: 84, fuel: 74, seatbelt: true, engineLoad: 82 },
    dynamicTargets: [{ id: 'd1', type: 'human', label: 'Worker A', distanceM: 12, angle: 45 }],
    staticTargets: [
      { id: 's1', type: 'fuel_station', label: 'Fuel Bunk A', distanceKm: 1.4, category: 'fuel' },
    ],
    taskProgress: { elapsedMin: 22, progressPct: 18 },
    logCategory: 'TASK', logMessage: 'Excavation active — RPM 1800, hydraulic pressure nominal.', logSeverity: 'INFO',
  },
  {
    label: 'Proximity Alert', name: '3. Proximity Alert', id: 'phase-3',
    operatingMode: 'excavating',
    telemetry: { rpm: 1650, hydraulic: 235, temp: 85, fuel: 68, seatbelt: true, engineLoad: 79 },
    dynamicTargets: [{ id: 'd1', type: 'human', label: 'Worker A', distanceM: 3.2, angle: 30 }],
    staticTargets: [
      { id: 's1', type: 'fuel_station', label: 'Fuel Bunk A', distanceKm: 1.4, category: 'fuel' },
    ],
    taskProgress: { elapsedMin: 45, progressPct: 37 },
    logCategory: 'SAFETY', logMessage: 'PROXIMITY BREACH — Worker detected at 3.2m. Machine halted.', logSeverity: 'CRITICAL',
  },
  {
    label: 'High Load Operation', name: '4. High Load Operation', id: 'phase-4',
    operatingMode: 'excavating',
    telemetry: { rpm: 2100, hydraulic: 288, temp: 94, fuel: 55, seatbelt: true, engineLoad: 96 },
    dynamicTargets: [],
    staticTargets: [
      { id: 's1', type: 'fuel_station', label: 'Fuel Bunk A', distanceKm: 1.4, category: 'fuel' },
    ],
    taskProgress: { elapsedMin: 70, progressPct: 58 },
    logCategory: 'SAFETY', logMessage: 'HIGH ENGINE LOAD — RPM 2100, hydraulic 288 bar. Reduce load.', logSeverity: 'WARNING',
  },
  {
    label: 'Low Fuel Warning', name: '5. Low Fuel Warning', id: 'phase-5',
    operatingMode: 'excavating',
    telemetry: { rpm: 1600, hydraulic: 220, temp: 82, fuel: 18, seatbelt: true, engineLoad: 74 },
    dynamicTargets: [],
    staticTargets: [
      { id: 's1', type: 'fuel_station', label: 'Fuel Bunk A', distanceKm: 1.4, category: 'fuel' },
    ],
    taskProgress: { elapsedMin: 95, progressPct: 79 },
    logCategory: 'FUEL', logMessage: 'LOW FUEL — 18% remaining (73.8L). Refuel at Bunk A (1.4km).', logSeverity: 'WARNING',
  },
  {
    label: 'Task Complete', name: '6. Task Complete', id: 'phase-6',
    operatingMode: 'idle',
    telemetry: { rpm: 700, hydraulic: 140, temp: 78, fuel: 14, seatbelt: true, engineLoad: 30 },
    dynamicTargets: [],
    staticTargets: [
      { id: 's1', type: 'fuel_station', label: 'Fuel Bunk A', distanceKm: 1.4, category: 'fuel' },
    ],
    taskProgress: { elapsedMin: 118, progressPct: 100 },
    logCategory: 'TASK', logMessage: 'Task complete — Deep Trenching Pipeline B finished. 118 min.', logSeverity: 'INFO',
  },
];
