const router = require('express').Router();
const { predictMaintenance } = require('../ml/inference');

// GET /maintenance/status
router.get('/status', async (req, res) => {
  const { machine_id = 'EXC001' } = req.query;
  // Deterministic demo telemetry per machine
  const seed = [...machine_id].reduce((a,c)=>a+c.charCodeAt(0),0);
  const data = {
    EngineHours: 2000 + (seed % 500),
    LastServiceHours: 1700 + (seed % 300),
    HydraulicPressure: 210 + (seed % 60),
    RPM: 1500 + (seed % 200),
    FuelUsed: 3.5 + (seed % 3),
    LoadCycles: 60 + (seed % 40),
    ArmCycles: 180 + (seed % 80),
  };
  try {
    const result = await predictMaintenance(data);
    res.json({ machine_id, ...result });
  } catch {
    const hrs = Math.max(0, 500 - (data.EngineHours - data.LastServiceHours));
    res.json({ machine_id, hours_until_service: Math.round(hrs), component_at_risk: 'engine',
      urgency: hrs < 50 ? 'critical' : hrs < 150 ? 'warning' : 'ok',
      recommendation: `Service due in ~${Math.round(hrs)} hours.` });
  }
});

// POST /maintenance/predict
router.post('/predict', async (req, res) => {
  try {
    const result = await predictMaintenance(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
