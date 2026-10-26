const net = require('net');
const { testRdpConnection, RDP_NEG_REQ_PDU } = require('../../src/services/rdpService');
const { getMonitoringCollector, RdpMonitoringCollector } = require('../../src/services/monitoringAdapter');

describe('Windows RDP Connection & Monitoring Subsystem', () => {
  let mockRdpServer;
  let mockPort;

  beforeAll((done) => {
    // Spin up a lightweight local mock server simulating Windows RDP on a dynamic port
    mockRdpServer = net.createServer((socket) => {
      socket.on('data', (data) => {
        // Echo back mock RDP NegRsp / Connection Confirm PDU
        const rdpConfirm = Buffer.from([
          0x03, 0x00, 0x00, 0x13,
          0x0e, 0xd0, 0x00, 0x00, 0x12, 0x34, 0x00,
          0x02, 0x00, 0x08, 0x00, 0x03, 0x00, 0x00, 0x00
        ]);
        socket.write(rdpConfirm);
      });
    });

    mockRdpServer.listen(0, '127.0.0.1', () => {
      mockPort = mockRdpServer.address().port;
      done();
    });
  });

  afterAll((done) => {
    if (mockRdpServer) {
      mockRdpServer.close(done);
    } else {
      done();
    }
  });

  describe('testRdpConnection', () => {
    it('should successfully detect and verify an active Windows RDP endpoint', async () => {
      const result = await testRdpConnection({
        hostname: '127.0.0.1',
        port: mockPort,
        timeout: 3000,
        allowLoopback: true
      });

      expect(result.success).toBe(true);
      expect(result.protocol).toBe('rdp');
      expect(result.os.distro).toBe('windows');
      expect(result.os.distroName).toBe('Windows Server');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.message).toContain('Windows');
    });

    it('should cleanly fail when port is refused / not listening', async () => {
      await expect(
        testRdpConnection({
          hostname: '127.0.0.1',
          port: 19999, // Unused port
          timeout: 1000,
          allowLoopback: true
        })
      ).rejects.toThrow(/refused|failed/i);
    });
  });

  describe('getMonitoringCollector', () => {
    it('should select RdpMonitoringCollector for servers with monitoringMethod rdp', () => {
      const collector = getMonitoringCollector('rdp');
      expect(collector).toBeInstanceOf(RdpMonitoringCollector);
    });

    it('should select RdpMonitoringCollector for Windows servers using default RDP port 3389', () => {
      const server = {
        port: 3389,
        os: { distro: 'windows' },
        monitoringMethod: 'ssh'
      };
      const collector = getMonitoringCollector('ssh', server);
      expect(collector).toBeInstanceOf(RdpMonitoringCollector);
    });

    it('should produce normalized telemetry in collectSnapshot for Windows RDP hosts', async () => {
      const collector = new RdpMonitoringCollector();
      const mockServer = {
        _id: '507f191e810c19729de860ea',
        hostname: '127.0.0.1',
        port: mockPort,
        username: 'Administrator',
        os: { distro: 'windows', distroName: 'Windows Server' },
        createdAt: new Date(Date.now() - 3600000)
      };

      const snapshot = await collector.collectSnapshot(mockServer);

      expect(snapshot.success).toBe(true);
      expect(snapshot.os.distro).toBe('windows');
      expect(snapshot.cpu.usagePercent).toBeGreaterThanOrEqual(0);
      expect(snapshot.memory.totalBytes).toBeGreaterThan(0);
      expect(snapshot.disk.length).toBeGreaterThan(0);
      expect(snapshot.disk[0].mountPoint).toBe('C:');
      expect(snapshot.uptime.uptimeSeconds).toBeGreaterThan(0);
    });
  });
});
