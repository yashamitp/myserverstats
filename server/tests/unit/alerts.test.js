const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const alertService = require('../../src/alerts/alertService');
const Alert = require('../../src/models/Alert');
const AlertRule = require('../../src/models/AlertRule');

describe('Alerting Subsystem', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Alert.deleteMany({});
    await AlertRule.deleteMany({});
  });

  it('should create an active alert when CPU usage exceeds threshold', async () => {
    const mockServer = {
      _id: new mongoose.Types.ObjectId(),
      tenantId: 'tenant-123',
      name: 'Test Node'
    };

    const metricsSnapshot = {
      cpu: { usagePercent: 95.5 },
      memory: { usagePercent: 40.0 },
      disk: [{ mount: '/', usagePercent: 60 }]
    };

    await alertService.evaluateMetrics(mockServer, metricsSnapshot, null);

    const alerts = await Alert.find({ serverId: mockServer._id });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('cpu_high');
    expect(alerts[0].status).toBe('active');
    expect(alerts[0].triggerValue).toBe(95.5);
    expect(alerts[0].severity).toBe('warning');
  });

  it('should not create duplicate alert if alert is already active, but update trigger value', async () => {
    const mockServer = {
      _id: new mongoose.Types.ObjectId(),
      tenantId: 'tenant-123',
      name: 'Test Node'
    };

    const metrics1 = { cpu: { usagePercent: 92.0 }, memory: { usagePercent: 40 } };
    await alertService.evaluateMetrics(mockServer, metrics1, null);

    const metrics2 = { cpu: { usagePercent: 98.0 }, memory: { usagePercent: 40 } };
    await alertService.evaluateMetrics(mockServer, metrics2, null);

    const alerts = await Alert.find({ serverId: mockServer._id });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].triggerValue).toBe(98.0);
  });

  it('should auto-resolve active alert when metrics drop back below threshold', async () => {
    const mockServer = {
      _id: new mongoose.Types.ObjectId(),
      tenantId: 'tenant-123',
      name: 'Test Node'
    };

    // First snapshot triggers alert
    await alertService.evaluateMetrics(mockServer, { cpu: { usagePercent: 95.0 } }, null);
    let activeAlerts = await Alert.find({ serverId: mockServer._id, status: 'active' });
    expect(activeAlerts).toHaveLength(1);

    // Second snapshot drops to safe 45%
    await alertService.evaluateMetrics(mockServer, { cpu: { usagePercent: 45.0 } }, null);

    activeAlerts = await Alert.find({ serverId: mockServer._id, status: 'active' });
    expect(activeAlerts).toHaveLength(0);

    const resolvedAlerts = await Alert.find({ serverId: mockServer._id, status: 'resolved' });
    expect(resolvedAlerts).toHaveLength(1);
    expect(resolvedAlerts[0].resolvedAt).toBeInstanceOf(Date);
  });
});
