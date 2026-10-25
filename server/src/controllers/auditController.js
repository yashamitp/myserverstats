const AuditEvent = require('../models/AuditEvent');
const { success } = require('../utils/response');

exports.getAuditEvents = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const events = await AuditEvent.find({ tenantId: req.user.tenantId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10));

    return success(res, events, 'Audit logs retrieved');
  } catch (err) {
    next(err);
  }
};
