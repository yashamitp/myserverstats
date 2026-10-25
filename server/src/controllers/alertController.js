const Alert = require('../models/Alert');
const AlertRule = require('../models/AlertRule');
const Server = require('../models/Server');
const { success, error } = require('../utils/response');

// GET /api/v1/alerts - Get all alerts for current tenant
exports.getAlerts = async (req, res, next) => {
  try {
    const { status, severity, limit = 50 } = req.query;
    const query = { tenantId: req.user.tenantId };

    if (status) query.status = status;
    if (severity) query.severity = severity;

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    return success(res, alerts, 'Alerts retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/servers/:id/alerts - Get alerts for specific server
exports.getServerAlerts = async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;
    const query = {
      serverId: req.server._id,
      tenantId: req.user.tenantId
    };

    if (status) query.status = status;

    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    return success(res, alerts, 'Server alerts retrieved');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/alerts/rules - Create alert rule
exports.createRule = async (req, res, next) => {
  try {
    const {
      serverId,
      name,
      metricType,
      condition = 'gt',
      threshold,
      durationSec = 30,
      severity = 'warning',
      serviceName,
      isEnabled = true
    } = req.body;

    // If serverId is provided, verify it belongs to this tenant
    if (serverId) {
      const server = await Server.findOne({ _id: serverId, tenantId: req.user.tenantId });
      if (!server) {
        return error(res, 'Specified server not found or access denied', 404);
      }
    }

    const rule = await AlertRule.create({
      tenantId: req.user.tenantId,
      serverId: serverId || null,
      name,
      metricType,
      condition,
      threshold,
      durationSec,
      severity,
      serviceName: serviceName || '',
      isEnabled
    });

    return success(res, rule, 'Alert rule created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/alerts/rules/:id - Update rule
exports.updateRule = async (req, res, next) => {
  try {
    const rule = await AlertRule.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!rule) {
      return error(res, 'Alert rule not found', 404);
    }

    Object.assign(rule, req.body);
    await rule.save();

    return success(res, rule, 'Alert rule updated');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/alerts/rules/:id - Delete rule
exports.deleteRule = async (req, res, next) => {
  try {
    const result = await AlertRule.deleteOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (result.deletedCount === 0) {
      return error(res, 'Alert rule not found', 404);
    }

    return success(res, { deletedRuleId: req.params.id }, 'Alert rule deleted');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/alerts/:id/acknowledge - Acknowledge alert
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const alert = await Alert.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!alert) {
      return error(res, 'Alert not found', 404);
    }

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = req.user.email || req.user.id;
    await alert.save();

    return success(res, alert, 'Alert acknowledged');
  } catch (err) {
    next(err);
  }
};
