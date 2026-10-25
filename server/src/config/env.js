const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // Fallback to current working directory

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

const KNOWN_DEV_JWT_SECRETS = [
  'dev_secret_key_agentops_super_secure_32bytes!',
  'change_me_to_a_random_production_secret_32chars!',
  'your_super_secret_jwt_key_at_least_32_characters_long!',
  'REPLACE_WITH_CRYPTOGRAPHICALLY_SECURE_RANDOM_KEY_AT_LEAST_32_CHARS'
];

const KNOWN_DEV_ENCRYPTION_KEYS = [
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  'REPLACE_WITH_64_CHAR_HEX_KEY_E_G_NODE_CRYPTO_RANDOMBYTES_32_HEX'
];

// Helper to validate 32-byte (64 hex characters) AES-256 key
function isValidHex64(str) {
  return typeof str === 'string' && /^[0-9a-fA-F]{64}$/.test(str);
}

// Startup validation function
function validateConfig(customEnv = process.env) {
  const nodeEnv = customEnv.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';

  if (isProd) {
    // 1. Validate JWT_SECRET in production
    const jwtSecret = customEnv.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32 || KNOWN_DEV_JWT_SECRETS.includes(jwtSecret)) {
      throw new Error(
        'FATAL CONFIGURATION ERROR: In production, JWT_SECRET must be explicitly configured with at least 32 characters and cannot use development placeholder defaults.'
      );
    }

    // 2. Validate ENCRYPTION_KEY in production
    const encKey = customEnv.ENCRYPTION_KEY;
    if (!encKey || !isValidHex64(encKey) || KNOWN_DEV_ENCRYPTION_KEYS.includes(encKey)) {
      throw new Error(
        'FATAL CONFIGURATION ERROR: In production, ENCRYPTION_KEY must be explicitly configured as a 64-character hex string (32 bytes) and cannot use development placeholder defaults.'
      );
    }

    // 3. Validate MONGODB_URI in production
    const mongoUri = customEnv.MONGODB_URI;
    if (!mongoUri || (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://'))) {
      throw new Error(
        'FATAL CONFIGURATION ERROR: In production, MONGODB_URI is required and must be a valid persistent MongoDB connection string. In-memory database fallback is strictly prohibited in production.'
      );
    }
  } else {
    // Development validation
    if (customEnv.ENCRYPTION_KEY && !isValidHex64(customEnv.ENCRYPTION_KEY)) {
      throw new Error(
        'CONFIG ERROR: ENCRYPTION_KEY must be a valid 64-character hex string (32 bytes).'
      );
    }
  }
}

// Run validation
validateConfig();

const env = {
  NODE_ENV,
  isProduction,
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || (isProduction ? '' : 'mongodb://localhost:27017/agentops'),
  USE_MEMORY_DB: isProduction ? false : (process.env.USE_MEMORY_DB === 'true' || !process.env.MONGODB_URI),
  
  // Security & Auth
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_key_agentops_super_secure_32bytes!',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  ALLOW_PRIVATE_NETWORKS: process.env.ALLOW_PRIVATE_NETWORKS === 'true',
  
  // Clerk Integration (Optional)
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',

  // AI Integration (Optional)
  AI_PROVIDER: process.env.AI_PROVIDER || '',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || (process.env.AI_PROVIDER === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'),
  AI_API_BASE: process.env.AI_API_BASE || (process.env.AI_PROVIDER === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta/openai' : 'https://api.openai.com/v1'),

  // Monitoring
  MONITORING_INTERVAL_SEC: parseInt(process.env.MONITORING_INTERVAL_SEC, 10) || 10,
  MAX_CONCURRENT_CHECKS: parseInt(process.env.MAX_CONCURRENT_CHECKS, 10) || 10,
  METRICS_RETENTION_DAYS: parseInt(process.env.METRICS_RETENTION_DAYS, 10) || 30,
  MAX_SSH_TIMEOUT_MS: parseInt(process.env.MAX_SSH_TIMEOUT_MS, 10) || 8000,
  MAX_LOG_LINES: parseInt(process.env.MAX_LOG_LINES, 10) || 100,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Validation function export for testing
  validateConfig
};

module.exports = env;
