/**
 * dashboard.js — Static + SQLite dashboard. No CSV, no Python.
 */
const router = require('express').Router();

const FUEL_DATA = [
  { machine_id:'EXC001', fuel_used_l:42.3 },
  { machine_id:'EXC002', fuel_used_l:38.1 },
  { machine_id:'EXC003', fuel_used_l:55.7 },
  { machine_id:'EXC004', fuel_used_l:29.4 },
  { machine_id:'EXC005', fuel_used_l:47.2 },
];

const TIME_DATA = [
  { task_type:'Earth Excavation', estimated_time:65,  actual_time:71  },
  { task_type:'Trenching',        estimated_time:80,  actual_time:94  },
  { task_type:'Material Loading', estimated_time:35,  actual_time:33  },
  { task_type:'Grading',          estimated_time:50,  actual_time:52  },
  { task_type:'Compaction',       estimated_time:45,  actual_time:48  },
  { task_type:'Demolition',       estimated_time:110, actual_time:128 },
];

router.get('/', (req, res) => {
  try {
    const db = req.app.get('db');
    const alertCount = db.prepare('SELECT COUNT(*) as c FROM alerts WHERE acknowledged=0').get()?.c || 0;
    const sessions   = db.prepare('SELECT COUNT(*) as c FROM machine_sessions WHERE active=1').get()?.c || 0;

    res.json({
      summary: {
        total_machines:  5,
        tasks_today:     24,
        completed:       18,
        active_alerts:   alertCount,
        active_sessions: sessions,
        completion_rate: 75,
      },
      fuel_by_machine:  FUEL_DATA,
      time_comparison:  TIME_DATA,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
