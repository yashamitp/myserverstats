/**
 * Strictly predefined, read-only Linux monitoring commands.
 * No arbitrary user or LLM-generated commands are executed.
 */

// Combined quick probe command to collect complete snapshot in a single SSH session
const COLLECT_SYSTEM_SNAPSHOT = [
  "echo '===OS==='; uname -srm; cat /etc/os-release 2>/dev/null || true",
  "echo '===UPTIME==='; cat /proc/uptime 2>/dev/null || uptime",
  "echo '===MEMINFO==='; cat /proc/meminfo 2>/dev/null",
  "echo '===LOADAVG==='; cat /proc/loadavg 2>/dev/null",
  "echo '===CPUINFO==='; grep -c ^processor /proc/cpuinfo 2>/dev/null || nproc 2>/dev/null || echo 1",
  "echo '===DF==='; df -PB1 -x tmpfs -x devtmpfs -x squashfs -x overlay 2>/dev/null",
  "echo '===NETDEV==='; cat /proc/net/dev 2>/dev/null",
  "echo '===STAT1==='; cat /proc/stat 2>/dev/null",
  "sleep 0.25",
  "echo '===STAT2==='; cat /proc/stat 2>/dev/null"
].join(" && ");

// Fast basic test command for connection testing & OS verification
const TEST_PROBE = "uname -srm && cat /etc/os-release 2>/dev/null || true";

// Top 50 processes by CPU usage (safe fields: pid, user, %cpu, %mem, command name)
const GET_PROCESSES = "ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu --no-headers 2>/dev/null | head -n 50";

// Systemd service statuses (first 100 services)
const GET_SERVICES = "systemctl list-units --type=service --all --no-legend --no-pager 2>/dev/null | head -n 100";

/**
 * Build safe journalctl query
 * @param {object} options 
 * @returns {string} safe command
 */
function buildLogsCommand(options = {}) {
  const lines = Math.min(Math.max(parseInt(options.lines, 10) || 50, 10), 200);
  let cmd = `journalctl -n ${lines} --no-pager -o short-iso`;

  if (options.service && /^[a-zA-Z0-9_\-\.]+$/.test(options.service)) {
    cmd += ` -u ${options.service}`;
  }

  if (options.severity && ['emerg', 'alert', 'crit', 'err', 'warning', 'notice', 'info', 'debug'].includes(options.severity)) {
    cmd += ` -p ${options.severity}`;
  }

  return cmd;
}

module.exports = {
  COLLECT_SYSTEM_SNAPSHOT,
  TEST_PROBE,
  GET_PROCESSES,
  GET_SERVICES,
  buildLogsCommand
};
