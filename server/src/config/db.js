const mongoose = require('mongoose');
const logger = require('./logger');
const env = require('./env');

let memoryServer = null;

async function connectDB() {
  try {
    // If configured to use real mongo uri and not forced to memory
    if (process.env.MONGODB_URI && process.env.USE_MEMORY_DB !== 'true') {
      try {
        await mongoose.connect(env.MONGODB_URI, {
          serverSelectionTimeoutMS: 10000
        });
        logger.info('Connected to MongoDB database');
        return;
      } catch (err) {
        if (env.NODE_ENV === 'production') {
          throw err;
        }
        logger.warn(`Failed to connect to external MongoDB at ${env.MONGODB_URI.replace(/\/\/.*@/, '//<auth>@')}: ${err.message}. Initializing embedded in-memory MongoDB fallback.`);
      }
    }

    // Dev/Test fallback: MongoDB Memory Server
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const uri = memoryServer.getUri();
    await mongoose.connect(uri);
    logger.info(`Connected to embedded MongoDB Memory Server [${uri}]`);
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
  disconnectDB
};
