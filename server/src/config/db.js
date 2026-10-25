const mongoose = require('mongoose');
const logger = require('./logger');
const env = require('./env');

let memoryServer = null;

async function connectDB() {
  try {
    // 1. Strict production mode enforcement: in-memory DB is prohibited
    if (env.isProduction || env.NODE_ENV === 'production') {
      if (!env.MONGODB_URI) {
        throw new Error('Production deployment requires an explicit, persistent MongoDB connection string via MONGODB_URI. In-memory database fallback is strictly prohibited in production.');
      }

      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000
      });
      logger.info('Connected to production persistent MongoDB database');
      return;
    }

    // 2. Non-production mode: External MongoDB connection attempt
    if (env.MONGODB_URI && !env.USE_MEMORY_DB) {
      try {
        await mongoose.connect(env.MONGODB_URI, {
          serverSelectionTimeoutMS: 5000
        });
        logger.info('Connected to MongoDB database');
        return;
      } catch (err) {
        logger.warn(`Could not connect to external MongoDB: ${err.message}. Initializing development embedded MongoDB Memory Server.`);
      }
    }

    // 3. Isolated Development / Test in-memory database
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri();
    await mongoose.connect(uri);
    logger.info(`Connected to embedded MongoDB Memory Server for development/testing [${uri}]`);
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    throw error;
  }
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting database', { error: error.message });
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  isUsingMemoryServer: () => Boolean(memoryServer)
};
