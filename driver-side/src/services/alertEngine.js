// alertEngine.js — Headless alert engine; runs every render tick
const PROXIMITY_THRESHOLD_M = 5;
const FUEL_CRITICAL_PCT      = 15;
const FUEL_LOW_PCT           = 25;

export function runAlertEngineTick({ dynamicTargets = [], fuelState = {} }) {
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

  if (fuelLevelPct <= FUEL_CRITICAL_PCT) {
    alerts.push({ type: 'FUEL_CRITICAL', severity: 'critical', message: `Critical fuel: ${fuelLevelPct}%. Range ${rangeKm.toFixed(1)}km.` });
  } else if (fuelTriggered) {
    alerts.push({ type: 'FUEL_LOW', severity: 'warning', message: `Low fuel: ${fuelLevelPct}%. Refuel soon.` });
  }

  const isCritical  = alerts.some(a => a.severity === 'critical');
  const hasAlerts   = alerts.length > 0;

  return {
    alerts,
    isCritical,
    hasAlerts,
    proximity: { triggered: proximityTriggered, target: breachTarget || null },
    fuel: {
      triggered: fuelTriggered,
      metrics: { fuelLevelPct, fuelAvailableL: fuelAvailableL.toFixed(1), rangeKm: rangeKm.toFixed(1), canReachBunk, distanceToBunkKm },
    },
  };
}
