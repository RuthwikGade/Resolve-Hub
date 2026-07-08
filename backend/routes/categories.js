const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { createCategorySchema, updateRoutingSchema } = require('../schemas/categorySchemas');

// GET /api/categories/:communityId — get categories for a community
router.get('/:communityId', authenticateToken, categoryController.getCategories);

// POST /api/categories — create a new category (admin only)
router.post(
  '/',
  authenticateToken,
  validate(createCategorySchema),
  categoryController.createCategory
);

// GET /api/categories/routing/:communityId — get routing rules (admin only)
router.get(
  '/routing/:communityId',
  authenticateToken,
  requireRole('community_admin'),
  categoryController.getRouting
);

// PUT /api/categories/routing — update routing rules (admin only)
router.put(
  '/routing',
  authenticateToken,
  validate(updateRoutingSchema),
  categoryController.updateRouting
);

module.exports = router;
