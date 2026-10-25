const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditEvent = require('../models/AuditEvent');
const { success, error } = require('../utils/response');
const env = require('../config/env');

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      tenantId: user._id.toString(),
      email: user.email,
      role: user.role
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

exports.register = async (req, res, next) => {
  try {
    const { email, name, password } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return error(res, 'User with this email already exists', 409);
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      email: email.toLowerCase(),
      name: name || '',
      passwordHash,
      role: 'user'
    });

    const token = generateToken(user);

    // Audit event
    await AuditEvent.create({
      tenantId: user._id.toString(),
      actorId: user._id.toString(),
      action: 'user.registered',
      resourceType: 'user',
      resourceId: user._id.toString(),
      ipAddress: req.ip || ''
    });

    return success(res, {
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return error(res, 'Invalid email or password', 401);
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return error(res, 'Invalid email or password', 401);
    }

    const token = generateToken(user);

    return success(res, {
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      // In case of Clerk user or token
      return success(res, {
        id: req.user.id,
        tenantId: req.user.tenantId,
        email: req.user.email,
        name: req.user.name || 'AgentOps User',
        role: req.user.role
      });
    }

    return success(res, {
      id: user._id,
      tenantId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (err) {
    next(err);
  }
};
