const router = require('express').Router();
const { spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const PYTHON    = process.env.PYTHON_PATH || 'python3';
const MODEL_DIR = path.join(__dirname, '../../../model');

function runPython(script, payload) {
  let result = spawnSync(PYTHON, [path.join(MODEL_DIR, script), JSON.stringify(payload)], { encoding: 'utf8', timeout: 30000 });
  if (result.error || result.status !== 0) {
    const fb = PYTHON === 'python3' ? 'python' : 'python3';
    result = spawnSync(fb, [path.join(MODEL_DIR, script), JSON.stringify(payload)], { encoding: 'utf8', timeout: 30000 });
  }
  if (result.error) throw result.error;
  return JSON.parse(result.stdout.trim());
}

// POST /api/anomaly/detect
router.post('/detect', (req, res) => {
  try { res.json(runPython('predict_anomaly.py', req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/anomaly/scan
router.get('/scan', (req, res) => {
  try {
    const dataPath = path.join(MODEL_DIR, 'data', 'machine_logs.csv');
    if (!fs.existsSync(dataPath)) return res.json({ alerts: [] });
    const lines   = fs.readFileSync(dataPath, 'utf8').trim().split('\n');
    const headers = lines[0].split(',');
    const rows    = lines.slice(-20).map(l => {
      const vals = l.split(','), obj = {};
      headers.forEach((h, i) => obj[h.trim()] = vals[i]?.trim());
      return obj;
    });
    const { machine_id } = req.query;
    const filtered = machine_id ? rows.filter(r => r.machine_id === machine_id) : rows;
    const alerts = [];
    for (const row of filtered.slice(0, 5)) {
      const result = runPython('predict_anomaly.py', {
        rpm: parseFloat(row.rpm), hydraulic_pressure: parseFloat(row.hydraulic_pressure),
        temperature_c: parseFloat(row.temperature_c), fuel_level: parseFloat(row.fuel_level),
        fuel_used_l: parseFloat(row.fuel_used_l), idle_time_min: parseInt(row.idle_time_min),
        active_time_min: parseInt(row.active_time_min), speed_kph: parseFloat(row.speed_kph),
        tilt_angle: parseFloat(row.tilt_angle), engine_load_pct: parseFloat(row.engine_load_pct || 70),
        seatbelt: row.seatbelt, proximity_alert: parseInt(row.proximity_alert || 0),
        weather: row.weather, ground_condition: row.ground_condition,
      });
      if (result.label !== 'NORMAL') alerts.push({ ...result, machine_id: row.machine_id, operator_id: row.operator_id });
    }
    res.json({ count: alerts.length, alerts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
