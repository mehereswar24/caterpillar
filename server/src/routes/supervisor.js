/**
 * supervisor.js — supervisor console backend.
 *
 *   /api/supervisor/*  (Bearer token, from POST /login)
 *       POST   /login                 username + password -> token
 *       POST   /logout
 *       GET    /operators             every operator + live status
 *       GET    /operators/:id/live    one operator's live status + full cockpit snapshot
 *       GET    /machines              every machine: registry details + live status
 *       GET    /logs                  driver activity logs (?operator_id=&severity=&limit=)
 *       GET    /frame/:operatorId     latest cab-camera JPEG
 *       GET    /tasks                 assigned tasks (?operator_id=)
 *       POST   /tasks                 assign a task to an operator
 *       DELETE /tasks/:id             cancel a task
 *
 *   /api/live/*  (called by the operator cockpit after face login)
 *       POST /heartbeat               status: machine, task, telemetry, alerts
 *       POST /frame                   cab-camera JPEG (data URL)
 *       POST /logs                    the cockpit's event log entries
 *       GET  /tasks/:operatorId       tasks the supervisor assigned
 *       POST /tasks/:operatorId/:taskId/done
 *
 * Credentials come from SUPERVISOR_USER / SUPERVISOR_PASS. The defaults below are for local
 * development only — set both in server/.env before exposing this anywhere.
 */
const crypto = require('crypto');
const express = require('express');
const FLEET = require('../data/fleet');
const faces = require('../faceStore');

const SUPERVISOR_USER = process.env.SUPERVISOR_USER || 'supervisor';
const SUPERVISOR_PASS = process.env.SUPERVISOR_PASS || 'CatSuper@2026';
if (!process.env.SUPERVISOR_PASS) {
  console.warn('[supervisor] SUPERVISOR_PASS is not set — using the development default. Set SUPERVISOR_USER / SUPERVISOR_PASS in server/.env.');
}

const SESSION_MS = 12 * 60 * 60 * 1000;
const ONLINE_MS = 15 * 1000;          // heartbeat newer than this = operator is online
const FRAME_FRESH_MS = 10 * 1000;     // frame older than this is not shown as live
const MAX_FRAME_BYTES = 300 * 1024;
const MAX_SNAPSHOT_BYTES = 80 * 1024;
const MAX_LOG_ROWS = 5000;

const sessions = new Map();           // token -> expiry
const live = new Map();               // operator_id -> { status, seen, frame: { buf, ts } }
const attempts = new Map();           // ip -> { n, resetAt }

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const clip = (v, n) => String(v ?? '').slice(0, n);

// ── DB ──────────────────────────────────────────────────────────────────────
let tableReady = false;
function db(req) {
  const d = req.app.get('db');
  if (!tableReady) {
    d.exec(`
      CREATE TABLE IF NOT EXISTS assigned_tasks (
        id            TEXT PRIMARY KEY,
        operator_id   TEXT NOT NULL,
        name          TEXT NOT NULL,
        zone          TEXT,
        estimated_min INTEGER DEFAULT 60,
        priority      TEXT DEFAULT 'normal',
        status        TEXT DEFAULT 'pending',
        assigned_by   TEXT,
        created_at    TEXT DEFAULT (datetime('now')),
        completed_at  TEXT
      );
      CREATE TABLE IF NOT EXISTS driver_logs (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        operator_id TEXT NOT NULL,
        machine_id  TEXT,
        ts          TEXT NOT NULL,
        category    TEXT,
        severity    TEXT,
        message     TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_driver_logs_op ON driver_logs (operator_id, id);
    `);
    tableReady = true;
  }
  return d;
}
const operatorExists = (d, id) => !!d.prepare('SELECT 1 FROM operators WHERE operator_id=? AND active=1').get(id);

// ── supervisor routes ───────────────────────────────────────────────────────
const supervisorRouter = express.Router();

supervisorRouter.post('/login', (req, res) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const a = attempts.get(ip);
  if (a && now < a.resetAt && a.n >= 5) {
    return res.status(429).json({ error: 'Too many attempts. Wait a minute and try again.' });
  }
  const rec = a && now < a.resetAt ? a : { n: 0, resetAt: now + 60 * 1000 };
  const { username = '', password = '' } = req.body || {};
  const ok = safeEqual(username, SUPERVISOR_USER) & safeEqual(password, SUPERVISOR_PASS);   // & (not &&): no early exit
  if (!ok) {
    rec.n += 1; attempts.set(ip, rec);
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  attempts.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, now + SESSION_MS);
  res.json({ token, username: SUPERVISOR_USER, expires_in_s: SESSION_MS / 1000 });
});

function requireSupervisor(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const exp = sessions.get(token);
  if (!exp || exp < Date.now()) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Supervisor login required.' });
  }
  req.supervisor = SUPERVISOR_USER;
  req.token = token;
  next();
}

supervisorRouter.post('/logout', requireSupervisor, (req, res) => {
  sessions.delete(req.token);
  res.json({ ok: true });
});

supervisorRouter.get('/operators', requireSupervisor, (req, res) => {
  const d = db(req);
  const ops = d.prepare('SELECT operator_id, name, assigned_machines, skill_level FROM operators WHERE active=1 ORDER BY operator_id').all();
  const pending = {};
  d.prepare("SELECT operator_id, COUNT(*) c FROM assigned_tasks WHERE status='pending' GROUP BY operator_id").all()
    .forEach(r => { pending[r.operator_id] = r.c; });
  const now = Date.now();
  const enrolled = faces.enrolledCount(d);
  res.json({
    operators: ops.map(o => {
      const l = live.get(o.operator_id);
      const online = !!l && now - l.seen < ONLINE_MS;
      return {
        ...o,
        online,
        last_seen: l ? new Date(l.seen).toISOString() : null,
        status: online ? l.status : null,
        has_frame: !!l?.frame && now - l.frame.ts < FRAME_FRESH_MS,
        pending_tasks: pending[o.operator_id] || 0,
        face_samples: enrolled[o.operator_id] || 0,   // 0 = face not enrolled, can't log in by face
      };
    }),
  });
});

// Face enrollment: photos of the operator -> identity vectors used by the login face scan.
supervisorRouter.post('/operators/:id/face', requireSupervisor, async (req, res) => {
  const d = db(req);
  if (!operatorExists(d, req.params.id)) return res.status(404).json({ error: 'Unknown operator.' });
  const images = Array.isArray(req.body?.images) ? req.body.images.slice(0, 12) : [];
  if (images.length < 3) return res.status(400).json({ error: 'Send at least 3 photos.' });
  try {
    const r = await faces.enroll(d, req.params.id, images);
    if (!r.ok) return res.status(422).json({ error: r.error });
    d.prepare('INSERT INTO driver_logs (operator_id, machine_id, ts, category, severity, message) VALUES (?,?,?,?,?,?)')
      .run(req.params.id, null, new Date().toISOString(), 'SYSTEM', 'INFO', `Face enrolled by ${req.supervisor} (${r.samples} samples)`);
    res.json({ ok: true, samples: r.samples });
  } catch (e) {
    res.status(e.serviceDown ? 503 : 500).json({ error: e.serviceDown ? 'The face service is not running (python face_server.py).' : e.message });
  }
});

supervisorRouter.delete('/operators/:id/face', requireSupervisor, (req, res) => {
  const n = faces.clear(db(req), req.params.id);
  res.json({ ok: true, removed: n });
});

supervisorRouter.get('/frame/:operatorId', requireSupervisor, (req, res) => {
  const f = live.get(req.params.operatorId)?.frame;
  if (!f || Date.now() - f.ts > FRAME_FRESH_MS) return res.status(404).json({ error: 'No live frame' });
  res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
  res.send(f.buf);
});

supervisorRouter.get('/tasks', requireSupervisor, (req, res) => {
  const d = db(req);
  const { operator_id } = req.query;
  const rows = operator_id
    ? d.prepare('SELECT * FROM assigned_tasks WHERE operator_id=? ORDER BY created_at DESC LIMIT 100').all(operator_id)
    : d.prepare('SELECT * FROM assigned_tasks ORDER BY created_at DESC LIMIT 100').all();
  res.json({ tasks: rows });
});

supervisorRouter.post('/tasks', requireSupervisor, (req, res) => {
  const d = db(req);
  const b = req.body || {};
  const name = clip(b.name, 120).trim();
  const est = Math.round(Number(b.estimated_min));
  if (!name) return res.status(400).json({ error: 'Task name is required.' });
  if (!operatorExists(d, b.operator_id)) return res.status(400).json({ error: 'Unknown operator.' });
  if (!Number.isFinite(est) || est < 5 || est > 960) return res.status(400).json({ error: 'Estimated time must be 5–960 minutes.' });
  const priority = b.priority === 'high' ? 'high' : 'normal';
  const id = 'SUP-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  d.prepare('INSERT INTO assigned_tasks (id, operator_id, name, zone, estimated_min, priority, assigned_by) VALUES (?,?,?,?,?,?,?)')
    .run(id, b.operator_id, name, clip(b.zone, 80).trim(), est, priority, req.supervisor);
  res.status(201).json({ task: d.prepare('SELECT * FROM assigned_tasks WHERE id=?').get(id) });
});

supervisorRouter.delete('/tasks/:id', requireSupervisor, (req, res) => {
  const r = db(req).prepare("UPDATE assigned_tasks SET status='cancelled' WHERE id=? AND status='pending'").run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'No pending task with that id.' });
  res.json({ ok: true });
});

supervisorRouter.get('/operators/:id/live', requireSupervisor, (req, res) => {
  const d = db(req);
  const op = d.prepare('SELECT operator_id, name, assigned_machines, skill_level FROM operators WHERE operator_id=? AND active=1').get(req.params.id);
  if (!op) return res.status(404).json({ error: 'Unknown operator.' });
  const l = live.get(op.operator_id);
  const now = Date.now();
  res.json({
    operator: op,
    online: !!l && now - l.seen < ONLINE_MS,
    last_seen: l ? new Date(l.seen).toISOString() : null,
    status: l?.status || null,
    snapshot: l?.snapshot || null,            // the operator's cockpit state — the supervisor renders the same dashboard from it
    has_frame: !!l?.frame && now - l.frame.ts < FRAME_FRESH_MS,
  });
});

supervisorRouter.get('/machines', requireSupervisor, (req, res) => {
  const d = db(req);
  const ops = d.prepare('SELECT operator_id, name, assigned_machines FROM operators WHERE active=1').all();
  const now = Date.now();
  const onMachine = {};
  for (const [opId, l] of live) {
    if (now - l.seen < ONLINE_MS && l.status?.machine_id) onMachine[l.status.machine_id] = { operator_id: opId, l };
  }
  res.json({
    machines: FLEET.map(m => {
      const cur = onMachine[m.machine_id];
      const opRow = cur && ops.find(o => o.operator_id === cur.operator_id);
      const hoursSince = m.engine_hours - m.hours_at_last_service;
      return {
        ...m,
        service_due_in_h: Math.max(0, m.service_interval_h - hoursSince),
        service_overdue: hoursSince > m.service_interval_h,
        status: cur ? 'in_use' : 'idle',
        operator: opRow ? { operator_id: opRow.operator_id, name: opRow.name } : null,
        live: cur ? { mode: cur.l.status.mode, task: cur.l.status.task, telemetry: cur.l.status.telemetry, alerts: cur.l.status.alerts } : null,
        assigned_operators: ops.filter(o => (o.assigned_machines || '').split(',').map(x => x.trim()).includes(m.machine_id)).map(o => ({ operator_id: o.operator_id, name: o.name })),
      };
    }),
  });
});

supervisorRouter.get('/logs', requireSupervisor, (req, res) => {
  const d = db(req);
  const limit = Math.max(1, Math.min(500, parseInt(req.query.limit, 10) || 200));
  const { operator_id, severity } = req.query;
  const sev = severity ? String(severity).toUpperCase() : null;
  const where = [], args = [];
  if (operator_id) { where.push('operator_id = ?'); args.push(operator_id); }
  if (sev) { where.push('severity = ?'); args.push(sev); }
  const rows = d.prepare(`SELECT id, operator_id, machine_id, ts, category, severity, message FROM driver_logs ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ?`).all(...args, limit);
  // face-login attempts are part of every driver's history too
  let auth = [];
  try {
    auth = d.prepare(`SELECT id, operator_id, machine_id, timestamp AS ts, result, confidence, reason FROM auth_log ${operator_id ? 'WHERE operator_id = ?' : ''} ORDER BY id DESC LIMIT ?`)
      .all(...(operator_id ? [operator_id] : []), limit)
      .map(a => ({
        id: 'auth-' + a.id, operator_id: a.operator_id, machine_id: a.machine_id, ts: String(a.ts).replace(' ', 'T') + 'Z', category: 'AUTH',
        severity: /APPROVED|OVERRIDE/i.test(a.result) ? 'INFO' : 'WARNING',
        message: `Sign-in ${String(a.result).toLowerCase()}${a.confidence != null ? ` (${Math.round(a.confidence * (a.confidence <= 1 ? 100 : 1))}% match)` : ''}${a.reason ? ' — ' + a.reason : ''}`,
      }))
      .filter(a => !sev || a.severity === sev);
  } catch { /* auth_log may not exist yet */ }
  const logs = [...rows, ...auth].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limit);
  res.json({ logs });
});

// ── operator-side routes ────────────────────────────────────────────────────
const liveRouter = express.Router();

// The cab-camera readout the operator's cockpit computes (on-device face metrics + vision-model checks).
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
function cleanCab(c) {
  if (!c || typeof c !== 'object') return null;
  const n = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const m = c.m && typeof c.m === 'object' ? {
    faces: Math.max(0, Math.min(9, n(c.m.faces) | 0)), calibrating: !!c.m.calibrating, driverPresent: !!c.m.driverPresent, absent: !!c.m.absent,
    eyesClosed: !!c.m.eyesClosed, perclos: Math.max(0, Math.min(1, n(c.m.perclos))), yawning: !!c.m.yawning,
    yawns: Math.max(0, Math.min(99, n(c.m.yawns) | 0)), pitch: n(c.m.pitch), yaw: n(c.m.yaw), passenger: !!c.m.passenger,
  } : null;
  const sem = c.sem && typeof c.sem === 'object' ? {
    seatbelt: oneOf(c.sem.seatbelt, ['on', 'off', 'unseen'], 'unseen'), hardhat: oneOf(c.sem.hardhat, ['on', 'off'], 'off'),
    phone: !!c.sem.phone, smoking: !!c.sem.smoking, eating: !!c.sem.eating, description: clip(c.sem.description, 80),
  } : null;
  return {
    m, sem, latency: Math.max(0, Math.min(60000, n(c.latency))) || null,
    vlmStatus: oneOf(c.vlmStatus, ['waiting', 'live', 'offline'], 'waiting'),
    trackStatus: oneOf(c.trackStatus, ['loading', 'ready', 'error'], 'loading'),
    camStatus: oneOf(c.camStatus, ['starting', 'live', 'nocam'], 'starting'),
  };
}

liveRouter.post('/heartbeat', (req, res) => {
  const d = db(req);
  const b = req.body || {};
  if (!operatorExists(d, b.operator_id)) return res.status(400).json({ error: 'Unknown operator.' });
  const t = b.telemetry || {};
  const entry = live.get(b.operator_id) || {};
  entry.seen = Date.now();
  entry.status = {
    machine_id: clip(b.machine_id, 20),
    task: clip(b.task, 120),
    task_progress_pct: Math.max(0, Math.min(100, Number(b.task_progress_pct) || 0)),
    mode: clip(b.mode, 20),
    telemetry: {
      fuel: Number(t.fuel) || 0, temp: Number(t.temp) || 0, rpm: Number(t.rpm) || 0, hydraulic: Number(t.hydraulic) || 0,
    },
    alerts: Array.isArray(b.alerts) ? b.alerts.slice(0, 8).map(a => ({ type: clip(a.type, 40), severity: clip(a.severity, 12), message: clip(a.message, 160) })) : [],
    cab: cleanCab(b.cab),
  };
  if (b.snapshot && typeof b.snapshot === 'object') {
    const json = JSON.stringify(b.snapshot);
    if (json.length <= MAX_SNAPSHOT_BYTES) entry.snapshot = b.snapshot;
  }
  live.set(b.operator_id, entry);
  res.json({ ok: true });
});

liveRouter.post('/frame', (req, res) => {
  const { operator_id, image } = req.body || {};
  const entry = live.get(operator_id);
  if (!entry) return res.status(409).json({ error: 'Send a heartbeat first.' });
  const m = /^data:image\/jpeg;base64,(.+)$/.exec(image || '');
  if (!m) return res.status(400).json({ error: 'Expected a JPEG data URL.' });
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > MAX_FRAME_BYTES) return res.status(413).json({ error: 'Frame too large.' });
  entry.frame = { buf, ts: Date.now() };
  res.json({ ok: true });
});

liveRouter.post('/logs', (req, res) => {
  const d = db(req);
  const { operator_id, machine_id, entries } = req.body || {};
  if (!operatorExists(d, operator_id)) return res.status(400).json({ error: 'Unknown operator.' });
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries must be an array.' });
  const ins = d.prepare('INSERT INTO driver_logs (operator_id, machine_id, ts, category, severity, message) VALUES (?,?,?,?,?,?)');
  const sev = new Set(['INFO', 'WARNING', 'CRITICAL']);
  let n = 0;
  d.transaction(() => {
    for (const e of entries.slice(0, 100)) {
      const ts = new Date(e.ts);
      if (isNaN(ts) || !e.message) continue;
      ins.run(operator_id, clip(machine_id, 20), ts.toISOString(), clip(e.category, 20), sev.has(e.severity) ? e.severity : 'INFO', clip(e.message, 300));
      n++;
    }
    d.prepare('DELETE FROM driver_logs WHERE id <= (SELECT MAX(id) FROM driver_logs) - ?').run(MAX_LOG_ROWS);
  })();
  res.json({ ok: true, stored: n });
});

liveRouter.get('/tasks/:operatorId', (req, res) => {
  const rows = db(req).prepare(
    "SELECT id, name, zone, estimated_min, priority FROM assigned_tasks WHERE operator_id=? AND status='pending' ORDER BY (priority='high') DESC, created_at ASC"
  ).all(req.params.operatorId);
  res.json({ tasks: rows });
});

liveRouter.post('/tasks/:operatorId/:taskId/done', (req, res) => {
  const r = db(req).prepare("UPDATE assigned_tasks SET status='done', completed_at=datetime('now') WHERE id=? AND operator_id=? AND status='pending'")
    .run(req.params.taskId, req.params.operatorId);
  res.json({ ok: true, updated: r.changes });
});

module.exports = { supervisorRouter, liveRouter };
