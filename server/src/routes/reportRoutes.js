const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/config', controller.getReportConfig);
router.put('/config', controller.updateReportConfig);
router.post('/generate-now', controller.generateReportNow);

module.exports = router;
