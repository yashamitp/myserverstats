const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/schemas');
const { strictLimiter } = require('../middleware/rateLimiter');

router.post('/register', strictLimiter, validate(registerSchema), authController.register);
router.post('/login', strictLimiter, validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
