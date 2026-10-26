const MaintenanceWindow = require('../models/MaintenanceWindow');
const AuditEvent = require('../models/AuditEvent');
const { success, error } = require('../utils/response');

// GET /api/v1/maintenance - List maintenance windows
exports.getMaintenanceWindows = async (req, res, next) => {
  try {
    const windows = await MaintenanceWindow.find({ tenantId: req.user.tenantId })
      .sort({ startTime: -1 })
      .populate('serverIds', 'name hostname status os');

    return success(res, windows);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/maintenance - Schedule maintenance window
exports.createMaintenanceWindow = async (req, res, next) => {
  try {
    const {
      title,
      description,
      serverIds,
      startTime,
      endTime,
      timezone,
      suppressNotifications,
      suppressWarningsOnly
    } = req.body;

    if (!title || !startTime || !endTime) {
      return error(res, 'Title, startTime, and endTime are required', 400);
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return error(res, 'endTime must be strictly after startTime', 400);
    }

    const now = new Date();
    let initialStatus = 'scheduled';
    if (start <= now && end >= now) {
      initialStatus = 'active';
    }

    const window = await MaintenanceWindow.create({
      tenantId: req.user.tenantId,
      title: title.trim(),
      description: description || '',
      serverIds: Array.isArray(serverIds) ? serverIds : [],
      startTime: start,
      endTime: end,
      timezone: timezone || 'UTC',
      suppressNotifications: suppressNotifications !== undefined ? Boolean(suppressNotifications) : true,
      suppressWarningsOnly: Boolean(suppressWarningsOnly),
      status: initialStatus
    });

    await AuditEvent.create({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      action: 'maintenance_window.created',
      resourceType: 'maintenance_window',
      resourceId: window._id.toString(),
      metadata: { title: window.title, startTime: window.startTime, endTime: window.endTime }
    });

    return success(res, window, 'Maintenance window scheduled successfully', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/maintenance/:id - Update or cancel window
exports.updateMaintenanceWindow = async (req, res, next) => {
  try {
    const window = await MaintenanceWindow.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!window) {
      return error(res, 'Maintenance window not found', 404);
    }

    const {
      title,
      description,
      serverIds,
      startTime,
      endTime,
      suppressNotifications,
      status
    } = req.body;

    if (title) window.title = title.trim();
    if (description !== undefined) window.description = description;
    if (Array.isArray(serverIds)) window.serverIds = serverIds;
    if (startTime) window.startTime = new Date(startTime);
    if (endTime) window.endTime = new Date(endTime);
    if (suppressNotifications !== undefined) window.suppressNotifications = Boolean(suppressNotifications);
    if (status && ['scheduled', 'active', 'completed', 'cancelled'].includes(status)) {
      window.status = status;
    }

    await window.save();

    return success(res, window, 'Maintenance window updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/maintenance/:id - Delete window
exports.deleteMaintenanceWindow = async (req, res, next) => {
  try {
    const window = await MaintenanceWindow.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!window) {
      return error(res, 'Maintenance window not found', 404);
    }

    return success(res, null, 'Maintenance window deleted successfully');
  } catch (err) {
    next(err);
  }
};
