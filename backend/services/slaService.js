const { query } = require('../config/db');

/**
 * Get all SLA rules for a community.
 * @param {string} communityId
 * @returns {Array}
 */
const getRules = async (communityId) => {
  const result = await query(
    `SELECT * FROM sla_rules
     WHERE community_id = $1
     ORDER BY category`,
    [communityId]
  );

  return result.rows;
};

/**
 * Get a specific SLA rule for a community and category.
 * @param {string} communityId
 * @param {string} category
 * @returns {Object|null}
 */
const getRule = async (communityId, category) => {
  const result = await query(
    `SELECT * FROM sla_rules
     WHERE community_id = $1 AND category = $2`,
    [communityId, category]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Insert or update an SLA rule for a community and category.
 * @param {string} communityId
 * @param {string} category
 * @param {number} maxMinutes
 * @returns {Object} The upserted SLA rule
 */
const upsertRule = async (communityId, category, maxMinutes) => {
  const result = await query(
    `INSERT INTO sla_rules (community_id, category, max_resolution_minutes)
     VALUES ($1, $2, $3)
     ON CONFLICT (community_id, category)
     DO UPDATE SET max_resolution_minutes = $3, updated_at = NOW()
     RETURNING *`,
    [communityId, category, maxMinutes]
  );

  return result.rows[0];
};

/**
 * Delete an SLA rule by ID.
 * @param {string} id - SLA rule UUID
 * @returns {boolean} True if deleted
 */
const deleteRule = async (id) => {
  const result = await query(
    'DELETE FROM sla_rules WHERE id = $1 RETURNING id',
    [id]
  );

  return result.rows.length > 0;
};

module.exports = { getRules, getRule, upsertRule, deleteRule };
