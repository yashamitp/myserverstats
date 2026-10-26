const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', incidentController.getIncidents);
router.get('/:id', incidentController.getIncidentById);
router.patch('/:id/acknowledge', incidentController.acknowledgeIncident);
router.patch('/:id/resolve', incidentController.resolveIncident);

module.exports = router;
