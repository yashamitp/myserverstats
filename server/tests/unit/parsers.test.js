const {
  parseOS,
  parseUptime,
  parseMeminfo,
  parseCpu,
  parseDf,
  parseNetDev,
  parseProcesses,
  parseServices,
  parseLogs
} = require('../../src/monitoring/parsers');

describe('Linux Metrics Parsers', () => {
  describe('parseOS', () => {
    it('should correctly parse Ubuntu os-release and uname output', () => {
      const sample = `Linux 5.15.0-89-generic x86_64
NAME="Ubuntu"
VERSION="22.04.3 LTS (Jammy Jellyfish)"
ID=ubuntu
ID_LIKE=debian
PRETTY_NAME="Ubuntu 22.04.3 LTS"
VERSION_ID="22.04"`;

      const os = parseOS(sample);
      expect(os.distro).toBe('ubuntu');
      expect(os.distroName).toBe('Ubuntu 22.04.3 LTS');
      expect(os.version).toBe('22.04');
      expect(os.kernel).toBe('5.15.0-89-generic');
      expect(os.arch).toBe('x86_64');
    });

    it('should handle empty or malformed input gracefully', () => {
      const os = parseOS('');
      expect(os.distro).toBe('linux');
      expect(os.arch).toBe('x86_64');
    });
  });

  describe('parseUptime', () => {
    it('should parse uptime seconds from /proc/uptime', () => {
      const sample = '354210.45 1412841.80';
      const result = parseUptime(sample);
      expect(result.seconds).toBe(354210);
      expect(result.bootTime).toBeInstanceOf(Date);
    });
  });

  describe('parseMeminfo', () => {
    it('should accurately calculate used memory and handle reclaimable memory', () => {
      const sample = `MemTotal:       16384000 kB
MemFree:         4096000 kB
MemAvailable:    8192000 kB
Buffers:          500000 kB
Cached:          3596000 kB
SwapTotal:       2097152 kB
SwapFree:        1048576 kB`;

      const mem = parseMeminfo(sample);
      // MemTotal in bytes = 16384000 * 1024
      expect(mem.totalBytes).toBe(16384000 * 1024);
      // MemAvailable in bytes = 8192000 * 1024
      expect(mem.availableBytes).toBe(8192000 * 1024);
      // Used = Total - Available = 8192000 * 1024
      expect(mem.usedBytes).toBe(8192000 * 1024);
      expect(mem.usagePercent).toBe(50.0);

      // Swap = (2097152 - 1048576) / 2097152 = 50%
      expect(mem.swapTotalBytes).toBe(2097152 * 1024);
      expect(mem.swapUsedBytes).toBe(1048576 * 1024);
      expect(mem.swapPercent).toBe(50.0);
    });
  });

  describe('parseCpu', () => {
    it('should calculate CPU percentage from /proc/stat delta', () => {
      const stat1 = `cpu  1000 0 200 8800 0 0 0 0
cpu0 500 0 100 4400 0 0 0 0
cpu1 500 0 100 4400 0 0 0 0`;

      // 100 active ticks added, 100 idle ticks added -> total 200 delta, 100 active -> 50% usage
      const stat2 = `cpu  1080 0 220 8900 0 0 0 0
cpu0 540 0 110 4450 0 0 0 0
cpu1 540 0 110 4450 0 0 0 0`;

      const loadavg = '0.75 0.50 0.35 1/320 19842';
      const cpuinfo = '2';

      const cpu = parseCpu(stat1, stat2, loadavg, cpuinfo);
      expect(cpu.coreCount).toBe(2);
      expect(cpu.loadAvg).toEqual([0.75, 0.5, 0.35]);
      expect(cpu.usagePercent).toBe(50.0);
      expect(cpu.perCore).toHaveLength(2);
    });
  });

  describe('parseDf', () => {
    it('should parse df -PB1 output into structured mounts', () => {
      const sample = `Filesystem 1024-blocks Used Available Capacity Mounted on
/dev/sda1 52428800 26214400 26214400 50% /
/dev/sdb1 104857600 83886080 20971520 80% /data`;

      const mounts = parseDf(sample);
      expect(mounts).toHaveLength(2);
      expect(mounts[0]).toEqual({
        filesystem: '/dev/sda1',
        mount: '/',
        totalBytes: 52428800,
        usedBytes: 26214400,
        availableBytes: 26214400,
        usagePercent: 50
      });
      expect(mounts[1].mount).toBe('/data');
      expect(mounts[1].usagePercent).toBe(80);
    });
  });

  describe('parseNetDev', () => {
    it('should parse network counters excluding loopback', () => {
      const sample = `Inter-|   Receive                                                |  Transmit
 face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed
    lo: 1000000    1000    0    0    0     0          0         0  1000000    1000    0    0    0     0       0          0
  eth0: 50000000   45000    1    0    0     0          0         0 25000000   30000    2    1    0     0       0          0`;

      const ifaces = parseNetDev(sample);
      expect(ifaces).toHaveLength(1);
      expect(ifaces[0].interface).toBe('eth0');
      expect(ifaces[0].rxBytes).toBe(50000000);
      expect(ifaces[0].txBytes).toBe(25000000);
      expect(ifaces[0].errors).toBe(3); // 1 rx + 2 tx
      expect(ifaces[0].dropped).toBe(1); // 0 rx + 1 tx
    });
  });

  describe('parseProcesses', () => {
    it('should parse ps output lines safely', () => {
      const sample = `  1234 root      15.2  3.4 /usr/sbin/apache2 -k start
  5678 postgres   8.5 12.1 /usr/lib/postgresql/14/bin/postgres`;

      const procs = parseProcesses(sample);
      expect(procs).toHaveLength(2);
      expect(procs[0].pid).toBe(1234);
      expect(procs[0].user).toBe('root');
      expect(procs[0].cpuPercent).toBe(15.2);
      expect(procs[0].memPercent).toBe(3.4);
      expect(procs[0].command).toBe('/usr/sbin/apache2 -k start');
    });
  });

  describe('parseServices', () => {
    it('should parse systemctl list-units output', () => {
      const sample = `nginx.service loaded active running A high performance web server and reverse proxy
ssh.service loaded active running OpenBSD Secure Shell server
failed-job.service loaded failed failed Failed background worker`;

      const services = parseServices(sample);
      expect(services).toHaveLength(3);
      expect(services[0].name).toBe('nginx.service');
      expect(services[0].active).toBe('active');
      expect(services[0].sub).toBe('running');
      expect(services[2].active).toBe('failed');
    });
  });

  describe('parseLogs', () => {
    it('should parse journalctl short-iso log lines', () => {
      const sample = `2026-10-25T11:20:00+0000 web-server-1 systemd[1]: Started Nginx service.
2026-10-25T11:20:05+0000 web-server-1 sshd[4012]: Accepted publickey for agentops from 192.0.2.1 port 52341`;

      const logs = parseLogs(sample);
      expect(logs).toHaveLength(2);
      expect(logs[0].timestamp).toBe('2026-10-25T11:20:00+0000');
      expect(logs[0].host).toBe('web-server-1');
      expect(logs[0].process).toBe('systemd[1]');
      expect(logs[0].message).toBe('Started Nginx service.');
    });
  });
});
