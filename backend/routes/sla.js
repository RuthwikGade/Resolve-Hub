const express = require('express');
const router = express.Router();
const slaController = require('../controllers/slaController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createSlaSchema, updateSlaSchema } = require('../schemas/slaSchemas');

// GET /api/sla/:communityId — get SLA rules (admin only)
router.get(
  '/:communityId',
  authenticateToken,
  requireRole('community_admin'),
  slaController.getRules
);

// PUT /api/sla — create/update SLA rule (admin only)
router.put(
  '/',
  authenticateToken,
  validate(createSlaSchema),
  slaController.upsertRule
);

// DELETE /api/sla/:id — delete SLA rule (admin only)
router.delete(
  '/:id',
  authenticateToken,
  slaController.deleteRule
);

module.exports = router;
