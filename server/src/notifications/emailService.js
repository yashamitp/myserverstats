const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');
const { decrypt } = require('../security/crypto');

class EmailService {
  /**
   * Determine if SMTP is configured either in environment or custom preferences
   */
  isConfigured(customSmtp = null) {
    if (customSmtp && customSmtp.enabled && customSmtp.host) {
      return true;
    }
    return Boolean(env.SMTP_HOST && env.SMTP_HOST.trim() !== '');
  }

  /**
   * Create Nodemailer transport
   */
  createTransporter(customSmtp = null) {
    if (customSmtp && customSmtp.enabled && customSmtp.host) {
      let pass = '';
      if (customSmtp.encryptedPass) {
        try {
          pass = decrypt(customSmtp.encryptedPass);
        } catch (e) {
          logger.warn('Failed to decrypt custom SMTP password', { error: e.message });
        }
      }

      return nodemailer.createTransport({
        host: customSmtp.host,
        port: customSmtp.port || 587,
        secure: Boolean(customSmtp.secure),
        auth: customSmtp.user ? { user: customSmtp.user, pass } : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 10000
      });
    }

    if (!env.SMTP_HOST) {
      return null;
    }

    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000
    });
  }

  /**
   * Render Branded HTML Incident Email
   */
  renderIncidentHtml(incident, server) {
    const isCritical = incident.severity === 'critical';
    const accentColor = isCritical ? '#ef4444' : '#f59e0b';
    const badgeBg = isCritical ? '#450a0a' : '#451a03';
    const badgeBorder = isCritical ? '#b91c1c' : '#b45309';

    const clientUrl = env.CLIENT_URL || 'http://localhost:3000';
    const incidentUrl = `${clientUrl}/servers/${incident.serverId}?tab=alerts`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[${incident.severity.toUpperCase()}] ${incident.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #090d16; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-bottom: 1px solid #334155;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 700; color: #38bdf8; letter-spacing: -0.5px;">AgentOps 2.0</span>
                    <span style="font-size: 11px; background-color: #0284c7; color: #ffffff; padding: 2px 8px; border-radius: 9999px; margin-left: 8px; font-weight: 600; text-transform: uppercase;">Infrastructure Alert</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; background-color: ${badgeBg}; color: ${accentColor}; border: 1px solid ${badgeBorder};">
                      ${incident.severity}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #ffffff;">${incident.title}</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">${incident.message}</p>

              <!-- Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 12px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Target Server</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #f8fafc; font-weight: 500;">${server ? server.name : incident.serverName} (${server ? server.hostname : 'Host'})</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Operating System</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #f8fafc; text-transform: capitalize;">${server && server.os ? (server.os.distroName || server.os.distro) : 'Linux/Windows'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Observed Value</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: ${accentColor}; font-weight: 600;">${incident.triggerValue !== undefined ? incident.triggerValue : 'N/A'}${typeof incident.triggerValue === 'number' ? '%' : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Threshold</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #94a3b8;">${incident.threshold !== undefined ? incident.threshold : 'Breached'}${typeof incident.threshold === 'number' ? '%' : ''}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">First Detected</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #94a3b8;">${new Date(incident.firstSeen).toUTCString()}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Occurrences</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #94a3b8;">${incident.occurrenceCount || 1} consecutive check(s)</td>
                </tr>
              </table>

              <!-- Call to action -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="${incidentUrl}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);">
                      View Incident in AgentOps
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0b1120; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b;">
              Incident Fingerprint: <code style="color: #94a3b8;">${incident.fingerprint}</code><br>
              Automated message sent by AgentOps 2.0 Infrastructure Monitoring. Do not reply directly to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Render Branded HTML Recovery Email
   */
  renderRecoveryHtml(incident, server) {
    const clientUrl = env.CLIENT_URL || 'http://localhost:3000';
    const incidentUrl = `${clientUrl}/servers/${incident.serverId}?tab=alerts`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[RESOLVED] ${incident.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #090d16; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border-bottom: 1px solid #334155;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 700; color: #38bdf8; letter-spacing: -0.5px;">AgentOps 2.0</span>
                    <span style="font-size: 11px; background-color: #059669; color: #ffffff; padding: 2px 8px; border-radius: 9999px; margin-left: 8px; font-weight: 600; text-transform: uppercase;">Recovered</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; background-color: #064e3b; color: #34d399; border: 1px solid #059669;">
                      Resolved
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #ffffff;">Incident Resolved: ${incident.title}</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                The condition triggering this incident on <strong style="color: #f1f5f9;">${server ? server.name : incident.serverName}</strong> has returned to normal operational limits.
              </p>

              <!-- Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 12px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Server</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #f8fafc; font-weight: 500;">${server ? server.name : incident.serverName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Resolved At</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #34d399; font-weight: 600;">${incident.resolvedAt ? new Date(incident.resolvedAt).toUTCString() : new Date().toUTCString()}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Total Duration</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #94a3b8;">${Math.round((new Date(incident.resolvedAt || Date.now()).getTime() - new Date(incident.firstSeen).getTime()) / 60000)} minute(s)</td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="${incidentUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">
                      View Server Health
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0b1120; border-top: 1px solid #1e293b; text-align: center; font-size: 12px; color: #64748b;">
              Automated message sent by AgentOps 2.0 Infrastructure Monitoring.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Render Health Report HTML
   */
  renderHealthReportHtml(data) {
    const clientUrl = env.CLIENT_URL || 'http://localhost:3000';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AgentOps Infrastructure Health Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090d16; font-family: sans-serif; color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; padding: 32px;">
          <tr>
            <td>
              <h1 style="color: #38bdf8; font-size: 22px; margin: 0 0 8px 0;">AgentOps 2.0 Infrastructure Health Report</h1>
              <p style="color: #94a3b8; font-size: 13px; margin: 0 0 24px 0;">Generated on ${new Date().toUTCString()} for tenant ${data.tenantId}</p>

              <div style="background-color: #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <h3 style="color: #ffffff; margin: 0 0 12px 0; font-size: 15px;">Summary Overview</h3>
                <p style="color: #94a3b8; margin: 4px 0; font-size: 13px;">Total Servers Monitored: <strong style="color: #ffffff;">${data.totalServers}</strong></p>
                <p style="color: #94a3b8; margin: 4px 0; font-size: 13px;">Online / Healthy: <strong style="color: #34d399;">${data.onlineServers}</strong></p>
                <p style="color: #94a3b8; margin: 4px 0; font-size: 13px;">Offline / Warning: <strong style="color: #f87171;">${data.offlineServers}</strong></p>
                <p style="color: #94a3b8; margin: 4px 0; font-size: 13px;">Active Incidents: <strong style="color: #fbbf24;">${data.activeIncidentsCount}</strong></p>
                <p style="color: #94a3b8; margin: 4px 0; font-size: 13px;">Incidents Resolved (24h): <strong style="color: #34d399;">${data.resolvedIncidentsCount}</strong></p>
              </div>

              <a href="${clientUrl}" style="display: block; text-align: center; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px; border-radius: 6px; font-weight: 600; font-size: 14px;">Open AgentOps Dashboard</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Send a rendered email using transporter with fallback
   */
  async sendMail({ to, subject, html, customSmtp = null }) {
    const transporter = this.createTransporter(customSmtp);
    if (!transporter) {
      throw new Error('SMTP service is not configured. Set SMTP_HOST in environment or configure custom SMTP settings.');
    }

    const fromAddress = customSmtp?.fromEmail || env.SMTP_FROM || 'alerts@agentops.io';
    const fromName = customSmtp?.fromName || env.SMTP_FROM_NAME || 'AgentOps 2.0';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      html
    });

    logger.info('Email sent successfully', { messageId: info.messageId, to, subject });
    return info;
  }
}

module.exports = new EmailService();
