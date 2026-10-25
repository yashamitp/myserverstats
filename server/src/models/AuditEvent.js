const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  actorId: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true // 'server.created', 'server.deleted', 'connection.tested', 'rule.updated', 'ai.investigation'
  },
  resourceType: {
    type: String,
    required: true // 'server', 'alert', 'rule', 'ai'
  },
  resourceId: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  versionKey: false
});

auditEventSchema.index({ tenantId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditEvent', auditEventSchema);
