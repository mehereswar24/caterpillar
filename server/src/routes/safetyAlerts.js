/**
 * safetyAlerts.js — Rule-based alerts from SQLite + live telemetry simulation.
 * No CSV, no Python, no MODEL_DIR.
 */
const router = require('express').Router();

// Simulate live readings for 5 machines
const LIVE = [
  { machine_id:'EXC001', operator_id:'OP001', rpm:1480, hydraulic_pressure:218, tilt_angle:2.1,  idle_time_min:8,  active_time_min:52, speed_kph:4.0, seatbelt:'fastened',   proximity_alert:0 },
  { machine_id:'EXC002', operator_id:'OP002', rpm:820,  hydraulic_pressure:170, tilt_angle:0.5,  idle_time_min:58, active_time_min:12, speed_kph:0.0, seatbelt:'fastened',   proximity_alert:0 },
  { machine_id:'EXC003', operator_id:'OP003', rpm:1400, hydraulic_pressure:210, tilt_angle:2.0,  idle_time_min:4,  active_time_min:56, speed_kph:3.0, seatbelt:'fastened',   proximity_alert:1 },
  { machine_id:'EXC004', operator_id:'OP004', rpm:1600, hydraulic_pressure:235, tilt_angle:3.0,  idle_time_min:2,  active_time_min:58, speed_kph:6.5, seatbelt:'unfastened', proximity_alert:0 },
  { machine_id:'EXC005', operator_id:'OP005', rpm:2210, hydraulic_pressure:288, tilt_angle:1.0,  idle_time_min:1,  active_time_min:59, speed_kph:1.0, seatbelt:'fastened',   proximity_alert:0 },
];

function evalRow(row) {
  const alerts = [];
  const ratio  = row.idle_time_min / Math.max(row.idle_time_min + row.active_time_min, 1);
  const ts     = new Date().toISOString();
  if (row.seatbelt === 'unfastened' && row.speed_kph > 1)
    alerts.push({ type:'SEATBELT_VIOLATION',    severity:'critical', machine_id:row.machine_id, operator_id:row.operator_id, reason:'Seatbelt unfastened while moving', action:'Stop immediately', acknowledged:0, created_at:ts });
  if (row.proximity_alert === 1)
    alerts.push({ type:'PROXIMITY_BREACH',      severity:'critical', machine_id:row.machine_id, operator_id:row.operator_id, reason:'Worker detected in exclusion zone', action:'Halt all movement', acknowledged:0, created_at:ts });
  if (row.tilt_angle > 15)
    alerts.push({ type:'SLOPE_INSTABILITY',     severity:'critical', machine_id:row.machine_id, operator_id:row.operator_id, reason:`Tilt ${row.tilt_angle}°`, action:'Lower boom immediately', acknowledged:0, created_at:ts });
  if (row.rpm > 2100)
    alerts.push({ type:'OVER_REV',              severity:'high',     machine_id:row.machine_id, operator_id:row.operator_id, reason:`Engine RPM ${row.rpm}`, action:'Reduce throttle', acknowledged:0, created_at:ts });
  if (row.hydraulic_pressure > 270)
    alerts.push({ type:'HIGH_HYDRAULIC_PRESSURE',severity:'high',   machine_id:row.machine_id, operator_id:row.operator_id, reason:`Hydraulic ${row.hydraulic_pressure} bar`, action:'Reduce load', acknowledged:0, created_at:ts });
  if (ratio > 0.5)
    alerts.push({ type:'EXCESSIVE_IDLE',        severity:'medium',   machine_id:row.machine_id, operator_id:row.operator_id, reason:`Idle ratio ${(ratio*100).toFixed(0)}%`, action:'Shut down engine', acknowledged:0, created_at:ts });
  return alerts;
}

router.get('/', (req, res) => {
  try {
    const db = req.app.get('db');
    const { machine_id, operator_id, severity, limit = 50 } = req.query;

    // Live rule-based alerts
    let fresh = LIVE.flatMap(evalRow);
    if (machine_id)  fresh = fresh.filter(a => a.machine_id  === machine_id);
    if (operator_id) fresh = fresh.filter(a => a.operator_id === operator_id);
    if (severity)    fresh = fresh.filter(a => a.severity    === severity);

    // Persisted alerts from SQLite
    const dbParams = [machine_id, operator_id, severity].filter(Boolean);
    dbParams.push(parseInt(limit));
    const dbAlerts = db.prepare(`
      SELECT * FROM alerts WHERE acknowledged=0
      ${machine_id  ? 'AND machine_id=?'  : ''}
      ${operator_id ? 'AND operator_id=?' : ''}
      ${severity    ? 'AND severity=?'    : ''}
      ORDER BY created_at DESC LIMIT ?
    `).all(...dbParams);

    const all = [...fresh, ...dbAlerts].slice(0, parseInt(limit));
    res.json({ count: all.length, alerts: all });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
