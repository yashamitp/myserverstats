const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM

function getKey(customKey) {
  const keySource = customKey || env.ENCRYPTION_KEY;
  if (!keySource) {
    throw new Error('ENCRYPTION_KEY must be provided');
  }
  // Ensure exactly 32 bytes (256 bits)
  return crypto.createHash('sha256').update(String(keySource)).digest();
}

/**
 * Encrypt sensitive plain text using AES-256-GCM
 * @param {string} text 
 * @param {string} [customKey] 
 * @returns {string} iv:tag:ciphertext in hex
 */
function encrypt(text, customKey) {
  if (text === null || text === undefined || text === '') {
    return text;
  }
  const key = getKey(customKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt ciphertext encrypted with AES-256-GCM
 * @param {string} encryptedPayload iv:tag:ciphertext in hex
 * @param {string} [customKey] 
 * @returns {string} decrypted plain text
 */
function decrypt(encryptedPayload, customKey) {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') {
    return encryptedPayload;
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivHex, tagHex, encryptedText] = parts;
  const key = getKey(customKey);
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Safely mask a secret for logging or UI display
 * @param {string} str 
 * @returns {string}
 */
function maskSecret(str) {
  if (!str) return '';
  if (str.length <= 8) return '********';
  return str.slice(0, 3) + '...' + str.slice(-3);
}

module.exports = {
  encrypt,
  decrypt,
  maskSecret
};
