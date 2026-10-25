const { Client } = require('ssh2');
const crypto = require('crypto');
const logger = require('../config/logger');
const env = require('../config/env');
const { validateDestination } = require('../security/networkValidator');
const { decrypt } = require('../security/crypto');

/**
 * Generate MD5/SHA256 fingerprint from host key buffer
 */
function getFingerprint(hostKeyBuffer) {
  const hash = crypto.createHash('sha256').update(hostKeyBuffer).digest('base64');
  return `SHA256:${hash}`;
}

/**
 * Execute a single command safely with timeout and output truncation
 */
function execCommand(conn, command, timeoutMs = 7000, maxOutputBytes = 512 * 1024) {
  return new Promise((resolve, reject) => {
    let timer = null;

    conn.exec(command, (err, stream) => {
      if (err) return reject(err);

      let stdout = '';
      let stderr = '';
      let totalBytes = 0;

      timer = setTimeout(() => {
        stream.close();
        reject(new Error(`Command timed out after ${timeoutMs}ms: ${command.slice(0, 40)}...`));
      }, timeoutMs);

      stream.on('data', (data) => {
        totalBytes += data.length;
        if (totalBytes <= maxOutputBytes) {
          stdout += data.toString();
        }
      });

      stream.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      stream.on('close', (code, signal) => {
        clearTimeout(timer);
        resolve({
          code,
          signal,
          stdout,
          stderr
        });
      });

      stream.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  });
}

/**
 * Create an authenticated SSH connection with security checks
 */
async function createSshConnection(config, options = {}) {
  // 1. SSRF and destination validation
  const destCheck = await validateDestination(config.hostname, config.port || 22, {
    allowPrivate: options.allowPrivate !== undefined ? options.allowPrivate : env.ALLOW_PRIVATE_NETWORKS
  });

  if (!destCheck.valid) {
    throw new Error(`Connection rejected: ${destCheck.error}`);
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();
    let verifiedHostKey = null;
    let isHandshakeComplete = false;

    const timeout = setTimeout(() => {
      conn.end();
      reject(new Error(`Connection timed out after ${env.MAX_SSH_TIMEOUT_MS}ms`));
    }, env.MAX_SSH_TIMEOUT_MS);

    // Host key verification
    const hostVerifier = (hostKey) => {
      const fingerprint = getFingerprint(hostKey);
      verifiedHostKey = fingerprint;

      // If a known fingerprint is stored on the server record, verify strictly
      if (config.expectedHostKeyFingerprint && config.expectedHostKeyFingerprint !== '') {
        if (config.expectedHostKeyFingerprint !== fingerprint) {
          logger.warn('Host key mismatch detected!', {
            hostname: config.hostname,
            expected: config.expectedHostKeyFingerprint,
            actual: fingerprint
          });
          return false; // Reject connection
        }
      }

      return true; // Accept and record
    };

    conn.on('ready', () => {
      clearTimeout(timeout);
      isHandshakeComplete = true;
      resolve({ conn, hostKeyFingerprint: verifiedHostKey });
    });

    conn.on('error', (err) => {
      clearTimeout(timeout);
      if (!isHandshakeComplete) {
        if (err.level === 'client-authentication') {
          reject(new Error('Authentication failed: Invalid credentials or key'));
        } else if (err.code === 'ECONNREFUSED') {
          reject(new Error(`Connection refused by host at ${config.hostname}:${config.port || 22}`));
        } else if (err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH') {
          reject(new Error(`Host unreachable at ${config.hostname}`));
        } else {
          reject(new Error(`SSH error: ${err.message}`));
        }
      }
    });

    // Prepare connection options
    const connOptions = {
      host: destCheck.resolvedIp || config.hostname,
      port: config.port || 22,
      username: config.username || 'agentops',
      readyTimeout: env.MAX_SSH_TIMEOUT_MS,
      hostVerifier
    };

    // Authenticate by Key or Password
    if (config.authMethod === 'password') {
      const encryptedPass = config.credentials?.encryptedPassword || config.encryptedPassword;
      const plainPassword = config.password || (encryptedPass ? decrypt(encryptedPass) : '');
      if (!plainPassword) {
        clearTimeout(timeout);
        return reject(new Error('Password authentication requested but no password provided'));
      }
      connOptions.password = plainPassword;
    } else {
      // Default: Public key auth
      const encryptedKey = config.credentials?.encryptedPrivateKey || config.encryptedPrivateKey;
      const plainKey = config.privateKey || (encryptedKey ? decrypt(encryptedKey) : '');
      if (!plainKey) {
        clearTimeout(timeout);
        return reject(new Error('SSH key authentication requested but private key is missing'));
      }
      connOptions.privateKey = plainKey;
      const passphrase = config.credentials?.keyPassphrase || config.keyPassphrase;
      if (passphrase) {
        connOptions.passphrase = passphrase.includes(':') ? decrypt(passphrase) : passphrase;
      }
    }

    try {
      conn.connect(connOptions);
    } catch (connectErr) {
      clearTimeout(timeout);
      reject(connectErr);
    }
  });
}

/**
 * Comprehensive Connection Test
 */
async function testSshConnection(config) {
  let connectionObj = null;
  try {
    const startTime = Date.now();
    connectionObj = await createSshConnection(config);
    const { conn, hostKeyFingerprint } = connectionObj;

    // Verify basic read-only monitoring probe
    const { TEST_PROBE } = require('../monitoring/commands');
    const { parseOS } = require('../monitoring/parsers');

    const probeResult = await execCommand(conn, TEST_PROBE, 5000);
    const latencyMs = Date.now() - startTime;

    const parsedOS = parseOS(probeResult.stdout);

    conn.end();

    return {
      success: true,
      latencyMs,
      hostKeyFingerprint,
      os: parsedOS,
      message: `Connection successful. Detected ${parsedOS.distroName || parsedOS.distro} (${parsedOS.kernel})`
    };
  } catch (err) {
    if (connectionObj && connectionObj.conn) {
      connectionObj.conn.end();
    }
    return {
      success: false,
      error: err.message,
      message: `Connection test failed: ${err.message}`
    };
  }
}

module.exports = {
  createSshConnection,
  execCommand,
  testSshConnection,
  getFingerprint
};
