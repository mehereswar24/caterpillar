// radarTargets.js — Compute ETAs and display strings for static targets
const formatDistance = (km) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

export function computeStaticTargetsWithETA(targets = [], travelSpeedKmh = 5) {
  return targets.map(t => {
    const etaMin = travelSpeedKmh > 0 ? (t.distanceKm / travelSpeedKmh) * 60 : null;
    return {
      ...t,
      etaMin: etaMin === null ? null : Math.round(etaMin),
      displayDistance: formatDistance(t.distanceKm),
      etaDisplay: etaMin === null ? '—' : `${etaMin < 10 ? etaMin.toFixed(1) : Math.round(etaMin)} min`,
    };
  });
}
