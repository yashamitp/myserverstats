const Server = require('../models/Server');
const Metric = require('../models/Metric');
const Incident = require('../models/Incident');
const ScheduledReport = require('../models/ScheduledReport');
const emailService = require('../notifications/emailService');
const notificationQueue = require('../notifications/notificationQueue');
const logger = require('../config/logger');

class ReportService {
  /**
   * Generate infrastructure health report for a tenant
   */
  async generateReport(tenantId, reportConfig = null) {
    const query = { tenantId };
    if (reportConfig?.serverIds && reportConfig.serverIds.length > 0) {
      query._id = { $in: reportConfig.serverIds };
    }

    const servers = await Server.find(query);
    const totalServers = servers.length;
    const onlineServers = servers.filter(s => s.status === 'online').length;
    const offlineServers = servers.filter(s => ['offline', 'error'].includes(s.status)).length;
    const warningServers = servers.filter(s => s.status === 'warning').length;

    // 24-hour incident statistics
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [activeIncidents, resolvedIncidents] = await Promise.all([
      Incident.find({ tenantId, status: 'active' }),
      Incident.find({ tenantId, status: 'resolved', resolvedAt: { $gte: since24h } })
    ]);

    // Aggregate server resource utilization
    const serverSummaries = [];
    for (const server of servers) {
      const metrics = server.lastMetrics;
      const cpu = metrics?.cpu?.usagePercent ?? null;
      const mem = metrics?.memory?.usagePercent ?? null;
      let maxDisk = null;
      if (metrics?.disk && Array.isArray(metrics.disk) && metrics.disk.length > 0) {
        maxDisk = metrics.disk.reduce((max, d) => d.usagePercent > max.usagePercent ? d : max, metrics.disk[0]);
      }

      // Explicitly distinguish missing telemetry vs confirmed down
      let healthStatus = server.status;
      if (!server.lastContact || (Date.now() - new Date(server.lastContact).getTime()) > 300000) {
        healthStatus = server.status === 'online' ? 'stale_telemetry' : server.status;
      }

      serverSummaries.push({
        id: server._id,
        name: server.name,
        hostname: server.hostname,
        os: server.os?.distroName || server.os?.distro || 'Unknown',
        status: healthStatus,
        cpu,
        memory: mem,
        disk: maxDisk ? maxDisk.usagePercent : null,
        consecutiveFailures: server.consecutiveFailures || 0
      });
    }

    return {
      tenantId,
      generatedAt: new Date(),
      totalServers,
      onlineServers,
      offlineServers,
      warningServers,
      activeIncidentsCount: activeIncidents.length,
      resolvedIncidentsCount: resolvedIncidents.length,
      activeIncidents: activeIncidents.slice(0, 10).map(i => ({
        id: i._id,
        serverName: i.serverName,
        title: i.title,
        severity: i.severity,
        firstSeen: i.firstSeen,
        occurrences: i.occurrenceCount
      })),
      servers: serverSummaries
    };
  }

  /**
   * Run and dispatch report via email
   */
  async runAndSendReport(tenantId, recipients = [], reportConfig = null) {
    const reportData = await this.generateReport(tenantId, reportConfig);
    const html = emailService.renderHealthReportHtml(reportData);

    const targetRecipients = recipients.length > 0 ? recipients : (reportConfig?.recipients || []);
    for (const recipient of targetRecipients) {
      await notificationQueue.enqueueEmail({
        tenantId,
        recipient,
        subject: `AgentOps 2.0 Infrastructure Health Report - ${new Date().toLocaleDateString()}`,
        type: 'health_report',
        htmlPayload: html
      });
    }

    logger.info('Scheduled health report generated and queued', { tenantId, recipientCount: targetRecipients.length });
    return reportData;
  }
}

module.exports = new ReportService();
