const rateLimit = require('express-rate-limit');
const { error } = require('../utils/response');

// General API rate limiter: 300 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return error(res, 'Too many requests, please try again later.', 429);
  }
});

// Stricter limiter for sensitive operations (connection testing, auth login): 30 requests per 15 min
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return error(res, 'Rate limit exceeded for sensitive operations. Please wait before retrying.', 429);
  }
});

module.exports = {
  apiLimiter,
  strictLimiter
};
