const router = require('express').Router();
const mongoose = require('mongoose');
const TrainingProgress = require('../models/TrainingProgress');

const _mem = {};
const isMongoUp = () => mongoose.connection.readyState === 1;

const MODULES = [
  { id:'m1', title:'Proximity Safety',     type:'simulation', description:'Identify and respond to worker proximity breaches.' },
  { id:'m2', title:'Night Operations',     type:'video',      description:'Safe procedures for low-visibility conditions.' },
  { id:'m3', title:'Seatbelt Compliance',  type:'quiz',       description:'Rules and importance of seatbelt use on site.' },
  { id:'m4', title:'Slope & Tilt Safety',  type:'simulation', description:'Recognising unsafe tilt angles and safe parking.' },
  { id:'m5', title:'Fuel Efficiency',      type:'video',      description:'Reducing idle time and improving fuel economy.' },
  { id:'m6', title:'Pre-Shift Inspection', type:'checklist',  description:'Step-by-step machine inspection before every shift.' },
];

// GET /training/modules
router.get('/modules', async (req, res) => {
  const { operator_id = 'OP001' } = req.query;
  let progressMap = _mem[operator_id] || {};

  if (isMongoUp()) {
    try {
      const rows = await TrainingProgress.find({ operator_id }).lean();
      rows.forEach(r => { progressMap[r.module_id] = r; });
    } catch {}
  }

  const modules = MODULES.map(m => ({
    ...m,
    completed:    !!(progressMap[m.id]?.completed),
    score:        progressMap[m.id]?.score || 0,
    completed_at: progressMap[m.id]?.completed_at || null,
  }));

  const done = modules.filter(m=>m.completed).length;
  res.json({ operator_id, modules, progress: `${done}/${MODULES.length} completed` });
});

// POST /training/complete
router.post('/complete', async (req, res) => {
  const { operator_id='OP001', module_id, score=100 } = req.body;
  const completed_at = new Date();

  if (!_mem[operator_id]) _mem[operator_id] = {};
  _mem[operator_id][module_id] = { module_id, score, completed: true, completed_at };

  if (isMongoUp()) {
    try {
      await TrainingProgress.findOneAndUpdate(
        { operator_id, module_id },
        { operator_id, module_id, score, completed: true, completed_at },
        { upsert: true, new: true }
      );
    } catch {}
  }

  res.json({ status:'success', module_id, score, completed_at });
});

module.exports = router;
