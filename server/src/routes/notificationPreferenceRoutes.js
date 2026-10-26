const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationPreferenceController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', controller.getPreferences);
router.put('/', controller.updatePreferences);
router.post('/test-email', controller.sendTestEmail);
router.get('/deliveries', controller.getDeliveryHistory);

module.exports = router;
