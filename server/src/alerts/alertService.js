const Alert = require('../models/Alert');
const AlertRule = require('../models/AlertRule');
const logger = require('../config/logger');

class AlertService {
  /**
   * Evaluate a fresh metrics snapshot against active rules for a server
   */
  async evaluateMetrics(server, metrics, io = null) {
    try {
      const tenantId = server.tenantId;
      const serverId = server._id;

      // Find all rules applicable to this server or tenant-wide
      const rules = await AlertRule.find({
        tenantId,
        isEnabled: true,
        $or: [{ serverId: serverId }, { serverId: null }]
      });

      // Default built-in threshold rules if no custom rules configured
      const effectiveRules = rules.length > 0 ? rules : [
        { metricType: 'cpu', threshold: 90, severity: 'warning', name: 'High CPU Usage' },
        { metricType: 'memory', threshold: 90, severity: 'warning', name: 'High Memory Usage' },
        { metricType: 'disk', threshold: 90, severity: 'warning', name: 'High Disk Usage' }
      ];

      for (const rule of effectiveRules) {
        let isBreached = false;
        let triggerValue = 0;
        let alertType = '';
        let message = '';

        if (rule.metricType === 'cpu' && metrics.cpu) {
          alertType = 'cpu_high';
          triggerValue = metrics.cpu.usagePercent || 0;
          if (triggerValue >= rule.threshold) {
            isBreached = true;
            message = `CPU utilization is high at ${triggerValue}% (threshold: ${rule.threshold}%)`;
          }
        } else if (rule.metricType === 'memory' && metrics.memory) {
          alertType = 'memory_high';
          triggerValue = metrics.memory.usagePercent || 0;
          if (triggerValue >= rule.threshold) {
            isBreached = true;
            message = `Memory utilization is high at ${triggerValue}% (threshold: ${rule.threshold}%)`;
          }
        } else if (rule.metricType === 'disk' && Array.isArray(metrics.disk)) {
          alertType = 'disk_high';
          const maxDisk = metrics.disk.reduce((max, d) => d.usagePercent > max.usagePercent ? d : max, { usagePercent: 0, mount: '/' });
          triggerValue = maxDisk.usagePercent;
          if (triggerValue >= rule.threshold) {
            isBreached = true;
            message = `Disk usage on mount ${maxDisk.mount} is high at ${triggerValue}% (threshold: ${rule.threshold}%)`;
          }
        }

        if (alertType) {
          await this.handleAlertState(server, alertType, isBreached, {
            severity: rule.severity || 'warning',
            message,
            triggerValue,
            threshold: rule.threshold,
            ruleId: rule._id || null
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
      message,
      triggerValue: 'unreachable',
      threshold: 'online',
      ruleId: null
    }, io);
  }

  /**
   * Deduplicate, fire or resolve alert
   */
  async handleAlertState(server, type, isBreached, data, io = null) {
    const activeAlert = await Alert.findOne({
      serverId: server._id,
      tenantId: server.tenantId,
      type,
      status: 'active'
    });

    if (isBreached) {
      if (!activeAlert) {
        // Create new active alert
        const newAlert = await Alert.create({
          tenantId: server.tenantId,
          serverId: server._id,
          serverName: server.name,
          type,
          severity: data.severity,
          message: data.message,
          triggerValue: data.triggerValue,
          threshold: data.threshold,
          ruleId: data.ruleId,
          status: 'active'
        });

        logger.warn('Alert triggered', { serverId: server._id, type, message: data.message });

        if (io) {
          io.to(`tenant:${server.tenantId}`).emit('alert:created', newAlert);
          io.to(`server:${server._id}`).emit('alert:created', newAlert);
        }
      } else {
        // Update triggering value without spamming
        activeAlert.triggerValue = data.triggerValue;
        activeAlert.message = data.message;
        await activeAlert.save();
      }
    } else {
      // Condition cleared: resolve existing active alert if present
      if (activeAlert) {
        activeAlert.status = 'resolved';
        activeAlert.resolvedAt = new Date();
        await activeAlert.save();

        logger.info('Alert resolved', { serverId: server._id, type });

        if (io) {
          io.to(`tenant:${server.tenantId}`).emit('alert:resolved', activeAlert);
          io.to(`server:${server._id}`).emit('alert:resolved', activeAlert);
        }
      }
    }
  }
}

module.exports = new AlertService();
