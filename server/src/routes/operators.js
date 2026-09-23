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

// GET /api/operators  ?operator_id=OP001
router.get('/', (req, res) => {
  try {
    const logs  = readCSV('machine_logs.csv');
    const tasks = readCSV('tasks.csv');
    const { operator_id } = req.query;

    const ops = {};

    logs.forEach(r => {
      const id = r.operator_id;
      if (operator_id && id !== operator_id) return;
      if (!ops[id]) ops[id] = {
        operator_id: id, logs: 0,
        seatbelt_violations: 0, proximity_alerts: 0,
        idle_events: 0, fuel_total: 0,
        machines: new Set(),
      };
      const o = ops[id];
      o.logs++;
      o.machines.add(r.machine_id);
      if (r.seatbelt === 'unfastened') o.seatbelt_violations++;
      if (parseInt(r.proximity_alert) === 1) o.proximity_alerts++;
      const idle = parseInt(r.idle_time_min || 0);
      const act  = parseInt(r.active_time_min || 1);
      if (idle / (idle + act) > 0.5) o.idle_events++;
      o.fuel_total += parseFloat(r.fuel_used_l || 0);
    });

    tasks.forEach(t => {
      const id = t.operator_id;
      if (operator_id && id !== operator_id) return;
      if (!ops[id]) return;
      if (!ops[id].tasks) ops[id].tasks = { total: 0, completed: 0, overrun_total: 0 };
      ops[id].tasks.total++;
      if (t.completed === '1') ops[id].tasks.completed++;
      const overrun = parseFloat(t.actual_time) - parseFloat(t.estimated_time);
      if (overrun > 0) ops[id].tasks.overrun_total += overrun;
    });

    const result = Object.values(ops).map(o => {
      const taskInfo = o.tasks || { total: 0, completed: 0, overrun_total: 0 };
      const safetyScore = Math.max(0, 100
        - o.seatbelt_violations * 5
        - o.proximity_alerts * 3
        - o.idle_events);
      const efficiencyScore = taskInfo.total
        ? Math.max(0, 100 - Math.round(taskInfo.overrun_total / taskInfo.total))
        : 80;
      return {
        operator_id:          o.operator_id,
        machines_operated:    [...o.machines],
        total_sessions:       o.logs,
        seatbelt_violations:  o.seatbelt_violations,
        proximity_alerts:     o.proximity_alerts,
        idle_events:          o.idle_events,
        avg_fuel_per_session: Math.round(o.fuel_total / o.logs * 100) / 100,
        tasks_total:          taskInfo.total,
        tasks_completed:      taskInfo.completed,
        avg_overrun_min:      taskInfo.total
          ? Math.round(taskInfo.overrun_total / taskInfo.total * 10) / 10 : 0,
        safety_score:         safetyScore,
        efficiency_score:     efficiencyScore,
      };
    });

    res.json({ count: result.length, operators: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
