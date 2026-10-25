const Server = require('../models/Server');
const User = require('../models/User');
const logger = require('../config/logger');
const { verifyAuthToken } = require('../security/tokenVerifier');

function initSocketHandlers(io) {
  // Cryptographically verified authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization && socket.handshake.headers.authorization.split(' ')[1]);

      if (!token) {
        return next(new Error('Authentication required for socket connection'));
      }

      let verified;
      try {
        verified = await verifyAuthToken(token);
      } catch (err) {
        logger.debug('Socket authentication rejected', { error: err.message });
        return next(new Error('Invalid or expired socket authentication token'));
      }

      if (verified.type === 'local') {
        socket.user = {
          id: verified.id,
          tenantId: verified.tenantId || verified.id,
          email: verified.email
        };
        return next();
      }

      if (verified.type === 'clerk') {
        const clerkSub = verified.sub;
        let user = await User.findOne({ clerkId: clerkSub });

        if (!user) {
          const verifiedEmail = verified.email || `${clerkSub}@clerk.agentops.io`;
          try {
            user = await User.findOneAndUpdate(
              { clerkId: clerkSub },
              {
                $setOnInsert: {
                  email: verifiedEmail,
                  name: verified.name || 'Clerk User',
                  clerkId: clerkSub,
                  role: 'user'
                }
              },
              { upsert: true, new: true, setDefaultsOnInsert: true }
            );
          } catch (dbErr) {
            user = await User.findOne({ clerkId: clerkSub });
          }
        }

        if (!user) {
          return next(new Error('Failed to resolve authenticated socket user'));
        }

        socket.user = {
          id: user._id.toString(),
          tenantId: user._id.toString(),
          email: user.email
        };
        return next();
      }

      return next(new Error('Invalid socket authentication identity'));
    } catch (err) {
      logger.error('Socket authentication failed', { error: err.message });
      return next(new Error('Internal socket authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('Socket client connected', {
      socketId: socket.id,
      tenantId: socket.user.tenantId,
      userId: socket.user.id
    });

    // Automatically join the user's isolated tenant room
    const tenantRoom = `tenant:${socket.user.tenantId}`;
    socket.join(tenantRoom);

    // Client requests subscription to a specific server's high-frequency live room
    socket.on('subscribe:server', async (data) => {
      try {
        const serverId = data?.serverId;
        if (!serverId) return;

        // Authorize: strictly verify ownership
        const server = await Server.findOne({
          _id: serverId,
          tenantId: socket.user.tenantId
        });

        if (!server) {
          socket.emit('error', { message: 'Unauthorized server subscription' });
          return;
        }

        const room = `server:${serverId}`;
        socket.join(room);
        logger.debug(`Socket ${socket.id} subscribed to room ${room}`);

        // Send immediate current state
        socket.emit('server:current', {
          serverId: server._id,
          status: server.status,
          metrics: server.lastMetrics,
          lastContact: server.lastContact
        });
      } catch (err) {
        logger.error('Error in subscribe:server', { error: err.message });
      }
    });

    // Unsubscribe from a server room
    socket.on('unsubscribe:server', (data) => {
      const serverId = data?.serverId;
      if (serverId) {
        socket.leave(`server:${serverId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug('Socket client disconnected', { socketId: socket.id, reason });
    });
  });
}

module.exports = {
  initSocketHandlers
};
