const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createCommunitySchema,
  searchCommunitySchema,
} = require('../schemas/communitySchemas');

// POST /api/communities — create a new community
router.post(
  '/',
  authenticateToken,
  validate(createCommunitySchema),
  communityController.create
);

// GET /api/communities/search — search communities
router.get(
  '/search',
  authenticateToken,
  validate(searchCommunitySchema, 'query'),
  communityController.search
);

// GET /api/communities/mine — get user's communities
router.get('/mine', authenticateToken, communityController.getUserCommunities);

// GET /api/communities/:id — get community by ID
router.get('/:id', authenticateToken, communityController.getById);

module.exports = router;
