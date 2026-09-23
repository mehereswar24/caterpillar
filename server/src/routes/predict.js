const router = require('express').Router();
const { spawnSync } = require('child_process');
const path = require('path');

const PYTHON    = process.env.PYTHON_PATH || 'python3';
const MODEL_DIR = path.join(__dirname, '../../../model');

// POST /api/predict
router.post('/', (req, res) => {
  try {
    const payload = {
      task_type:       req.body.task_type       || 'dig',
      weather:         req.body.weather         || 'sunny',
      soil_type:       req.body.soil_type       || 'sand',
      operator_skill:  req.body.operator_skill  || 'mid',
      machine_age_yrs: req.body.machine_age_yrs || 3,
      load_weight_t:   req.body.load_weight_t   || 10,
    };

    // Try python3 first, fall back to python
    let result = spawnSync(
      PYTHON,
      [path.join(MODEL_DIR, 'predictor.py'), 'predict', JSON.stringify(payload)],
      { encoding: 'utf8', timeout: 30000 }
    );

    if (result.error || result.status !== 0) {
      const fallback = PYTHON === 'python3' ? 'python' : 'python3';
      result = spawnSync(
        fallback,
        [path.join(MODEL_DIR, 'predictor.py'), 'predict', JSON.stringify(payload)],
        { encoding: 'utf8', timeout: 30000 }
      );
    }

    const prediction = JSON.parse(result.stdout.trim());
    res.json(prediction);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
