const mongoose = require('mongoose');

const scheduledReportSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'Infrastructure Health Report',
    trim: true
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly'],
    default: 'daily'
  },
  hour: {
    type: Number,
    default: 8,
    min: 0,
    max: 23
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  recipients: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  serverIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server'
  }],
  includeMetrics: {
    cpu: { type: Boolean, default: true },
    memory: { type: Boolean, default: true },
    disk: { type: Boolean, default: true },
    incidents: { type: Boolean, default: true }
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  lastRunAt: {
    type: Date,
    default: null
  },
  nextRunAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ScheduledReport', scheduledReportSchema);
