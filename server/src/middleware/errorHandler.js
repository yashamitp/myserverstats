const logger = require('../config/logger');
const { error } = require('../utils/response');
const env = require('../config/env');

function notFoundHandler(req, res, next) {
  return error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

function errorHandler(err, req, res, next) {
  logger.error('Unhandled request error', {
    method: req.method,
    path: req.originalUrl,
    error: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const formatted = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return error(res, 'Validation error', 400, formatted);
  }

  // Handle Mongoose duplicate key error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return error(res, `A resource with that ${field} already exists.`, 409);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return error(res, `Invalid format for field "${err.path}"`, 400);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return error(res, 'Invalid authentication token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return error(res, 'Authentication token expired', 401);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : err.message || 'Internal server error';

  return error(res, message, statusCode);
}

module.exports = {
  notFoundHandler,
  errorHandler
};
