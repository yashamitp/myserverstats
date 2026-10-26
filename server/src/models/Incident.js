const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
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
  serverName: {
    type: String,
    required: true
  },
  // Stable deduplication fingerprint: `${tenantId}:${serverId}:${type}:${resourceKey}`
  fingerprint: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    index: true // 'cpu_high', 'memory_high', 'disk_high', 'unreachable', 'service_down', 'windows_event', 'stale_metrics'
  },
  resourceKey: {
    type: String,
    default: 'system' // e.g., '/', '/data', 'nginx.service', 'wuauserv'
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning',
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved'],
    default: 'active',
    index: true
  },
  triggerValue: {
    type: mongoose.Schema.Types.Mixed
  },
  threshold: {
    type: mongoose.Schema.Types.Mixed
  },
  ruleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AlertRule',
    default: null
  },
  firstSeen: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  acknowledgedAt: {
    type: Date,
    default: null
  },
  acknowledgedBy: {
    type: String,
    default: null
  },
  occurrenceCount: {
    type: Number,
    default: 1
  },
  inMaintenance: {
    type: Boolean,
    default: false
  },
  lastNotificationSentAt: {
    type: Date,
    default: null
  },
  history: [{
    timestamp: { type: Date, default: Date.now },
    status: { type: String },
    message: { type: String },
    value: { type: mongoose.Schema.Types.Mixed }
  }]
}, {
  timestamps: true
});

incidentSchema.index({ tenantId: 1, status: 1 });
incidentSchema.index({ tenantId: 1, fingerprint: 1, status: 1 });
incidentSchema.index({ serverId: 1, status: 1 });
incidentSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);
