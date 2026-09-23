const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incident_id:  { type: String, required: true, unique: true },
  operator_id:  { type: String, required: true },
  machine_id:   { type: String, required: true },
  description:  { type: String, required: true },
  alert_type:   { type: String, default: 'GENERAL' },
  severity:     { type: String, default: 'medium' },
  resolved:     { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
