const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Incident = require('../../src/models/Incident');
const Alert = require('../../src/models/Alert');
const Notification = require('../../src/models/Notification');
const MaintenanceWindow = require('../../src/models/MaintenanceWindow');
const Server = require('../../src/models/Server');
const alertService = require('../../src/alerts/alertService');
const incidentService = require('../../src/alerts/incidentService');

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
  await Incident.deleteMany({});
  await Alert.deleteMany({});
  await Notification.deleteMany({});
  await MaintenanceWindow.deleteMany({});
  await Server.deleteMany({});
});

describe('Incident Management & Alert Deduplication Subsystem', () => {
  const tenantId = 'tenant_inc_test_123';
  const serverId = new mongoose.Types.ObjectId();
  const mockServer = {
    _id: serverId,
    tenantId,
    name: 'Production-Web-01',
    hostname: '192.0.2.10',
    status: 'online',
    os: { distro: 'ubuntu' }
  };

  it('should generate stable deterministic incident fingerprints', () => {
    const fp1 = incidentService.generateFingerprint('t1', 's1', 'cpu_high', 'cpu');
    const fp2 = incidentService.generateFingerprint('t1', 's1', 'cpu_high', 'cpu');
    const fp3 = incidentService.generateFingerprint('t1', 's1', 'disk_high', '/');

    expect(fp1).toBe('t1:s1:cpu_high:cpu');
    expect(fp1).toBe(fp2);
    expect(fp1).not.toBe(fp3);
  });

  it('should create an active incident when a threshold is breached', async () => {
    await incidentService.handleIncidentState(mockServer, 'cpu_high', true, {
      severity: 'warning',
      title: 'High CPU on Production-Web-01',
      message: 'CPU reached 94%',
      triggerValue: 94,
      threshold: 90,
      resourceKey: 'cpu'
    });

    const incident = await Incident.findOne({ tenantId, serverId });
    expect(incident).not.toBeNull();
    expect(incident.status).toBe('active');
    expect(incident.occurrenceCount).toBe(1);
    expect(incident.triggerValue).toBe(94);
    expect(incident.fingerprint).toBe(`${tenantId}:${serverId}:cpu_high:cpu`);

    // Verify in-app notification was created
    const notif = await Notification.findOne({ tenantId, incidentId: incident._id });
    expect(notif).not.toBeNull();
    expect(notif.severity).toBe('warning');
  });

  it('should deduplicate ongoing condition and increment occurrence count', async () => {
    // Check 1: Breach
    await incidentService.handleIncidentState(mockServer, 'cpu_high', true, {
      severity: 'warning',
      title: 'High CPU on Production-Web-01',
      message: 'CPU reached 92%',
      triggerValue: 92,
      threshold: 90,
      resourceKey: 'cpu'
    });

    // Check 2: Ongoing breach in next polling cycle
    await incidentService.handleIncidentState(mockServer, 'cpu_high', true, {
      severity: 'warning',
      title: 'High CPU on Production-Web-01',
      message: 'CPU reached 96%',
      triggerValue: 96,
      threshold: 90,
      resourceKey: 'cpu'
    });

    // Verify only ONE incident exists, with occurrenceCount = 2 and updated triggerValue
    const incidents = await Incident.find({ tenantId, serverId });
    expect(incidents).toHaveLength(1);
    expect(incidents[0].occurrenceCount).toBe(2);
    expect(incidents[0].triggerValue).toBe(96);
    expect(incidents[0].history).toHaveLength(2);
  });

  it('should record recovery and resolve incident when condition clears', async () => {
    // Initial breach
    await incidentService.handleIncidentState(mockServer, 'cpu_high', true, {
      severity: 'warning',
      title: 'High CPU on Production-Web-01',
      message: 'CPU reached 93%',
      triggerValue: 93,
      threshold: 90,
      resourceKey: 'cpu'
    });

    let incident = await Incident.findOne({ tenantId, serverId });
    expect(incident.status).toBe('active');

    // Recovery
    await incidentService.handleIncidentState(mockServer, 'cpu_high', false, {
      severity: 'warning',
      triggerValue: 45,
      resourceKey: 'cpu'
    });

    incident = await Incident.findOne({ tenantId, serverId });
    expect(incident.status).toBe('resolved');
    expect(incident.resolvedAt).toBeInstanceOf(Date);

    // Verify recovery in-app notification created
    const recoveryNotif = await Notification.findOne({
      tenantId,
      incidentId: incident._id,
      type: 'incident_resolved'
    });
    expect(recoveryNotif).not.toBeNull();
  });

  it('should suppress notifications during an active maintenance window without dropping incidents', async () => {
    const now = new Date();
    // Create an active maintenance window for this server
    await MaintenanceWindow.create({
      tenantId,
      title: 'Scheduled OS Maintenance',
      serverIds: [serverId],
      startTime: new Date(now.getTime() - 10 * 60 * 1000), // started 10m ago
      endTime: new Date(now.getTime() + 50 * 60 * 1000),  // ends in 50m
      suppressNotifications: true,
      status: 'active'
    });

    // Trigger alert during maintenance
    await incidentService.handleIncidentState(mockServer, 'memory_high', true, {
      severity: 'critical',
      title: 'High Memory on Production-Web-01',
      message: 'Memory reached 95%',
      triggerValue: 95,
      threshold: 90,
      resourceKey: 'memory'
    });

    // Incident MUST be recorded with inMaintenance: true
    const incident = await Incident.findOne({ tenantId, serverId });
    expect(incident).not.toBeNull();
    expect(incident.inMaintenance).toBe(true);

    // Notifications MUST be suppressed!
    const notifs = await Notification.find({ tenantId, incidentId: incident._id });
    expect(notifs).toHaveLength(0);
  });
});
