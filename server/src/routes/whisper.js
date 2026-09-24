// whisper.js — Proxy route: Express → local Python Whisper server (port 5001)
const router = require('express').Router();
const axios  = require('axios');
const multer = require('multer');

const WHISPER_URL = process.env.WHISPER_URL || 'http://127.0.0.1:5001';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// GET /api/whisper/health
router.get('/health', async (req, res) => {
  try {
    const r = await axios.get(`${WHISPER_URL}/health`, { timeout: 3000 });
    res.json(r.data);
  } catch {
    res.status(503).json({ ok: false, error: 'Whisper server not running' });
  }
});

// POST /api/whisper/transcribe — multipart/form-data with field "audio"
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file?.buffer?.length) return res.status(400).json({ ok: false, error: 'No audio uploaded' });
  const ext = (req.file.originalname.split('.').pop() || 'webm').toLowerCase();
  try {
    const r = await axios.post(`${WHISPER_URL}/transcribe`, req.file.buffer, {
      headers: { 'Content-Type': 'application/octet-stream', 'X-Audio-Ext': ext },
      timeout: 120000,
      maxBodyLength: Infinity,
    });
    res.json(r.data);
  } catch (e) {
    const status = e.response?.status || 503;
    res.status(status).json({
      ok: false,
      error: e.response?.data?.error || e.message,
      hint: e.response ? undefined : 'Is whisper_server.py running on port 5001?',
    });
  }
});

module.exports = router;
