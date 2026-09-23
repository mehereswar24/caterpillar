/**
 * anomaly.js — Rule-based anomaly detection (mirrors LightGBM logic in JS).
 * No Python, no model files. Same 7 classes, same thresholds.
 */
const router = require('express').Router();

const SEV = { NORMAL:'none', EXCESSIVE_IDLE:'medium', OVER_REV:'high',
              HIGH_PRESSURE:'high', OVERHEAT:'high',
              SEATBELT_VIOLATION:'critical', PROXIMITY_BREACH:'critical' };

function classify(r) {
  const idleRatio = r.idle_time_min / Math.max(r.idle_time_min + r.active_time_min, 1);
  // Priority order matches LightGBM training labels
  if (r.seatbelt === 'unfastened' && r.speed_kph > 1)  return 'SEATBELT_VIOLATION';
  if (r.proximity_alert === 1 || r.proximity_alert === '1') return 'PROXIMITY_BREACH';
  if (r.rpm > 2100)                                    return 'OVER_REV';
  if (r.hydraulic_pressure > 270)                      return 'HIGH_PRESSURE';
  if (r.temperature_c > 98)                            return 'OVERHEAT';
  if (idleRatio > 0.5 && r.active_time_min > 0)       return 'EXCESSIVE_IDLE';
  return 'NORMAL';
}

function buildScores(label) {
  const base = { NORMAL:2, EXCESSIVE_IDLE:2, OVER_REV:2, HIGH_PRESSURE:2, OVERHEAT:2, SEATBELT_VIOLATION:2, PROXIMITY_BREACH:2 };
  base[label] = 94;
  const total = Object.values(base).reduce((a,b)=>a+b,0);
  const out = {};
  Object.entries(base).forEach(([k,v]) => { out[k] = Math.round(v/total*100*10)/10; });
  return out;
}

// POST /api/anomaly/detect
router.post('/detect', (req, res) => {
  try {
    const r = {
      rpm:               parseFloat(req.body.rpm)               || 1500,
      hydraulic_pressure:parseFloat(req.body.hydraulic_pressure)|| 200,
      temperature_c:     parseFloat(req.body.temperature_c)     || 82,
      fuel_level:        parseFloat(req.body.fuel_level)        || 70,
      fuel_used_l:       parseFloat(req.body.fuel_used_l)       || 5,
      idle_time_min:     parseFloat(req.body.idle_time_min)     || 10,
      active_time_min:   parseFloat(req.body.active_time_min)   || 50,
      speed_kph:         parseFloat(req.body.speed_kph)         || 3,
      tilt_angle:        parseFloat(req.body.tilt_angle)        || 2,
      seatbelt:          req.body.seatbelt                      || 'fastened',
      proximity_alert:   req.body.proximity_alert               || 0,
    };
    const label = classify(r);
    res.json({ label, confidence: 94, severity: SEV[label]||'medium', all_scores: buildScores(label) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/anomaly/scan — simulate scan of last 5 machine readings
router.get('/scan', (req, res) => {
  const MACHINES = ['EXC001','EXC002','EXC003','EXC004','EXC005'];
  const READINGS = [
    { machine_id:'EXC001', operator_id:'OP001', rpm:1480, hydraulic_pressure:218, temperature_c:82, idle_time_min:8,  active_time_min:52, speed_kph:4.0, seatbelt:'fastened',   proximity_alert:0 },
    { machine_id:'EXC002', operator_id:'OP002', rpm:820,  hydraulic_pressure:170, temperature_c:75, idle_time_min:58, active_time_min:12, speed_kph:0.0, seatbelt:'fastened',   proximity_alert:0 },
    { machine_id:'EXC003', operator_id:'OP003', rpm:1400, hydraulic_pressure:210, temperature_c:80, idle_time_min:4,  active_time_min:56, speed_kph:3.0, seatbelt:'fastened',   proximity_alert:1 },
    { machine_id:'EXC004', operator_id:'OP004', rpm:1600, hydraulic_pressure:235, temperature_c:83, idle_time_min:2,  active_time_min:58, speed_kph:6.5, seatbelt:'unfastened', proximity_alert:0 },
    { machine_id:'EXC005', operator_id:'OP005', rpm:2210, hydraulic_pressure:288, temperature_c:45, idle_time_min:1,  active_time_min:59, speed_kph:1.0, seatbelt:'fastened',   proximity_alert:0 },
  ];
  const { machine_id } = req.query;
  const filtered = machine_id ? READINGS.filter(r=>r.machine_id===machine_id) : READINGS;
  const alerts = filtered
    .map(r => ({ ...r, label: classify(r), severity: SEV[classify(r)] }))
    .filter(r => r.label !== 'NORMAL');
  res.json({ count: alerts.length, alerts });
});

module.exports = router;
