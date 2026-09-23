const router  = require('express').Router();
const { spawnSync } = require('child_process');
const axios   = require('axios');
const path    = require('path');

const OLLAMA     = process.env.OLLAMA_BASE_URL  || 'http://localhost:11434';
const TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL || 'qwen2.5:7b';
const PYTHON     = process.env.PYTHON_PATH       || 'python3';
const RAG_SCRIPT = path.join(__dirname, '../../../core/rag_ask.py');

// POST /api/voice/ask  — RAG + Qwen text answer
router.post('/ask', async (req, res) => {
  try {
    const { question, operator_context } = req.body;
    if (!question) return res.status(400).json({ error: 'question required' });

    // Build RAG prompt via Python
    const ragResult = spawnSync(PYTHON,
      [RAG_SCRIPT, 'prompt', JSON.stringify({ question, operator_context: operator_context || {} })],
      { encoding: 'utf8', timeout: 10000 });
    const fb = PYTHON === 'python3' ? 'python' : 'python3';
    const ragFinal = (ragResult.error || ragResult.status !== 0)
      ? spawnSync(fb, [RAG_SCRIPT, 'prompt', JSON.stringify({ question, operator_context: operator_context || {} })], { encoding: 'utf8', timeout: 10000 })
      : ragResult;

    let prompt = question;
    let sources = [];
    try {
      const parsed = JSON.parse(ragFinal.stdout.trim());
      prompt  = parsed.prompt;
      sources = parsed.sources || [];
    } catch { /* fallback to raw question */ }

    // Call Ollama
    let answer = 'Ollama not available — check local server.';
    try {
      const resp = await axios.post(`${OLLAMA}/api/generate`, {
        model: TEXT_MODEL, prompt, stream: false, options: { temperature: 0.3, num_predict: 150 }
      }, { timeout: 20000 });
      answer = resp.data.response?.trim() || answer;
    } catch (e) {
      answer = `Could not reach Ollama (${e.message}). Check that Ollama is running with qwen2.5:7b.`;
    }

    res.json({ question, answer, sources, model: TEXT_MODEL });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/voice/ask?q=... — convenience GET version
router.get('/ask', async (req, res) => {
  req.body = { question: req.query.q, operator_context: {} };
  return router.handle({ ...req, method: 'POST', url: '/ask' }, res, () => {});
});

// POST /api/voice/transcribe — stub (real STT needs Whisper locally)
router.post('/transcribe', (req, res) => {
  res.json({ transcript: req.body.text || '', note: 'Use browser Web Speech API for live transcription.' });
});

// POST /api/voice/tts — text-to-speech via browser (returns SSML hint)
router.post('/tts', (req, res) => {
  res.json({ text: req.body.text, voice: 'Use browser SpeechSynthesis API.', ssml: `<speak>${req.body.text}</speak>` });
});

module.exports = router;
