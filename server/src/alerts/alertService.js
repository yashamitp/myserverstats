const Alert = require('../models/Alert');
const AlertRule = require('../models/AlertRule');
const MonitoringProfile = require('../models/MonitoringProfile');
const incidentService = require('./incidentService');
const logger = require('../config/logger');

class AlertService {
  /**
   * Evaluate a fresh metrics snapshot against active rules and monitoring profile for a server
   */
  async evaluateMetrics(server, metrics, io = null) {
    try {
      const tenantId = server.tenantId;
      const serverId = server._id;

      // 1. Resolve Monitoring Profile (custom assigned or tenant default)
      let profile = null;
      if (server.monitoringProfileId) {
        profile = await MonitoringProfile.findOne({
          _id: server.monitoringProfileId,
          tenantId
        });
      }
      if (!profile) {
        profile = await MonitoringProfile.findOne({
          tenantId,
          isDefault: true
        });
      }

      // 2. Find any custom per-server/tenant alert rules
      const customRules = await AlertRule.find({
        tenantId,
        isEnabled: true,
        $or: [{ serverId: serverId }, { serverId: null }]
      });

      // Build effective rules prioritizing custom rules, then profile, then built-in defaults
      const effectiveRules = [];

      if (customRules.length > 0) {
        effectiveRules.push(...customRules);
      } else if (profile && profile.thresholds) {
        if (profile.thresholds.cpu?.enabled) {
          effectiveRules.push({
            metricType: 'cpu',
            threshold: profile.thresholds.cpu.threshold || 85,
            severity: profile.thresholds.cpu.severity || 'warning',
            name: `${profile.name} - CPU Threshold`
          });
        }
        if (profile.thresholds.memory?.enabled) {
          effectiveRules.push({
            metricType: 'memory',
            threshold: profile.thresholds.memory.threshold || 90,
            severity: profile.thresholds.memory.severity || 'warning',
            name: `${profile.name} - Memory Threshold`
          });
        }
        if (profile.thresholds.disk?.enabled) {
          effectiveRules.push({
            metricType: 'disk',
            threshold: profile.thresholds.disk.threshold || 90,
            severity: profile.thresholds.disk.severity || 'critical',
            name: `${profile.name} - Disk Threshold`
          });
        }
      } else {
        effectiveRules.push(
          { metricType: 'cpu', threshold: 90, severity: 'warning', name: 'High CPU Usage' },
          { metricType: 'memory', threshold: 90, severity: 'warning', name: 'High Memory Usage' },
          { metricType: 'disk', threshold: 90, severity: 'warning', name: 'High Disk Usage' }
        );
      }

      for (const rule of effectiveRules) {
        let isBreached = false;
        let triggerValue = 0;
        let alertType = '';
        let message = '';
        let resourceKey = 'system';

        if (rule.metricType === 'cpu' && metrics.cpu) {
          alertType = 'cpu_high';
          resourceKey = 'cpu';
          triggerValue = metrics.cpu.usagePercent || 0;
          if (triggerValue >= rule.threshold) {
            isBreached = true;
            message = `CPU utilization is high at ${triggerValue}% (threshold: ${rule.threshold}%)`;
          }
        } else if (rule.metricType === 'memory' && metrics.memory) {
          alertType = 'memory_high';
          resourceKey = 'memory';
          triggerValue = metrics.memory.usagePercent || 0;
          if (triggerValue >= rule.threshold) {
            isBreached = true;
            message = `Memory utilization is high at ${triggerValue}% (threshold: ${rule.threshold}%)`;
          }
        } else if (rule.metricType === 'disk' && Array.isArray(metrics.disk)) {
          alertType = 'disk_high';
          const maxDisk = metrics.disk.reduce((max, d) => d.usagePercent > max.usagePercent ? d : max, { usagePercent: 0, mount: '/' });
          resourceKey = maxDisk.mount || '/';
          triggerValue = maxDisk.usagePercent;
          if (triggerValue >= rule.threshold) {
            isBreached = true;
            message = `Disk usage on mount ${maxDisk.mount} is high at ${triggerValue}% (threshold: ${rule.threshold}%)`;
          }
        }

        if (alertType) {
          await this.handleAlertState(server, alertType, isBreached, {
            severity: rule.severity || 'warning',
            title: rule.name || `${alertType.replace('_', ' ').toUpperCase()} on ${server.name}`,
            message,
            triggerValue,
            threshold: rule.threshold,
            ruleId: rule._id || null,
            resourceKey
          }, io);
        }
      }
    } catch (err) {
      logger.error('Failed to evaluate alert rules', { serverId: server._id, error: err.message });
    }
  }

  /**
   * Handle server unreachable status alert
   */
  async handleUnreachable(server, errorMessage, io = null) {
    const alertType = 'unreachable';
    const message = `Server ${server.name} (${server.hostname}) is unreachable: ${errorMessage}`;
    await this.handleAlertState(server, alertType, true, {
      severity: 'critical',
      title: `Server Unreachable: ${server.name}`,
      message,
      triggerValue: 'unreachable',
      threshold: 'online',
      ruleId: null,
      resourceKey: 'connectivity'
    }, io);
  }

  /**
   * Deduplicate, fire or resolve alert and incident
   */
  async handleAlertState(server, type, isBreached, data, io = null) {
    // Delegate to unified IncidentService for durable deduplication, occurrences, recovery & notifications
    await incidentService.handleIncidentState(server, type, isBreached, data, io);
  }
}

module.exports = new AlertService();
