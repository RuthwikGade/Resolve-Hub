const routingService = require('../services/routingService');
const { query } = require('../config/db');

/**
 * GET /api/categories/:communityId
 * Get all categories for a community.
 */
const getCategories = async (req, res, next) => {
  try {
    const { communityId } = req.params;

    const result = await query(
      `SELECT DISTINCT category FROM category_role_mapping
       WHERE community_id = $1
       ORDER BY category`,
      [communityId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((r) => r.category),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/categories
 * Create a new category/routing rule.
 */
const createCategory = async (req, res, next) => {
  try {
    const { community_id, category, role_name, assigned_user_id } = req.body;

    const mapping = await routingService.updateRouting(
      community_id,
      category,
      role_name,
      assigned_user_id
    );

    return res.status(201).json({
      success: true,
      data: mapping,
      message: 'Category created successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/categories/routing/:communityId
 * Get all routing rules for a community.
 */
const getRouting = async (req, res, next) => {
  try {
    const { communityId } = req.params;
    const routing = await routingService.getRouting(communityId);

    return res.status(200).json({
      success: true,
      data: routing,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/categories/routing
 * Update a routing rule.
 */
const updateRouting = async (req, res, next) => {
  try {
    const { community_id, category, role_name, assigned_user_id } = req.body;

    const mapping = await routingService.updateRouting(
      community_id,
      category,
      role_name,
      assigned_user_id
    );

    return res.status(200).json({
      success: true,
      data: mapping,
      message: 'Routing rule updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCategories, createCategory, getRouting, updateRouting };
