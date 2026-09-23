const router = require('express').Router();
const axios = require('axios');

const OLLAMA = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL  = process.env.OLLAMA_TEXT_MODEL || 'qwen2.5:7b';

// T0 grammar patterns
const T0_PATTERNS = [
  { pattern: /safety\s*score/i,         skill: 'operator.safety_score',
    respond: () => `Your safety score today is 84 out of 100. One seatbelt alert this shift.` },
  { pattern: /idle|idling/i,             skill: 'operator.idle',
    respond: () => `You have idled for 22 minutes this shift. Reduce idle time to save fuel.` },
  { pattern: /how long|time|estimate|eta/i, skill: 'task.estimate',
    respond: () => `Estimated 52 minutes, plus or minus 8. Wet soil adds 18 minutes.` },
  { pattern: /proximity|worker|zone/i,  skill: 'safety.proximity',
    respond: () => `1 proximity alert logged this shift. No workers currently in zone.` },
  { pattern: /maintenance|service/i,    skill: 'maintenance.status',
    respond: () => `Next service due in approximately 413 hours. Engine component at risk.` },
  { pattern: /fuel/i,                   skill: 'operator.fuel',
    respond: () => `Fuel level is at 72%. Estimated 6 hours of operation remaining.` },
  { pattern: /seatbelt/i,               skill: 'safety.seatbelt',
    respond: () => `Seatbelt is currently fastened. Stay buckled while operating.` },
  { pattern: /weather/i,                skill: 'site.weather',
    respond: () => `Current conditions: Cloudy, 22°C, wind 12 kph. Rainy conditions expected later.` },
];

async function t2Respond(transcript) {
  try {
    const res = await axios.post(`${OLLAMA}/v1/chat/completions`, {
      model: MODEL,
      messages: [
        { role:'system', content:'You are the voice assistant for a CAT excavator operator. Answer in one plain sentence. No markdown.' },
        { role:'user', content: transcript },
      ],
      max_tokens: 60, temperature: 0.3,
    }, { timeout: 10000 });
    return res.data.choices[0].message.content.trim();
  } catch {
    return `I heard: "${transcript}". Please check your dashboard for details.`;
  }
}

// POST /voice/respond
router.post('/respond', async (req, res) => {
  const { transcript='', operator_id='OP001', machine_id='EXC001' } = req.body;

  // T0 — grammar match
  for (const rule of T0_PATTERNS) {
    if (rule.pattern.test(transcript)) {
      return res.json({ speech_text: rule.respond(), skill_id: rule.skill, tier:'t0', action_taken:'executed' });
    }
  }

  // T2 — LLM fallback
  const speech_text = await t2Respond(transcript);
  res.json({ speech_text, skill_id:'llm.freeform', tier:'t2', action_taken:'executed' });
});

// POST /voice/transcribe
router.post('/transcribe', (req, res) => {
  // Whisper runs as a Python subprocess — stub for now
  res.json({ transcript:'Voice transcription requires Whisper (Python). Use /voice/respond with text input.', confidence:0 });
});

module.exports = router;
