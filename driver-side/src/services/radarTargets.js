// radarTargets.js — Compute ETAs for static targets
export function computeStaticTargetsWithETA(targets = [], travelSpeedKmh = 5) {
  return targets.map(t => {
    const etaMin = travelSpeedKmh > 0
      ? Math.round((t.distanceKm / travelSpeedKmh) * 60)
      : null;
    return { ...t, etaMin };
  });
}
