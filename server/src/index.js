require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── MongoDB ─────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/caterpillar';
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.warn('MongoDB not connected — using in-memory fallback:', err.message));

// ── Routes ───────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ message: 'CAT Smart Operator API is running.' }));

app.use('/anomaly',     require('./routes/anomaly'));
app.use('/task',        require('./routes/task'));
app.use('/maintenance', require('./routes/maintenance'));
app.use('/safety',      require('./routes/safety'));
app.use('/operator',    require('./routes/operator'));
app.use('/fleet',       require('./routes/fleet'));
app.use('/incidents',   require('./routes/incidents'));
app.use('/training',    require('./routes/training'));
app.use('/voice',       require('./routes/voice'));

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`CAT API listening on port ${PORT}`));
