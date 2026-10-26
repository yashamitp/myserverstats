const mongoose = require('mongoose');

const monitoringProfileSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  targetOs: {
    type: String,
    enum: ['any', 'linux', 'windows'],
    default: 'any'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  checkIntervalSec: {
    type: Number,
    default: 10,
    min: 5,
    max: 300
  },
  thresholds: {
    cpu: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 85, min: 1, max: 100 },
      severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' }
    },
    memory: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 90, min: 1, max: 100 },
      severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' }
    },
    disk: {
      enabled: { type: Boolean, default: true },
      threshold: { type: Number, default: 90, min: 1, max: 100 },
      severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'critical' }
    }
  },
  monitoredServices: [{
    name: { type: String, required: true },
    targetOs: { type: String, enum: ['linux', 'windows', 'any'], default: 'any' },
    required: { type: Boolean, default: true }
  }],
  eventLogFilters: [{
    logName: { type: String, default: 'System' },
    entryTypes: [{ type: String, default: 'Error' }], // 'Error', 'Warning', 'Critical'
    source: { type: String, default: '' }
  }]
}, {
  timestamps: true
});

monitoringProfileSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model('MonitoringProfile', monitoringProfileSchema);
