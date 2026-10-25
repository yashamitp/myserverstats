const mongoose = require('mongoose');

const alertRuleSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    default: null // null means tenant-wide rule
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  metricType: {
    type: String,
    enum: ['cpu', 'memory', 'disk', 'status', 'stale_metrics', 'service'],
    required: true
  },
  condition: {
    type: String,
    enum: ['gt', 'lt', 'eq', 'ne'],
    default: 'gt'
  },
  threshold: {
    type: Number,
    required: true
  },
  durationSec: {
    type: Number,
    default: 30
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning'
  },
  serviceName: {
    type: String,
    default: ''
  },
  isEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

alertRuleSchema.index({ tenantId: 1, isEnabled: 1 });
alertRuleSchema.index({ serverId: 1, isEnabled: 1 });

module.exports = mongoose.model('AlertRule', alertRuleSchema);
