const { query } = require('../config/db');

/**
 * Middleware that checks if the user has one of the required community roles.
 * Community ID is resolved from req.params (communityId, community_id, id) or req.body.community_id.
 *
 * @param  {...string} roles - Allowed roles (e.g. 'member', 'responsible_person', 'community_admin')
 * @returns {Function} Express middleware
 */
const requireRole = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
        });
      }

      const communityId =
        req.params.communityId ||
        req.params.community_id ||
        req.params.id ||
        req.body.community_id;

      if (!communityId) {
        return res.status(400).json({
          success: false,
          message: 'Community ID is required.',
        });
      }

      const result = await query(
        `SELECT role FROM community_members
         WHERE community_id = $1 AND user_id = $2 AND status = 'approved'`,
        [communityId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this community.',
        });
      }

      const userRole = result.rows[0].role;

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${userRole}.`,
        });
      }

      req.communityRole = userRole;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware that checks if the user has one of the required roles
 * in a specific community identified by a named route parameter.
 *
 * @param {string} communityIdParam - The name of the route parameter holding the community ID
 * @param  {...string} roles - Allowed roles
 * @returns {Function} Express middleware
 */
const requireCommunityRole = (communityIdParam, ...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
        });
      }

      const communityId = req.params[communityIdParam];

      if (!communityId) {
        return res.status(400).json({
          success: false,
          message: `Community ID parameter '${communityIdParam}' is required.`,
        });
      }

      const result = await query(
        `SELECT role FROM community_members
         WHERE community_id = $1 AND user_id = $2 AND status = 'approved'`,
        [communityId, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this community.',
        });
      }

      const userRole = result.rows[0].role;

      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${userRole}.`,
        });
      }

      req.communityRole = userRole;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware that checks if the current user is a platform administrator.
 * Queries the platform_admins table.
 */
const requirePlatformAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const result = await query(
      'SELECT id FROM platform_admins WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform administrator privileges required.',
      });
    }

    req.isPlatformAdmin = true;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireRole, requireCommunityRole, requirePlatformAdmin };
