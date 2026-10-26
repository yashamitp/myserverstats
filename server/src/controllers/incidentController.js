const Incident = require('../models/Incident');
const AuditEvent = require('../models/AuditEvent');
const { success, error } = require('../utils/response');

// GET /api/v1/incidents - List incidents with filtering & pagination
exports.getIncidents = async (req, res, next) => {
  try {
    const { status, severity, serverId, page = 1, limit = 20 } = req.query;
    const query = { tenantId: req.user.tenantId };

    if (status && ['active', 'acknowledged', 'resolved'].includes(status)) {
      query.status = status;
    }
    if (severity && ['info', 'warning', 'critical'].includes(severity)) {
      query.severity = severity;
    }
    if (serverId) {
      query.serverId = serverId;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [incidents, total] = await Promise.all([
      Incident.find(query)
        .sort({ status: 1, lastSeen: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('serverId', 'name hostname status os'),
      Incident.countDocuments(query)
    ]);

    return success(res, {
      incidents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/incidents/:id - Get single incident
exports.getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    }).populate('serverId', 'name hostname status os');

    if (!incident) {
      return error(res, 'Incident not found', 404);
    }

    return success(res, incident);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/incidents/:id/acknowledge - Acknowledge incident
exports.acknowledgeIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!incident) {
      return error(res, 'Incident not found', 404);
    }

    incident.status = 'acknowledged';
    incident.acknowledgedAt = new Date();
    incident.acknowledgedBy = req.user.email || req.user.id;
    incident.history.push({
      timestamp: new Date(),
      status: 'acknowledged',
      message: `Acknowledged by ${incident.acknowledgedBy}`,
      value: incident.triggerValue
    });

    await incident.save();

    await AuditEvent.create({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      action: 'incident.acknowledged',
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      metadata: { serverName: incident.serverName, title: incident.title }
    });

    // Real-time broadcast
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`tenant:${req.user.tenantId}`).emit('incident:updated', incident);
    }

    return success(res, incident, 'Incident acknowledged successfully');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/incidents/:id/resolve - Manually resolve incident
exports.resolveIncident = async (req, res, next) => {
  try {
    const incident = await Incident.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!incident) {
      return error(res, 'Incident not found', 404);
    }

    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    incident.history.push({
      timestamp: new Date(),
      status: 'resolved',
      message: `Manually resolved by ${req.user.email || req.user.id}`,
      value: incident.triggerValue
    });

    await incident.save();

    await AuditEvent.create({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      action: 'incident.resolved',
      resourceType: 'incident',
      resourceId: incident._id.toString(),
      metadata: { serverName: incident.serverName, title: incident.title }
    });

    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`tenant:${req.user.tenantId}`).emit('incident:resolved', incident);
    }

    return success(res, incident, 'Incident resolved successfully');
  } catch (err) {
    next(err);
  }
};
