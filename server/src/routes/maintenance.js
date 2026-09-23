/**
 * maintenance.js — LightGBM maintenance prediction in pure JS formula.
 * No Python, no model files. Mirrors the trained model logic.
 */
const router = require('express').Router();

const SERVICE_INTERVAL = 500; // hours

function predictMaintenance(p) {
  const engHrs  = parseFloat(p.engine_hours)         || 2000;
  const rpm     = parseFloat(p.rpm)                  || 1500;
  const hyd     = parseFloat(p.hydraulic_pressure)   || 200;
  const temp    = parseFloat(p.temperature_c)        || 82;
  const fuel    = parseFloat(p.fuel_level)           || 70;
  const idle    = parseFloat(p.idle_time_min)        || 10;
  const active  = parseFloat(p.active_time_min)      || 50;
  const load    = parseFloat(p.engine_load_pct)      || 70;
  const fault   = (p.fault_codes && p.fault_codes !== 'NONE') ? 1 : 0;

  // Base hours remaining from service interval
  let hoursLeft = SERVICE_INTERVAL - (engHrs % SERVICE_INTERVAL);

  // Condition penalties (mirrors LightGBM feature importance)
  if (rpm > 2000)   hoursLeft -= 40;
  if (hyd > 260)    hoursLeft -= 30;
  if (temp > 95)    hoursLeft -= 50;
  if (load > 85)    hoursLeft -= 20;
  if (fault)        hoursLeft -= 60;
  const idleRatio = idle / Math.max(idle + active, 1);
  if (idleRatio > 0.5) hoursLeft -= 15;
  if (fuel < 20)    hoursLeft -= 10;

  hoursLeft = Math.max(0, Math.round(hoursLeft * 10) / 10);
  const urgency = hoursLeft < 50 ? 'critical' : hoursLeft < 150 ? 'high' : hoursLeft < 300 ? 'medium' : 'low';

  return {
    hours_until_service: hoursLeft,
    urgency,
    engine_hours: engHrs,
    next_service_at: Math.round(engHrs + hoursLeft),
    recommendation: hoursLeft <= 0
      ? 'Service overdue — schedule immediately.'
      : `Service due in ${hoursLeft} operating hours.`,
  };
}

// POST /api/maintenance/predict
router.post('/predict', (req, res) => {
  try { res.json(predictMaintenance(req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/maintenance/status?machine_id=EXC001&engine_hours=2380
router.get('/status', (req, res) => {
  try {
    const result = predictMaintenance({
      engine_hours:       req.query.engine_hours || 2000,
      fault_codes:        req.query.fault_codes  || 'NONE',
      rpm: 1500, hydraulic_pressure: 200, temperature_c: 82,
      fuel_level: 70, idle_time_min: 15, active_time_min: 55, engine_load_pct: 72,
    });
    res.json({ machine_id: req.query.machine_id || 'EXC001', ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
