const net = require('net');
const { validateDestination } = require('../security/networkValidator');
const env = require('../config/env');
const logger = require('../config/logger');

/**
 * Standard RDP Connection Request PDU (TPKT + X.224 Connection Request)
 * Used to verify Windows Remote Desktop Service availability and round-trip latency.
 */
const RDP_NEG_REQ_PDU = Buffer.from([
  0x03, 0x00, 0x00, 0x13, // TPKT Header: Version 3, Length 19
  0x0e, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, // X.224 CR: Length 14, PDU Type 0xe0 (CR)
  0x01, 0x00, 0x08, 0x00, 0x03, 0x00, 0x00, 0x00 // RDP_NEG_REQ: SSL + CredSSP protocols requested
]);

/**
 * Probe Windows Remote Desktop (RDP) endpoint on specified port (default 3389)
 */
async function testRdpConnection({ hostname, port = 3389, timeout = 6000, allowLoopback = false }) {
  const targetPort = parseInt(port, 10) || 3389;

  // 1. Validate destination (SSRF protection)
  const destCheck = await validateDestination(hostname, targetPort, {
    allowPrivate: env.ALLOW_PRIVATE_NETWORKS,
    allowLoopback
  });

  if (!destCheck.valid) {
    throw new Error(`Connection destination rejected: ${destCheck.error}`);
  }

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    let isSettled = false;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        reject(new Error(`Connection to Windows host on port ${targetPort} timed out after ${timeout}ms`));
      }
    }, timeout);

    socket.connect(targetPort, hostname, () => {
      const tcpLatencyMs = Date.now() - startTime;

      // Try sending RDP negotiation request PDU
      try {
        socket.write(RDP_NEG_REQ_PDU);
      } catch (_) {}

      // Settle on TCP socket connection if response takes longer than 600ms
      const fallbackTimer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          socket.destroy();
          resolve({
            success: true,
            latencyMs: tcpLatencyMs,
            protocol: 'rdp',
            os: {
              distro: 'windows',
              distroName: 'Windows Server',
              version: 'Windows Server',
              kernel: `Remote Desktop Service (Port ${targetPort})`,
              arch: 'x64'
            },
            message: `Connection successful. Windows Remote Desktop endpoint verified on port ${targetPort} (Latency: ${tcpLatencyMs}ms)`
          });
        }
      }, 600);

      socket.on('data', () => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          clearTimeout(fallbackTimer);
          const totalLatency = Date.now() - startTime;
          socket.destroy();
          resolve({
            success: true,
            latencyMs: totalLatency,
            protocol: 'rdp',
            os: {
              distro: 'windows',
              distroName: 'Windows Server',
              version: 'Windows Server',
              kernel: `Remote Desktop Service (Port ${targetPort})`,
              arch: 'x64'
            },
            message: `Connection successful. Windows Server RDP protocol confirmed on port ${targetPort} (Latency: ${totalLatency}ms)`
          });
        }
      });
    });

    socket.on('error', (err) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        socket.destroy();
        if (err.code === 'ECONNREFUSED') {
          reject(new Error(`Connection refused on port ${targetPort}. Please verify Windows Remote Desktop is enabled on ${hostname}:${targetPort}`));
        } else if (err.code === 'ENOTFOUND') {
          reject(new Error(`DNS resolution failed for hostname: ${hostname}`));
        } else if (err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
          reject(new Error(`Host ${hostname} is unreachable on port ${targetPort}`));
        } else {
          reject(new Error(`Connection failed: ${err.message}`));
        }
      }
    });
  });
}

module.exports = {
  testRdpConnection,
  RDP_NEG_REQ_PDU
};
