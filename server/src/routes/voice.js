/**
 * voice.js — RAG voice assistant using embedded KB + Ollama Qwen2.5:7b.
 * No Python, no external files. KB embedded directly in JS.
 */
const router = require('express').Router();
const axios  = require('axios');

const OLLAMA     = process.env.OLLAMA_BASE_URL  || 'http://localhost:11434';
const TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL || 'qwen2.5:7b';


const gpu = require('../gpuPriority');
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'qwen2.5vl:7b';

// Models to try, best first: the one already in GPU memory, then the other.
async function modelOrder() {
  let loaded = [];
  try {
    const r = await axios.get(`${OLLAMA}/api/ps`, { timeout: 1500 });
    loaded = (r.data.models || []).map(m => m.name);
  } catch { /* Ollama unreachable: fall through to the default order */ }
  if (loaded.includes(TEXT_MODEL)) return [TEXT_MODEL, VISION_MODEL];
  if (loaded.includes(VISION_MODEL)) return [VISION_MODEL, TEXT_MODEL];
  return [TEXT_MODEL, VISION_MODEL];
}

// ── Embedded Knowledge Base (key excerpts from 8 CAT manuals) ─────────────
const KB = [
  // Specs
  { text:'Maximum safe tilt angle is 15 degrees on any slope. Maximum travel speed on grade above 15 degrees is 5 km/h.', source:'01_excavator_specs' },
  { text:'Fuel tank capacity is 345 litres. Engine oil capacity is 22 litres with filter. Hydraulic tank capacity is 215 litres.', source:'01_excavator_specs' },
  { text:'Maximum digging depth is 6.69 metres. Maximum reach at ground level is 9.78 metres.', source:'01_excavator_specs' },
  { text:'Engine RPM should not exceed 2100 during normal work. Hydraulic system relief pressure is 34300 kPa (4975 psi).', source:'01_excavator_specs' },
  // Maintenance
  { text:'Every 10 hours: check engine oil, coolant, hydraulic oil, track tension. Inspect for fluid leaks.', source:'02_maintenance' },
  { text:'Every 250 hours: change engine oil and filter using CAT DEO 15W-40.', source:'02_maintenance' },
  { text:'Every 500 hours: replace primary and secondary fuel filters, hydraulic tank breather filter.', source:'02_maintenance' },
  { text:'Every 1000 hours: change hydraulic oil return filter and swing drive oil.', source:'02_maintenance' },
  { text:'Every 2000 hours: complete hydraulic oil change — flush tank, change all filters, refill with 215 L of CAT HYDO Advanced 10.', source:'02_maintenance' },
  { text:'Recommended engine oil: CAT DEO 15W-40. Hydraulic fluid: CAT HYDO Advanced 10 ISO VG 46. Coolant: CAT ELC Extended Life Coolant 50/50.', source:'02_maintenance' },
  // Troubleshooting
  { text:'Engine overheating: stop work immediately, idle 2 minutes then shut down, check coolant level, inspect radiator for blockage, inspect fan belt.', source:'03_troubleshooting' },
  { text:'Hydraulics slow or weak: check hydraulic oil level, replace hydraulic filter, test pump pressure — should be 34300 kPa maximum.', source:'03_troubleshooting' },
  { text:'Engine will not start: check battery voltage, fuel shutoff valve, fuel level, replace fuel filter.', source:'03_troubleshooting' },
  { text:'Track coming off: stop immediately, adjust track tension — correct sag is 10-15 mm. Replace worn sprocket or idler.', source:'03_troubleshooting' },
  { text:'Hydraulic oil temperature warning: stop productive work, idle at low RPM, check oil level and oil cooler.', source:'03_troubleshooting' },
  { text:'Black smoke from exhaust: clogged air filter or engine overload. Replace air filter and reduce load.', source:'03_troubleshooting' },
  // Safety
  { text:'Seatbelt must be fastened at all times when engine is running. ROPS only protects operator when seatbelt is fastened.', source:'04_safety' },
  { text:'Minimum exclusion zone around machine during operation is 5 metres. No workers allowed within this zone.', source:'04_safety' },
  { text:'Do not operate on slopes greater than 35 degrees. For sustained work limit slopes to 15 degrees. Always travel up and down slopes, never across.', source:'04_safety' },
  { text:'Before swinging, sound horn twice and check mirrors. Never lift loads over people or truck cabs.', source:'04_safety' },
  { text:'When parking: lower all attachments to ground, engage park brake, reduce to idle for 5 minutes, turn key off, remove key.', source:'04_safety' },
  // Operator health
  { text:'Maximum continuous operating time is 4 hours before a 30-minute break. Fatigue is a leading cause of construction accidents.', source:'05_operator_health' },
  { text:'Signs of fatigue: eyes closing involuntarily, missing signals, difficulty remembering last few minutes. Stop machine and rest immediately.', source:'05_operator_health' },
  { text:'Drink at least 500 ml of water per hour in temperatures above 25 degrees Celsius. Dehydration reduces concentration.', source:'05_operator_health' },
  { text:'Heat stroke: no sweating, hot dry skin, confusion — this is a medical emergency. Call ambulance immediately and cool the person rapidly.', source:'05_operator_health' },
  { text:'Adjust seat so lumbar support presses against lower back. Take a 5-minute walk every 2 hours to prevent back strain.', source:'05_operator_health' },
  // Operations
  { text:'Allow engine to idle for 5 minutes before operating under load. In cold weather below 5 degrees idle for 10 minutes.', source:'06_operations' },
  { text:'Idle for no more than 3-5 minutes when waiting. Unnecessary idling burns 6-8 litres per hour with zero productive output.', source:'06_operations' },
  { text:'Reduce swing angle between dig and dump to below 90 degrees. Every 10 degree reduction saves approximately 3 percent fuel.', source:'06_operations' },
  { text:'Target 100 percent bucket fill on each pass. Adjust crowd and curl pressure to match soil hardness.', source:'06_operations' },
  // Emergency
  { text:'Machine fire: press emergency stop, exit cab, move 50 metres upwind, call emergency services. Do not open engine hood.', source:'07_emergency' },
  { text:'Machine rollover: stay in cab, grip handlebar, do not jump. ROPS structure protects you if seatbelt is fastened.', source:'07_emergency' },
  { text:'Hydraulic injection injury: go to emergency department immediately, tell doctor it is a high-pressure injection injury. Surgery usually required.', source:'07_emergency' },
  { text:'Worker struck by machine: stop immediately, do not move machine, call emergency services, do not move the injured person.', source:'07_emergency' },
  { text:'Gas line strike: stop excavation, do not use any electrical switch, evacuate 50 metre radius, call emergency services.', source:'07_emergency' },
  // Attachments
  { text:'Hydraulic breaker: never operate without material contact for more than 15 seconds — blank firing destroys the piston.', source:'08_attachments' },
  { text:'Quick coupler safety: after connecting, test by lifting 300 mm and applying full curl then dump. Confirm both locking pins are extended.', source:'08_attachments' },
  { text:'Auger operation: apply light crowd pressure, engage rotation. Do not apply excessive crowd force — let the cutting torque advance the auger.', source:'08_attachments' },
];

// ── Simple BM25-style keyword retrieval in JS ─────────────────────────────
const STOP = new Set(['a','an','the','is','it','in','on','at','to','of','for','and','or','but','what','how','should','do','i','my','me']);

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w));
}

function retrieve(query, topK=4) {
  const qTok = tokenize(query);
  return KB
    .map(doc => {
      const dTok = tokenize(doc.text);
      const dSet = new Set(dTok);
      const hits = qTok.filter(w=>dSet.has(w)).length;
      return { ...doc, score: hits };
    })
    .filter(d=>d.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,topK);
}

function buildPrompt(question, hits, opCtx) {
  const context = hits.length
    ? hits.map(h=>`[${h.source}] ${h.text}`).join('\n')
    : 'No relevant section found.';
  const opStr = opCtx && Object.keys(opCtx).length
    ? '\nCURRENT OPERATOR STATUS:\n' + Object.entries(opCtx).map(([k,v])=>`  ${k}: ${v}`).join('\n')
    : '';
  return `You are the CAT Smart Operator voice assistant inside a CAT 320 excavator.
Answer using ONLY the knowledge base below. Be concise — 2-3 sentences max.
Only when the question describes an emergency or immediate danger (fire, rollover, injury, gas strike, overheating in progress) start your answer with: SAFETY ALERT. For routine questions such as specs, intervals or procedures, answer directly without that prefix.

KNOWLEDGE BASE:
${context}${opStr}

OPERATOR QUESTION: ${question}

ANSWER:`;
}

// POST /api/voice/ask
router.post('/ask', async (req, res) => {
  try {
    const { question, operator_context } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    const hits    = retrieve(question);
    const prompt  = buildPrompt(question, hits, operator_context || {});
    const sources = [...new Set(hits.map(h=>h.source))];

    let answer = 'Ollama not available — check that Ollama is running with qwen2.5:7b.';
    let usedModel = TEXT_MODEL;
    gpu.begin();
    try {
      // With one GPU, swapping between the text and vision models costs 10-20 s. Use whichever is resident.
      for (const model of await modelOrder()) {
        try {
          const resp = await axios.post(`${OLLAMA}/api/generate`, {
            model, prompt, stream: false, keep_alive: '10m',
            options: { temperature: 0.3, num_predict: 150 },
          }, { timeout: 30000 });
          const text = resp.data.response?.trim();
          if (text) { answer = text; usedModel = model; break; }
        } catch (e) {
          answer = `Ollama unreachable: ${e.message}`;
        }
      }
    } finally {
      gpu.end();
    }

    res.json({ question, answer, sources, model: usedModel });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET convenience
router.get('/ask', async (req, res) => {
  req.body = { question: req.query.q, operator_context: {} };
  const hits   = retrieve(req.query.q || '');
  const prompt = buildPrompt(req.query.q || '', hits, {});
  const sources = hits.map(h=>h.source);
  let answer = 'Ollama not available.';
  try {
    const resp = await axios.post(`${OLLAMA}/api/generate`,
      { model:TEXT_MODEL, prompt, stream:false, options:{temperature:0.3,num_predict:150} },
      { timeout:25000 });
    answer = resp.data.response?.trim() || answer;
  } catch {}
  res.json({ question: req.query.q, answer, sources, model: TEXT_MODEL });
});

router.post('/transcribe', (req, res) => {
  res.json({ transcript: req.body.text || '', note: 'Use browser Web Speech API for live transcription.' });
});

// POST /api/voice/safety-check — quick safety keyword check
router.post('/safety-check', (req, res) => {
  const { question = '' } = req.body;
  const q = question.toLowerCase();
  const SAFETY_KEYWORDS = ['proximity','breach','seatbelt','fire','rollover','gas','struck','crush','tilt','slope','overheat','pressure','flood','emergency'];
  const triggered = SAFETY_KEYWORDS.filter(k => q.includes(k));
  const hits = retrieve(question, 3);
  res.json({
    question,
    safety_triggered: triggered.length > 0,
    keywords_matched: triggered,
    relevant_sections: hits.map(h => ({ source: h.source, text: h.text })),
    recommendation: triggered.length > 0
      ? `SAFETY ALERT: ${triggered[0].toUpperCase()} detected. ${hits[0]?.text || 'Stop machine and assess.'}`
      : 'No immediate safety concern detected.',
  });
});

module.exports = router;
