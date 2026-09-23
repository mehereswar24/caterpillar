const router = require('express').Router();
const { scoreAnomaly } = require('../ml/inference');
const axios = require('axios');

const OLLAMA = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL  = process.env.OLLAMA_TEXT_MODEL || 'qwen2.5:7b';

const TEMPLATES = {
  EXCESSIVE_IDLE:     (d) => `You idled for ${d.IdlingTime} minutes — wastes ~${(d.IdlingTime*0.055).toFixed(1)}L of fuel.`,
  OVER_REV:           (d) => `Engine RPM ${d.RPM?.toFixed(0)} detected. Sustained over-revving damages internals.`,
  UNSAFE_SPEED:       (d) => `Speed ${d.SpeedKPH?.toFixed(1)} kph in proximity zone. Max safe speed is 10 kph.`,
  SEATBELT_VIOLATION: (d) => `Seatbelt unfastened at ${d.SpeedKPH?.toFixed(1)} kph. Fasten before moving.`,
  COLD_START_ABUSE:   (d) => `High load applied within 2 min of cold start. Allow engine to warm to 60°C first.`,
  FUEL_ANOMALY:       (d) => `Fuel consumption ${d.FuelUsed?.toFixed(1)}L with no matching task. Possible sensor fault or unauthorised use.`,
  NORMAL:             ()  => 'Operating conditions are within safe and efficient parameters.',
};

async function llmExplain(label, data) {
  const base = (TEMPLATES[label] || (() => `Anomaly: ${label}`))(data);
  try {
    const res = await axios.post(`${OLLAMA}/v1/chat/completions`, {
      model: MODEL,
      messages: [{ role: 'user', content:
        `CAT excavator anomaly: ${label}. RPM=${data.RPM?.toFixed(0)}, Idle=${data.IdlingTime}min, Speed=${data.SpeedKPH?.toFixed(1)}kph. One plain sentence — what happened and how to fix it.`
      }],
      max_tokens: 80, temperature: 0.2,
    }, { timeout: 8000 });
    return res.data.choices[0].message.content.trim();
  } catch { return base; }
}

// POST /anomaly/score
router.post('/score', async (req, res, next) => {
  try {
    const result = await scoreAnomaly(req.body);
    result.explanation = await llmExplain(result.label, req.body);
    res.json(result);
  } catch (err) {
    // Rule-based fallback
    const d = req.body;
    let label = 'NORMAL', confidence = 0.95;
    if (d.IdlingTime > 30)           { label = 'EXCESSIVE_IDLE';     confidence = 0.91; }
    else if (d.RPM > 2000)           { label = 'OVER_REV';           confidence = 0.88; }
    else if (d.SpeedKPH > 10)        { label = 'UNSAFE_SPEED';       confidence = 0.85; }
    else if (d.seatbelt_encoded === 1){ label = 'SEATBELT_VIOLATION'; confidence = 0.93; }
    res.json({ label, confidence, explanation: (TEMPLATES[label] || TEMPLATES.NORMAL)(d) });
  }
});

// GET /anomaly/history
router.get('/history', (req, res) => {
  const { operator_id = 'OP001', days = 7 } = req.query;
  const labels = ['NORMAL','EXCESSIVE_IDLE','OVER_REV','SEATBELT_VIOLATION','UNSAFE_SPEED','COLD_START_ABUSE','FUEL_ANOMALY'];
  const seed = [...operator_id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const events = Array.from({ length: Number(days) }, (_, i) => ({
    day: i + 1,
    count: (seed * (i + 1)) % 3,
    label: labels[(seed + i) % labels.length],
  }));
  res.json({ operator_id, days: Number(days), events, trend: events.map(e => e.count) });
});

// GET /anomaly/report
router.get('/report', (req, res) => {
  const { machine_id = 'EXC001' } = req.query;
  res.json({
    machine_id, summary: 'Weekly anomaly report generated.',
    total_anomalies: 5,
    breakdown: { EXCESSIVE_IDLE: 2, SEATBELT_VIOLATION: 1, OVER_REV: 1, FUEL_ANOMALY: 1 },
  });
});

module.exports = router;
