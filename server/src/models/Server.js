const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
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
  hostname: {
    type: String,
    required: true,
    trim: true
  },
  port: {
    type: Number,
    default: 22,
    min: 1,
    max: 65535
  },
  os: {
    distro: { type: String, default: 'ubuntu' },
    version: { type: String, default: '' },
    kernel: { type: String, default: '' },
    arch: { type: String, default: 'x86_64' }
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'warning', 'error', 'pending'],
    default: 'pending',
    index: true
  },
  monitoringMethod: {
    type: String,
    enum: ['ssh', 'agent'],
    default: 'ssh'
  },
  authMethod: {
    type: String,
    enum: ['key', 'password'],
    default: 'key'
  },
  username: {
    type: String,
    default: 'agentops',
    trim: true
  },
  // Reusable SSH credentials stored encrypted via AES-256-GCM.
  // Excluded from query results by default for defense-in-depth!
  credentials: {
    encryptedPrivateKey: { type: String, select: false },
    encryptedPassword: { type: String, select: false },
    keyPassphrase: { type: String, select: false }
  },
  hostKeyFingerprint: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  monitoringProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonitoringProfile',
    default: null
  },
  monitoringInterval: {
    type: Number,
    default: 10,
    min: 5,
    max: 300
  },
  isMonitoringEnabled: {
    type: Boolean,
    default: true
  },
  lastContact: {
    type: Date,
    default: null
  },
  lastMetrics: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  consecutiveFailures: {
    type: Number,
    default: 0
  },
  lastErrorMessage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

serverSchema.index({ tenantId: 1, status: 1 });
serverSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model('Server', serverSchema);
