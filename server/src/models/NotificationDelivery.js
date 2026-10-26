const mongoose = require('mongoose');

const notificationDeliverySchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  recipient: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  subject: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['incident_alert', 'incident_recovery', 'health_report', 'test_email', 'security_event'],
    required: true
  },
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    default: null
  },
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'retrying'],
    default: 'pending',
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  lastAttemptAt: {
    type: Date,
    default: null
  },
  nextAttemptAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  htmlPayload: {
    type: String,
    required: true
  },
  error: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

notificationDeliverySchema.index({ status: 1, nextAttemptAt: 1 });
notificationDeliverySchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.model('NotificationDelivery', notificationDeliverySchema);
