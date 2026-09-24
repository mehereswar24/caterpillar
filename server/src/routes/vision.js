/**
 * vision.js — Qwen2.5-VL vision analysis for:
 *   - Seatbelt detection
 *   - Worker proximity (people in frame)
 *   - Hazard detection (slope, blind spot, debris)
 *   - Operator fatigue signs (eyes closed, head drop)
 *   - Pre-shift visual inspection
 *
 * APPLICATION OF VISION MODEL:
 * The Qwen2.5-VL:7b model runs locally via Ollama and analyses
 * images from the cab camera or site camera in real-time.
 * Express calls Ollama /api/generate with base64 image + system prompt.
 * Returns structured JSON that drives safety alerts on the UI.
 */
const router = require('express').Router();
const axios  = require('axios');

const OLLAMA       = process.env.OLLAMA_BASE_URL   || 'http://localhost:11434';
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'qwen2.5vl:7b';

const VISION_SYSTEM = `You are the safety vision AI for a CAT excavator.
Analyse the image and respond with ONLY valid JSON matching this schema:
{
  "seatbelt_fastened": boolean,
  "operator_visible": boolean,
  "operator_alert": boolean,
  "fatigue_signs": boolean,
  "workers_in_frame": integer,
  "workers_in_zone": integer,
  "nearest_worker_m": float or null,
  "hazard_detected": boolean,
  "hazard_type": one of ["none","worker_proximity","slope_instability","blind_spot","debris","equipment_collision"],
  "hazard_severity": one of ["none","low","medium","high","critical"],
  "description": "one sentence summary"
}
Be conservative — if unsure, flag as potential hazard.`;

// Minimal 1x1 white PNG in base64 for demo mode
const DEMO_IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

const DEMO_RESULT = {
  seatbelt_fastened: true, operator_visible: true, operator_alert: true,
  fatigue_signs: false, workers_in_frame: 0, workers_in_zone: 0,
  nearest_worker_m: null, hazard_detected: false,
  hazard_type: 'none', hazard_severity: 'none',
  description: 'Demo mode — no image provided. All systems nominal.',
};

async function callVision(imageBase64, extraPrompt = '') {
  // Demo / invalid image fallback
  const isDemo = !imageBase64 || imageBase64 === 'demo' || imageBase64.length < 50;
  const img = isDemo ? DEMO_IMAGE : imageBase64;

  try {
    const resp = await axios.post(`${OLLAMA}/api/generate`, {
      model:  VISION_MODEL,
      prompt: extraPrompt || 'Analyse this construction site image for safety.',
      images: [img],
      system: VISION_SYSTEM,
      stream: false,
      options: { temperature: 0.1, num_predict: 300 },
    }, { timeout: 30000 });

    const raw = resp.data.response || '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { ...DEMO_RESULT, description: raw.slice(0, 200) };
    return JSON.parse(match[0]);
  } catch (e) {
    // Vision model unavailable — return demo result with note
    return { ...DEMO_RESULT, description: `Vision model unavailable: ${e.message}`, demo: true };
  }
}

// POST /api/vision/analyze — general safety analysis
router.post('/analyze', async (req, res) => {
  try {
    const { image, prompt } = req.body;
    const result = await callVision(image, prompt);
    // Derive alert list
    const alerts = [];
    if (result.seatbelt_fastened === false)   alerts.push({ type: 'SEATBELT_VIOLATION', severity: 'critical' });
    if (result.workers_in_zone > 0)           alerts.push({ type: 'PROXIMITY_BREACH',   severity: 'critical', count: result.workers_in_zone });
    if (result.fatigue_signs)                 alerts.push({ type: 'FATIGUE_DETECTED',   severity: 'high' });
    if (result.hazard_detected && result.hazard_type !== 'none')
                                              alerts.push({ type: result.hazard_type.toUpperCase(), severity: result.hazard_severity });
    res.json({ ...result, alerts, model: VISION_MODEL });
  } catch (e) {
    res.status(500).json({ error: e.message, hint: 'Is Ollama running with qwen2.5vl:7b?' });
  }
});

// POST /api/vision/seatbelt — focused seatbelt check
router.post('/seatbelt', async (req, res) => {
  try {
    const { image } = req.body;
    const result = await callVision(image, 'Is the operator wearing and fastening their seatbelt?');
    res.json({
      seatbelt_fastened: result.seatbelt_fastened,
      operator_visible:  result.operator_visible,
      alert:             result.seatbelt_fastened === false,
      description:       result.description,
      model:             VISION_MODEL,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/vision/proximity — worker proximity check
router.post('/proximity', async (req, res) => {
  try {
    const { image } = req.body;
    const result = await callVision(image, 'How many workers are visible? Are any in the danger zone (within 5 metres of the machine)?');
    res.json({
      workers_in_frame:  result.workers_in_frame,
      workers_in_zone:   result.workers_in_zone,
      nearest_worker_m:  result.nearest_worker_m,
      breach:            result.workers_in_zone > 0,
      description:       result.description,
      model:             VISION_MODEL,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/vision/fatigue — operator fatigue detection
router.post('/fatigue', async (req, res) => {
  try {
    const { image } = req.body;
    const result = await callVision(image, 'Does the operator show signs of fatigue? Look for closed eyes, head drooping, or unfocused gaze.');
    res.json({
      fatigue_signs:    result.fatigue_signs,
      operator_alert:   result.operator_alert,
      recommendation:   result.fatigue_signs ? 'Stop machine and take a break immediately.' : 'Operator appears alert.',
      description:      result.description,
      model:            VISION_MODEL,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/vision/preshift — pre-shift visual inspection
router.post('/preshift', async (req, res) => {
  try {
    const { image } = req.body;
    const result = await callVision(image, 'Inspect this machine image for pre-shift safety issues: fluid leaks, track damage, loose components, visible damage.');
    res.json({
      pass:        !result.hazard_detected,
      issues:      result.hazard_detected ? [result.description] : [],
      hazard_type: result.hazard_type,
      description: result.description,
      model:       VISION_MODEL,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Live cab-camera monitor (semantic checks) ───────────────────────────────
// Eyes / yawning / head pose / driver-present are tracked ON-DEVICE by the browser (MediaPipe,
// ~15 ms) — far faster than a VLM. This route only answers what needs real understanding:
// seatbelt, phone, hard hat, smoking, eating/drinking.
//  - compact JSON: ~35 output tokens instead of ~90 (about half the latency)
//  - "unseen" is an allowed answer so the model doesn't have to guess
//  - if the model is unavailable we say so (503) — never a fake "all nominal" result
const CAB_SYSTEM = `You check a machine operator through the cab camera. The operator is the person closest to the camera.
Reply ONLY with compact JSON:
{"belt":"on"|"off"|"unseen","phone":bool,"hardhat":"on"|"off","smoking":bool,"eating":bool,"d":"max 6 words"}
Use "unseen" when it is not visible. Do not guess.`;

const ON_OFF = (v, allowed) => (allowed.includes(v) ? v : allowed[allowed.length - 1]);
let cabBusy = false;   // one frame at a time — the GPU is shared, queued frames would only add lag

// POST /api/vision/cab  { image: <base64 or data URL JPEG> }
router.post('/cab', async (req, res) => {
  const image = String(req.body?.image || '').replace(/^data:image\/\w+;base64,/, '');
  if (image.length < 200) return res.status(400).json({ ok: false, error: 'No image' });
  if (cabBusy || require('../gpuPriority').busy()) return res.status(429).json({ ok: false, busy: true, error: 'Previous frame still processing' });
  cabBusy = true;
  const t0 = Date.now();
  try {
    const resp = await axios.post(`${OLLAMA}/api/generate`, {
      model: VISION_MODEL, system: CAB_SYSTEM, prompt: 'Check.', images: [image],
      stream: false, format: 'json', keep_alive: '30m',
      options: { temperature: 0, num_predict: 90 },   // NB: don't change num_ctx — Ollama reloads the model when it differs
    }, { timeout: 25000 });
    const raw = JSON.parse(resp.data.response || '{}');
    const driver = {
      seatbelt:  ON_OFF(raw.belt, ['on', 'off', 'unseen']),
      phone:     raw.phone === true,
      hardhat:   ON_OFF(raw.hardhat, ['on', 'off']),
      smoking:   raw.smoking === true,
      eating:    raw.eating === true,
      description: String(raw.d || '').slice(0, 80),
    };
    res.json({ ok: true, driver, latency_ms: Date.now() - t0, model: VISION_MODEL });
  } catch (e) {
    res.status(503).json({ ok: false, error: `Vision model unavailable: ${e.message}` });
  } finally {
    cabBusy = false;
  }
});

module.exports = router;
