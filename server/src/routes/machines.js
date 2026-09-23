const router = require('express').Router();
const path = require('path');
const fs   = require('fs');

const DATA_DIR = path.join(__dirname, '../../../model/data');

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

// GET /api/machines  ?machine_id=EXC001
router.get('/', (req, res) => {
  try {
    const logs = readCSV('machine_logs.csv');
    const { machine_id } = req.query;

    const machines = {};
    logs.forEach(r => {
      const id = r.machine_id;
      if (machine_id && id !== machine_id) return;
      if (!machines[id]) {
        machines[id] = {
          machine_id: id,
          total_logs: 0,
          avg_rpm: 0,
          avg_hydraulic: 0,
          avg_temp: 0,
          avg_fuel_used: 0,
          seatbelt_violations: 0,
          proximity_alerts: 0,
          idle_events: 0,
          faults: new Set(),
          latest: null,
        };
      }
      const m = machines[id];
      m.total_logs++;
      m.avg_rpm        += parseFloat(r.rpm || 0);
      m.avg_hydraulic  += parseFloat(r.hydraulic_pressure || 0);
      m.avg_temp       += parseFloat(r.temperature_c || 0);
      m.avg_fuel_used  += parseFloat(r.fuel_used_l || 0);
      if (r.seatbelt === 'unfastened') m.seatbelt_violations++;
      if (parseInt(r.proximity_alert) === 1) m.proximity_alerts++;
      const idle = parseInt(r.idle_time_min || 0);
      const act  = parseInt(r.active_time_min || 1);
      if (idle / (idle + act) > 0.5) m.idle_events++;
      if (r.fault_codes && r.fault_codes !== 'NONE') m.faults.add(r.fault_codes);
      m.latest = r;
    });

    const result = Object.values(machines).map(m => {
      const n = m.total_logs;
      return {
        machine_id: m.machine_id,
        total_logs: n,
        avg_rpm:           Math.round(m.avg_rpm / n),
        avg_hydraulic_bar: Math.round(m.avg_hydraulic / n * 10) / 10,
        avg_temp_c:        Math.round(m.avg_temp / n * 10) / 10,
        avg_fuel_used_l:   Math.round(m.avg_fuel_used / n * 100) / 100,
        seatbelt_violations: m.seatbelt_violations,
        proximity_alerts: m.proximity_alerts,
        idle_events: m.idle_events,
        fault_codes: [...m.faults],
        latest_engine_hours: parseFloat(m.latest?.engine_hours || 0),
        latest_fuel_level:   parseFloat(m.latest?.fuel_level || 0),
        health_score: Math.max(0, 100
          - m.seatbelt_violations * 5
          - m.proximity_alerts * 3
          - m.idle_events * 1),
      };
    });

    res.json({ count: result.length, machines: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
