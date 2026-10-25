const winston = require('winston');
const env = require('./env');

const SENSITIVE_KEYS = ['password', 'privatekey', 'passphrase', 'token', 'secret', 'authorization', 'bearer', 'key'];

function sanitizeMetadata(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeMetadata);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

const redactFormat = winston.format((info) => {
  return sanitizeMetadata(info);
});

const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    redactFormat(),
    winston.format.timestamp(),
    env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
        })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

module.exports = logger;
