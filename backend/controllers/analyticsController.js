const analyticsService = require('../services/analyticsService');

/**
 * GET /api/analytics/:communityId
 * Get comprehensive analytics for a community.
 */
const getCommunityStats = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const stats = await analyticsService.getCommunityStats(communityId);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analytics/:communityId/categories
 * Get complaint counts grouped by category.
 */
const getByCategory = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const data = await analyticsService.getComplaintsByCategory(communityId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analytics/:communityId/trend
 * Get daily complaint counts for a period.
 */
const getTrend = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const days = parseInt(req.query.days, 10) || 30;

    const data = await analyticsService.getComplaintsTrend(communityId, days);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/analytics/:communityId/ai-insights
 * Get AI-powered insights, hotspots, efficiency, and suggestions.
 */
const getAIInsights = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const insights = await analyticsService.getAIInsights(communityId);

    return res.status(200).json({
      success: true,
      data: insights,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { 
  getCommunityStats, 
  getByCategory, 
  getTrend,
  getAIInsights,
};
