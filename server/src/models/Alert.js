const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true,
    index: true
  },
  ruleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AlertRule',
    default: null
  },
  serverName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true // 'cpu_high', 'memory_high', 'disk_high', 'unreachable', 'stale_metrics', 'service_down'
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning'
  },
  message: {
    type: String,
    required: true
  },
  triggerValue: {
    type: mongoose.Schema.Types.Mixed
  },
  threshold: {
    type: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved'],
    default: 'active',
    index: true
  },
  acknowledgedAt: {
    type: Date,
    default: null
  },
  acknowledgedBy: {
    type: String,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

alertSchema.index({ tenantId: 1, status: 1 });
alertSchema.index({ serverId: 1, status: 1 });
alertSchema.index({ serverId: 1, type: 1, status: 1 });

module.exports = mongoose.model('Alert', alertSchema);
