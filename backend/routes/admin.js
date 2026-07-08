const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { requirePlatformAdmin } = require('../middleware/rbac');

// All admin routes require authentication + platform admin check
router.use(authenticateToken, requirePlatformAdmin);

// GET /api/admin/communities — all communities
router.get('/communities', adminController.getAllCommunities);

// GET /api/admin/escalations — all escalations
router.get('/escalations', adminController.getAllEscalations);

// GET /api/admin/stats — platform-wide stats
router.get('/stats', adminController.getPlatformStats);

module.exports = router;
