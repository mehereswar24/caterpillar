const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  event_type:  { type: String, required: true },
  operator_id: String,
  machine_id:  String,
  action:      String,
  details:     mongoose.Schema.Types.Mixed,
  ip:          String,
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditSchema);
