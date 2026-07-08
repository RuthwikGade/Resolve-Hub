const slaService = require('../services/slaService');

/**
 * GET /api/sla/:communityId
 * Get all SLA rules for a community.
 */
const getRules = async (req, res, next) => {
  try {
    const rules = await slaService.getRules(req.params.communityId);

    return res.status(200).json({
      success: true,
      data: rules,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/sla
 * Create or update an SLA rule.
 */
const upsertRule = async (req, res, next) => {
  try {
    const { community_id, category, max_resolution_minutes } = req.body;

    const rule = await slaService.upsertRule(community_id, category, max_resolution_minutes);

    return res.status(200).json({
      success: true,
      data: rule,
      message: 'SLA rule saved successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/sla/:id
 * Delete an SLA rule.
 */
const deleteRule = async (req, res, next) => {
  try {
    const deleted = await slaService.deleteRule(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'SLA rule not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'SLA rule deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRules, upsertRule, deleteRule };
