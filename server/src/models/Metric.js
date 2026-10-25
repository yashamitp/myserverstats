const mongoose = require('mongoose');
const env = require('../config/env');

const networkInterfaceSchema = new mongoose.Schema({
  interface: { type: String },
  rxBytes: { type: Number, default: 0 },
  txBytes: { type: Number, default: 0 },
  rxRateBytesPerSec: { type: Number, default: 0 },
  txRateBytesPerSec: { type: Number, default: 0 },
  errors: { type: Number, default: 0 },
  dropped: { type: Number, default: 0 }
}, {
  _id: false,
  suppressReservedKeysWarning: true
});

const metricSchema = new mongoose.Schema({
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  cpu: {
    usagePercent: { type: Number, default: 0 },
    loadAvg: [{ type: Number }],
    coreCount: { type: Number, default: 1 },
    perCore: [{ type: Number }]
  },
  memory: {
    totalBytes: { type: Number, default: 0 },
    usedBytes: { type: Number, default: 0 },
    freeBytes: { type: Number, default: 0 },
    availableBytes: { type: Number, default: 0 },
    usagePercent: { type: Number, default: 0 },
    swapTotalBytes: { type: Number, default: 0 },
    swapUsedBytes: { type: Number, default: 0 },
    swapPercent: { type: Number, default: 0 }
  },
  disk: [{
    _id: false,
    filesystem: { type: String },
    mount: { type: String },
    totalBytes: { type: Number },
    usedBytes: { type: Number },
    availableBytes: { type: Number },
    usagePercent: { type: Number }
  }],
  network: [networkInterfaceSchema],
  uptime: {
    seconds: { type: Number, default: 0 },
    bootTime: { type: Date }
  }
}, {
  timestamps: false,
  versionKey: false,
  suppressReservedKeysWarning: true
});

// Compound indexes for time-series range queries
metricSchema.index({ serverId: 1, timestamp: -1 });
metricSchema.index({ tenantId: 1, timestamp: -1 });

// TTL retention index (default: 30 days)
const ttlSeconds = (env.METRICS_RETENTION_DAYS || 30) * 24 * 60 * 60;
metricSchema.index({ timestamp: 1 }, { expireAfterSeconds: ttlSeconds });

module.exports = mongoose.model('Metric', metricSchema);
