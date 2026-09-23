const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const AuditLog = require('../models/AuditLog');

const _mem = [];
const isMongoUp = () => mongoose.connection.readyState === 1;

// POST /incidents/log
router.post('/log', async (req, res) => {
  const { operator_id='OP001', machine_id='EXC001', description='', alert_type='GENERAL', severity='medium' } = req.body;
  const incident_id = 'INC-' + uuidv4().slice(0,6).toUpperCase();
  const doc = { incident_id, operator_id, machine_id, description, alert_type, severity, createdAt: new Date().toISOString() };

  if (isMongoUp()) {
    try { await Incident.create(doc); } catch { _mem.push(doc); }
    try { await AuditLog.create({ event_type:'INCIDENT_LOGGED', operator_id, machine_id, action:alert_type, details:doc }); } catch {}
  } else {
    _mem.push(doc);
  }

  res.json({ incident_id, status:'logged', created_at: doc.createdAt });
});

// GET /incidents/list
router.get('/list', async (req, res) => {
  const { operator_id, machine_id, limit=20 } = req.query;

  if (isMongoUp()) {
    try {
      const query = {};
      if (operator_id) query.operator_id = operator_id;
      if (machine_id)  query.machine_id  = machine_id;
      const incidents = await Incident.find(query).sort({ createdAt:-1 }).limit(Number(limit)).lean();
      return res.json({ incidents, count: incidents.length });
    } catch {}
  }

  let incidents = [..._mem];
  if (operator_id) incidents = incidents.filter(i=>i.operator_id===operator_id);
  if (machine_id)  incidents = incidents.filter(i=>i.machine_id===machine_id);
  incidents = incidents.slice(-Number(limit)).reverse();
  res.json({ incidents, count: incidents.length });
});

module.exports = router;
