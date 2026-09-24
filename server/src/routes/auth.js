/**
 * auth.js — Face authentication (local ArcFace embeddings, see faceStore.js)
 *
 * Flow:
 *   1. Cab camera captures image → base64 sent to POST /api/auth/face
 *   2. face service turns the photo into a 512-d identity vector
 *   3. vector compared (cosine) against the vectors enrolled for each operator
 *   4. Best match above threshold and clear of the runner-up → session created, machine unlocked
 *   5. No match → UNAUTHORIZED logged, machine stays locked
 *   6. Supervisor can override via POST /api/auth/override
 */
const router = require('express').Router();
const crypto = require('crypto');
const faces  = require('../faceStore');

// ── POST /api/auth/face ────────────────────────────────────────────────────
router.post('/face', async (req, res) => {
  const { image, machine_id = 'EXC001', operator_id: claimedId } = req.body;
  if (!image || image === 'demo' || image.length < 200) return res.status(400).json({ approved: false, result: 'ERROR_NO_IMAGE', error: 'A real camera image (base64) is required' });

  const db = req.app.get('db');

  // Step 1: read the face (fails CLOSED — no face service, no entry)
  let probe;
  try {
    probe = await faces.embed(image);
  } catch (e) {
    return res.status(503).json({
      approved: false, result: 'ERROR_FACE_SERVICE_UNAVAILABLE', operator: null, machine_id,
      error: e.message,
      message: 'Face recognition is unavailable, so the machine stays locked. Ask a supervisor for an override.',
    });
  }
  const logAttempt = (result, reason, opId = 'UNKNOWN', conf = 0) =>
    db.prepare('INSERT INTO auth_log (machine_id, operator_id, result, confidence, reason) VALUES (?, ?, ?, ?, ?)').run(machine_id, opId, result, conf, reason);

  if (!probe.ok || !probe.embedding) {
    const message = faces.reasonText(probe.reason);
    logAttempt('REJECTED_BAD_SCAN', `Unusable scan: ${probe.reason || 'unknown'}`);
    return res.json({ approved: false, result: 'REJECTED_BAD_SCAN', operator: null, machine_id, message, scan_problem: probe.reason });
  }

  // Step 2: compare against every enrolled operator
  const ranked = faces.identify(db, probe.embedding);
  if (!ranked.length) {
    return res.json({ approved: false, result: 'REJECTED_NOT_ENROLLED', operator: null, machine_id,
      message: 'No operator faces are enrolled yet. Ask a supervisor to enroll faces first.' });
  }
  const operators = db.prepare('SELECT * FROM operators WHERE active = 1').all();
  const byId = new Map(ranked.map(r => [r.operator_id, r.score]));
  const scores = operators.map(op => ({ ...op, score: Math.max(0, byId.get(op.operator_id) ?? 0) }))
    .sort((a, b) => b.score - a.score);
  const best = scores[0];
  const matched = faces.isMatch(ranked);
  const visionRaw = `face match ${(ranked[0].score * 100).toFixed(0)}% (${probe.face_px?.toFixed(0)}px face)`;

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
  // The driver picked a profile before scanning: the face has to be THAT person's.
  const wrongProfile = matched && claimedId && best.operator_id !== claimedId;
  const result = !matched ? 'REJECTED_NO_MATCH'
               : wrongProfile ? 'REJECTED_PROFILE_MISMATCH'
               : !assignmentValid ? 'REJECTED_WRONG_MACHINE'
               : 'APPROVED';

  db.prepare(`INSERT INTO auth_log (machine_id, operator_id, result, confidence, reason)
              VALUES (?, ?, ?, ?, ?)`).run(
    machine_id,
    matched ? best.operator_id : 'UNKNOWN',
    result,
    matched ? Math.round(best.score * 100) : 0,
    wrongProfile ? `Face matched ${best.operator_id}, but ${claimedId} was selected`
      : matched ? assignmentMsg : 'No operator profile matched the face scan',
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
           : result === 'REJECTED_PROFILE_MISMATCH' ? `Face matches ${best.name}, not the selected driver profile. Select the right profile or ask a supervisor.`
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
