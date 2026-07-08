const { query } = require('../config/db');
const notificationService = require('../services/notificationService');

/**
 * POST /api/members/join/:communityId
 * Request to join a community.
 */
const requestJoin = async (req, res, next) => {
  try {
    const { communityId } = req.params;

    // Check if community exists
    const communityResult = await query('SELECT id, name FROM communities WHERE id = $1', [communityId]);
    if (communityResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Community not found.',
      });
    }

    // Check if user already has a membership record
    const existing = await query(
      'SELECT id, status FROM community_members WHERE community_id = $1 AND user_id = $2',
      [communityId, req.user.id]
    );

    if (existing.rows.length > 0) {
      const status = existing.rows[0].status;
      if (status === 'approved') {
        return res.status(409).json({
          success: false,
          message: 'You are already a member of this community.',
        });
      }
      if (status === 'pending') {
        return res.status(409).json({
          success: false,
          message: 'Your join request is already pending.',
        });
      }
    }

    const result = await query(
      `INSERT INTO community_members (community_id, user_id, role, status)
       VALUES ($1, $2, 'member', 'pending')
       RETURNING *`,
      [communityId, req.user.id]
    );

    // Notify community admins about the join request
    const admins = await query(
      `SELECT user_id FROM community_members
       WHERE community_id = $1 AND role = 'community_admin' AND status = 'approved'`,
      [communityId]
    );

    const adminIds = admins.rows.map((a) => a.user_id);
    if (adminIds.length > 0) {
      await notificationService.notifyMultiple(
        adminIds,
        'IN_APP',
        'New Join Request',
        `${req.user.name} has requested to join ${communityResult.rows[0].name}.`,
        { communityId, userId: req.user.id }
      );
    }

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Join request submitted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/members/requests/:communityId
 * Get pending join requests for a community (admin only).
 */
const getJoinRequests = async (req, res, next) => {
  try {
    const { communityId } = req.params;

    const result = await query(
      `SELECT cm.id, cm.user_id, cm.status, cm.joined_at,
              u.name, u.email, u.phone
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = $1 AND cm.status = 'pending'
       ORDER BY cm.joined_at ASC`,
      [communityId]
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
 * PUT /api/members/requests/:id
 * Approve or reject a join request (admin only).
 * Body: { action: 'approve' | 'reject' }
 */
const handleJoinRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'approve' or 'reject'.",
      });
    }

    const memberResult = await query(
      'SELECT * FROM community_members WHERE id = $1',
      [id]
    );

    if (memberResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found.',
      });
    }

    const member = memberResult.rows[0];

    if (member.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${member.status}.`,
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const result = await query(
      `UPDATE community_members SET status = $1, joined_at = ${action === 'approve' ? 'NOW()' : 'joined_at'}
       WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );

    // Notify the user about the decision
    const community = await query('SELECT name FROM communities WHERE id = $1', [member.community_id]);
    const communityName = community.rows.length > 0 ? community.rows[0].name : 'the community';

    await notificationService.notify(
      member.user_id,
      'IN_APP',
      `Join Request ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      `Your request to join ${communityName} has been ${newStatus}.`,
      { communityId: member.community_id }
    );

    return res.status(200).json({
      success: true,
      data: result.rows[0],
      message: `Join request ${newStatus} successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/members/:communityId
 * Get all members of a community.
 */
const getMembers = async (req, res, next) => {
  try {
    const { communityId } = req.params;

    const result = await query(
      `SELECT cm.id, cm.user_id, cm.role, cm.status, cm.joined_at,
              u.name, u.email, u.phone
       FROM community_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.community_id = $1 AND cm.status = 'approved'
       ORDER BY cm.role, u.name`,
      [communityId]
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
 * PUT /api/members/:id/role
 * Update a member's role (admin only).
 * Body: { role: 'member' | 'responsible_person' | 'community_admin' }
 */
const updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['member', 'responsible_person', 'community_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(', ')}`,
      });
    }

    const result = await query(
      `UPDATE community_members SET role = $1
       WHERE id = $2 AND status = 'approved'
       RETURNING *`,
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Member not found or not approved.',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Member role updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/members/:id
 * Remove a member from a community (admin only).
 */
const removeMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM community_members WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Member not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Member removed successfully.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  requestJoin,
  getJoinRequests,
  handleJoinRequest,
  getMembers,
  updateRole,
  removeMember,
};
