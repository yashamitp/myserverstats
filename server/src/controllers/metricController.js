const Metric = require('../models/Metric');
const Server = require('../models/Server');
const { getMonitoringCollector } = require('../services/monitoringAdapter');
const { success, error } = require('../utils/response');

// GET /api/v1/servers/:id/metrics/current - Latest metrics snapshot
exports.getCurrentMetrics = async (req, res, next) => {
  try {
    const server = req.server;

    // Check if server has cached latest metrics
    if (server.lastMetrics) {
      return success(res, {
        metrics: server.lastMetrics,
        status: server.status,
        lastContact: server.lastContact,
        isStale: server.lastContact ? (Date.now() - new Date(server.lastContact).getTime()) > (server.monitoringInterval * 2000) : true
      });
    }

    // Otherwise check latest Metric document in database
    const latestDoc = await Metric.findOne({
      serverId: server._id,
      tenantId: req.user.tenantId
    }).sort({ timestamp: -1 });

    if (!latestDoc) {
      return success(res, null, 'No metrics recorded yet for this server');
    }

    return success(res, {
      metrics: latestDoc,
      status: server.status,
      lastContact: latestDoc.timestamp,
      isStale: (Date.now() - new Date(latestDoc.timestamp).getTime()) > (server.monitoringInterval * 2000)
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/servers/:id/metrics/history - Historical metrics range
exports.getMetricHistory = async (req, res, next) => {
  try {
    const server = req.server;
    const { range = '1h', limit = 100 } = req.query;

    const rangeMs = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }[range] || (60 * 60 * 1000);

    const since = new Date(Date.now() - rangeMs);

    const metrics = await Metric.find({
      serverId: server._id,
      tenantId: req.user.tenantId,
      timestamp: { $gte: since }
    })
      .sort({ timestamp: 1 })
      .limit(parseInt(limit, 10))
      .select('timestamp cpu memory disk network uptime');

    return success(res, {
      serverId: server._id,
      range,
      count: metrics.length,
      history: metrics
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/servers/:id/processes - Active processes
exports.getProcesses = async (req, res, next) => {
  try {
    const server = await Server.findById(req.server._id)
      .select('+credentials.encryptedPrivateKey +credentials.encryptedPassword +credentials.keyPassphrase');

    const collector = getMonitoringCollector(server.monitoringMethod, server);
    const processes = await collector.getProcesses(server);

    return success(res, {
      count: processes.length,
      processes
    });
  } catch (err) {
    return error(res, `Failed to fetch processes: ${err.message}`, 500);
  }
};

// GET /api/v1/servers/:id/services - Systemd services
exports.getServices = async (req, res, next) => {
  try {
    const server = await Server.findById(req.server._id)
      .select('+credentials.encryptedPrivateKey +credentials.encryptedPassword +credentials.keyPassphrase');

    const collector = getMonitoringCollector(server.monitoringMethod, server);
    const services = await collector.getServices(server);

    return success(res, {
      count: services.length,
      services
    });
  } catch (err) {
    return error(res, `Failed to fetch system services: ${err.message}`, 500);
  }
};

// GET /api/v1/servers/:id/logs - Restricted journalctl logs
exports.getLogs = async (req, res, next) => {
  try {
    const server = await Server.findById(req.server._id)
      .select('+credentials.encryptedPrivateKey +credentials.encryptedPassword +credentials.keyPassphrase');

    const { lines = 50, service, severity } = req.query;

    const collector = getMonitoringCollector(server.monitoringMethod, server);
    const logs = await collector.getLogs(server, {
      lines: parseInt(lines, 10),
      service,
      severity
    });

    return success(res, {
      count: logs.length,
      logs
    });
  } catch (err) {
    return error(res, `Failed to retrieve logs: ${err.message}`, 500);
  }
};
