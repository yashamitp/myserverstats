const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', incidentController.getIncidents);
router.get('/:id', incidentController.getIncidentById);
router.patch('/:id/acknowledge', incidentController.acknowledgeIncident);
router.patch('/:id/resolve', incidentController.resolveIncident);

module.exports = router;
