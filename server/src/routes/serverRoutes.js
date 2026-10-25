const express = require('express');
const router = express.Router();
const serverController = require('../controllers/serverController');
const { authenticate, authorizeServer } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createServerSchema,
  updateServerSchema,
  testConnectionSchema
} = require('../validators/schemas');
const { strictLimiter } = require('../middleware/rateLimiter');

// All server routes require authentication
router.use(authenticate);

// Collection routes
router.get('/', serverController.getServers);
router.post('/', validate(createServerSchema), serverController.createServer);

// Pre-flight test connection before creation
router.post('/test-connection', strictLimiter, validate(testConnectionSchema), serverController.testArbitraryConnection);

// Member routes (enforcing authorizeServer tenant isolation)
router.get('/:id', authorizeServer, serverController.getServerById);
router.patch('/:id', authorizeServer, validate(updateServerSchema), serverController.updateServer);
router.delete('/:id', authorizeServer, serverController.deleteServer);
router.post('/:id/test-connection', strictLimiter, authorizeServer, serverController.testServerConnection);
router.post('/:id/refresh', strictLimiter, authorizeServer, serverController.refreshServer);

// Nested metric & operational inspection routes
const metricRoutes = require('./metricRoutes');
router.use('/:id', metricRoutes);

module.exports = router;
