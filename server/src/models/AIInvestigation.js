const mongoose = require('mongoose');

const aiInvestigationSchema = new mongoose.Schema({
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
  query: {
    type: String,
    required: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'completed'
  },
  toolCalls: [{
    tool: { type: String, required: true },
    params: { type: mongoose.Schema.Types.Mixed },
    resultSummary: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
  }],
  findings: [{
    type: String
  }],
  recommendations: [{
    type: String
  }],
  summary: {
    type: String,
    required: true
  },
  modelUsed: {
    type: String,
    default: ''
  },
  tokensUsed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

aiInvestigationSchema.index({ tenantId: 1, serverId: 1, createdAt: -1 });

module.exports = mongoose.model('AIInvestigation', aiInvestigationSchema);
