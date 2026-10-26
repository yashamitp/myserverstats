const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/config', controller.getReportConfig);
router.put('/config', controller.updateReportConfig);
router.post('/generate-now', controller.generateReportNow);

module.exports = router;
