const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const maintenanceService = require('../services/maintenanceService');
const notificationQueue = require('../notifications/notificationQueue');
const emailService = require('../notifications/emailService');
const logger = require('../config/logger');

class IncidentService {
  /**
   * Deterministic incident fingerprint
   */
  generateFingerprint(tenantId, serverId, type, resourceKey = 'system') {
    return `${tenantId}:${serverId}:${type}:${resourceKey}`;
  }

  /**
   * Handle incident state changes with deduplication and recovery tracking
   */
  async handleIncidentState(server, type, isBreached, data, io = null) {
    const resourceKey = data.resourceKey || 'system';
    const fingerprint = this.generateFingerprint(server.tenantId, server._id, type, resourceKey);

    // 1. Check maintenance status
    const maintInfo = await maintenanceService.checkMaintenance(server);

    // 2. Lookup existing active incident
    const activeIncident = await Incident.findOne({
      tenantId: server.tenantId,
      fingerprint,
      status: 'active'
    });

    // Also maintain legacy Alert record for full backward compatibility
    let activeAlert = await Alert.findOne({
      serverId: server._id,
      tenantId: server.tenantId,
      type,
      status: 'active'
    });

    const now = new Date();

    if (isBreached) {
      if (!activeIncident) {
        // === NEW INCIDENT DETECTED ===
        const newIncident = await Incident.create({
          tenantId: server.tenantId,
          serverId: server._id,
          serverName: server.name,
          fingerprint,
          type,
          resourceKey,
          severity: data.severity || 'warning',
          title: data.title || `${type.replace('_', ' ').toUpperCase()} on ${server.name}`,
          message: data.message,
          triggerValue: data.triggerValue,
          threshold: data.threshold,
          ruleId: data.ruleId || null,
          status: 'active',
          firstSeen: now,
          lastSeen: now,
          occurrenceCount: 1,
          inMaintenance: maintInfo.inMaintenance,
          history: [{
            timestamp: now,
            status: 'active',
            message: data.message,
            value: data.triggerValue
          }]
        });

        // Mirror to Alert collection for backward compatibility
        if (!activeAlert) {
          activeAlert = await Alert.create({
            tenantId: server.tenantId,
            serverId: server._id,
            serverName: server.name,
            type,
            severity: data.severity || 'warning',
            message: data.message,
            triggerValue: data.triggerValue,
            threshold: data.threshold,
            ruleId: data.ruleId || null,
            status: 'active'
          });
        }

        logger.warn('New incident triggered', {
          incidentId: newIncident._id,
          fingerprint,
          severity: newIncident.severity,
          serverName: server.name
        });

        // Real-time broadcast
        if (io) {
          io.to(`tenant:${server.tenantId}`).emit('incident:created', newIncident);
          io.to(`server:${server._id}`).emit('incident:created', newIncident);
          io.to(`tenant:${server.tenantId}`).emit('alert:created', activeAlert);
        }

        // Create In-App Notification (unless suppressed by maintenance)
        if (!maintInfo.suppressNotifications) {
          const inAppNotif = await Notification.create({
            tenantId: server.tenantId,
            serverId: server._id,
            incidentId: newIncident._id,
            title: newIncident.title,
            message: newIncident.message,
            severity: newIncident.severity,
            type: 'incident_new',
            link: `/servers/${server._id}?tab=alerts`
          });

          if (io) {
            io.to(`tenant:${server.tenantId}`).emit('notification:new', inAppNotif);
          }

          // Email Notification dispatch
          await this.dispatchIncidentEmail(newIncident, server, 'new');
        }
      } else {
        // === ONGOING INCIDENT: DEDUPLICATE & UPDATE OBSERVATION ===
        activeIncident.occurrenceCount += 1;
        activeIncident.lastSeen = now;
        activeIncident.triggerValue = data.triggerValue;
        activeIncident.message = data.message;
        activeIncident.inMaintenance = maintInfo.inMaintenance;

        if (activeIncident.history.length < 50) {
          activeIncident.history.push({
            timestamp: now,
            status: 'active',
            message: data.message,
            value: data.triggerValue
          });
        }

        // Backward compatibility Alert update
        if (activeAlert) {
          activeAlert.triggerValue = data.triggerValue;
          activeAlert.message = data.message;
          await activeAlert.save();
        }

        await activeIncident.save();

        if (io) {
          io.to(`tenant:${server.tenantId}`).emit('incident:updated', activeIncident);
        }

        // Check if cooldown has expired for reminder email
        if (!maintInfo.suppressNotifications) {
          await this.dispatchIncidentEmail(activeIncident, server, 'reminder');
        }
      }
    } else {
      // === RECOVERY / CONDITION CLEARED ===
      if (activeIncident) {
        activeIncident.status = 'resolved';
        activeIncident.resolvedAt = now;
        activeIncident.history.push({
          timestamp: now,
          status: 'resolved',
          message: 'Metric returned to normal levels',
          value: data.triggerValue
        });

        await activeIncident.save();

        logger.info('Incident resolved', {
          incidentId: activeIncident._id,
          fingerprint,
          durationMs: now - activeIncident.firstSeen
        });

        // Resolve legacy alert
        if (activeAlert) {
          activeAlert.status = 'resolved';
          activeAlert.resolvedAt = now;
          await activeAlert.save();
        }

        if (io) {
          io.to(`tenant:${server.tenantId}`).emit('incident:resolved', activeIncident);
          io.to(`server:${server._id}`).emit('incident:resolved', activeIncident);
          io.to(`tenant:${server.tenantId}`).emit('alert:resolved', activeAlert);
        }

        // Recovery Notification & Email
        if (!maintInfo.suppressNotifications) {
          const recoveryNotif = await Notification.create({
            tenantId: server.tenantId,
            serverId: server._id,
            incidentId: activeIncident._id,
            title: `Resolved: ${activeIncident.title}`,
            message: `Condition cleared on ${server.name}`,
            severity: 'info',
            type: 'incident_resolved',
            link: `/servers/${server._id}?tab=alerts`
          });

          if (io) {
            io.to(`tenant:${server.tenantId}`).emit('notification:new', recoveryNotif);
          }

          await this.dispatchIncidentEmail(activeIncident, server, 'recovery');
        }
      }
    }
  }

  /**
   * Check preferences and dispatch email alert or recovery
   */
  async dispatchIncidentEmail(incident, server, reason = 'new') {
    try {
      const prefs = await NotificationPreference.findOne({ tenantId: server.tenantId });
      let recipients = prefs?.recipients ? [...prefs.recipients] : [];

      // Fallback: If preferences have no recipient, look up the tenant's primary user email
      if (recipients.length === 0 && server.tenantId) {
        try {
          const User = require('../models/User');
          const user = await User.findById(server.tenantId);
          if (user?.email) {
            recipients = [user.email.toLowerCase().trim()];
          }
        } catch (_) {}
      }

      if (!prefs || !prefs.emailEnabled || recipients.length === 0) {
        return;
      }

      // Check severity filter
      const severityOrder = { info: 1, warning: 2, critical: 3 };
      const minLevel = severityOrder[prefs.minSeverity] || 2;
      const incidentLevel = severityOrder[incident.severity] || 2;

      if (reason !== 'recovery' && incidentLevel < minLevel) {
        return;
      }

      const now = Date.now();

      if (reason === 'new') {
        const html = emailService.renderIncidentHtml(incident, server);
        for (const recipient of recipients) {
          await notificationQueue.enqueueEmail({
            tenantId: server.tenantId,
            recipient,
            subject: `[${incident.severity.toUpperCase()}] ${incident.title} on ${server.name}`,
            type: 'incident_alert',
            incidentId: incident._id,
            serverId: server._id,
            htmlPayload: html
          });
        }
        incident.lastNotificationSentAt = new Date(now);
        await incident.save();
      } else if (reason === 'reminder') {
        const cooldownMs = (prefs.cooldownMinutes || 30) * 60 * 1000;
        const lastSent = incident.lastNotificationSentAt ? new Date(incident.lastNotificationSentAt).getTime() : 0;
        if (now - lastSent >= cooldownMs) {
          const html = emailService.renderIncidentHtml(incident, server);
          for (const recipient of recipients) {
            await notificationQueue.enqueueEmail({
              tenantId: server.tenantId,
              recipient,
              subject: `[REMINDER - ${incident.severity.toUpperCase()}] ${incident.title} on ${server.name}`,
              type: 'incident_alert',
              incidentId: incident._id,
              serverId: server._id,
              htmlPayload: html
            });
          }
          incident.lastNotificationSentAt = new Date(now);
          await incident.save();
        }
      } else if (reason === 'recovery' && prefs.sendRecoveryEmail) {
        const html = emailService.renderRecoveryHtml(incident, server);
        for (const recipient of recipients) {
          await notificationQueue.enqueueEmail({
            tenantId: server.tenantId,
            recipient,
            subject: `[RESOLVED] ${incident.title} on ${server.name}`,
            type: 'incident_recovery',
            incidentId: incident._id,
            serverId: server._id,
            htmlPayload: html
          });
        }
      }
    } catch (err) {
      logger.error('Failed to dispatch incident email', {
        incidentId: incident._id,
        error: err.message
      });
    }
  }
}

module.exports = new IncidentService();
