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

function toPowerShellEncoded(script) {
  const b64 = Buffer.from(script, 'utf16le').toString('base64');
  return `powershell -NoProfile -NonInteractive -EncodedCommand ${b64}`;
}

const WINDOWS_TEST_PROBE_SCRIPT = [
  "Write-Output '===OS==='",
  "(Get-CimInstance Win32_OperatingSystem).Caption",
  "(Get-CimInstance Win32_OperatingSystem).Version",
  "(Get-CimInstance Win32_OperatingSystem).OSArchitecture"
].join('; ');

const WINDOWS_TEST_PROBE = toPowerShellEncoded(WINDOWS_TEST_PROBE_SCRIPT);

const WINDOWS_COLLECT_SYSTEM_SNAPSHOT_SCRIPT = [
  "Write-Output '===OS==='",
  "(Get-CimInstance Win32_OperatingSystem).Caption",
  "(Get-CimInstance Win32_OperatingSystem).Version",
  "(Get-CimInstance Win32_OperatingSystem).OSArchitecture",
  "Write-Output '===UPTIME==='",
  "[int]((Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime).TotalSeconds",
  "Write-Output '===MEMINFO==='",
  "$os = Get-CimInstance Win32_OperatingSystem",
  "Write-Output ('TotalKB: ' + $os.TotalVisibleMemorySize)",
  "Write-Output ('FreeKB: ' + $os.FreePhysicalMemory)",
  "Write-Output '===CPU==='; (Get-CimInstance Win32_Processor).LoadPercentage",
  "Write-Output '===CPUINFO==='; (Get-CimInstance Win32_Processor | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum",
  "Write-Output '===DF==='; Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object { Write-Output ($_.DeviceID + ' ' + $_.Size + ' ' + $_.FreeSpace) }"
].join('; ');

const WINDOWS_COLLECT_SYSTEM_SNAPSHOT = toPowerShellEncoded(WINDOWS_COLLECT_SYSTEM_SNAPSHOT_SCRIPT);

const WINDOWS_GET_PROCESSES_SCRIPT = `Get-Process | Sort-Object CPU -Descending | Select-Object -First 50 -Property Id, ProcessName, @{Name='CPU';Expression={[math]::Round($_.CPU, 1)}}, @{Name='MemMB';Expression={[math]::Round($_.WorkingSet64 / 1MB, 1)}} | ForEach-Object { "$($_.Id) $($_.ProcessName) $($_.CPU) $($_.MemMB)" }`;
const WINDOWS_GET_PROCESSES = toPowerShellEncoded(WINDOWS_GET_PROCESSES_SCRIPT);

const WINDOWS_GET_SERVICES_SCRIPT = `Get-Service | Select-Object -First 100 -Property Name, Status, StartType, DisplayName | ForEach-Object { "$($_.Name)|$($_.Status)|$($_.StartType)|$($_.DisplayName)" }`;
const WINDOWS_GET_SERVICES = toPowerShellEncoded(WINDOWS_GET_SERVICES_SCRIPT);

function buildWindowsLogsCommand(options = {}) {
  const lines = Math.min(Math.max(parseInt(options.lines, 10) || 50, 10), 200);
  const script = `Get-WinEvent -LogName System -MaxEvents ${lines} -ErrorAction SilentlyContinue | ForEach-Object { "$($_.TimeCreated.ToString('yyyy-MM-ddTHH:mm:ss')) [$($_.LevelDisplayName)] $($_.Message -replace '[\r\n]+', ' ')" }`;
  return toPowerShellEncoded(script);
}

module.exports = {
  COLLECT_SYSTEM_SNAPSHOT,
  TEST_PROBE,
  GET_PROCESSES,
  GET_SERVICES,
  buildLogsCommand,
  WINDOWS_TEST_PROBE,
  WINDOWS_COLLECT_SYSTEM_SNAPSHOT,
  WINDOWS_GET_PROCESSES,
  WINDOWS_GET_SERVICES,
  buildWindowsLogsCommand,
  toPowerShellEncoded
};
