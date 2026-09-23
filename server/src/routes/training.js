/**
 * training.js — Personalised modules from SQLite. No Python, no CSV.
 */
const router = require('express').Router();

const ALL_MODULES = [
  { id:'m1', title:'Proximity Safety Protocol',  type:'simulation', duration_min:30, severity:'critical', reason:'Prevent worker proximity breaches in exclusion zone' },
  { id:'m2', title:'Seatbelt & PPE Compliance',  type:'video',      duration_min:20, severity:'critical', reason:'Seatbelt must be fastened at all times when engine is running' },
  { id:'m3', title:'Fuel Efficiency Techniques', type:'instructor', duration_min:45, severity:'medium',   reason:'Reduce idle time and optimise fuel consumption per shift' },
  { id:'m4', title:'Slope & Stability Awareness',type:'simulation', duration_min:40, severity:'high',     reason:'Safe operation on grades above 10 degrees' },
  { id:'m5', title:'Engine & Hydraulics Basics', type:'video',      duration_min:60, severity:'low',      reason:'General mechanical knowledge for CAT 320 operators' },
  { id:'m6', title:'Task Time Optimisation',     type:'instructor', duration_min:35, severity:'low',      reason:'Improve productivity and reduce task overrun' },
];

// Priority map: alert type → module id
const PRIORITY = {
  SEATBELT_VIOLATION:  'm2',
  PROXIMITY_BREACH:    'm1',
  OVERHEAT:            'm5',
  OVER_REV:            'm5',
  HIGH_PRESSURE:       'm5',
  EXCESSIVE_IDLE:      'm3',
};

router.get('/:operatorId', (req, res) => {
  try {
    const { operatorId } = req.params;
    const db = req.app.get('db');

    // Get completion status from SQLite
    const completions = db.prepare(
      'SELECT module_id, score, completed_at FROM training_progress WHERE operator_id = ?'
    ).all(operatorId);
    const compMap = {};
    completions.forEach(c => { compMap[c.module_id] = c; });

    // Get operator's alert history to personalise order
    let alertCounts = {};
    try {
      const alertRows = db.prepare(
        'SELECT result as type, COUNT(*) as cnt FROM auth_log WHERE operator_id=? GROUP BY result'
      ).all(operatorId);
      alertRows.forEach(r => { alertCounts[r.type] = r.cnt; });
    } catch { /* auth_log may not exist yet */ }

    // Sort modules: prioritise those matching alert history
    const prioritised = new Set(
      Object.entries(alertCounts)
        .filter(([,cnt]) => cnt > 0)
        .map(([type]) => PRIORITY[type])
        .filter(Boolean)
    );

    const modules = [...ALL_MODULES].sort((a,b) => {
      const ap = prioritised.has(a.id) ? 0 : 1;
      const bp = prioritised.has(b.id) ? 0 : 1;
      return ap - bp;
    }).map(m => ({
      ...m,
      reason:       prioritised.has(m.id) ? `Recommended based on your alert history` : m.reason,
      completed:    !!compMap[m.id],
      score:        compMap[m.id]?.score || null,
      completed_at: compMap[m.id]?.completed_at || null,
    }));

    res.json({
      operator_id:       operatorId,
      total_modules:     modules.length,
      completed_modules: modules.filter(m => m.completed).length,
      modules,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:operatorId/complete', (req, res) => {
  try {
    const { operatorId } = req.params;
    const { module_id, score } = req.body;
    const db = req.app.get('db');
    db.prepare(`
      INSERT INTO training_progress (operator_id, module_id, score)
      VALUES (?, ?, ?)
      ON CONFLICT(operator_id, module_id) DO UPDATE SET score=excluded.score, completed_at=datetime('now')
    `).run(operatorId, module_id, score || 100);
    res.json({ success: true, operator_id: operatorId, module_id, score });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
