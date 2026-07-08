const communityService = require('../services/communityService');

/**
 * POST /api/communities
 */
const create = async (req, res, next) => {
  try {
    const community = await communityService.create(req.body, req.user.id);

    return res.status(201).json({
      success: true,
      data: community,
      message: 'Community created successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/communities/:id
 */
const getById = async (req, res, next) => {
  try {
    const community = await communityService.getById(req.params.id);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: community,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/communities/search
 */
const search = async (req, res, next) => {
  try {
    const { q, type } = req.query;
    const communities = await communityService.search(q, type, req.user.id);

    return res.status(200).json({
      success: true,
      data: communities,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/communities/mine
 */
const getUserCommunities = async (req, res, next) => {
  try {
    const communities = await communityService.getUserCommunities(req.user.id);

    return res.status(200).json({
      success: true,
      data: communities,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, getById, search, getUserCommunities };
