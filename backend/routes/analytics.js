const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// GET /api/analytics/:communityId — community stats (admin only)
router.get(
  '/:communityId',
  authenticateToken,
  requireRole('community_admin', 'responsible_person'),
  analyticsController.getCommunityStats
);

// GET /api/analytics/:communityId/categories — category breakdown
router.get(
  '/:communityId/categories',
  authenticateToken,
  requireRole('community_admin', 'responsible_person'),
  analyticsController.getByCategory
);

// GET /api/analytics/:communityId/trend — daily trend
router.get(
  '/:communityId/trend',
  authenticateToken,
  requireRole('community_admin', 'responsible_person'),
  analyticsController.getTrend
);

// GET /api/analytics/:communityId/ai-insights — AI analytics & recommendations
router.get(
  '/:communityId/ai-insights',
  authenticateToken,
  requireRole('community_admin', 'responsible_person'),
  analyticsController.getAIInsights
);

module.exports = router;
