const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const NotificationDelivery = require('../../src/models/NotificationDelivery');
const Notification = require('../../src/models/Notification');
const notificationQueue = require('../../src/notifications/notificationQueue');
const emailService = require('../../src/notifications/emailService');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await NotificationDelivery.deleteMany({});
  await Notification.deleteMany({});
  jest.restoreAllMocks();
});

describe('Reliable Notification Delivery Queue', () => {
  const tenantId = 'tenant_notif_test_456';

  it('should persist delivery job with pending status', async () => {
    const job = await notificationQueue.enqueueEmail({
      tenantId,
      recipient: 'devops@example.com',
      subject: 'Critical Alert',
      type: 'incident_alert',
      htmlPayload: '<p>Test Alert</p>'
    });

    expect(job).not.toBeNull();
    expect(job.status).toBe('pending');
    expect(job.attempts).toBe(0);
    expect(job.recipient).toBe('devops@example.com');
  });

  it('should deliver job successfully when emailService succeeds', async () => {
    jest.spyOn(emailService, 'sendMail').mockResolvedValue({ messageId: 'msg_12345' });

    const job = await notificationQueue.enqueueEmail({
      tenantId,
      recipient: 'admin@example.com',
      subject: 'Server Alert',
      type: 'incident_alert',
      htmlPayload: '<p>Alert</p>'
    });

    await notificationQueue.deliverJob(job);

    const updatedJob = await NotificationDelivery.findById(job._id);
    expect(updatedJob.status).toBe('sent');
    expect(updatedJob.attempts).toBe(1);
    expect(updatedJob.error).toBe('');
  });

  it('should retry with backoff on provider failure before max attempts', async () => {
    jest.spyOn(emailService, 'sendMail').mockRejectedValue(new Error('SMTP connection refused'));

    const job = await notificationQueue.enqueueEmail({
      tenantId,
      recipient: 'admin@example.com',
      subject: 'Server Alert',
      type: 'incident_alert',
      htmlPayload: '<p>Alert</p>'
    });

    await notificationQueue.deliverJob(job);

    const retryingJob = await NotificationDelivery.findById(job._id);
    expect(retryingJob.status).toBe('retrying');
    expect(retryingJob.attempts).toBe(1);
    expect(retryingJob.error).toContain('SMTP connection refused');
    expect(retryingJob.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('should mark failed and create delivery_failed notification when max attempts reached', async () => {
    jest.spyOn(emailService, 'sendMail').mockRejectedValue(new Error('Authentication failed'));

    const job = await NotificationDelivery.create({
      tenantId,
      recipient: 'admin@example.com',
      subject: 'Server Alert',
      type: 'incident_alert',
      htmlPayload: '<p>Alert</p>',
      attempts: 2,
      maxAttempts: 3,
      status: 'retrying'
    });

    await notificationQueue.deliverJob(job);

    const failedJob = await NotificationDelivery.findById(job._id);
    expect(failedJob.status).toBe('failed');
    expect(failedJob.attempts).toBe(3);

    // Verify in-app notification recorded for the failure
    const notif = await Notification.findOne({ tenantId, type: 'delivery_failed' });
    expect(notif).not.toBeNull();
    expect(notif.severity).toBe('warning');
    expect(notif.message).toContain('Authentication failed');
  });
});
