const ScheduledReport = require('../models/ScheduledReport');
const reportService = require('../services/reportService');
const AuditEvent = require('../models/AuditEvent');
const { success, error } = require('../utils/response');

// GET /api/v1/reports/config - Get report configurations
exports.getReportConfig = async (req, res, next) => {
  try {
    let config = await ScheduledReport.findOne({ tenantId: req.user.tenantId });

    if (!config) {
      config = await ScheduledReport.create({
        tenantId: req.user.tenantId,
        title: 'Daily Infrastructure Health Report',
        frequency: 'daily',
        hour: 8,
        recipients: [req.user.email].filter(Boolean),
        isEnabled: false
      });
    }

    return success(res, config);
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/reports/config - Update report configuration
exports.updateReportConfig = async (req, res, next) => {
  try {
    const { title, frequency, hour, timezone, recipients, serverIds, isEnabled } = req.body;

    let config = await ScheduledReport.findOne({ tenantId: req.user.tenantId });
    if (!config) {
      config = new ScheduledReport({ tenantId: req.user.tenantId });
    }

    if (title) config.title = title.trim();
    if (frequency && ['daily', 'weekly'].includes(frequency)) config.frequency = frequency;
    if (hour !== undefined) config.hour = Math.max(0, Math.min(23, parseInt(hour, 10) || 8));
    if (timezone) config.timezone = timezone;
    if (Array.isArray(recipients)) config.recipients = recipients.map(r => r.trim().toLowerCase()).filter(Boolean);
    if (Array.isArray(serverIds)) config.serverIds = serverIds;
    if (isEnabled !== undefined) config.isEnabled = Boolean(isEnabled);

    await config.save();

    return success(res, config, 'Report schedule configuration updated successfully');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/reports/generate-now - On-demand health report generation
exports.generateReportNow = async (req, res, next) => {
  try {
    const { recipients } = req.body;
    const config = await ScheduledReport.findOne({ tenantId: req.user.tenantId });

    const targetRecipients = Array.isArray(recipients) && recipients.length > 0
      ? recipients
      : (config?.recipients?.length > 0 ? config.recipients : [req.user.email].filter(Boolean));

    const reportData = await reportService.runAndSendReport(
      req.user.tenantId,
      targetRecipients,
      config
    );

    await AuditEvent.create({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      action: 'report.generated_on_demand',
      resourceType: 'report',
      resourceId: req.user.tenantId,
      metadata: { serverCount: reportData.totalServers, recipients: targetRecipients }
    });

    return success(res, reportData, 'Health report generated and queued for delivery');
  } catch (err) {
    next(err);
  }
};
