const router = require('express').Router();
const { estimateTask } = require('../ml/inference');

const TASK_NAMES   = { 0:'dig', 1:'load', 2:'grade', 3:'compact', 4:'trench' };
const WEATHER_LABELS = { 0:'Sunny', 1:'Cloudy', 2:'Rainy', 3:'Foggy' };
const WEATHER_FACTORS = { 0:1.0, 1:1.05, 2:1.3, 3:1.2 };
const SOIL_LABELS    = { 0:'Dry', 1:'Wet', 2:'Rocky', 3:'Muddy' };
const SOIL_FACTORS   = { 0:1.0, 1:1.2, 2:1.5, 3:1.4 };

// POST /task/estimate
router.post('/estimate', async (req, res) => {
  try {
    const result = await estimateTask(req.body);
    res.json(result);
  } catch {
    // Fallback formula
    const { TaskType_encoded=0, Weather_encoded=1, SoilType_encoded=1 } = req.body;
    const base = [45,30,60,40,90][TaskType_encoded % 5];
    const dur = Math.max(5, Math.round(base * (WEATHER_FACTORS[Weather_encoded]||1) * (SOIL_FACTORS[SoilType_encoded]||1)));
    const shap = {};
    const wa = Math.round((( WEATHER_FACTORS[Weather_encoded]||1) - 1) * dur);
    const sa = Math.round(((SOIL_FACTORS[SoilType_encoded]||1) - 1) * dur);
    if (wa) shap[`${WEATHER_LABELS[Weather_encoded]} weather`] = wa;
    if (sa) shap[`${SOIL_LABELS[SoilType_encoded]} soil`] = sa;
    res.json({ duration_min: dur, interval: Math.max(3, Math.round(dur*0.15)), shap_factors: shap,
      explanation: Object.entries(shap).map(([k,v])=>`${k} adds ${v} min`).join('. ') || 'Standard conditions.',
      task_name: TASK_NAMES[TaskType_encoded] || 'unknown' });
  }
});

// GET /task/dashboard
router.get('/dashboard', (req, res) => {
  res.json({
    operator_id: req.query.operator_id || 'OP001',
    date: new Date().toISOString().slice(0,10),
    weather: 'Cloudy, 22°C',
    tasks: [
      { id:1, type:'Trenching', location:'Sector 4', status:'In Progress', eta:'52 min', explanation:'Wet soil +18 min, Cloudy +2 min' },
      { id:2, type:'Loading',   location:'Sector 2', status:'Scheduled',   eta:'30 min', explanation:'Dry soil, normal conditions' },
      { id:3, type:'Grading',   location:'Sector 1', status:'Pending',     eta:'65 min', explanation:'Est. after current tasks' },
    ],
  });
});

// POST /task/schedule
router.post('/schedule', (req, res) => {
  const tasks = req.body || [];
  const sorted = [...tasks].sort((a,b) => (a.eta_min||60) - (b.eta_min||60));
  res.json({ optimized_order: sorted });
});

module.exports = router;
