const { createSshConnection, execCommand, testSshConnection } = require('./sshService');
const commands = require('../monitoring/commands');
const parsers = require('../monitoring/parsers');
const logger = require('../config/logger');

class SshMonitoringCollector {
  /**
   * Collect real-time metrics snapshot from Linux host over SSH
   */
  async collectSnapshot(server) {
    let conn = null;
    try {
      const { conn: activeConn } = await createSshConnection(server);
      conn = activeConn;

      // Execute combined snapshot command
      const res = await execCommand(conn, commands.COLLECT_SYSTEM_SNAPSHOT, 7000);
      conn.end();

      const output = res.stdout;
      const sections = {};
      const sectionMarkers = [
        '===OS===',
        '===UPTIME===',
        '===MEMINFO===',
        '===LOADAVG===',
        '===CPUINFO===',
        '===DF===',
        '===NETDEV===',
        '===STAT1===',
        '===STAT2==='
      ];

      for (let i = 0; i < sectionMarkers.length; i++) {
        const marker = sectionMarkers[i];
        const nextMarker = sectionMarkers[i + 1];
        const startIdx = output.indexOf(marker);
        if (startIdx !== -1) {
          const contentStart = startIdx + marker.length;
          const endIdx = nextMarker ? output.indexOf(nextMarker, contentStart) : output.length;
          sections[marker] = output.slice(contentStart, endIdx !== -1 ? endIdx : undefined).trim();
        }
      }

      const os = parsers.parseOS(sections['===OS===']);
      const uptime = parsers.parseUptime(sections['===UPTIME===']);
      const memory = parsers.parseMeminfo(sections['===MEMINFO===']);
      const cpu = parsers.parseCpu(
        sections['===STAT1==='],
        sections['===STAT2==='],
        sections['===LOADAVG==='],
        sections['===CPUINFO===']
      );
      const disk = parsers.parseDf(sections['===DF===']);
      const network = parsers.parseNetDev(sections['===NETDEV===']);

      // Calculate network delta rates if previous metrics exist
      if (server.lastMetrics && server.lastMetrics.network && server.lastContact) {
        const elapsedSec = Math.max(1, (Date.now() - new Date(server.lastContact).getTime()) / 1000);
        for (const netIface of network) {
          const prev = server.lastMetrics.network.find(n => n.interface === netIface.interface);
          if (prev && netIface.rxBytes >= prev.rxBytes && netIface.txBytes >= prev.txBytes) {
            netIface.rxRateBytesPerSec = Math.round((netIface.rxBytes - prev.rxBytes) / elapsedSec);
            netIface.txRateBytesPerSec = Math.round((netIface.txBytes - prev.txBytes) / elapsedSec);
          }
        }
      }

      return {
        success: true,
        os,
        uptime,
        cpu,
        memory,
        disk,
        network,
        timestamp: new Date()
      };
    } catch (err) {
      if (conn) conn.end();
      logger.error('Failed to collect metrics snapshot', { serverId: server._id, error: err.message });
      throw err;
    }
  }

  async getProcesses(server) {
    let conn = null;
    try {
      const { conn: activeConn } = await createSshConnection(server);
      conn = activeConn;
      const res = await execCommand(conn, commands.GET_PROCESSES, 5000);
      conn.end();
      return parsers.parseProcesses(res.stdout);
    } catch (err) {
      if (conn) conn.end();
      throw err;
    }
  }

  async getServices(server) {
    let conn = null;
    try {
      const { conn: activeConn } = await createSshConnection(server);
      conn = activeConn;
      const res = await execCommand(conn, commands.GET_SERVICES, 5000);
      conn.end();
      return parsers.parseServices(res.stdout);
    } catch (err) {
      if (conn) conn.end();
      throw err;
    }
  }

  async getLogs(server, options = {}) {
    let conn = null;
    try {
      const { conn: activeConn } = await createSshConnection(server);
      conn = activeConn;
      const cmd = commands.buildLogsCommand(options);
      const res = await execCommand(conn, cmd, 6000);
      conn.end();
      return parsers.parseLogs(res.stdout);
    } catch (err) {
      if (conn) conn.end();
      throw err;
    }
  }

  async testConnectivity(config) {
    return testSshConnection(config);
  }
}

// Collector singleton registry
const sshCollector = new SshMonitoringCollector();

/**
 * Factory to return the appropriate monitoring collector based on method
 */
function getMonitoringCollector(method = 'ssh') {
  if (method === 'ssh') {
    return sshCollector;
  }
  // Future: return agentCollector when monitoring agent is used
  return sshCollector;
}

module.exports = {
  SshMonitoringCollector,
  getMonitoringCollector
};
