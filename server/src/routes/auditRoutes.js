const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', auditController.getAuditEvents);

module.exports = router;
