const router = require('express').Router();
const { spawnSync } = require('child_process');
const path = require('path');

const PYTHON    = process.env.PYTHON_PATH || 'python3';
const MODEL_DIR = path.join(__dirname, '../../../model');

// POST /api/predict — RF + XGBoost ensemble
router.post('/', (req, res) => {
  try {
    const payload = {
      task_type:                req.body.task_type                || 'Earth Excavation',
      task_complexity:          req.body.task_complexity          || 'Medium',
      material_type:            req.body.material_type            || 'Soil',
      weather:                  req.body.weather                  || 'Sunny',
      ground_condition:         req.body.ground_condition         || 'Dry',
      operator_skill:           req.body.operator_skill           || 'Intermediate',
      quantity_m3:              req.body.quantity_m3              || 100,
      target_depth_m:           req.body.target_depth_m           || 2,
      haul_distance_m:          req.body.haul_distance_m          || 25,
      temperature_c:            req.body.temperature_c            || 25,
      rainfall_mm:              req.body.rainfall_mm              || 0,
      wind_speed_kmh:           req.body.wind_speed_kmh           || 10,
      operator_experience_yrs:  req.body.operator_experience_yrs  || 3,
      previous_similar_tasks:   req.body.previous_similar_tasks   || 20,
      previous_avg_completion_min: req.body.previous_avg_completion_min || 65,
      machine_age_yrs:          req.body.machine_age_yrs          || 3,
      engine_hours:             req.body.engine_hours             || 2000,
      bucket_capacity_m3:       req.body.bucket_capacity_m3       || 1.2,
      avg_engine_load_pct:      req.body.avg_engine_load_pct      || 70,
      machine_efficiency_pct:   req.body.machine_efficiency_pct   || 85,
    };

    let result = spawnSync(PYTHON,
      [path.join(MODEL_DIR, 'predict_ensemble.py'), JSON.stringify(payload)],
      { encoding: 'utf8', timeout: 30000 });

    if (result.error || result.status !== 0) {
      const fallback = PYTHON === 'python3' ? 'python' : 'python3';
      result = spawnSync(fallback,
        [path.join(MODEL_DIR, 'predict_ensemble.py'), JSON.stringify(payload)],
        { encoding: 'utf8', timeout: 30000 });
    }

    if (result.error) throw result.error;
    const prediction = JSON.parse(result.stdout.trim());
    res.json(prediction);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
