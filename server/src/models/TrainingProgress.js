const mongoose = require('mongoose');

const trainingProgressSchema = new mongoose.Schema({
  operator_id: { type: String, required: true },
  module_id:   { type: String, required: true },
  score:       { type: Number, default: 0 },
  completed:   { type: Boolean, default: false },
  completed_at:{ type: Date },
}, { timestamps: true });

trainingProgressSchema.index({ operator_id: 1, module_id: 1 }, { unique: true });

module.exports = mongoose.model('TrainingProgress', trainingProgressSchema);
