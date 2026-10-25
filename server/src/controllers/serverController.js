const Server = require('../models/Server');
const Metric = require('../models/Metric');
const Alert = require('../models/Alert');
const AlertRule = require('../models/AlertRule');
const AuditEvent = require('../models/AuditEvent');
const { encrypt } = require('../security/crypto');
const { testSshConnection } = require('../services/sshService');
const monitoringWorker = require('../workers/monitoringWorker');
const { success, error } = require('../utils/response');
const logger = require('../config/logger');

// GET /api/v1/servers - List user servers
exports.getServers = async (req, res, next) => {
  try {
    const servers = await Server.find({ tenantId: req.user.tenantId })
      .sort({ createdAt: -1 });

    return success(res, servers, 'Servers retrieved successfully');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/servers - Create new server
exports.createServer = async (req, res, next) => {
  try {
    const {
      name,
      hostname,
      port = 22,
      osDistro = 'ubuntu',
      monitoringMethod = 'ssh',
      authMethod = 'key',
      username = 'agentops',
      privateKey,
      password,
      keyPassphrase,
      tags = [],
      monitoringInterval = 10
    } = req.body;

    // Encrypt sensitive credentials
    const credentials = {};
    if (authMethod === 'password' && password) {
      credentials.encryptedPassword = encrypt(password);
    } else if (privateKey) {
      credentials.encryptedPrivateKey = encrypt(privateKey);
      if (keyPassphrase) {
        credentials.keyPassphrase = encrypt(keyPassphrase);
      }
    }

    const server = new Server({
      tenantId: req.user.tenantId,
      name,
      hostname,
      port,
      os: { distro: osDistro },
      monitoringMethod,
      authMethod,
      username,
      credentials,
      tags,
      monitoringInterval,
      status: 'pending'
    });

    await server.save();

    // Audit log
    await AuditEvent.create({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      action: 'server.created',
      resourceType: 'server',
      resourceId: server._id.toString(),
      metadata: { name: server.name, hostname: server.hostname, port: server.port },
      ipAddress: req.ip || ''
    });

    // Strip credentials from returned object for defense-in-depth
    const serverObj = server.toObject();
    delete serverObj.credentials;

    // Trigger immediate background metrics collection
    setTimeout(() => {
      monitoringWorker.refreshServerNow(server._id).catch(err => {
        logger.debug('Initial server poll deferred', { error: err.message });
      });
    }, 500);

    return success(res, serverObj, 'Server added successfully', 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/servers/:id - Get single server
exports.getServerById = async (req, res, next) => {
  try {
    // req.server is already populated and verified by authorizeServer middleware
    return success(res, req.server, 'Server details retrieved');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/servers/:id - Update server
exports.updateServer = async (req, res, next) => {
  try {
    const server = req.server;
    const {
      name,
      tags,
      monitoringInterval,
      isMonitoringEnabled,
      username,
      authMethod,
      privateKey,
      password,
      keyPassphrase
    } = req.body;

    if (name !== undefined) server.name = name;
    if (tags !== undefined) server.tags = tags;
    if (monitoringInterval !== undefined) server.monitoringInterval = monitoringInterval;
    if (isMonitoringEnabled !== undefined) server.isMonitoringEnabled = isMonitoringEnabled;
    if (username !== undefined) server.username = username;
    if (authMethod !== undefined) server.authMethod = authMethod;

    if (password) {
      server.credentials.encryptedPassword = encrypt(password);
    }
    if (privateKey) {
      server.credentials.encryptedPrivateKey = encrypt(privateKey);
      if (keyPassphrase) {
        server.credentials.keyPassphrase = encrypt(keyPassphrase);
      }
    }

    await server.save();

    await AuditEvent.create({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      action: 'server.updated',
      resourceType: 'server',
      resourceId: server._id.toString(),
      metadata: { name: server.name }
    });

    const serverObj = server.toObject();
    delete serverObj.credentials;

    return success(res, serverObj, 'Server updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/servers/:id - Delete server and cleanup
exports.deleteServer = async (req, res, next) => {
  try {
    const serverId = req.server._id;
    const serverName = req.server.name;

    // Delete server
    await Server.deleteOne({ _id: serverId, tenantId: req.user.tenantId });

    // Clean up related historical metrics and alerts
    await Metric.deleteMany({ serverId, tenantId: req.user.tenantId });
    await Alert.deleteMany({ serverId, tenantId: req.user.tenantId });
    await AlertRule.deleteMany({ serverId, tenantId: req.user.tenantId });

    await AuditEvent.create({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      action: 'server.deleted',
      resourceType: 'server',
      resourceId: serverId.toString(),
      metadata: { name: serverName }
    });

    return success(res, { deletedServerId: serverId }, 'Server removed and monitoring revoked');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/servers/test-connection - Test arbitrary connection before adding
exports.testArbitraryConnection = async (req, res, next) => {
  try {
    const {
      hostname,
      port = 22,
      username = 'agentops',
      authMethod = 'key',
      privateKey,
      password,
      keyPassphrase
    } = req.body;

    const result = await testSshConnection({
      hostname,
      port,
      username,
      authMethod,
      privateKey,
      password,
      keyPassphrase
    });

    if (!result.success) {
      return error(res, result.message || 'Connection failed', 400, result);
    }

    return success(res, result, result.message);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/servers/:id/test-connection - Test existing server connection
exports.testServerConnection = async (req, res, next) => {
  try {
    const server = await Server.findById(req.server._id)
      .select('+credentials.encryptedPrivateKey +credentials.encryptedPassword +credentials.keyPassphrase');

    const result = await testSshConnection({
      hostname: server.hostname,
      port: server.port,
      username: server.username,
      authMethod: server.authMethod,
      encryptedPrivateKey: server.credentials?.encryptedPrivateKey,
      encryptedPassword: server.credentials?.encryptedPassword,
      keyPassphrase: server.credentials?.keyPassphrase,
      expectedHostKeyFingerprint: server.hostKeyFingerprint
    });

    if (result.success && result.hostKeyFingerprint && !server.hostKeyFingerprint) {
      server.hostKeyFingerprint = result.hostKeyFingerprint;
      await server.save();
    }

    if (!result.success) {
      return error(res, result.message || 'Connection failed', 400, result);
    }

    return success(res, result, result.message);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/servers/:id/refresh - Trigger instant on-demand monitoring poll
exports.refreshServer = async (req, res, next) => {
  try {
    const updatedServer = await monitoringWorker.refreshServerNow(req.server._id);
    return success(res, {
      status: updatedServer.status,
      lastContact: updatedServer.lastContact,
      metrics: updatedServer.lastMetrics
    }, 'Server metrics refreshed');
  } catch (err) {
    return error(res, `Refresh failed: ${err.message}`, 500);
  }
};
