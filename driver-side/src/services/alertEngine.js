// alertEngine.js — Headless alert engine; runs every render tick
const PROXIMITY_THRESHOLD_M = 5;
const FUEL_CRITICAL_PCT      = 15;
const FUEL_LOW_PCT           = 25;

const ENGINE_TEMP_CRITICAL_C = 95;
const HYDRAULIC_CRITICAL_BAR = 280;
const TILT_CRITICAL_DEG      = 15;

export function runAlertEngineTick({ dynamicTargets = [], fuelState = {}, telemetry = {}, operatingMode = '', injectedFaults = [] }) {
  const alerts = [];

  // Proximity check
  const breachTarget = dynamicTargets.find(t => t.type === 'human' && t.distanceM < PROXIMITY_THRESHOLD_M);
  const proximityTriggered = !!breachTarget;
  if (proximityTriggered) {
    alerts.push({
      type: 'PROXIMITY_BREACH',
      severity: 'critical',
      message: `Worker detected at ${breachTarget.distanceM}m — stop immediately!`,
    });
  }

  // Fuel check
  const { fuelLevelPct = 100, tankCapacityL = 410, hourlyConsumptionL = 18.5,
          distanceToBunkKm = 1.4, travelSpeedKmh = 5 } = fuelState;
  const fuelAvailableL = (fuelLevelPct / 100) * tankCapacityL;
  const rangeKm        = (fuelAvailableL / hourlyConsumptionL) * travelSpeedKmh;
  const canReachBunk   = rangeKm >= distanceToBunkKm;
  const fuelTriggered  = fuelLevelPct <= FUEL_LOW_PCT;
  const runoutTimeMin  = (fuelAvailableL / hourlyConsumptionL) * 60;                 // how long the tank lasts at this burn rate
  const travelTimeMin  = travelSpeedKmh > 0 ? (distanceToBunkKm / travelSpeedKmh) * 60 : Infinity;   // time to reach the fuel bunk


  if (!canReachBunk) {
    alerts.push({ type: 'FUEL_UNREACHABLE', severity: 'critical', message: `Fuel lasts ${rangeKm.toFixed(1)} km but the bunk is ${distanceToBunkKm} km away.` });
  }
  if (fuelLevelPct <= FUEL_CRITICAL_PCT) {
    alerts.push({ type: 'FUEL_CRITICAL', severity: 'critical', message: `Critical fuel: ${fuelLevelPct}%. Range ${rangeKm.toFixed(1)}km.` });
  } else if (fuelTriggered) {
    alerts.push({ type: 'FUEL_LOW', severity: 'warning', message: `Low fuel: ${fuelLevelPct}%. Refuel soon.` });
  }

  // Machine hazards
  if ((telemetry.tilt ?? 0) > TILT_CRITICAL_DEG || operatingMode === 'slope_alert') {
    alerts.push({ type: 'SLOPE', severity: 'critical', message: `Machine tilt ${(telemetry.tilt ?? 0).toFixed(1)}° exceeds ${TILT_CRITICAL_DEG}° limit.` });
  }
  if ((telemetry.temp ?? 0) > ENGINE_TEMP_CRITICAL_C) {
    alerts.push({ type: 'OVERHEAT', severity: 'critical', message: `Engine coolant ${telemetry.temp}°C exceeds ${ENGINE_TEMP_CRITICAL_C}°C.` });
  }
  if ((telemetry.hydraulic ?? 0) > HYDRAULIC_CRITICAL_BAR) {
    alerts.push({ type: 'HIGH_PRESSURE', severity: 'warning', message: `Hydraulic pressure ${telemetry.hydraulic} bar above ${HYDRAULIC_CRITICAL_BAR} bar.` });
  }

  if (telemetry.seatbelt === false && ['travelling', 'digging', 'excavating'].includes(operatingMode)) {
    alerts.push({ type: 'SEATBELT_VIOLATION', severity: 'critical', message: 'Machine moving with the seatbelt unfastened.' });
  }
  if ((telemetry.rpm ?? 0) >= 2200 && (telemetry.temp ?? 99) < 50) {
    alerts.push({ type: 'COLD_START', severity: 'warning', message: `${telemetry.rpm} RPM on a cold engine.` });
  }

  // Defects on specific machine parts — the simulator marks each one with a red spot where it is.
  // Parts: engine, cooling, hydraulics, fuel, undercarriage, cab, boom, bucket.
  const faults = [];
  const fuelPct = fuelState.fuelLevelPct ?? 100;
  if ((telemetry.rpm ?? 0) >= 2200 || ((telemetry.rpm ?? 0) > 0 && telemetry.rpm < 650)) faults.push({ part: 'engine', severity: 'critical', label: `Engine speed out of range (${telemetry.rpm} rpm)` });
  if ((telemetry.temp ?? 0) > ENGINE_TEMP_CRITICAL_C) faults.push({ part: 'cooling', severity: 'critical', label: `Coolant ${telemetry.temp}°C — radiator/cooling system` });
  if ((telemetry.hydraulic ?? 0) > HYDRAULIC_CRITICAL_BAR) faults.push({ part: 'hydraulics', severity: 'warning', label: `Hydraulic pressure ${telemetry.hydraulic} bar` });
  if (fuelPct <= FUEL_CRITICAL_PCT) faults.push({ part: 'fuel', severity: 'critical', label: `Fuel tank ${fuelPct}%` });
  if ((telemetry.tilt ?? 0) > TILT_CRITICAL_DEG || operatingMode === 'slope_alert') faults.push({ part: 'undercarriage', severity: 'critical', label: 'Chassis tilt over the limit' });
  if (telemetry.seatbelt === false) faults.push({ part: 'cab', severity: 'critical', label: 'Seatbelt unfastened' });
  for (const f of injectedFaults) {
    faults.push(f);
    alerts.push({ type: 'MACHINE_FAULT', severity: f.severity, message: f.label });
  }

  const isCritical  = alerts.some(a => a.severity === 'critical');
  const hasAlerts   = alerts.length > 0;

  return {
    alerts,
    isCritical,
    hasAlerts,
    faults,
    proximity: { triggered: proximityTriggered, target: breachTarget || null },
    fuel: {
      triggered: fuelTriggered,
      metrics: { fuelLevelPct, fuelAvailableL: fuelAvailableL.toFixed(1), rangeKm: rangeKm.toFixed(1), canReachBunk, distanceToBunkKm, runoutTimeMin, travelTimeMin, bufferMin: runoutTimeMin - travelTimeMin },
    },
  };
}
