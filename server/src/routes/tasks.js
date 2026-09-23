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

// GET /api/tasks  ?machine_id=&operator_id=&status=&limit=50
router.get('/', (req, res) => {
  try {
    let tasks = readCSV('tasks.csv');
    const { machine_id, operator_id, status, limit = 50 } = req.query;

    if (machine_id)  tasks = tasks.filter(t => t.machine_id  === machine_id);
    if (operator_id) tasks = tasks.filter(t => t.operator_id === operator_id);
    if (status === 'completed')   tasks = tasks.filter(t => t.completed === '1');
    if (status === 'incomplete')  tasks = tasks.filter(t => t.completed === '0');

    tasks = tasks.slice(-parseInt(limit)).map(t => ({
      task_id:        t.task_id,
      machine_id:     t.machine_id,
      operator_id:    t.operator_id,
      task_type:      t.task_type,
      estimated_time: parseFloat(t.estimated_time),
      actual_time:    parseFloat(t.actual_time),
      overrun:        Math.max(0, parseFloat(t.actual_time) - parseFloat(t.estimated_time)).toFixed(1),
      weather:        t.weather,
      soil_type:      t.soil_type,
      operator_skill: t.operator_skill,
      machine_age:    parseFloat(t.machine_age_yrs),
      completed:      t.completed === '1',
      date:           t.date,
    }));

    res.json({ count: tasks.length, tasks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
