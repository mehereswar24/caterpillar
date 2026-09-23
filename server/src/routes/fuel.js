/**
 * fuel.js — Fuel sufficiency check with GPS range calculation.
 * Mirrors LightGBM fuel classifier + regressor logic in pure JS.
 * 
 * POST /api/fuel/check   — full analysis
 * GET  /api/fuel/status  — quick status for dashboard alert
 */
const router = require('express').Router();

const TANK_CAPACITY    = 410;   // CAT 320 litres
const BASE_CONSUMPTION = 18.5;  // litres/hour
const AVG_SPEED_KMH    = 8.5;   // avg travel speed for range calc
const RESERVE_PCT      = 0.10;  // 10% reserve

// Nearest CAT fuel stations (lat/lon) — demo data for 5 major cities
const FUEL_STATIONS = [
  { name: 'CAT Dealer - Hyderabad Central',  lat: 17.3850, lon: 78.4867, dist_km: null },
  { name: 'CAT Dealer - Hyderabad West',     lat: 17.4400, lon: 78.3800, dist_km: null },
  { name: 'CAT Dealer - Secunderabad',       lat: 17.4399, lon: 78.4983, dist_km: null },
  { name: 'CAT Dealer - Bangalore',          lat: 12.9716, lon: 77.5946, dist_km: null },
  { name: 'CAT Dealer - Chennai',            lat: 13.0827, lon: 80.2707, dist_km: null },
];

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function calcConsumption({ engine_load_pct=75, temperature_c=28, ground_condition='Dry', task_type='Earth Excavation' }) {
  const loadFactor   = 0.8 + (engine_load_pct / 100) * 0.6;
  const tempFactor   = 1.0 + Math.max(0, temperature_c - 35) * 0.008;
  const groundFactor = { Dry:1.0, Wet:1.08, Muddy:1.18, Frozen:1.12 }[ground_condition] || 1.0;
  const taskFactor   = { 'Earth Excavation':1.1, Trenching:1.15, 'Material Loading':0.95,
                          Grading:1.0, Compaction:0.90, Demolition:1.25 }[task_type] || 1.0;
  return parseFloat((BASE_CONSUMPTION * loadFactor * tempFactor * groundFactor * taskFactor).toFixed(2));
}

// POST /api/fuel/check
router.post('/check', (req, res) => {
  const {
    fuel_level_pct,
    task_duration_est_min,
    engine_load_pct    = 75,
    temperature_c      = 28,
    ground_condition   = 'Dry',
    task_type          = 'Earth Excavation',
    operator_lat       = 17.3850,
    operator_lon       = 78.4867,
  } = req.body;

  if (fuel_level_pct === undefined || task_duration_est_min === undefined) {
    return res.status(400).json({ error: 'fuel_level_pct and task_duration_est_min are required' });
  }

  const fuel_available_l   = parseFloat(((fuel_level_pct / 100) * TANK_CAPACITY).toFixed(1));
  const consumption        = calcConsumption({ engine_load_pct, temperature_c, ground_condition, task_type });
  const task_dur_hr        = task_duration_est_min / 60;
  const fuel_needed_l      = parseFloat((consumption * task_dur_hr).toFixed(1));
  const reserve_l          = parseFloat((TANK_CAPACITY * RESERVE_PCT).toFixed(1));
  const fuel_after_l       = parseFloat(Math.max(0, fuel_available_l - fuel_needed_l).toFixed(1));
  const fuel_after_pct     = parseFloat(((fuel_after_l / TANK_CAPACITY) * 100).toFixed(1));
  const range_km           = parseFloat(((fuel_available_l / consumption) * AVG_SPEED_KMH).toFixed(1));
  const can_complete       = fuel_available_l >= (fuel_needed_l + reserve_l);

  // GPS: find nearest station
  const stations = FUEL_STATIONS.map(s => ({
    ...s,
    dist_km: parseFloat(haversine(operator_lat, operator_lon, s.lat, s.lon).toFixed(2))
  })).sort((a, b) => a.dist_km - b.dist_km);

  const nearest            = stations[0];
  const can_reach_station  = range_km >= nearest.dist_km;

  // Risk level
  let risk, alert, recommendation;
  if (!can_complete && !can_reach_station) {
    risk           = 'CRITICAL';
    alert          = true;
    recommendation = `CRITICAL: Only ${fuel_level_pct}% fuel (${fuel_available_l}L). Cannot complete task (needs ${fuel_needed_l}L) and range (${range_km}km) is less than nearest station (${nearest.dist_km}km). Refuel immediately before proceeding.`;
  } else if (!can_complete) {
    risk           = 'HIGH';
    alert          = true;
    recommendation = `Insufficient fuel to complete task. Needs ${fuel_needed_l}L but only ${fuel_available_l}L available. Nearest station: ${nearest.name} (${nearest.dist_km}km, within range). Refuel before starting.`;
  } else if (fuel_after_pct < 15) {
    risk           = 'MEDIUM';
    alert          = true;
    recommendation = `Task can complete but fuel will drop to ${fuel_after_pct}% (${fuel_after_l}L). Plan refuel immediately after. Nearest: ${nearest.name} (${nearest.dist_km}km).`;
  } else {
    risk           = 'LOW';
    alert          = false;
    recommendation = `Sufficient fuel. ${fuel_after_pct}% (${fuel_after_l}L) remaining after task. Next refuel recommended within ${Math.floor(fuel_after_l / consumption)}h of operation.`;
  }

  res.json({
    // Fuel state
    fuel_level_pct,
    fuel_available_l,
    fuel_needed_l,
    fuel_after_task_l:   fuel_after_l,
    fuel_after_task_pct: fuel_after_pct,
    reserve_l,
    consumption_l_per_hour: consumption,
    // Range
    range_km,
    // Task sufficiency
    can_complete_task:   can_complete,
    can_reach_station,
    // Station
    nearest_station: {
      name:    nearest.name,
      dist_km: nearest.dist_km,
      within_range: can_reach_station,
    },
    all_stations: stations.slice(0, 3),
    // Alert
    risk_level:      risk,
    alert,
    recommendation,
    // Input echo
    task_type,
    task_duration_est_min,
    ground_condition,
  });
});

// GET /api/fuel/status?fuel_level_pct=18&task_duration_est_min=120
router.get('/status', (req, res) => {
  const fuel_level_pct       = parseFloat(req.query.fuel_level_pct || 80);
  const task_duration_est_min = parseFloat(req.query.task_duration_est_min || 60);
  const engine_load_pct      = parseFloat(req.query.engine_load_pct || 75);
  const temperature_c        = parseFloat(req.query.temperature_c || 28);
  const ground_condition     = req.query.ground_condition || 'Dry';
  const task_type            = req.query.task_type || 'Earth Excavation';

  const fuel_available_l = parseFloat(((fuel_level_pct / 100) * TANK_CAPACITY).toFixed(1));
  const consumption      = calcConsumption({ engine_load_pct, temperature_c, ground_condition, task_type });
  const fuel_needed_l    = parseFloat((consumption * (task_duration_est_min / 60)).toFixed(1));
  const reserve_l        = TANK_CAPACITY * RESERVE_PCT;
  const can_complete     = fuel_available_l >= (fuel_needed_l + reserve_l);
  const range_km         = parseFloat(((fuel_available_l / consumption) * AVG_SPEED_KMH).toFixed(1));

  let risk = 'LOW', alert = false;
  if (!can_complete) { risk = 'HIGH'; alert = true; }
  if (fuel_level_pct < 15) { risk = 'CRITICAL'; alert = true; }
  else if (fuel_level_pct < 25 && risk === 'LOW') { risk = 'MEDIUM'; alert = true; }

  res.json({
    fuel_level_pct,
    fuel_available_l,
    fuel_needed_l,
    range_km,
    can_complete_task: can_complete,
    risk_level: risk,
    alert,
    message: alert
      ? `⚠️ Fuel alert: ${fuel_level_pct}% fuel. ${can_complete ? 'Low fuel — refuel soon.' : `Insufficient for ${task_duration_est_min}min task (needs ${fuel_needed_l}L).`}`
      : `Fuel OK: ${fuel_level_pct}% (${fuel_available_l}L). Range: ${range_km}km.`,
  });
});

module.exports = router;
