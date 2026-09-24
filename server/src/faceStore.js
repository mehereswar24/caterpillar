/**
 * faceStore.js — real face recognition on top of the local face service (face_server.py).
 *
 * The service turns a photo into a 512-d identity vector (ArcFace). Here we keep the enrolled
 * vectors in SQLite and compare a new scan against them with cosine similarity:
 *   same person  ≈ 0.6 – 0.95     different people ≈ 0.0 – 0.25
 * A scan is accepted only if the best operator clears MATCH_THRESHOLD *and* beats the runner-up
 * by MARGIN (so a look-alike can't sneak in on a borderline score).
 */
const axios = require('axios');

const FACE_URL = process.env.FACE_SERVICE_URL || 'http://127.0.0.1:5002';
const MATCH_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD || 0.45);
const MARGIN = Number(process.env.FACE_MATCH_MARGIN || 0.06);
const SAME_PERSON_MIN = 0.55;      // enrollment photos must agree with each other at least this much

const REASONS = {
  no_face:        'No face found. Look straight at the camera in good light.',
  low_confidence: 'The face is unclear. Face the camera and improve the lighting.',
  too_small:      'You are too far from the camera. Move closer.',
  multiple_faces: 'More than one face in view. Only the operator should be in front of the camera.',
  bad_image:      'The camera image could not be read. Try again.',
};
const reasonText = (r) => REASONS[r] || 'Could not read a usable face. Try again.';

let ready = false;
function ensureTable(db) {
  if (ready) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS face_templates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      operator_id TEXT NOT NULL,
      embedding   TEXT NOT NULL,          -- JSON array of 512 floats (L2-normalised)
      created_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_face_templates_op ON face_templates (operator_id);
  `);
  ready = true;
}

const stripDataUrl = (s) => String(s || '').replace(/^data:image\/\w+;base64,/, '');
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/** Send one image (base64 / data URL) to the face service. Throws {serviceDown:true} if it's not reachable. */
async function embed(imageB64) {
  try {
    const r = await axios.post(`${FACE_URL}/embed`, Buffer.from(stripDataUrl(imageB64), 'base64'), {
      headers: { 'Content-Type': 'application/octet-stream' }, timeout: 15000, maxBodyLength: Infinity, validateStatus: () => true,
    });
    return r.data || { ok: false, reason: 'error' };
  } catch (e) {
    const err = new Error(`Face service unreachable: ${e.message}`);
    err.serviceDown = true;
    throw err;
  }
}

function templatesByOperator(db) {
  ensureTable(db);
  const rows = db.prepare(`
    SELECT t.operator_id, t.embedding FROM face_templates t
    JOIN operators o ON o.operator_id = t.operator_id AND o.active = 1`).all();
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.operator_id)) map.set(r.operator_id, []);
    map.get(r.operator_id).push(JSON.parse(r.embedding));
  }
  return map;
}

/** Score a probe vector against every enrolled operator. Returns [{operator_id, score}] best first. */
function identify(db, probe) {
  const scores = [];
  for (const [operator_id, temps] of templatesByOperator(db)) {
    const s = temps.map(t => dot(probe, t)).sort((a, b) => b - a);
    scores.push({ operator_id, score: s.slice(0, 2).reduce((a, b) => a + b, 0) / Math.min(2, s.length) });   // mean of the top 2 samples
  }
  return scores.sort((a, b) => b.score - a.score);
}

function isMatch(scores) {
  const [best, second] = scores;
  if (!best || best.score < MATCH_THRESHOLD) return false;
  return !second || best.score - second.score >= MARGIN;
}

const enrolledCount = (db) => {
  ensureTable(db);
  const out = {};
  db.prepare('SELECT operator_id, COUNT(*) c FROM face_templates GROUP BY operator_id').all().forEach(r => { out[r.operator_id] = r.c; });
  return out;
};

/**
 * Enroll an operator from several photos. Rejects unusable photos, photos that are not the same
 * person, and faces that already belong to a different operator. Replaces earlier templates.
 * Returns {ok, samples} or {ok:false, error}.
 */
async function enroll(db, operatorId, images) {
  ensureTable(db);
  const vecs = [];
  const problems = [];
  for (let i = 0; i < images.length; i++) {
    const r = await embed(images[i]);
    if (r.ok && r.embedding) vecs.push(r.embedding);
    else problems.push(r.reason);
  }
  if (vecs.length < 3) {
    const why = [...new Set(problems)].map(reasonText).join(' ');
    return { ok: false, error: `Only ${vecs.length} of ${images.length} photos were usable (need at least 3). ${why}`.trim() };
  }
  // all photos must be the same person: each must agree with the group centroid
  const centroid = vecs[0].map((_, k) => vecs.reduce((s, v) => s + v[k], 0) / vecs.length);
  const norm = Math.sqrt(dot(centroid, centroid)) || 1;
  const c = centroid.map(x => x / norm);
  const good = vecs.filter(v => dot(v, c) >= SAME_PERSON_MIN);
  if (good.length < 3) return { ok: false, error: 'The photos do not look like the same person. Make sure only the operator is in view and retry.' };

  // must not already belong to someone else
  const other = identify(db, c).find(s => s.operator_id !== operatorId && s.score >= MATCH_THRESHOLD);
  if (other) return { ok: false, error: `This face is already enrolled as ${other.operator_id}. One person, one profile.` };

  db.prepare('DELETE FROM face_templates WHERE operator_id = ?').run(operatorId);
  const ins = db.prepare('INSERT INTO face_templates (operator_id, embedding) VALUES (?, ?)');
  db.transaction(() => { good.forEach(v => ins.run(operatorId, JSON.stringify(v))); })();
  return { ok: true, samples: good.length, rejected: vecs.length - good.length };
}

const clear = (db, operatorId) => { ensureTable(db); return db.prepare('DELETE FROM face_templates WHERE operator_id = ?').run(operatorId).changes; };

module.exports = { embed, identify, isMatch, enroll, clear, enrolledCount, reasonText, MATCH_THRESHOLD };
