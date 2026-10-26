const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDB, disconnectDB } = require('./config/db');
const { initSocketHandlers } = require('./sockets/socketHandler');
const monitoringWorker = require('./workers/monitoringWorker');

async function bootstrap() {
  try {
    // 1. Connect to Database (real MongoDB or automatic memory server fallback)
    await connectDB();

    // 2. Create HTTP & WebSocket Server
    const corsOriginSetting = env.CORS_ORIGIN || '*';
    const socketCorsOrigins = corsOriginSetting === '*' || !corsOriginSetting
      ? true
      : (corsOriginSetting.includes(',') ? corsOriginSetting.split(',').map(s => s.trim()) : corsOriginSetting);

    const httpServer = http.createServer(app);
    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: socketCorsOrigins,
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        credentials: true
      }
    });

    // 3. Initialize Socket.IO authenticated rooms and handlers
    initSocketHandlers(io);

    // 4. Start background monitoring worker scheduler
    monitoringWorker.start(io, (env.MONITORING_INTERVAL_SEC || 10) * 1000);

    // 5. Start listening
    const server = httpServer.listen(env.PORT, () => {
      logger.info(`AgentOps Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`REST API base URL: http://localhost:${env.PORT}/api/v1`);
      logger.info(`Interactive API Documentation: http://localhost:${env.PORT}/api/v1/docs`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      monitoringWorker.stop();
      io.close();
      server.close(async () => {
        await disconnectDB();
        logger.info('AgentOps server exited cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return { server, io, httpServer };
  } catch (error) {
    logger.error('Fatal startup error', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Start if executed directly
if (require.main === module) {
  bootstrap();
}

module.exports = { bootstrap };
