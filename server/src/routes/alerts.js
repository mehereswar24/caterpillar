const router = require('express').Router();

// POST /api/alerts/:id/acknowledge
router.post('/:id/acknowledge', (req, res) => {
  try {
    const db = req.app.get('db');
    const { id } = req.params;

    const result = db.prepare(
      'UPDATE alerts SET acknowledged = 1 WHERE id = ?'
    ).run(parseInt(id));

    if (result.changes === 0) {
      // If not in DB yet (fresh rule-based alert), just confirm
      return res.json({ success: true, id, message: 'Alert acknowledged.' });
    }
    res.json({ success: true, id, acknowledged: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/alerts — list all unacknowledged from SQLite
router.get('/', (req, res) => {
  try {
    const db = req.app.get('db');
    const alerts = db.prepare(
      'SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC LIMIT 100'
    ).all();
    res.json({ count: alerts.length, alerts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/alerts — persist a new alert
router.post('/', (req, res) => {
  try {
    const db = req.app.get('db');
    const { type, severity, reason, action, machine_id, operator_id } = req.body;
    const result = db.prepare(`
      INSERT INTO alerts (type, severity, reason, action, machine_id, operator_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(type, severity, reason, action, machine_id, operator_id);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
