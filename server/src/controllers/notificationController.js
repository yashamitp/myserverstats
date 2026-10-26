const Notification = require('../models/Notification');
const { success, error } = require('../utils/response');

// GET /api/v1/notifications - List notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const { isRead, severity, page = 1, limit = 20 } = req.query;
    const query = { tenantId: req.user.tenantId };

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }
    if (severity) {
      query.severity = severity;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ isRead: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(query),
      Notification.countDocuments({ tenantId: req.user.tenantId, isRead: false })
    ]);

    return success(res, {
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/notifications/unread-count - Fast unread counter for badge
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      tenantId: req.user.tenantId,
      isRead: false
    });
    return success(res, { unreadCount: count });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/:id/read - Mark single notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return error(res, 'Notification not found', 404);
    }

    return success(res, notification, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/notifications/read-all - Mark all notifications as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { tenantId: req.user.tenantId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return success(res, { modifiedCount: result.modifiedCount }, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};
