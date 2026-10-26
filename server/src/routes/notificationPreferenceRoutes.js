const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationPreferenceController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', controller.getPreferences);
router.put('/', controller.updatePreferences);
router.post('/test-email', controller.sendTestEmail);
router.get('/deliveries', controller.getDeliveryHistory);

module.exports = router;
