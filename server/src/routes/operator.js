const router = require('express').Router();
const axios = require('axios');

const OLLAMA = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL  = process.env.OLLAMA_TEXT_MODEL || 'qwen2.5:7b';

function safetyScore(operator_id) {
  const seed = [...operator_id].reduce((a,c)=>a+c.charCodeAt(0),0);
  return { safety_score: 75+(seed%25), efficiency_score: 80+(seed%18), shift_hours:7.5, idle_minutes:22, seatbelt_alerts:0, proximity_alerts:1 };
}

async function llmCoaching(operator_id, scores) {
  const prompt = `You are a safety coach for a CAT excavator operator. Write a 2-sentence post-shift debrief for operator ${operator_id}. Data: safety ${scores.safety_score}/100, idle ${scores.idle_minutes}min, seatbelt alerts ${scores.seatbelt_alerts}, proximity alerts ${scores.proximity_alerts}. Be direct and constructive. No markdown.`;
  try {
    const res = await axios.post(`${OLLAMA}/v1/chat/completions`, {
      model: MODEL,
      messages: [{ role:'user', content: prompt }],
      max_tokens: 80, temperature: 0.4,
    }, { timeout: 12000 });
    return res.data.choices[0].message.content.trim();
  } catch {
    const s = scores;
    if (s.idle_minutes > 30) return `Your safety score is ${s.safety_score}/100. Watch idle time — ${s.idle_minutes} minutes wastes fuel.`;
    if (s.seatbelt_alerts)   return `Your safety score is ${s.safety_score}/100. ${s.seatbelt_alerts} seatbelt alert(s) — always fasten before moving.`;
    return `Your safety score is ${s.safety_score}/100. Excellent shift — no major alerts. Keep it up.`;
  }
}

// GET /operator/score
router.get('/score', (req, res) => {
  const { operator_id = 'OP001' } = req.query;
  res.json({ operator_id, ...safetyScore(operator_id) });
});

// GET /operator/coaching
router.get('/coaching', async (req, res) => {
  const { operator_id = 'OP001' } = req.query;
  const scores = safetyScore(operator_id);
  const debrief = await llmCoaching(operator_id, scores);
  res.json({ operator_id, debrief, scores });
});

// GET /operator/wellness
router.get('/wellness', (req, res) => {
  const { operator_id = 'OP001' } = req.query;
  const seed = [...operator_id].reduce((a,c)=>a+c.charCodeAt(0),0);
  res.json({ operator_id, fatigue_score: (seed%40)/100, hours_on_shift:7.5,
    break_recommended: (seed%3)===0, last_break_mins_ago: 55+(seed%30) });
});

module.exports = router;
