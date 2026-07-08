const authService = require('../services/authService');

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    const token = authService.generateToken(user);

    return res.status(201).json({
      success: true,
      data: { user, token },
      message: 'Registration successful.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);

    return res.status(200).json({
      success: true,
      data: { user, token },
      message: 'Login successful.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/auth/profile
 * Update current user's profile details.
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    return res.status(200).json({
      success: true,
      data: user,
      message: 'Profile updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/preferences
 * Get current user's notification preferences.
 */
const getPreferences = async (req, res, next) => {
  try {
    const preferences = await authService.getPreferences(req.user.id);
    return res.status(200).json({
      success: true,
      data: preferences,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/auth/preferences
 * Update current user's notification preferences.
 */
const updatePreferences = async (req, res, next) => {
  try {
    const preferences = await authService.updatePreferences(req.user.id, req.body);
    return res.status(200).json({
      success: true,
      data: preferences,
      message: 'Notification preferences updated successfully.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  getPreferences,
  updatePreferences,
};
