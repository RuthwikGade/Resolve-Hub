const notificationService = require('../services/notificationService');

/**
 * GET /api/notifications
 * Get paginated notifications for the authenticated user.
 */
const getNotifications = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    const result = await notificationService.getUserNotifications(
      req.user.id,
      limit,
      offset
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read.
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user.id
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification marked as read.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const count = await notificationService.markAllAsRead(req.user.id);

    return res.status(200).json({
      success: true,
      data: { updated: count },
      message: `${count} notification(s) marked as read.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/notifications/unread-count
 * Get the count of unread notifications.
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);

    return res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, getUnreadCount };
