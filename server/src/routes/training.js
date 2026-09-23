const router = require('express').Router();
const { spawnSync } = require('child_process');
const path = require('path');

const PYTHON    = process.env.PYTHON_PATH || 'python';
const MODEL_DIR = path.join(__dirname, '../../../model');

// GET /api/training/:operatorId
router.get('/:operatorId', (req, res) => {
  try {
    const { operatorId } = req.params;
    const db = req.app.get('db');

    const result = spawnSync(
      PYTHON,
      [path.join(MODEL_DIR, 'recommendations.py'), operatorId],
      { encoding: 'utf8', timeout: 10000 }
    );
    if (result.error) throw result.error;

    let modules = [];
    try { modules = JSON.parse(result.stdout.trim()); } catch { modules = []; }

    const completions = db.prepare(
      'SELECT module_id, score, completed_at FROM training_progress WHERE operator_id = ?'
    ).all(operatorId);
    const compMap = {};
    completions.forEach(c => { compMap[c.module_id] = c; });

    modules = modules.map(m => ({
      ...m,
      completed:    !!compMap[m.id],
      score:        compMap[m.id]?.score || null,
      completed_at: compMap[m.id]?.completed_at || null,
    }));

    res.json({
      operator_id: operatorId,
      total_modules: modules.length,
      completed_modules: modules.filter(m => m.completed).length,
      modules,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/training/:operatorId/complete
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
