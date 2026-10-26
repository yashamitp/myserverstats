const { Client } = require('ssh2');
const crypto = require('crypto');
const Server = require('../models/Server');
const AuditEvent = require('../models/AuditEvent');
const { decrypt } = require('../security/crypto');
const { validateDestination } = require('../security/networkValidator');
const env = require('../config/env');
const logger = require('../config/logger');

// Generate SHA256 fingerprint from host key buffer
function getFingerprint(hostKeyBuffer) {
  const hash = crypto.createHash('sha256').update(hostKeyBuffer).digest('base64');
  return `SHA256:${hash}`;
}

class ConsoleSessionManager {
  constructor() {
    // Map of sessionId -> { id, tenantId, serverId, conn, stream, timer, idleTimer, createdAt, socketId }
    this.sessions = new Map();
    this.maxSessionsPerServer = 3;
    this.maxDurationMs = 60 * 60 * 1000; // 60 minutes
    this.idleTimeoutMs = 15 * 60 * 1000; // 15 minutes idle
  }

  /**
   * Start a new interactive PTY terminal session
   */
  async createSession({ serverId, tenantId, userId, socket, initialCols = 80, initialRows = 24 }) {
    // 1. Authorize: verify server ownership within tenant
    const server = await Server.findOne({
      _id: serverId,
      tenantId
    }).select('+credentials.encryptedPrivateKey +credentials.encryptedPassword +credentials.keyPassphrase');

    if (!server) {
      throw new Error('Server not found or access denied');
    }

    // 2. Concurrency limit per server
    const activeCount = Array.from(this.sessions.values()).filter(s => s.serverId === serverId).length;
    if (activeCount >= this.maxSessionsPerServer) {
      throw new Error(`Maximum concurrent console sessions reached for this server (limit: ${this.maxSessionsPerServer})`);
    }

    // 3. Validate network destination (SSRF protection)
    const destCheck = await validateDestination(server.hostname, server.port || 22, {
      allowPrivate: env.ALLOW_PRIVATE_NETWORKS
    });
    if (!destCheck.valid) {
      throw new Error(`Connection destination rejected: ${destCheck.error}`);
    }

    // 4. Decrypt credentials server-side only
    let privateKey = null;
    let password = null;
    let passphrase = null;

    if (server.authMethod === 'key' && server.credentials?.encryptedPrivateKey) {
      privateKey = decrypt(server.credentials.encryptedPrivateKey);
      if (server.credentials?.keyPassphrase) {
        passphrase = decrypt(server.credentials.keyPassphrase);
      }
    } else if (server.authMethod === 'password' && server.credentials?.encryptedPassword) {
      password = decrypt(server.credentials.encryptedPassword);
    } else {
      throw new Error('No valid authentication credentials configured for this server');
    }

    const sessionId = `term_${crypto.randomBytes(12).toString('hex')}`;

    return new Promise((resolve, reject) => {
      const conn = new Client();
      let verifiedHostKey = null;

      const connTimeout = setTimeout(() => {
        conn.end();
        reject(new Error(`SSH connection timed out after ${env.MAX_SSH_TIMEOUT_MS}ms`));
      }, env.MAX_SSH_TIMEOUT_MS);

      // Strict host key verification
      const hostVerifier = (hostKey) => {
        const fingerprint = getFingerprint(hostKey);
        verifiedHostKey = fingerprint;

        if (server.hostKeyFingerprint && server.hostKeyFingerprint !== '') {
          if (server.hostKeyFingerprint !== fingerprint) {
            logger.warn('Host key mismatch detected in console session!', {
              hostname: server.hostname,
              expected: server.hostKeyFingerprint,
              actual: fingerprint
            });
            return false;
          }
        }
        return true;
      };

      conn.on('ready', () => {
        clearTimeout(connTimeout);

        // Update host key fingerprint if first time
        if (!server.hostKeyFingerprint && verifiedHostKey) {
          Server.updateOne({ _id: server._id }, { hostKeyFingerprint: verifiedHostKey }).catch(() => {});
        }

        // Allocate pseudo-terminal (PTY)
        const termConfig = {
          term: 'xterm-256color',
          cols: Math.max(20, Math.min(250, initialCols)),
          rows: Math.max(5, Math.min(100, initialRows))
        };

        conn.shell(termConfig, (err, stream) => {
          if (err) {
            conn.end();
            return reject(new Error(`Failed to spawn remote shell: ${err.message}`));
          }

          const sessionObj = {
            id: sessionId,
            tenantId,
            serverId: server._id.toString(),
            serverName: server.name,
            osDistro: server.os?.distro || 'linux',
            conn,
            stream,
            socketId: socket.id,
            createdAt: new Date(),
            lastActivity: Date.now()
          };

          // Setup idle and max duration timers
          this.resetIdleTimer(sessionObj, socket);

          sessionObj.maxDurationTimer = setTimeout(() => {
            this.closeSession(sessionId, 'Maximum session duration reached (60 minutes)');
          }, this.maxDurationMs);

          // Stream events
          stream.on('data', (data) => {
            sessionObj.lastActivity = Date.now();
            socket.emit('console:output', {
              sessionId,
              data: data.toString('utf-8')
            });
          });

          stream.stderr.on('data', (data) => {
            sessionObj.lastActivity = Date.now();
            socket.emit('console:output', {
              sessionId,
              data: data.toString('utf-8')
            });
          });

          stream.on('close', () => {
            this.closeSession(sessionId, 'Remote shell process closed');
          });

          this.sessions.set(sessionId, sessionObj);

          // Audit log
          AuditEvent.create({
            tenantId,
            actorId: userId || 'user',
            action: 'console.session_started',
            resourceType: 'server',
            resourceId: server._id.toString(),
            metadata: { sessionId, serverName: server.name, os: server.os?.distro }
          }).catch(() => {});

          logger.info('Console session started', {
            sessionId,
            serverId: server._id,
            tenantId,
            os: server.os?.distro
          });

          resolve({
            sessionId,
            serverName: server.name,
            osDistro: server.os?.distro || 'linux',
            distroName: server.os?.distroName || (server.os?.distro === 'windows' ? 'Windows PowerShell' : 'Linux Bash'),
            connectedAt: sessionObj.createdAt
          });
        });
      });

      conn.on('error', (err) => {
        clearTimeout(connTimeout);
        logger.error('Console SSH connection error', { serverId: server._id, error: err.message });
        reject(new Error(`Failed to connect to server: ${err.message}`));
      });

      conn.on('close', () => {
        this.closeSession(sessionId, 'SSH connection closed');
      });

      const connectOpts = {
        host: server.hostname,
        port: server.port || 22,
        username: server.username,
        readyTimeout: env.MAX_SSH_TIMEOUT_MS,
        hostVerifier
      };

      if (privateKey) {
        connectOpts.privateKey = privateKey;
        if (passphrase) connectOpts.passphrase = passphrase;
      } else if (password) {
        connectOpts.password = password;
      }

      conn.connect(connectOpts);
    });
  }

  /**
   * Handle user input sent to the terminal
   */
  handleInput(sessionId, input, tenantId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      return;
    }

    session.lastActivity = Date.now();
    if (session.stream && session.stream.writable) {
      session.stream.write(input);
    }
  }

  /**
   * Handle terminal resize event
   */
  handleResize(sessionId, cols, rows, tenantId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      return;
    }

    const safeCols = Math.max(20, Math.min(250, parseInt(cols, 10) || 80));
    const safeRows = Math.max(5, Math.min(100, parseInt(rows, 10) || 24));

    if (session.stream && typeof session.stream.setWindow === 'function') {
      try {
        session.stream.setWindow(safeRows, safeCols, 0, 0);
      } catch (e) {
        logger.debug('Terminal resize error', { error: e.message });
      }
    }
  }

  /**
   * Reset the idle timeout timer
   */
  resetIdleTimer(session, socket) {
    if (session.idleTimer) clearTimeout(session.idleTimer);

    session.idleTimer = setTimeout(() => {
      this.closeSession(session.id, 'Session closed due to inactivity (15 minutes idle)');
      if (socket) {
        socket.emit('console:closed', {
          sessionId: session.id,
          reason: 'Session timed out due to inactivity'
        });
      }
    }, this.idleTimeoutMs);
  }

  /**
   * Close and clean up an active console session
   */
  closeSession(sessionId, reason = 'User disconnected') {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.idleTimer) clearTimeout(session.idleTimer);
    if (session.maxDurationTimer) clearTimeout(session.maxDurationTimer);

    try {
      if (session.stream) {
        session.stream.removeAllListeners();
        session.stream.end();
      }
      if (session.conn) {
        session.conn.removeAllListeners();
        session.conn.end();
      }
    } catch (e) {
      // Ignore teardown errors
    }

    this.sessions.delete(sessionId);

    AuditEvent.create({
      tenantId: session.tenantId,
      actorId: 'system',
      action: 'console.session_ended',
      resourceType: 'server',
      resourceId: session.serverId,
      metadata: { sessionId, reason, durationSeconds: Math.floor((Date.now() - session.createdAt.getTime()) / 1000) }
    }).catch(() => {});

    logger.info('Console session terminated', { sessionId, reason });
  }

  /**
   * Clean up all sessions tied to a socket disconnect
   */
  handleSocketDisconnect(socketId) {
    for (const [id, session] of this.sessions.entries()) {
      if (session.socketId === socketId) {
        this.closeSession(id, 'Client browser connection lost');
      }
    }
  }
}

module.exports = new ConsoleSessionManager();
