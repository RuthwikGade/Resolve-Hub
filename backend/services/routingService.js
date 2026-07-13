const { query } = require('../config/db');

/**
 * Auto-assign a complaint based on the category_role_mapping table.
 * Looks up the assigned user for a given community and category.
 *
 * @param {string} communityId
 * @param {string} category
 * @returns {string|null} Assigned user ID or null if no mapping found
 */
const autoAssign = async (communityId, category) => {
  const result = await query(
    `SELECT assigned_user_id FROM category_role_mapping
     WHERE community_id = $1 AND category = $2 AND assigned_user_id IS NOT NULL`,
    [communityId, category]
  );

  if (result.rows.length > 0 && result.rows[0].assigned_user_id) {
    return result.rows[0].assigned_user_id;
  }

  // If no specific user assigned, try to find any responsible_person in the community
  const fallback = await query(
    `SELECT user_id FROM community_members
     WHERE community_id = $1 AND role = 'responsible_person' AND status = 'approved'
     LIMIT 1`,
    [communityId]
  );

  if (fallback.rows.length > 0) {
    return fallback.rows[0].user_id;
  }

  // Last resort: assign to a community_admin
  const admin = await query(
    `SELECT user_id FROM community_members
     WHERE community_id = $1 AND role = 'community_admin' AND status = 'approved'
     LIMIT 1`,
    [communityId]
  );

  return admin.rows.length > 0 ? admin.rows[0].user_id : null;
};

/**
 * Get all category-role mappings for a community.
 * @param {string} communityId
 * @returns {Array}
 */
const getRouting = async (communityId) => {
  const result = await query(
    `SELECT crm.*, u.name as assigned_user_name, u.email as assigned_user_email
     FROM category_role_mapping crm
     LEFT JOIN users u ON crm.assigned_user_id = u.id
     WHERE crm.community_id = $1
     ORDER BY crm.category`,
    [communityId]
  );

  return result.rows;
};

/**
 * Create or update a routing rule (category-role mapping).
 * @param {string} communityId
 * @param {string} category
 * @param {string} roleName
 * @param {string|null} assignedUserId
 * @returns {Object} The upserted mapping
 */
const updateRouting = async (communityId, category, roleName, assignedUserId) => {
  const result = await query(
    `INSERT INTO category_role_mapping (community_id, category, role_name, assigned_user_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (community_id, category)
     DO UPDATE SET role_name = $3, assigned_user_id = $4, updated_at = NOW()
     RETURNING *`,
    [communityId, category, roleName, assignedUserId || null]
  );

  return result.rows[0];
};

module.exports = { autoAssign, getRouting, updateRouting };
