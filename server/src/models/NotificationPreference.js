const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  emailEnabled: {
    type: Boolean,
    default: true
  },
  recipients: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  minSeverity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'warning'
  },
  cooldownMinutes: {
    type: Number,
    default: 30,
    min: 5,
    max: 1440
  },
  sendRecoveryEmail: {
    type: Boolean,
    default: true
  },
  // Custom SMTP configuration override (optional, defaults to environment SMTP)
  customSmtp: {
    enabled: { type: Boolean, default: false },
    host: { type: String, default: '' },
    port: { type: Number, default: 587 },
    secure: { type: Boolean, default: false },
    user: { type: String, default: '' },
    encryptedPass: { type: String, select: false },
    fromEmail: { type: String, default: '' },
    fromName: { type: String, default: 'AgentOps Alerts' }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
