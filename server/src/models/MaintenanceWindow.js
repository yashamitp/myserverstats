const mongoose = require('mongoose');

const maintenanceWindowSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  serverIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server'
  }],
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    required: true,
    index: true
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  suppressNotifications: {
    type: Boolean,
    default: true
  },
  suppressWarningsOnly: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  }
}, {
  timestamps: true
});

maintenanceWindowSchema.index({ tenantId: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('MaintenanceWindow', maintenanceWindowSchema);
