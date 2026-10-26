const { error } = require('../utils/response');
const User = require('../models/User');
const Server = require('../models/Server');
const logger = require('../config/logger');
const { verifyAuthToken } = require('../security/tokenVerifier');

/**
 * Authentication Middleware
 * Validates cryptographic signatures, claims, and tenant scopes.
 * Never decodes or links accounts based on unverified client headers.
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

    let verified;
    try {
      verified = await verifyAuthToken(token);
    } catch (verifyErr) {
      logger.debug('Token verification rejected', { error: verifyErr.message });
      return error(res, 'Invalid or expired authentication token', 401);
    }

    if (verified.type === 'local') {
      req.user = {
        id: verified.id,
        tenantId: verified.tenantId || verified.id,
        email: verified.email,
        role: verified.role || 'user'
      };
      return next();
    }

    if (verified.type === 'clerk') {
      const clerkSub = verified.sub;
      // Look up user strictly by verified provider identity (clerkId)
      let user = await User.findOne({ clerkId: clerkSub });

      if (!user) {
        // If this is a verified Clerk user not yet in our DB, provision atomically
        const verifiedEmail = verified.email || `${clerkSub}@clerk.agentops.io`;
        try {
          user = await User.findOneAndUpdate(
            { clerkId: clerkSub },
            {
              $setOnInsert: {
                email: verifiedEmail,
                name: verified.name || 'Clerk User',
                clerkId: clerkSub,
                role: 'user'
              }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (dbErr) {
          if (dbErr.code === 11000) {
            // Concurrent provisioning or email collision: fallback to isolated scoped email
            user = await User.findOne({ clerkId: clerkSub });
            if (!user) {
              user = await User.create({
                email: `${clerkSub}@clerk.agentops.io`,
                name: verified.name || 'Clerk User',
                clerkId: clerkSub,
                role: 'user'
              });
            }
          } else {
            throw dbErr;
          }
        }
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

    return error(res, 'Authentication failed', 401);
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
  requireAuth: authenticate,
  authorizeServer,
  requireRole
};
