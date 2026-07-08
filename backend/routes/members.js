const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// POST /api/members/join/:communityId — request to join
router.post('/join/:communityId', authenticateToken, memberController.requestJoin);

// GET /api/members/requests/:communityId — get pending requests (admin only)
router.get(
  '/requests/:communityId',
  authenticateToken,
  requireRole('community_admin'),
  memberController.getJoinRequests
);

// PUT /api/members/requests/:id — approve/reject request (admin only)
// The community ID is needed for RBAC; we look it up from the membership record
router.put(
  '/requests/:id',
  authenticateToken,
  memberController.handleJoinRequest
);

// GET /api/members/:communityId — get all members
router.get('/:communityId', authenticateToken, memberController.getMembers);

// PUT /api/members/:id/role — update member role (admin only)
router.put(
  '/:id/role',
  authenticateToken,
  memberController.updateRole
);

// DELETE /api/members/:id — remove member (admin only)
router.delete(
  '/:id',
  authenticateToken,
  memberController.removeMember
);

module.exports = router;
