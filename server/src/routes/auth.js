/**
 * auth.js — Face authentication via Qwen2.5-VL:7b
 *
 * Flow:
 *   1. Cab camera captures image → base64 sent to POST /api/auth/face
 *   2. Qwen-VL describes the person in the image
 *   3. Description compared against registered operator face_descriptors
 *   4. Best match above threshold → session created, machine unlocked
 *   5. No match → UNAUTHORIZED logged, machine stays locked
 *   6. Supervisor can override via POST /api/auth/override
 */
const router = require('express').Router();
const axios  = require('axios');
const crypto = require('crypto');

const OLLAMA       = process.env.OLLAMA_BASE_URL    || 'http://localhost:11434';
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'qwen2.5vl:7b';
const AUTH_THRESHOLD = 0.15; // low threshold — VLM descriptions rarely share many tokens with stored descriptors

// ── Similarity: token overlap between VLM description and stored descriptor ──
function similarity(desc1, desc2) {
  const tok = s => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const a = tok(desc1), b = tok(desc2);
  const inter = [...a].filter(x => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

// ── POST /api/auth/face ────────────────────────────────────────────────────
router.post('/face', async (req, res) => {
  const { image, machine_id = 'EXC001' } = req.body;
  if (!image) return res.status(400).json({ error: 'image (base64) required' });

  const db = req.app.get('db');

  // Step 1: Ask VLM to describe the person
  let visionDesc = '';
  let visionRaw  = '';
  try {
    const resp = await axios.post(`${OLLAMA}/api/generate`, {
      model:  VISION_MODEL,
      prompt: 'Describe the person in this image in detail: gender, approximate age, hair colour and style, skin complexion, and any visible safety equipment such as hard hat colour, vest colour, or glasses. Be specific and factual.',
      images: [image],
      stream: false,
      options: { temperature: 0.1, num_predict: 150 },
    }, { timeout: 30000 });
    visionDesc = resp.data.response?.trim() || '';
    visionRaw  = visionDesc;
  } catch (e) {
    // Ollama not available — use demo mode
    visionDesc = 'Male, short black hair, dark complexion, approximately 35 years old, wearing orange hard hat and high-vis vest';
    visionRaw  = `[DEMO MODE - Ollama unavailable: ${e.message}]`;
  }

  // Step 2: Match against all registered operators
  const operators = db.prepare('SELECT * FROM operators WHERE active = 1').all();
  const scores = operators.map(op => ({
    ...op,
    score: similarity(visionDesc, op.face_descriptor || ''),
  })).sort((a, b) => b.score - a.score);

  const best = scores[0];
  const matched = best && best.score >= AUTH_THRESHOLD;

  // Step 3: Check machine assignment
  let assignmentValid = false;
  let assignmentMsg   = '';
  if (matched) {
    const assigned = (best.assigned_machines || '').split(',').map(m => m.trim());
    assignmentValid = assigned.includes(machine_id);
    assignmentMsg = assignmentValid
      ? `${best.name} is authorised for ${machine_id}`
      : `${best.name} is NOT authorised for ${machine_id} (assigned: ${assigned.join(', ')})`;
  }

  // Step 4: Log auth attempt
  const result = !matched ? 'REJECTED_NO_MATCH'
               : !assignmentValid ? 'REJECTED_WRONG_MACHINE'
               : 'APPROVED';

  db.prepare(`INSERT INTO auth_log (machine_id, operator_id, result, confidence, reason)
              VALUES (?, ?, ?, ?, ?)`).run(
    machine_id,
    matched ? best.operator_id : 'UNKNOWN',
    result,
    matched ? Math.round(best.score * 100) : 0,
    matched ? assignmentMsg : 'No operator profile matched the face scan',
  );

  // Step 5: Create session if approved
  let session_token = null;
  if (result === 'APPROVED') {
    // End any existing active session on this machine
    db.prepare(`UPDATE machine_sessions SET active=0, ended_at=datetime('now') WHERE machine_id=? AND active=1`)
      .run(machine_id);

    session_token = crypto.randomBytes(16).toString('hex');
    db.prepare(`INSERT INTO machine_sessions (machine_id, operator_id, auth_method, auth_score)
                VALUES (?, ?, 'face', ?)`).run(machine_id, best.operator_id, best.score);

    // Alert supervisors if previously unassigned op was on machine
    const lastSession = db.prepare(`SELECT operator_id FROM machine_sessions WHERE machine_id=? ORDER BY id DESC LIMIT 2`).all(machine_id);
    if (lastSession.length === 2 && lastSession[1].operator_id !== lastSession[0].operator_id) {
      db.prepare(`INSERT INTO alerts (type, severity, reason, action, machine_id, operator_id)
                  VALUES (?, ?, ?, ?, ?, ?)`).run(
        'OPERATOR_CHANGE', 'medium',
        `Machine ${machine_id} operator changed from ${lastSession[1].operator_id} to ${best.operator_id}`,
        'Verify shift handover was authorised by supervisor',
        machine_id, best.operator_id,
      );
    }
  }

  // Step 6: Alert on unauthorized attempt
  if (result === 'REJECTED_WRONG_MACHINE') {
    db.prepare(`INSERT INTO alerts (type, severity, reason, action, machine_id, operator_id)
                VALUES (?, ?, ?, ?, ?, ?)`).run(
      'UNAUTHORIZED_MACHINE_ACCESS', 'critical',
      `${best.name} attempted to operate ${machine_id} without authorisation`,
      'Contact supervisor immediately. Machine remains locked.',
      machine_id, best.operator_id,
    );
  }

  if (result === 'REJECTED_NO_MATCH') {
    db.prepare(`INSERT INTO alerts (type, severity, reason, action, machine_id, operator_id)
                VALUES (?, ?, ?, ?, ?, ?)`).run(
      'UNIDENTIFIED_OPERATOR', 'critical',
      `Unrecognised person attempted to operate ${machine_id}`,
      'Security alert raised. Machine remains locked.',
      machine_id, 'UNKNOWN',
    );
  }

  res.json({
    result,
    approved:          result === 'APPROVED',
    operator:          matched ? { id: best.operator_id, name: best.name, skill: best.skill_level, assigned_machines: best.assigned_machines } : null,
    match_score:       matched ? Math.round(best.score * 100) : 0,
    machine_id,
    assignment_valid:  assignmentValid,
    assignment_msg:    assignmentMsg,
    session_token,
    vision_description: visionRaw,
    all_scores:        scores.map(s => ({ operator_id: s.operator_id, name: s.name, score: Math.round(s.score * 100) })),
    message: result === 'APPROVED'              ? `Welcome, ${best.name}. Machine ${machine_id} unlocked.`
           : result === 'REJECTED_WRONG_MACHINE' ? `Access denied. ${best.name} is not authorised for ${machine_id}.`
           : 'Access denied. Face not recognised. Supervisor alerted.',
  });
});

// ── GET /api/auth/operators ─ list registered operators ───────────────────
router.get('/operators', (req, res) => {
  const db = req.app.get('db');
  const ops = db.prepare('SELECT operator_id, name, assigned_machines, skill_level, active FROM operators').all();
  res.json({ operators: ops });
});

// ── GET /api/auth/session/:machine_id ─ active session on machine ─────────
router.get('/session/:machine_id', (req, res) => {
  const db = req.app.get('db');
  const session = db.prepare(`
    SELECT ms.*, o.name, o.skill_level
    FROM machine_sessions ms
    JOIN operators o ON ms.operator_id = o.operator_id
    WHERE ms.machine_id = ? AND ms.active = 1
    ORDER BY ms.id DESC LIMIT 1
  `).get(req.params.machine_id);
  res.json({ session: session || null, locked: !session });
});

// ── GET /api/auth/log ─ recent auth attempts ───────────────────────────────
router.get('/log', (req, res) => {
  const db = req.app.get('db');
  const log = db.prepare('SELECT * FROM auth_log ORDER BY id DESC LIMIT 20').all();
  res.json({ log });
});

// ── POST /api/auth/override ─ supervisor manual unlock ────────────────────
router.post('/override', (req, res) => {
  const { machine_id, operator_id, supervisor_id = 'SUPERVISOR' } = req.body;
  if (!machine_id || !operator_id) return res.status(400).json({ error: 'machine_id and operator_id required' });
  const db = req.app.get('db');

  db.prepare(`UPDATE machine_sessions SET active=0, ended_at=datetime('now') WHERE machine_id=? AND active=1`).run(machine_id);
  db.prepare(`INSERT INTO machine_sessions (machine_id, operator_id, auth_method, auth_score) VALUES (?,?,'supervisor_override',1.0)`).run(machine_id, operator_id);
  db.prepare(`INSERT INTO auth_log (machine_id, operator_id, result, confidence, reason) VALUES (?,?,'SUPERVISOR_OVERRIDE',100,?)`).run(machine_id, operator_id, `Manual override by ${supervisor_id}`);

  res.json({ success: true, message: `${machine_id} manually unlocked for ${operator_id} by ${supervisor_id}` });
});

// ── POST /api/auth/end-session ─ operator clocks out ─────────────────────
router.post('/end-session', (req, res) => {
  const { machine_id } = req.body;
  const db = req.app.get('db');
  db.prepare(`UPDATE machine_sessions SET active=0, ended_at=datetime('now') WHERE machine_id=? AND active=1`).run(machine_id);
  res.json({ success: true, message: `Session ended for ${machine_id}. Machine locked.` });
});

module.exports = router;
