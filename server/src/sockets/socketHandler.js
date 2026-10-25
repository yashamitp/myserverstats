const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Server = require('../models/Server');
const User = require('../models/User');
const logger = require('../config/logger');

function initSocketHandlers(io) {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization && socket.handshake.headers.authorization.split(' ')[1]);

      if (!token) {
        return next(new Error('Authentication required for socket connection'));
      }

      try {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        socket.user = {
          id: decoded.id,
          tenantId: decoded.tenantId || decoded.id,
          email: decoded.email
        };
        return next();
      } catch (jwtErr) {
        // Fallback for Clerk or test token
        if (env.CLERK_SECRET_KEY || env.CLERK_PUBLISHABLE_KEY) {
          const decodedClerk = jwt.decode(token);
          if (decodedClerk && decodedClerk.sub) {
            const clerkSub = decodedClerk.sub;
            const headerEmail = socket.handshake.headers?.['x-clerk-user-email'] || socket.handshake.auth?.email;
            const tokenEmail = decodedClerk.email || (decodedClerk.email_addresses && decodedClerk.email_addresses[0]?.email_address) || '';
            const clerkEmail = (headerEmail || tokenEmail || '').toLowerCase().trim();

            let user = null;
            if (clerkSub) {
              user = await User.findOne({ clerkId: clerkSub });
            }
            if (!user && clerkEmail) {
              user = await User.findOne({ email: clerkEmail });
              if (user) {
                user.clerkId = clerkSub;
                await user.save();
              }
            }
            if (!user) {
              user = await User.create({
                email: clerkEmail || `${clerkSub}@clerk.agentops.io`,
                name: socket.handshake.auth?.name || 'Clerk User',
                clerkId: clerkSub,
                role: 'user'
              });
            }

            socket.user = {
              id: user._id.toString(),
              tenantId: user._id.toString(),
              email: user.email
            };
            return next();
          }
        }
        return next(new Error('Invalid socket authentication token'));
      }
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
