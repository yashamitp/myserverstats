const Server = require('../models/Server');
const Metric = require('../models/Metric');
const { getMonitoringCollector } = require('../services/monitoringAdapter');
const alertService = require('../alerts/alertService');
const logger = require('../config/logger');

class MonitoringWorker {
  constructor() {
    this.intervalHandle = null;
    this.isRunning = false;
    this.inFlightJobs = new Set();
    this.io = null;
  }

  start(io, checkIntervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.io = io;

    logger.info('Starting Background Monitoring Worker scheduler');

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
    logger.info('Monitoring Worker stopped');
  }

  async tick() {
    try {
      const now = Date.now();
      // Find all enabled servers
      const servers = await Server.find({ isMonitoringEnabled: true })
        .select('+credentials.encryptedPrivateKey +credentials.encryptedPassword +credentials.keyPassphrase');

      for (const server of servers) {
        const serverIdStr = server._id.toString();

        // Prevent overlapping monitoring jobs for the same server
        if (this.inFlightJobs.has(serverIdStr)) {
          continue;
        }

        // Check if server is due for a check based on its configured interval
        const intervalSec = server.monitoringInterval || 10;
        const lastCheckTime = server.lastContact ? new Date(server.lastContact).getTime() : 0;
        const isDue = (now - lastCheckTime) >= (intervalSec * 1000);

        if (isDue) {
          this.executeCollection(server);
        }
      }
    } catch (err) {
      logger.error('Monitoring worker tick failed', { error: err.message });
    }
  }

  async executeCollection(server) {
    const serverIdStr = server._id.toString();
    this.inFlightJobs.add(serverIdStr);

    try {
      const collector = getMonitoringCollector(server.monitoringMethod);
      const snapshot = await collector.collectSnapshot(server);

      // Persist time-series metric document
      const metricDoc = await Metric.create({
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
      server.consecutiveFailures = (server.consecutiveFailures || 0) + 1;
      server.lastErrorMessage = err.message;

      // Mark offline if 2 consecutive failures occur
      if (server.consecutiveFailures >= 2) {
        server.status = 'offline';
        await alertService.handleUnreachable(server, err.message, this.io);
      }

      await server.save();

      if (this.io) {
        const statusData = {
          serverId: server._id,
          status: server.status,
          error: err.message,
          lastContact: server.lastContact
        };
        this.io.to(`server:${serverIdStr}`).emit('server:status', statusData);
        this.io.to(`tenant:${server.tenantId}`).emit('server:status', statusData);
      }
    } finally {
      this.inFlightJobs.delete(serverIdStr);
    }
  }

  /**
   * On-demand refresh trigger
   */
  async refreshServerNow(serverId) {
    const server = await Server.findById(serverId)
      .select('+credentials.encryptedPrivateKey +credentials.encryptedPassword +credentials.keyPassphrase');
    if (!server) throw new Error('Server not found');
    await this.executeCollection(server);
    return server;
  }
}

module.exports = new MonitoringWorker();
