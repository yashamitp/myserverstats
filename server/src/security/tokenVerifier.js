const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const { verifyToken } = require('@clerk/backend');
const env = require('../config/env');
const logger = require('../config/logger');

let jwksClient = null;
let clerkDomain = '';

if (env.CLERK_PUBLISHABLE_KEY) {
  try {
    const parts = env.CLERK_PUBLISHABLE_KEY.split('_');
    if (parts.length >= 3) {
      const b64 = parts.slice(2).join('_');
      clerkDomain = Buffer.from(b64, 'base64').toString('utf8').replace(/\$$/, '');
    }
    if (clerkDomain) {
      jwksClient = jwksRsa({
        jwksUri: `https://${clerkDomain}/.well-known/jwks.json`,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 15
      });
      logger.info(`Initialized Clerk JWKS client for domain: ${clerkDomain}`);
    }
  } catch (e) {
    logger.warn('Could not initialize JWKS client for Clerk', { error: e.message });
  }
}

/**
 * Cryptographically verifies an authentication token (local JWT or Clerk token).
 * Rejects expired, malformed, unsigned, incorrectly signed, and forged tokens.
 * Never trusts unverified decoded claims.
 * 
 * @param {string} token Bearer token string
 * @param {object} [options] Optional overrides for testing
 * @returns {Promise<{ type: 'local'|'clerk', id?: string, tenantId?: string, email?: string, role?: string, sub?: string, name?: string }>}
 */
async function verifyAuthToken(token, options = {}) {
  if (!token || typeof token !== 'string') {
    throw new Error('Authentication token is required');
  }

  // 1. First try verifying as local JWT signed by JWT_SECRET
  try {
    const decoded = jwt.verify(token, options.jwtSecret || env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      throw new Error('Malformed token: missing user id claim');
    }
    return {
      type: 'local',
      id: decoded.id,
      tenantId: decoded.tenantId || decoded.id,
      email: decoded.email,
      role: decoded.role || 'user'
    };
  } catch (localErr) {
    // If not a valid local JWT, check if Clerk verification is possible
    const secretKey = options.clerkSecretKey || env.CLERK_SECRET_KEY;
    const testJwksClient = options.jwksClient || jwksClient;
    const testClerkDomain = options.clerkDomain || clerkDomain;
    const testPublicKey = options.publicKey;

    // Direct public key provided (e.g. for unit testing Clerk RS256 signature verification)
    if (testPublicKey) {
      const verified = jwt.verify(token, testPublicKey, {
        algorithms: ['RS256']
      });
      if (!verified || !verified.sub) {
        throw new Error('Invalid Clerk token: missing sub');
      }
      if (testClerkDomain && verified.iss && !verified.iss.includes(testClerkDomain)) {
        throw new Error(`Token issuer (${verified.iss}) does not match expected Clerk domain (${testClerkDomain})`);
      }
      return {
        type: 'clerk',
        sub: verified.sub,
        email: verified.email || (verified.email_addresses && verified.email_addresses[0]?.email_address) || null,
        name: verified.name || null
      };
    }

    // 2. Verify with Clerk backend secret key if configured
    if (secretKey) {
      try {
        const verified = await verifyToken(token, {
          secretKey
        });
        if (!verified || !verified.sub) {
          throw new Error('Invalid Clerk token payload');
        }
        return {
          type: 'clerk',
          sub: verified.sub,
          email: verified.email || (verified.email_addresses && verified.email_addresses[0]?.email_address) || null,
          name: verified.name || null
        };
      } catch (clerkSecErr) {
        if (!testJwksClient) {
          throw clerkSecErr;
        }
      }
    }

    // 3. Verify with Clerk JWKS RSA256 signature
    if (testJwksClient) {
      const completeDecoded = jwt.decode(token, { complete: true });
      if (!completeDecoded || !completeDecoded.header || !completeDecoded.header.kid) {
        throw new Error('Malformed token header: missing kid for JWKS verification');
      }

      const signingKey = await new Promise((resolve, reject) => {
        testJwksClient.getSigningKey(completeDecoded.header.kid, (err, key) => {
          if (err) return reject(err);
          const keyMaterial = key.getPublicKey ? key.getPublicKey() : key.rsaPublicKey;
          resolve(keyMaterial);
        });
      });

      const verified = jwt.verify(token, signingKey, {
        algorithms: ['RS256']
      });

      if (!verified || !verified.sub) {
        throw new Error('Invalid Clerk token: missing sub');
      }

      if (testClerkDomain && verified.iss && !verified.iss.includes(testClerkDomain)) {
        throw new Error(`Token issuer (${verified.iss}) does not match expected Clerk domain (${testClerkDomain})`);
      }

      return {
        type: 'clerk',
        sub: verified.sub,
        email: verified.email || (verified.email_addresses && verified.email_addresses[0]?.email_address) || null,
        name: verified.name || null
      };
    }

    // Neither local JWT nor Clerk verified
    throw new Error('Invalid or expired authentication token');
  }
}

module.exports = {
  verifyAuthToken,
  getClerkDomain: () => clerkDomain
};
