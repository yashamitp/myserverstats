const NotificationPreference = require('../models/NotificationPreference');
const NotificationDelivery = require('../models/NotificationDelivery');
const emailService = require('../notifications/emailService');
const notificationQueue = require('../notifications/notificationQueue');
const { encrypt } = require('../security/crypto');
const { success, error } = require('../utils/response');
const logger = require('../config/logger');

// GET /api/v1/notification-preferences - Get tenant notification preferences
exports.getPreferences = async (req, res, next) => {
  try {
    let prefs = await NotificationPreference.findOne({ tenantId: req.user.tenantId });
    const userEmail = req.user?.email ? req.user.email.toLowerCase().trim() : null;

    if (!prefs) {
      prefs = await NotificationPreference.create({
        tenantId: req.user.tenantId,
        emailEnabled: true,
        recipients: userEmail ? [userEmail] : [],
        minSeverity: 'warning',
        cooldownMinutes: 30,
        sendRecoveryEmail: true
      });
    } else if (userEmail) {
      // Alert Notification Recipient is strictly locked to the user's login email
      if (!Array.isArray(prefs.recipients) || prefs.recipients.length !== 1 || prefs.recipients[0] !== userEmail) {
        prefs.recipients = [userEmail];
        await prefs.save();
      }
    }

    const isGlobalSmtpConfigured = emailService.isConfigured();

    return success(res, {
      preferences: prefs,
      isSmtpConfigured: isGlobalSmtpConfigured || Boolean(prefs.customSmtp?.enabled && prefs.customSmtp?.host)
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/notification-preferences - Update preferences
exports.updatePreferences = async (req, res, next) => {
  try {
    const {
      emailEnabled,
      minSeverity,
      cooldownMinutes,
      sendRecoveryEmail,
      customSmtp
    } = req.body;

    let prefs = await NotificationPreference.findOne({ tenantId: req.user.tenantId })
      .select('+customSmtp.encryptedPass');

    if (!prefs) {
      prefs = new NotificationPreference({ tenantId: req.user.tenantId });
    }

    if (emailEnabled !== undefined) prefs.emailEnabled = Boolean(emailEnabled);

    // Alert Notification Recipient is permanently locked to the authenticated user's primary login email
    const userEmail = req.user?.email ? req.user.email.toLowerCase().trim() : null;
    if (userEmail) {
      prefs.recipients = [userEmail];
    } else if (Array.isArray(req.body.recipients) && req.body.recipients.length > 0) {
      prefs.recipients = [req.body.recipients[0].trim().toLowerCase()];
    }

    if (minSeverity && ['info', 'warning', 'critical'].includes(minSeverity)) {
      prefs.minSeverity = minSeverity;
    }
    if (cooldownMinutes !== undefined) {
      prefs.cooldownMinutes = Math.max(5, Math.min(1440, parseInt(cooldownMinutes, 10) || 30));
    }
    if (sendRecoveryEmail !== undefined) {
      prefs.sendRecoveryEmail = Boolean(sendRecoveryEmail);
    }

    // Custom SMTP
    if (customSmtp && typeof customSmtp === 'object') {
      prefs.customSmtp = prefs.customSmtp || {};
      if (customSmtp.enabled !== undefined) prefs.customSmtp.enabled = Boolean(customSmtp.enabled);
      if (customSmtp.host !== undefined) prefs.customSmtp.host = customSmtp.host.trim();
      if (customSmtp.port !== undefined) prefs.customSmtp.port = parseInt(customSmtp.port, 10) || 587;
      if (customSmtp.secure !== undefined) prefs.customSmtp.secure = Boolean(customSmtp.secure);
      if (customSmtp.user !== undefined) prefs.customSmtp.user = customSmtp.user.trim();
      if (customSmtp.fromEmail !== undefined) prefs.customSmtp.fromEmail = customSmtp.fromEmail.trim();
      if (customSmtp.fromName !== undefined) prefs.customSmtp.fromName = customSmtp.fromName.trim();

      if (customSmtp.pass && customSmtp.pass.trim() !== '') {
        prefs.customSmtp.encryptedPass = encrypt(customSmtp.pass.trim());
      }
    }

    await prefs.save();

    return success(res, prefs, 'Notification preferences updated successfully');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/notification-preferences/test-email - Send a test email
exports.sendTestEmail = async (req, res, next) => {
  try {
    // Deliver test email strictly to the user's login email
    const recipient = req.user?.email || req.body?.targetEmail;

    if (!recipient) {
      return error(res, 'Authenticated user email address is required', 400);
    }

    const prefs = await NotificationPreference.findOne({ tenantId: req.user.tenantId })
      .select('+customSmtp.encryptedPass');

    const customSmtp = prefs?.customSmtp?.enabled ? prefs.customSmtp : null;

    if (!emailService.isConfigured(customSmtp)) {
      return error(res, 'SMTP is not configured. Please configure SMTP in environment or settings before sending test email.', 400);
    }

    const testHtml = `
      <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 8px;">
        <h2 style="color: #38bdf8; margin-top: 0;">AgentOps 2.0 Test Email</h2>
        <p>This is a verification email from AgentOps 2.0 infrastructure monitoring.</p>
        <p>SMTP notification delivery is correctly configured and operational for tenant: <code>${req.user.tenantId}</code>.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Sent at: ${new Date().toUTCString()}</p>
      </div>
    `;

    // Enqueue or send
    await notificationQueue.enqueueEmail({
      tenantId: req.user.tenantId,
      recipient,
      subject: 'AgentOps 2.0 - Test Email Verification',
      type: 'test_email',
      htmlPayload: testHtml
    });

    return success(res, { queued: true, recipient }, 'Test email queued for delivery');
  } catch (err) {
    logger.error('Failed to send test email', { error: err.message });
    return error(res, `Failed to send test email: ${err.message}`, 500);
  }
};

// GET /api/v1/notification-preferences/deliveries - Get delivery history
exports.getDeliveryHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [deliveries, total] = await Promise.all([
      NotificationDelivery.find({ tenantId: req.user.tenantId })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select('-htmlPayload'),
      NotificationDelivery.countDocuments({ tenantId: req.user.tenantId })
    ]);

    return success(res, {
      deliveries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
};
