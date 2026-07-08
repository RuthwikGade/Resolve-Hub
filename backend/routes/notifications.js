const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/auth');

// GET /api/notifications — get paginated notifications
router.get('/', authenticateToken, notificationController.getNotifications);

// GET /api/notifications/unread-count — get unread count (must be before /:id routes)
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', authenticateToken, notificationController.markAllAsRead);

// PUT /api/notifications/:id/read — mark single as read
router.put('/:id/read', authenticateToken, notificationController.markAsRead);

module.exports = router;
