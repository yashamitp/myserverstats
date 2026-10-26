const express = require('express');
const router = express.Router();
const controller = require('../controllers/monitoringProfileController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', controller.getProfiles);
router.post('/', controller.createProfile);
router.put('/:id', controller.updateProfile);
router.delete('/:id', controller.deleteProfile);
router.post('/:id/assign', controller.assignProfileToServers);

module.exports = router;
