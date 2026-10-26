const Server = require('../models/Server');
const Metric = require('../models/Metric');
const { getMonitoringCollector } = require('../services/monitoringAdapter');
const alertService = require('../alerts/alertService');
const logger = require('../config/logger');
const env = require('../config/env');

/**
 * Sanitizes monitoring error messages before storing or broadcasting them.
 * Never leaks internal credential paths, private diagnostics, or decrypted data.
 */
function sanitizeMonitoringError(err) {
  if (!err) return 'Unknown monitoring error';
  const msg = err.message || '';
  if (msg.includes('Authentication failed') || msg.includes('client-authentication') || msg.includes('password') || msg.includes('key')) {
    return 'SSH authentication failed: invalid credentials or rejected key';
  }
  if (msg.includes('timed out') || msg.includes('ETIMEDOUT') || msg.includes('readyTimeout')) {
    return 'Connection timed out';
  }
  if (msg.includes('ECONNREFUSED') || msg.includes('Connection refused')) {
    return 'Connection refused by remote host';
  }
  if (msg.includes('EHOSTUNREACH') || msg.includes('ENETUNREACH') || msg.includes('unreachable')) {
    return 'Remote host is unreachable';
  }
  if (msg.includes('Host key mismatch') || msg.includes('hostVerifier')) {
    return 'Host key verification failed: possible host key change or MITM';
  }
  if (msg.includes('prohibited') || msg.includes('restricted') || msg.includes('Loopback') || msg.includes('metadata')) {
    return 'Destination address rejected by security policy';
  }
  return 'Monitoring check failed to complete';
}

class MonitoringWorker {
  constructor() {
    this.intervalHandle = null;
    this.isRunning = false;
    this.inFlightJobs = new Set();
    this.maxConcurrency = env.MAX_CONCURRENT_CHECKS || 10;
    this.io = null;
  }

  start(io, checkIntervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.io = io;

    logger.info(`Starting Background Monitoring Worker scheduler (max concurrency: ${this.maxConcurrency})`);

    this.intervalHandle = setInterval(() => {
      this.tick();
    }, checkIntervalMs);

    // Initial tick
    this.tick();
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.isRunning = false;
    logger.info('Monitoring Worker stopped cleanly');
  }

  async tick() {
    if (!this.isRunning) return;
    try {
      const now = Date.now();
      // Find all enabled servers
      const servers = await Server.find({ isMonitoringEnabled: true })
        .select('+credentials.encryptedPrivateKey +credentials.encryptedPassword +credentials.keyPassphrase');

      for (const server of servers) {
        if (!this.isRunning) break;
        const serverIdStr = server._id.toString();

        // Prevent overlapping monitoring jobs for the same server
        if (this.inFlightJobs.has(serverIdStr)) {
          continue;
        }

        // Enforce global concurrency limit
        if (this.inFlightJobs.size >= this.maxConcurrency) {
          logger.debug(`Monitoring worker reached max concurrency (${this.maxConcurrency}). Deferring remaining servers.`);
          break;
        }

        // Check if server is due for a check based on its configured interval
        const intervalSec = server.monitoringInterval || 10;
        const lastCheckTime = server.lastContact ? new Date(server.lastContact).getTime() : 0;
        const isDue = (now - lastCheckTime) >= (intervalSec * 1000);

        if (isDue) {
          this.executeCollection(server).catch(err => {
            logger.error('Background collection failed', { serverId: serverIdStr, error: err.message });
          });
        }
      }
    } catch (err) {
      logger.error('Monitoring worker tick failed', { error: err.message });
    }
  }

  async executeCollection(server) {
    const serverIdStr = server._id.toString();
    this.inFlightJobs.add(serverIdStr);

    let collectionSuccess = false;
    let sanitizedError = '';

    try {
      const collector = getMonitoringCollector(server.monitoringMethod);
      const snapshot = await collector.collectSnapshot(server);

      // Persist time-series metric document
      await Metric.create({
        serverId: server._id,
        tenantId: server.tenantId,
        timestamp: snapshot.timestamp,
        cpu: snapshot.cpu,
        memory: snapshot.memory,
        disk: snapshot.disk,
        network: snapshot.network,
        uptime: snapshot.uptime
      });

      // Update server state & snapshot cache
      server.status = 'online';
      server.lastContact = snapshot.timestamp;
      server.consecutiveFailures = 0;
      server.lastErrorMessage = '';
      server.lastMetrics = {
        cpu: snapshot.cpu,
        memory: snapshot.memory,
        disk: snapshot.disk,
        network: snapshot.network,
        uptime: snapshot.uptime,
        timestamp: snapshot.timestamp
      };

      if (snapshot.os && (!server.os.distro || !server.os.kernel)) {
        server.os = {
          distro: snapshot.os.distro || server.os.distro,
          version: snapshot.os.version || server.os.version,
          kernel: snapshot.os.kernel || server.os.kernel,
          arch: snapshot.os.arch || server.os.arch
        };
      }

      await server.save();
      collectionSuccess = true;

      // If server recovered from unreachable state, resolve any active unreachable alerts
      await alertService.handleAlertState(server, 'unreachable', false, {
        severity: 'critical',
        message: 'Server has recovered and is reachable',
        triggerValue: 'online',
        resourceKey: 'connectivity'
      }, this.io);

      // Check alerts
      await alertService.evaluateMetrics(server, snapshot, this.io);

      // Real-time Socket.IO emission to authorized server room & tenant room
      if (this.io) {
        const eventData = {
          serverId: server._id,
          status: 'online',
          metrics: server.lastMetrics
        };
        this.io.to(`server:${serverIdStr}`).emit('metrics:update', eventData);
        this.io.to(`tenant:${server.tenantId}`).emit('server:metrics', eventData);
      }
    } catch (err) {
      sanitizedError = sanitizeMonitoringError(err);
      logger.warn('Server collection error', {
        serverId: serverIdStr,
        hostname: server.hostname,
        error: err.message
      });

      server.consecutiveFailures = (server.consecutiveFailures || 0) + 1;
      server.lastErrorMessage = sanitizedError;

      // Mark offline if 2 consecutive failures occur
      if (server.consecutiveFailures >= 2) {
        server.status = 'offline';
        await alertService.handleUnreachable(server, sanitizedError, this.io);
      }

      await server.save().catch(saveErr => {
        logger.error('Failed to save server error state', { serverId: serverIdStr, error: saveErr.message });
      });

      if (this.io) {
        const statusData = {
          serverId: server._id,
          status: server.status,
          error: sanitizedError,
          lastContact: server.lastContact
        };
        this.io.to(`server:${serverIdStr}`).emit('server:status', statusData);
        this.io.to(`tenant:${server.tenantId}`).emit('server:status', statusData);
      }
    } finally {
      this.inFlightJobs.delete(serverIdStr);
    }

    return {
      success: collectionSuccess,
      server,
      error: sanitizedError
    };
  }

  /**
   * On-demand refresh trigger
   */
  async refreshServerNow(serverId) {
    const server = await Server.findById(serverId)
      .select('+credentials.encryptedPrivateKey +credentials.encryptedPassword +credentials.keyPassphrase');
    if (!server) throw new Error('Server not found');
    return await this.executeCollection(server);
  }
}

module.exports = new MonitoringWorker();
