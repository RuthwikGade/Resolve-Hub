const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const {
  createComplaintSchema,
  updateStatusSchema,
  reassignSchema,
} = require('../schemas/complaintSchemas');

// POST /api/complaints — create complaint (with optional file upload)
router.post(
  '/',
  authenticateToken,
  upload.array('attachments', 5),
  validate(createComplaintSchema),
  complaintController.create
);

// GET /api/complaints/community/:communityId — get complaints by community
router.get(
  '/community/:communityId',
  authenticateToken,
  complaintController.getByCommunity
);

// GET /api/complaints/:id — get complaint by ID
router.get('/:id', authenticateToken, complaintController.getById);

// PUT /api/complaints/:id/status — update complaint status
router.put(
  '/:id/status',
  authenticateToken,
  validate(updateStatusSchema),
  complaintController.updateStatus
);

// PUT /api/complaints/:id/assign — reassign complaint
router.put(
  '/:id/assign',
  authenticateToken,
  validate(reassignSchema),
  complaintController.reassign
);

// GET /api/complaints/:id/events — get complaint event trail
router.get('/:id/events', authenticateToken, complaintController.getEvents);

module.exports = router;
