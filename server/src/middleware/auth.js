const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { error } = require('../utils/response');
const User = require('../models/User');
const Server = require('../models/Server');
const logger = require('../config/logger');

// Cache JWKS client if Clerk is configured
let jwksClient = null;
if (env.CLERK_PUBLISHABLE_KEY) {
  try {
    const jwksRsa = require('jwks-rsa');
    let domain = '';
    // Clerk publishable keys are: pk_test_<base64(domain$)> or pk_live_<base64(domain$)>
    const parts = env.CLERK_PUBLISHABLE_KEY.split('_');
    if (parts.length >= 3) {
      const b64 = parts.slice(2).join('_');
      domain = Buffer.from(b64, 'base64').toString('utf8').replace(/\$$/, '');
    }
    if (domain) {
      jwksClient = jwksRsa({
        jwksUri: `https://${domain}/.well-known/jwks.json`,
        cache: true,
        rateLimit: true
      });
      logger.info(`Initialized Clerk JWKS client for domain: ${domain}`);
    }
  } catch (e) {
    logger.warn('Could not initialize JWKS client for Clerk', { error: e.message });
  }
}

/**
 * Authentication Middleware
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Authentication required. No Bearer token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return error(res, 'Authentication token missing.', 401);
    }

    // 1. Try local JWT verification
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = {
        id: decoded.id,
        tenantId: decoded.tenantId || decoded.id,
        email: decoded.email,
        role: decoded.role || 'user'
      };
      return next();
    } catch (localJwtErr) {
      // If local JWT didn't match, check if Clerk is enabled
      if (env.CLERK_SECRET_KEY || env.CLERK_PUBLISHABLE_KEY || jwksClient) {
        try {
          const decodedClerk = jwt.decode(token, { complete: true });
          if (decodedClerk && decodedClerk.payload && decodedClerk.payload.sub) {
            const clerkSub = decodedClerk.payload.sub;
            const headerEmail = req.headers['x-clerk-user-email'];
            const tokenEmail = decodedClerk.payload.email ||
                               (decodedClerk.payload.email_addresses && decodedClerk.payload.email_addresses[0]?.email_address) ||
                               '';
            const clerkEmail = (headerEmail || tokenEmail || '').toLowerCase().trim();

            // Find existing user by clerkId or by email
            let user = null;
            if (clerkSub) {
              user = await User.findOne({ clerkId: clerkSub });
            }
            if (!user && clerkEmail) {
              user = await User.findOne({ email: clerkEmail });
              if (user) {
                // Link this existing user to their Clerk identity permanently
                user.clerkId = clerkSub;
                await user.save();
                logger.info(`Associated existing user ${user.email} (${user._id}) with Clerk sub ${clerkSub}`);
              }
            }

            // Provision a new user if no match found
            if (!user) {
              const userName = req.headers['x-clerk-user-name'] || decodedClerk.payload.name || '';
              user = await User.create({
                email: clerkEmail || `${clerkSub}@clerk.agentops.io`,
                name: userName,
                clerkId: clerkSub,
                role: 'user'
              });
              logger.info(`Provisioned new user record for Clerk user ${clerkSub}: ${user.email} (${user._id})`);
            }

            req.user = {
              id: user._id.toString(),
              tenantId: user._id.toString(),
              email: user.email,
              name: user.name,
              role: user.role,
              clerkId: clerkSub
            };
            return next();
          }
        } catch (clerkErr) {
          logger.debug('Clerk verification failed', { error: clerkErr.message });
        }
      }

      return error(res, 'Invalid or expired authentication token', 401);
    }
  } catch (err) {
    logger.error('Authentication error', { error: err.message });
    return error(res, 'Internal authentication error', 500);
  }
}

/**
 * Middleware to verify that the server specified in req.params.id (or req.params.serverId)
 * exists AND belongs to the authenticated user's tenantId.
 */
async function authorizeServer(req, res, next) {
  try {
    const serverId = req.params.id || req.params.serverId;
    if (!serverId) {
      return error(res, 'Server ID parameter is required', 400);
    }

    // Find server scoped strictly to req.user.tenantId
    const server = await Server.findOne({
      _id: serverId,
      tenantId: req.user.tenantId
    });

    if (!server) {
      return error(res, 'Server not found or access denied', 404);
    }

    req.server = server;
    next();
  } catch (err) {
    if (err.name === 'CastError') {
      return error(res, 'Invalid server ID format', 400);
    }
    logger.error('Server authorization check failed', { error: err.message });
    return error(res, 'Failed to verify server permissions', 500);
  }
}

/**
 * Role-based authorization
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return error(res, `Forbidden: requires ${role} role`, 403);
    }
    next();
  };
}

module.exports = {
  authenticate,
  authorizeServer,
  requireRole
};
