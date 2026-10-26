const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    default: null,
    index: true
  },
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    default: null
  },
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    default: null
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
    index: true
  },
  type: {
    type: String,
    enum: ['incident_new', 'incident_resolved', 'server_unreachable', 'server_recovered', 'security_event', 'report_generated', 'delivery_failed'],
    default: 'incident_new'
  },
  link: {
    type: String,
    default: '/alerts'
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

notificationSchema.index({ tenantId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
