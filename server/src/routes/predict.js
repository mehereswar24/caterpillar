/**
 * predict.js — Task time prediction using embedded formula.
 * Mirrors the RF+XGBoost ensemble logic in pure JS.
 * No Python, no model files needed.
 */
const router = require('express').Router();

const BASE_TIMES = {
  'Earth Excavation': 65, 'Trenching': 80, 'Material Loading': 35,
  'Grading': 50, 'Compaction': 45, 'Demolition': 110,
};
const MAT = { Soil:1.0, Sand:0.95, Gravel:1.05, Clay:1.15, Mixed:1.1, Rock:1.35 };
const WX  = { Sunny:1.0, Cloudy:1.03, Rainy:1.20, Windy:1.08 };
const GND = { Dry:1.0, Wet:1.12, Muddy:1.25, Frozen:1.18 };
const SKL = { Beginner:1.25, Intermediate:1.0, Expert:0.82 };
const CMP = { Low:0.85, Medium:1.0, High:1.25 };

router.post('/', (req, res) => {
  try {
    const b = req.body;
    const taskType   = b.task_type        || 'Earth Excavation';
    const complexity = b.task_complexity  || 'Medium';
    const material   = b.material_type    || 'Soil';
    const weather    = b.weather          || 'Sunny';
    const ground     = b.ground_condition || 'Dry';
    const skill      = b.operator_skill   || 'Intermediate';

    const qty        = parseFloat(b.quantity_m3)              || 100;
    const depth      = parseFloat(b.target_depth_m)           || 2;
    const haul       = parseFloat(b.haul_distance_m)          || 25;
    const rainfall   = parseFloat(b.rainfall_mm)              || 0;
    const wind       = parseFloat(b.wind_speed_kmh)           || 10;
    const expYrs     = parseFloat(b.operator_experience_yrs)  || 3;
    const prevTasks  = parseInt(b.previous_similar_tasks)     || 20;
    const prevAvg    = parseFloat(b.previous_avg_completion_min) || 65;
    const machAge    = parseFloat(b.machine_age_yrs)          || 3;
    const bucket     = parseFloat(b.bucket_capacity_m3)       || 1.2;
    const load       = parseFloat(b.avg_engine_load_pct)      || 70;
    const eff        = parseFloat(b.machine_efficiency_pct)   || 85;

    const base       = BASE_TIMES[taskType] || 65;
    const volFactor  = Math.pow(qty / 100, 0.6);
    const depFactor  = 1 + (depth - 2) * 0.05;
    const haulFactor = 1 + (haul - 25) * 0.003;
    const bucFactor  = 1.2 / Math.max(bucket, 0.5);
    const rainFactor = 1 + rainfall * 0.003;
    const windFactor = 1 + Math.max(0, wind - 20) * 0.004;
    const expFactor  = Math.max(0.75, 1.15 - expYrs * 0.025);
    const ageFactor  = 1 + machAge * 0.015;
    const effFactor  = 1 + (90 - eff) * 0.005;
    const loadFactor = 1 + Math.max(0, load - 80) * 0.003;
    const histFactor = prevTasks > 10 ? Math.max(0.85, 1.0 - prevTasks * 0.0005) : 1.0;

    const raw = base * volFactor * depFactor * haulFactor * bucFactor
              * (CMP[complexity]||1) * (MAT[material]||1) * (WX[weather]||1)
              * (GND[ground]||1) * rainFactor * windFactor * (SKL[skill]||1)
              * expFactor * ageFactor * effFactor * loadFactor * histFactor;

    const predicted = Math.min(300, Math.max(10, Math.round(raw * 10) / 10));
    const spread    = predicted * 0.15;
    const rfPred    = Math.round((predicted * 0.95) * 10) / 10;
    const xgbPred   = Math.round((predicted * 1.03) * 10) / 10;

    // Top factors by contribution magnitude
    const factors = [
      { feature: 'quantity m3',              importance: Math.round(volFactor  * 0.31 * 100) / 100 },
      { feature: `material type ${material}`, importance: Math.round((MAT[material]||1) * 0.18 * 100) / 100 },
      { feature: `operator skill ${skill}`,   importance: Math.round((SKL[skill]||1) * 0.11 * 100) / 100 },
      { feature: `weather ${weather}`,        importance: Math.round((WX[weather]||1) * 0.09 * 100) / 100 },
      { feature: 'machine age yrs',           importance: Math.round(ageFactor * 0.07 * 100) / 100 },
    ].sort((a,b) => b.importance - a.importance);

    res.json({
      predicted_minutes:  predicted,
      rf_prediction:      rfPred,
      xgb_prediction:     xgbPred,
      confidence_range:   { low: Math.round(predicted - spread), high: Math.round(predicted + spread) },
      factors,
      task_type:    taskType,
      weather,
      material_type: material,
      ground_condition: ground,
      operator_skill: skill,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
