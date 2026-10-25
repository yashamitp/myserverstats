const express = require('express');
const router = express.Router({ mergeParams: true });
const metricController = require('../controllers/metricController');
const alertController = require('../controllers/alertController');
const { authenticate, authorizeServer } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { metricHistoryQuerySchema, logQuerySchema } = require('../validators/schemas');

router.use(authenticate);
router.use(authorizeServer);

router.get('/metrics/current', metricController.getCurrentMetrics);
router.get('/metrics/history', validate(metricHistoryQuerySchema, 'query'), metricController.getMetricHistory);
router.get('/processes', metricController.getProcesses);
router.get('/services', metricController.getServices);
router.get('/logs', validate(logQuerySchema, 'query'), metricController.getLogs);
router.get('/alerts', alertController.getServerAlerts);

module.exports = router;
