const router = require('express').Router();
const { spawnSync } = require('child_process');
const path = require('path');
const fs   = require('fs');

const PYTHON = process.env.PYTHON_PATH || 'python';
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

// GET /api/dashboard
router.get('/', (req, res) => {
  try {
    const logs  = readCSV('machine_logs.csv');
    const tasks = readCSV('tasks.csv');

    const totalMachines  = new Set(logs.map(r => r.machine_id)).size;
    const tasksToday     = tasks.slice(-24).length;
    const completed      = tasks.filter(t => t.completed === '1').length;
    const activeAlerts   = logs.filter(r =>
      r.seatbelt === 'unfastened' ||
      parseInt(r.proximity_alert) === 1 ||
      parseFloat(r.tilt_angle) > 15
    ).length;

    // Fuel usage by machine (last 200 rows)
    const fuelMap = {};
    logs.slice(-200).forEach(r => {
      if (!fuelMap[r.machine_id]) fuelMap[r.machine_id] = 0;
      fuelMap[r.machine_id] += parseFloat(r.fuel_used_l || 0);
    });
    const fuelByMachine = Object.entries(fuelMap).map(([machine_id, fuel]) => ({
      machine_id, fuel_used_l: Math.round(fuel * 10) / 10
    }));

    // Estimated vs actual time (last 10 tasks)
    const timeComparison = tasks.slice(-10).map(t => ({
      task_id:        t.task_id,
      task_type:      t.task_type,
      estimated_time: parseFloat(t.estimated_time),
      actual_time:    parseFloat(t.actual_time),
    }));

    res.json({
      summary: {
        total_machines: totalMachines,
        tasks_today:    tasksToday,
        completed,
        active_alerts:  activeAlerts,
        completion_rate: tasks.length ? Math.round(completed / tasks.length * 100) : 0,
      },
      fuel_by_machine: fuelByMachine,
      time_comparison: timeComparison,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
