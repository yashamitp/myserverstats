const monitoringWorker = require('../../src/workers/monitoringWorker');

describe('Monitoring Worker Concurrency & Reliability', () => {
  it('should initialize with configurable concurrency limit', () => {
    expect(monitoringWorker.maxConcurrency).toBeDefined();
    expect(typeof monitoringWorker.maxConcurrency).toBe('number');
    expect(monitoringWorker.maxConcurrency).toBeGreaterThan(0);
  });

  it('should cleanly start and stop the scheduler without hanging', () => {
    const mockIo = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
    monitoringWorker.start(mockIo, 60000);
    expect(monitoringWorker.isRunning).toBe(true);

    monitoringWorker.stop();
    expect(monitoringWorker.isRunning).toBe(false);
    expect(monitoringWorker.intervalHandle).toBeNull();
  });
});
