/**
 * Robust Linux command output parsers
 */

function parseOS(rawText) {
  const result = {
    distro: 'linux',
    distroName: 'Linux',
    version: '',
    kernel: '',
    arch: 'x86_64'
  };

  if (!rawText) return result;

  const lines = rawText.split('\n');

  // Parse uname -srm line if present (e.g. "Linux 5.15.0-89-generic x86_64")
  const unameLine = lines.find(l => l.startsWith('Linux') || l.includes('generic') || l.includes('x86_64') || l.includes('aarch64'));
  if (unameLine) {
    const parts = unameLine.trim().split(/\s+/);
    if (parts.length >= 2) result.kernel = parts[1];
    if (parts.length >= 3) result.arch = parts[2];
  }

  // Parse /etc/os-release key-value pairs
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('ID=')) {
      result.distro = trimmed.replace(/^ID=["']?|["']?$/g, '').toLowerCase();
    } else if (trimmed.startsWith('PRETTY_NAME=')) {
      result.distroName = trimmed.replace(/^PRETTY_NAME=["']?|["']?$/g, '');
    } else if (trimmed.startsWith('VERSION_ID=')) {
      result.version = trimmed.replace(/^VERSION_ID=["']?|["']?$/g, '');
    }
  }

  return result;
}

function parseUptime(rawText) {
  if (!rawText) return { seconds: 0, bootTime: new Date() };

  // /proc/uptime format: "123456.78 987654.32"
  const match = rawText.trim().match(/^([0-9]+(?:\.[0-9]+)?)/);
  if (match) {
    const seconds = Math.floor(parseFloat(match[1]));
    const bootTime = new Date(Date.now() - seconds * 1000);
    return { seconds, bootTime };
  }

  return { seconds: 0, bootTime: new Date() };
}

function parseMeminfo(rawText) {
  const mem = {
    totalBytes: 0,
    usedBytes: 0,
    freeBytes: 0,
    availableBytes: 0,
    usagePercent: 0,
    swapTotalBytes: 0,
    swapUsedBytes: 0,
    swapPercent: 0
  };

  if (!rawText) return mem;

  const map = {};
  const lines = rawText.split('\n');
  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9_()]+):\s+([0-9]+)\s*(?:kB)?/);
    if (match) {
      map[match[1]] = parseInt(match[2], 10) * 1024; // convert kB to bytes
    }
  }

  const total = map['MemTotal'] || 0;
  const free = map['MemFree'] || 0;
  // MemAvailable handles buffers, cached, reclaimable memory accurately in modern Linux
  const available = map['MemAvailable'] !== undefined
    ? map['MemAvailable']
    : (free + (map['Buffers'] || 0) + (map['Cached'] || 0));

  const used = Math.max(0, total - available);
  const usagePercent = total > 0 ? parseFloat(((used / total) * 100).toFixed(1)) : 0;

  const swapTotal = map['SwapTotal'] || 0;
  const swapFree = map['SwapFree'] || 0;
  const swapUsed = Math.max(0, swapTotal - swapFree);
  const swapPercent = swapTotal > 0 ? parseFloat(((swapUsed / swapTotal) * 100).toFixed(1)) : 0;

  return {
    totalBytes: total,
    usedBytes: used,
    freeBytes: free,
    availableBytes: available,
    usagePercent,
    swapTotalBytes: swapTotal,
    swapUsedBytes: swapUsed,
    swapPercent
  };
}

function parseCpuStatLine(line) {
  const parts = line.trim().split(/\s+/).slice(1).map(Number);
  // [user, nice, system, idle, iowait, irq, softirq, steal]
  const user = parts[0] || 0;
  const nice = parts[1] || 0;
  const system = parts[2] || 0;
  const idle = parts[3] || 0;
  const iowait = parts[4] || 0;
  const irq = parts[5] || 0;
  const softirq = parts[6] || 0;
  const steal = parts[7] || 0;

  const idleTotal = idle + iowait;
  const activeTotal = user + nice + system + irq + softirq + steal;
  const total = idleTotal + activeTotal;

  return { total, active: activeTotal, idle: idleTotal };
}

function parseCpu(stat1Text, stat2Text, loadavgText, cpuinfoText) {
  const cpu = {
    usagePercent: 0,
    loadAvg: [0, 0, 0],
    coreCount: 1,
    perCore: []
  };

  // Parse core count
  if (cpuinfoText) {
    const cores = parseInt(cpuinfoText.trim(), 10);
    if (!isNaN(cores) && cores > 0) {
      cpu.coreCount = cores;
    }
  }

  // Parse load averages from /proc/loadavg (e.g. "0.15 0.20 0.18 1/250 12345")
  if (loadavgText) {
    const loadParts = loadavgText.trim().split(/\s+/).slice(0, 3).map(Number);
    if (loadParts.length === 3 && !loadParts.some(isNaN)) {
      cpu.loadAvg = loadParts;
    }
  }

  // Calculate real CPU utilization from /proc/stat differential
  if (stat1Text && stat2Text) {
    const stat1Lines = stat1Text.split('\n').filter(l => l.startsWith('cpu'));
    const stat2Lines = stat2Text.split('\n').filter(l => l.startsWith('cpu'));

    // Overall CPU line
    const s1Total = stat1Lines.find(l => l.startsWith('cpu '));
    const s2Total = stat2Lines.find(l => l.startsWith('cpu '));

    if (s1Total && s2Total) {
      const p1 = parseCpuStatLine(s1Total);
      const p2 = parseCpuStatLine(s2Total);

      const deltaTotal = p2.total - p1.total;
      const deltaActive = p2.active - p1.active;

      if (deltaTotal > 0) {
        cpu.usagePercent = parseFloat(Math.min(100, Math.max(0, (deltaActive / deltaTotal) * 100)).toFixed(1));
      }
    }

    // Per-core parsing (cpu0, cpu1, ...)
    const perCore = [];
    for (let i = 0; i < cpu.coreCount; i++) {
      const coreLabel = `cpu${i} `;
      const c1 = stat1Lines.find(l => l.startsWith(coreLabel));
      const c2 = stat2Lines.find(l => l.startsWith(coreLabel));
      if (c1 && c2) {
        const cp1 = parseCpuStatLine(c1);
        const cp2 = parseCpuStatLine(c2);
        const dTotal = cp2.total - cp1.total;
        const dActive = cp2.active - cp1.active;
        if (dTotal > 0) {
          perCore.push(parseFloat(Math.min(100, Math.max(0, (dActive / dTotal) * 100)).toFixed(1)));
        }
      }
    }
    if (perCore.length > 0) cpu.perCore = perCore;
  }

  return cpu;
}

function parseDf(rawText) {
  const mounts = [];
  if (!rawText) return mounts;

  const lines = rawText.trim().split('\n');
  // df -PB1 output has header: Filesystem 1024-blocks Used Available Capacity Mounted on
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    if (parts.length >= 6) {
      const filesystem = parts[0];
      const totalBytes = parseInt(parts[1], 10) || 0;
      const usedBytes = parseInt(parts[2], 10) || 0;
      const availableBytes = parseInt(parts[3], 10) || 0;
      const usagePercent = parseInt(parts[4].replace('%', ''), 10) || 0;
      const mount = parts.slice(5).join(' ');

      mounts.push({
        filesystem,
        mount,
        totalBytes,
        usedBytes,
        availableBytes,
        usagePercent
      });
    }
  }

  return mounts;
}

function parseNetDev(rawText) {
  const interfaces = [];
  if (!rawText) return interfaces;

  const lines = rawText.split('\n');
  // First two lines are headers
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || !line.includes(':')) continue;

    const [ifaceRaw, statsRaw] = line.split(':');
    const iface = ifaceRaw.trim();
    if (iface === 'lo') continue; // exclude loopback

    const stats = statsRaw.trim().split(/\s+/).map(Number);
    // [rx_bytes, rx_packets, rx_errs, rx_drop, ..., tx_bytes, tx_packets, tx_errs, tx_drop, ...]
    if (stats.length >= 16) {
      interfaces.push({
        interface: iface,
        rxBytes: stats[0] || 0,
        txBytes: stats[8] || 0,
        rxRateBytesPerSec: 0, // calculated from delta in collector
        txRateBytesPerSec: 0,
        errors: (stats[2] || 0) + (stats[10] || 0),
        dropped: (stats[3] || 0) + (stats[11] || 0)
      });
    }
  }

  return interfaces;
}

function parseProcesses(rawText) {
  const processes = [];
  if (!rawText) return processes;

  const lines = rawText.trim().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 5) {
      const pid = parseInt(parts[0], 10);
      const user = parts[1];
      const cpuPercent = parseFloat(parts[2]) || 0;
      const memPercent = parseFloat(parts[3]) || 0;
      const command = parts.slice(4).join(' ');

      if (!isNaN(pid)) {
        processes.push({
          pid,
          user,
          cpuPercent,
          memPercent,
          command
        });
      }
    }
  }

  return processes;
}

function parseServices(rawText) {
  const services = [];
  if (!rawText) return services;

  const lines = rawText.trim().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 4) {
      const name = parts[0];
      const load = parts[1];
      const active = parts[2];
      const sub = parts[3];
      const description = parts.slice(4).join(' ');

      services.push({
        name,
        load,
        active, // 'active', 'inactive', 'failed'
        sub,    // 'running', 'dead', 'failed'
        description
      });
    }
  }

  return services;
}

function parseLogs(rawText) {
  const logs = [];
  if (!rawText) return logs;

  const lines = rawText.trim().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // journalctl -o short-iso format: "2026-10-25T11:20:00+0000 hostname process[123]: message"
    const match = trimmed.match(/^([0-9T\:\+\-]+)\s+([^\s]+)\s+([^:]+):\s+(.*)$/);
    if (match) {
      logs.push({
        timestamp: match[1],
        host: match[2],
        process: match[3],
        message: match[4],
        raw: trimmed
      });
    } else {
      logs.push({
        timestamp: new Date().toISOString(),
        host: '',
        process: '',
        message: trimmed,
        raw: trimmed
      });
    }
  }

  return logs;
}

module.exports = {
  parseOS,
  parseUptime,
  parseMeminfo,
  parseCpu,
  parseDf,
  parseNetDev,
  parseProcesses,
  parseServices,
  parseLogs
};
