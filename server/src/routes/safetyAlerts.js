const router  = require('express').Router();
const { spawnSync } = require('child_process');
const path    = require('path');
const fs      = require('fs');

const PYTHON    = process.env.PYTHON_PATH || 'python';
const MODEL_DIR = path.join(__dirname, '../../../model');
const DATA_DIR  = path.join(MODEL_DIR, 'data');

function readCSV(file) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return [];
  const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = vals[i]?.trim());
    return obj;
  });
}

// GET /api/safety-alerts  ?machine_id=&operator_id=&severity=&limit=50
router.get('/', (req, res) => {
  try {
    const db = req.app.get('db');
    const { machine_id, operator_id, severity, limit = 50 } = req.query;

    // Pull from SQLite (persisted alerts) first
    const dbParams = [machine_id, operator_id, severity].filter(Boolean);
    dbParams.push(parseInt(limit));
    let dbAlerts = db.prepare(`
      SELECT * FROM alerts
      WHERE acknowledged = 0
      ${machine_id  ? "AND machine_id  = ?" : ""}
      ${operator_id ? "AND operator_id = ?" : ""}
      ${severity    ? "AND severity    = ?" : ""}
      ORDER BY created_at DESC LIMIT ?
    `).all(...dbParams);

    // Also generate fresh rule-based alerts from latest logs
    const logs = readCSV('machine_logs.csv').slice(-20);
    const freshAlerts = [];

    logs.forEach(row => {
      if (machine_id  && row.machine_id  !== machine_id)  return;
      if (operator_id && row.operator_id !== operator_id) return;

      const idle  = parseInt(row.idle_time_min  || 0);
      const act   = parseInt(row.active_time_min || 1);
      const ratio = idle / (idle + act);

      if (row.seatbelt === 'unfastened' && parseFloat(row.speed_kph) > 1)
        freshAlerts.push({ type:'SEATBELT_VIOLATION', severity:'critical', machine_id: row.machine_id, operator_id: row.operator_id, reason:'Seatbelt unfastened while moving', action:'Stop immediately', acknowledged: 0, created_at: row.timestamp });
      if (parseInt(row.proximity_alert) === 1)
        freshAlerts.push({ type:'PROXIMITY_BREACH', severity:'critical', machine_id: row.machine_id, operator_id: row.operator_id, reason:'Worker in exclusion zone', action:'Halt all movement', acknowledged: 0, created_at: row.timestamp });
      if (parseFloat(row.tilt_angle) > 15)
        freshAlerts.push({ type:'SLOPE_INSTABILITY', severity:'critical', machine_id: row.machine_id, operator_id: row.operator_id, reason:`Tilt ${row.tilt_angle}°`, action:'Lower boom, move to flat ground', acknowledged: 0, created_at: row.timestamp });
      if (parseInt(row.rpm) > 2100)
        freshAlerts.push({ type:'OVER_REV', severity:'high', machine_id: row.machine_id, operator_id: row.operator_id, reason:`RPM ${row.rpm}`, action:'Reduce throttle', acknowledged: 0, created_at: row.timestamp });
      if (parseFloat(row.hydraulic_pressure) > 270)
        freshAlerts.push({ type:'HIGH_HYDRAULIC_PRESSURE', severity:'high', machine_id: row.machine_id, operator_id: row.operator_id, reason:`${row.hydraulic_pressure} bar`, action:'Reduce load', acknowledged: 0, created_at: row.timestamp });
      if (ratio > 0.5)
        freshAlerts.push({ type:'EXCESSIVE_IDLE', severity:'medium', machine_id: row.machine_id, operator_id: row.operator_id, reason:`Idle ratio ${(ratio*100).toFixed(0)}%`, action:'Shut down if no task scheduled', acknowledged: 0, created_at: row.timestamp });
    });

    const all = [...freshAlerts.slice(0, 10), ...dbAlerts];
    res.json({ count: all.length, alerts: all });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
