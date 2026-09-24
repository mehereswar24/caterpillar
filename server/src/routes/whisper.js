// whisper.js — Proxy route: Express → local Python Whisper server (port 5001)
const router = require('express').Router();
const axios  = require('axios');
const FormData = require('form-data');

const WHISPER_URL = process.env.WHISPER_URL || 'http://127.0.0.1:5001';

// GET /api/whisper/health
router.get('/health', async (req, res) => {
  try {
    const r = await axios.get(`${WHISPER_URL}/health`, { timeout: 3000 });
    res.json(r.data);
  } catch {
    res.status(503).json({ ok: false, error: 'Whisper server not running' });
  }
});

// POST /api/whisper/transcribe — expects multipart/form-data with field "audio"
router.post('/transcribe', async (req, res) => {
  try {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', async () => {
      const body = Buffer.concat(chunks);
      // Forward raw body + headers to Whisper server
      const r = await axios.post(`${WHISPER_URL}/transcribe`, body, {
        headers: {
          'Content-Type': req.headers['content-type'],
          'Content-Length': body.length,
        },
        timeout: 60000,
        maxContentLength: 50 * 1024 * 1024,
      });
      res.json(r.data);
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, hint: 'Is whisper_server.py running on port 5001?' });
  }
});

module.exports = router;
