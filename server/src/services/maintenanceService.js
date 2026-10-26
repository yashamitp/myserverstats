const MaintenanceWindow = require('../models/MaintenanceWindow');
const logger = require('../config/logger');

class MaintenanceService {
  /**
   * Check if a server is currently inside an active maintenance window
   * @param {object} server 
   * @returns {Promise<{ inMaintenance: boolean, window: object|null, suppressNotifications: boolean }>}
   */
  async checkMaintenance(server) {
    try {
      const now = new Date();
      const activeWindow = await MaintenanceWindow.findOne({
        tenantId: server.tenantId,
        serverIds: server._id,
        status: { $in: ['scheduled', 'active'] },
        startTime: { $lte: now },
        endTime: { $gte: now }
      });

      if (activeWindow) {
        if (activeWindow.status === 'scheduled') {
          activeWindow.status = 'active';
          await activeWindow.save().catch(() => {});
        }

        return {
          inMaintenance: true,
          window: activeWindow,
          suppressNotifications: activeWindow.suppressNotifications
        };
      }

      return {
        inMaintenance: false,
        window: null,
        suppressNotifications: false
      };
    } catch (err) {
      logger.error('Error checking maintenance window', { serverId: server._id, error: err.message });
      return { inMaintenance: false, window: null, suppressNotifications: false };
    }
  }
}

module.exports = new MaintenanceService();
