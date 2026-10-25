const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createAlertRuleSchema, updateAlertRuleSchema } = require('../validators/schemas');

router.use(authenticate);

// Alerts endpoints
router.get('/', alertController.getAlerts);
router.patch('/:id/acknowledge', alertController.acknowledgeAlert);

// Alert Rules endpoints
router.post('/rules', validate(createAlertRuleSchema), alertController.createRule);
router.patch('/rules/:id', validate(updateAlertRuleSchema), alertController.updateRule);
router.delete('/rules/:id', alertController.deleteRule);

module.exports = router;
