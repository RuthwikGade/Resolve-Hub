const { query, getClient } = require('../config/db');

/**
 * Default categories seeded when a community is created.
 */
const DEFAULT_CATEGORIES = [
  'Electrical',
  'Plumbing',
  'Security',
  'Water Supply',
  'Common Area',
  'Garbage',
  'Maintenance',
  'Other',
];

/**
 * Default SLA rules (max resolution time in minutes) per category.
 */
const DEFAULT_SLA = {
  Electrical: 240,
  Plumbing: 240,
  Security: 30,
  'Water Supply': 120,
  'Common Area': 480,
  Garbage: 360,
  Maintenance: 480,
  Other: 480,
};

/**
 * Create a new community, add the creator as community_admin,
 * and seed default categories and SLA rules.
 *
 * @param {Object} data - { name, type, description, address }
 * @param {string} userId - Creator's user ID
 * @returns {Object} Created community
 */
const create = async (data, userId) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Create the community
    const communityResult = await client.query(
      `INSERT INTO communities (name, type, description, address, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.name, data.type, data.description || null, data.address || null, userId]
    );

    const community = communityResult.rows[0];

    // Add creator as community_admin
    await client.query(
      `INSERT INTO community_members (community_id, user_id, role, status)
       VALUES ($1, $2, 'community_admin', 'approved')`,
      [community.id, userId]
    );

    // Promote creator globally to community_admin if they are currently a member
    await client.query(
      `UPDATE users SET role = 'community_admin'
       WHERE id = $1 AND role = 'member'`,
      [userId]
    );

    // Seed default categories (category_role_mapping)
    for (const category of DEFAULT_CATEGORIES) {
      await client.query(
        `INSERT INTO category_role_mapping (community_id, category, role_name)
         VALUES ($1, $2, 'responsible_person')`,
        [community.id, category]
      );
    }

    // Seed default SLA rules
    for (const [category, minutes] of Object.entries(DEFAULT_SLA)) {
      await client.query(
        `INSERT INTO sla_rules (community_id, category, max_resolution_minutes)
         VALUES ($1, $2, $3)`,
        [community.id, category, minutes]
      );
    }

    await client.query('COMMIT');
    return community;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get a community by ID.
 * @param {string} id - Community UUID
 * @returns {Object|null}
 */
const getById = async (id) => {
  const result = await query(
    `SELECT c.*, u.name as creator_name,
            (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'approved') as member_count
     FROM communities c
     LEFT JOIN users u ON c.created_by = u.id
     WHERE c.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

/**
 * Search communities by name and/or type.
 * @param {string} searchQuery - Search term (optional)
 * @param {string} type - Community type filter (optional)
 * @returns {Array}
 */
const search = async (searchQuery, type, userId) => {
  let sql = `
    SELECT c.*, u.name as creator_name,
           (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'approved') as member_count,
           UPPER(cm.status) as request_status
    FROM communities c
    LEFT JOIN users u ON c.created_by = u.id
    LEFT JOIN community_members cm ON c.id = cm.community_id AND cm.user_id = $1
    WHERE 1=1
  `;
  const params = [userId];

  if (searchQuery) {
    params.push(`%${searchQuery}%`);
    sql += ` AND (c.name ILIKE $${params.length} OR c.description ILIKE $${params.length})`;
  }

  if (type) {
    params.push(type);
    sql += ` AND c.type = $${params.length}`;
  }

  sql += ' ORDER BY c.created_at DESC LIMIT 50';

  const result = await query(sql, params);
  return result.rows;
};

/**
 * Get all members of a community.
 * @param {string} communityId
 * @returns {Array}
 */
const getMembers = async (communityId) => {
  const result = await query(
    `SELECT cm.id, cm.user_id, cm.role, cm.status, cm.joined_at,
            u.name, u.email, u.phone
     FROM community_members cm
     JOIN users u ON cm.user_id = u.id
     WHERE cm.community_id = $1 AND cm.status = 'approved'
     ORDER BY cm.role, u.name`,
    [communityId]
  );

  return result.rows;
};

/**
 * Get all communities that a user belongs to.
 * @param {string} userId
 * @returns {Array}
 */
const getUserCommunities = async (userId) => {
  const result = await query(
    `SELECT c.*, cm.role as user_role, cm.joined_at,
            (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'approved') as member_count
     FROM communities c
     JOIN community_members cm ON c.id = cm.community_id
     WHERE cm.user_id = $1 AND cm.status = 'approved'
     ORDER BY cm.joined_at DESC`,
    [userId]
  );

  return result.rows;
};

module.exports = { create, getById, search, getMembers, getUserCommunities };
