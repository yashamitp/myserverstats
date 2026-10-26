const express = require('express');
const router = express.Router();
const controller = require('../controllers/maintenanceController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', controller.getMaintenanceWindows);
router.post('/', controller.createMaintenanceWindow);
router.put('/:id', controller.updateMaintenanceWindow);
router.delete('/:id', controller.deleteMaintenanceWindow);

module.exports = router;
