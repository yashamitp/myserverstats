const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // Fallback to current working directory

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/agentops',
  USE_MEMORY_DB: process.env.USE_MEMORY_DB === 'true' || !process.env.MONGODB_URI,
  
  // Security & Auth
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_key_agentops_super_secure_32bytes!',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // 32-byte hex for AES-256
  ALLOW_PRIVATE_NETWORKS: process.env.ALLOW_PRIVATE_NETWORKS === 'true', // SSRF control
  
  // Clerk Integration (Optional)
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',

  // AI Integration (Optional)
  AI_PROVIDER: process.env.AI_PROVIDER || '', // 'openai' | 'gemini' | 'anthropic' | 'custom'
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || (process.env.AI_PROVIDER === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'),
  AI_API_BASE: process.env.AI_API_BASE || (process.env.AI_PROVIDER === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta/openai' : 'https://api.openai.com/v1'),

  // Monitoring
  MONITORING_INTERVAL_SEC: parseInt(process.env.MONITORING_INTERVAL_SEC, 10) || 10,
  METRICS_RETENTION_DAYS: parseInt(process.env.METRICS_RETENTION_DAYS, 10) || 30,
  MAX_SSH_TIMEOUT_MS: parseInt(process.env.MAX_SSH_TIMEOUT_MS, 10) || 8000,
  MAX_LOG_LINES: parseInt(process.env.MAX_LOG_LINES, 10) || 100,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

module.exports = env;
