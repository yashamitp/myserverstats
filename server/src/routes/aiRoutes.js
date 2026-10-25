const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { aiChatSchema, aiAnalyzeSchema } = require('../validators/schemas');
const { strictLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);

router.post('/chat', strictLimiter, validate(aiChatSchema), aiController.chat);
router.post('/servers/:id/analyze', strictLimiter, validate(aiAnalyzeSchema), aiController.analyzeServer);
router.get('/servers/:id/insights', aiController.getServerInsights);

module.exports = router;
