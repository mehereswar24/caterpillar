const router = require('express').Router();
const { spawnSync } = require('child_process');
const path = require('path');

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

// POST /api/maintenance/predict
router.post('/predict', (req, res) => {
  try { res.json(runPython('predict_maintenance.py', req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/maintenance/status?machine_id=EXC001
router.get('/status', (req, res) => {
  try {
    const payload = {
      engine_hours:         parseFloat(req.query.engine_hours || 2000),
      rpm:                  1500,
      hydraulic_pressure:   200,
      temperature_c:        82,
      fuel_level:           70,
      fuel_used_l:          6,
      idle_time_min:        15,
      active_time_min:      55,
      engine_load_pct:      72,
      tilt_angle:           2,
      speed_kph:            3,
      fault_codes:          req.query.fault_codes || 'NONE',
    };
    const result = runPython('predict_maintenance.py', payload);
    res.json({ machine_id: req.query.machine_id || 'EXC001', ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
