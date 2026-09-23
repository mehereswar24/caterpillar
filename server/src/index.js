require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const morgan   = require('morgan');
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── SQLite ────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, '../../database/smart_operator.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL,
    severity    TEXT NOT NULL,
    reason      TEXT,
    action      TEXT,
    machine_id  TEXT,
    operator_id TEXT,
    acknowledged INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS training_progress (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    operator_id  TEXT NOT NULL,
    module_id    TEXT NOT NULL,
    score        REAL,
    completed_at TEXT DEFAULT (datetime('now')),
    UNIQUE(operator_id, module_id)
  );
`);

app.set('db', db);

// ── Routes — exact endpoints from architecture diagram ────────
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/machines',      require('./routes/machines'));
app.use('/api/operators',     require('./routes/operators'));
app.use('/api/safety-alerts', require('./routes/safetyAlerts'));
app.use('/api/predict',       require('./routes/predict'));
app.use('/api/training',      require('./routes/training'));
app.use('/api/alerts',        require('./routes/alerts'));

// ── Health ────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  message: 'CAT Smart Operator API is running.',
  stack: 'Node.js + Express + SQLite + Python ML',
  endpoints: [
    'GET  /api/dashboard',
    'GET  /api/tasks',
    'GET  /api/machines',
    'GET  /api/operators',
    'GET  /api/safety-alerts',
    'POST /api/predict',
    'GET  /api/training/:operatorId',
    'POST /api/alerts/:id/acknowledge',
  ],
}));

// ── 404 / error ───────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`CAT Smart Operator listening on port ${PORT}`));
