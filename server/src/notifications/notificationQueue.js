const NotificationDelivery = require('../models/NotificationDelivery');
const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const emailService = require('./emailService');
const logger = require('../config/logger');

class NotificationQueue {
  constructor() {
    this.intervalHandle = null;
    this.isProcessing = false;
    this.concurrency = 5;
    this.activeJobs = 0;
  }

  /**
   * Start the background delivery worker
   */
  start(checkIntervalMs = 15000) {
    if (this.intervalHandle) return;
    this.intervalHandle = setInterval(() => {
      this.processQueue().catch(err => {
        logger.error('Error during notification queue processing', { error: err.message });
      });
    }, checkIntervalMs);
    logger.info('Notification delivery queue started');
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    logger.info('Notification delivery queue stopped');
  }

  /**
   * Enqueue an email job into the durable delivery queue
   */
  async enqueueEmail({
    tenantId,
    recipient,
    subject,
    type,
    incidentId = null,
    serverId = null,
    htmlPayload
  }) {
    const delivery = await NotificationDelivery.create({
      tenantId,
      recipient,
      subject,
      type,
      incidentId,
      serverId,
      status: 'pending',
      nextAttemptAt: new Date(),
      htmlPayload
    });

    logger.debug('Enqueued notification delivery job', { deliveryId: delivery._id, recipient, type });
    // Trigger immediate queue processing attempt asynchronously
    setImmediate(() => this.processQueue().catch(() => {}));
    return delivery;
  }

  /**
   * Process pending or retrying jobs in queue
   */
  async processQueue(io = null) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      const jobs = await NotificationDelivery.find({
        status: { $in: ['pending', 'retrying'] },
        nextAttemptAt: { $lte: now }
      })
      .sort({ createdAt: 1 })
      .limit(this.concurrency);

      for (const job of jobs) {
        await this.deliverJob(job, io);
      }
    } catch (err) {
      logger.error('Failed to process notification queue', { error: err.message });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Deliver a single job with backoff and error tracking
   */
  async deliverJob(job, io = null) {
    job.attempts += 1;
    job.lastAttemptAt = new Date();

    try {
      // Check tenant custom SMTP preferences if available
      const prefs = await NotificationPreference.findOne({ tenantId: job.tenantId })
        .select('+customSmtp.encryptedPass');

      const customSmtp = prefs?.customSmtp?.enabled ? prefs.customSmtp : null;

      // Attempt send
      await emailService.sendMail({
        to: job.recipient,
        subject: job.subject,
        html: job.htmlPayload,
        customSmtp
      });

      job.status = 'sent';
      job.error = '';
      await job.save();

      logger.info('Notification delivered successfully', {
        deliveryId: job._id,
        recipient: job.recipient,
        type: job.type
      });
    } catch (err) {
      const isLastAttempt = job.attempts >= job.maxAttempts;
      job.error = err.message || 'Delivery error';

      if (isLastAttempt) {
        job.status = 'failed';
        logger.error('Notification delivery permanently failed', {
          deliveryId: job._id,
          recipient: job.recipient,
          error: job.error,
          attempts: job.attempts
        });

        // Create in-app notification about delivery failure
        try {
          const failNotif = await Notification.create({
            tenantId: job.tenantId,
            title: 'Email Alert Delivery Failed',
            message: `Failed to deliver ${job.type} email to ${job.recipient}: ${job.error}`,
            severity: 'warning',
            type: 'delivery_failed',
            link: '/settings'
          });

          if (io) {
            io.to(`tenant:${job.tenantId}`).emit('notification:new', failNotif);
          }
        } catch (notifErr) {
          logger.warn('Failed to record delivery failure notification', { error: notifErr.message });
        }
      } else {
        job.status = 'retrying';
        // Exponential backoff: 1 min, 5 min, 15 min
        const backoffMinutes = Math.pow(job.attempts, 2) * 1.5;
        job.nextAttemptAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
        logger.warn('Notification delivery failed, scheduled retry', {
          deliveryId: job._id,
          recipient: job.recipient,
          attempt: job.attempts,
          nextAttemptAt: job.nextAttemptAt
        });
      }

      await job.save();
    }
  }
}

module.exports = new NotificationQueue();
