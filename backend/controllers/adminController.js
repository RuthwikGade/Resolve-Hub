const { query } = require('../config/db');

/**
 * GET /api/admin/communities
 * Get all communities (platform admin only).
 */
const getAllCommunities = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, u.name as creator_name,
              (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'approved') as member_count,
              (SELECT COUNT(*) FROM complaints WHERE community_id = c.id) as complaint_count
       FROM communities c
       LEFT JOIN users u ON c.created_by = u.id
       ORDER BY c.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/escalations
 * Get all escalated complaints across the platform (platform admin only).
 */
const getAllEscalations = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT el.*, c.title as complaint_title, c.category, c.status as complaint_status,
              com.name as community_name,
              u.name as creator_name
       FROM escalation_log el
       JOIN complaints c ON el.complaint_id = c.id
       JOIN communities com ON el.community_id = com.id
       LEFT JOIN users u ON c.created_by = u.id
       ORDER BY el.created_at DESC
       LIMIT 100`
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/stats
 * Get platform-wide statistics (platform admin only).
 */
const getPlatformStats = async (req, res, next) => {
  try {
    const usersCount = await query('SELECT COUNT(*) FROM users');
    const communitiesCount = await query('SELECT COUNT(*) FROM communities');
    const complaintsCount = await query('SELECT COUNT(*) FROM complaints');
    const escalationsCount = await query(
      "SELECT COUNT(*) FROM complaints WHERE status = 'ESCALATED'"
    );
    const resolvedCount = await query(
      "SELECT COUNT(*) FROM complaints WHERE status IN ('RESOLVED', 'CLOSED')"
    );
    const membershipsCount = await query(
      "SELECT COUNT(*) FROM community_members WHERE status = 'approved'"
    );

    const recentComplaints = await query(
      `SELECT c.id, c.title, c.status, c.category, c.priority, c.created_at,
              com.name as community_name
       FROM complaints c
       JOIN communities com ON c.community_id = com.id
       ORDER BY c.created_at DESC
       LIMIT 10`
    );

    return res.status(200).json({
      success: true,
      data: {
        totalUsers: parseInt(usersCount.rows[0].count, 10),
        totalCommunities: parseInt(communitiesCount.rows[0].count, 10),
        totalComplaints: parseInt(complaintsCount.rows[0].count, 10),
        escalatedComplaints: parseInt(escalationsCount.rows[0].count, 10),
        resolvedComplaints: parseInt(resolvedCount.rows[0].count, 10),
        totalMemberships: parseInt(membershipsCount.rows[0].count, 10),
        recentComplaints: recentComplaints.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllCommunities, getAllEscalations, getPlatformStats };
