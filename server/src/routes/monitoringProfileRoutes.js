const express = require('express');
const router = express.Router();
const controller = require('../controllers/monitoringProfileController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', controller.getProfiles);
router.post('/', controller.createProfile);
router.put('/:id', controller.updateProfile);
router.delete('/:id', controller.deleteProfile);
router.post('/:id/assign', controller.assignProfileToServers);

module.exports = router;
