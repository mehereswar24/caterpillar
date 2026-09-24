try { require('dotenv').config(); } catch (_) {}
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
  CREATE TABLE IF NOT EXISTS operators (
    operator_id   TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    face_descriptor TEXT,
    assigned_machines TEXT,
    skill_level   TEXT DEFAULT 'intermediate',
    active        INTEGER DEFAULT 1,
    created_at    TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS machine_sessions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id    TEXT NOT NULL,
    operator_id   TEXT NOT NULL,
    auth_method   TEXT DEFAULT 'face',
    auth_score    REAL,
    started_at    TEXT DEFAULT (datetime('now')),
    ended_at      TEXT,
    active        INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS auth_log (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id    TEXT,
    operator_id   TEXT,
    result        TEXT,
    confidence    REAL,
    reason        TEXT,
    timestamp     TEXT DEFAULT (datetime('now'))
  );
`);

app.set('db', db);

// Seed operators if empty
const opCount = db.prepare('SELECT COUNT(*) as c FROM operators').get().c;
if (opCount === 0) {
  const ins = db.prepare('INSERT OR IGNORE INTO operators (operator_id,name,face_descriptor,assigned_machines,skill_level) VALUES (?,?,?,?,?)');
  [
    ['OP001','Rajan Kumar',   'Male, short black hair, dark complexion, ~35 years, orange hard hat','EXC001,EXC002','expert'],
    ['OP002','Suresh Patel',  'Male, medium build, brown complexion, ~28 years, yellow hard hat',  'EXC001,EXC003','intermediate'],
    ['OP003','Anita Sharma',  'Female, long black hair tied back, medium complexion, ~32 years, white hard hat','EXC002,EXC004','expert'],
    ['OP004','David Okafor',  'Male, tall, dark complexion, ~24 years, blue hard hat',              'EXC003,EXC005','beginner'],
    ['OP005','Maria Santos',  'Female, short curly hair, light complexion, ~29 years, green hard hat','EXC004,EXC005','intermediate'],
  ].forEach(o => ins.run(...o));
}

// ── Routes — exact endpoints from architecture diagram ────────
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/machines',      require('./routes/machines'));
app.use('/api/operators',     require('./routes/operators'));
app.use('/api/safety-alerts', require('./routes/safetyAlerts'));
app.use('/api/predict',       require('./routes/predict'));
app.use('/api/training',      require('./routes/training'));
app.use('/api/alerts',        require('./routes/alerts'));
app.use('/api/anomaly',       require('./routes/anomaly'));
app.use('/api/maintenance',   require('./routes/maintenance'));
app.use('/api/voice',         require('./routes/voice'));
app.use('/api/vision',        require('./routes/vision'));
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/fuel',           require('./routes/fuel'));
app.use('/api/whisper',        require('./routes/whisper'));

// ── Health ────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({
  message: 'CAT Smart Operator API is running.',
  stack: 'Node.js + Express + SQLite',
  endpoints: [
    'GET  /api/dashboard',
    'GET  /api/tasks',
    'GET  /api/machines',
    'GET  /api/operators',
    'GET  /api/safety-alerts',
    'POST /api/predict              ← Task Time (RF+XGBoost ensemble)',
    'POST /api/anomaly/detect       ← Anomaly Classifier (LightGBM, 7 classes)',
    'GET  /api/anomaly/scan',
    'POST /api/maintenance/predict  ← Maintenance Predictor (LightGBM)',
    'GET  /api/maintenance/status',
    'GET  /api/training/:operatorId',
    'POST /api/training/:operatorId/complete',
    'GET  /api/alerts',
    'POST /api/alerts/:id/acknowledge',
    'POST /api/voice/ask            ← RAG + Qwen2.5:7b',
    'POST /api/vision/analyze       ← Qwen2.5-VL:7b',
    'POST /api/vision/seatbelt',
    'POST /api/vision/proximity',
    'POST /api/vision/fatigue',
    'POST /api/vision/preshift',
    'POST /api/auth/face            ← Face Authentication',
    'GET  /api/auth/operators',
    'GET  /api/auth/session/:machine_id',
    'POST /api/auth/override',
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
