const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const env = require('../config/env');

const SALT_ROUNDS = 12;

/**
 * Register a new user.
 * @param {Object} data - { name, email, phone, password, role }
 * @returns {Object} Created user (without password)
 */
const register = async (data) => {
  const { name, email, phone, password, role } = data;

  // Check if email already exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    const err = new Error('A user with this email already exists.');
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await query(
    `INSERT INTO users (name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, phone, role, created_at, updated_at`,
    [name, email, phone || null, hashedPassword, role || 'member']
  );

  const user = result.rows[0];

  // Initialize notification preferences for user
  await query(
    `INSERT INTO notification_preferences (user_id) 
     VALUES ($1) 
     ON CONFLICT (user_id) DO NOTHING`,
    [user.id]
  );

  return user;
};

/**
 * Authenticate a user by email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Object} { user, token }
 */
const login = async (email, password) => {
  const result = await query(
    'SELECT id, name, email, phone, password_hash, role, created_at, updated_at FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const user = result.rows[0];
  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const token = generateToken(user);

  // Remove password_hash from the returned user object
  const { password_hash, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
};

/**
 * Get a user by their ID (without password).
 * @param {string} id - User UUID
 * @returns {Object|null} User object or null
 */
const getUserById = async (id) => {
  const result = await query(
    'SELECT id, name, email, phone, role, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

/**
 * Update user profile details.
 * @param {string} userId 
 * @param {Object} data - { name, phone, password }
 * @returns {Object} Updated user object
 */
const updateProfile = async (userId, data) => {
  const { name, phone, password } = data;
  
  let result;
  if (password) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    result = await query(
      `UPDATE users 
       SET name = $1, phone = $2, password_hash = $3, updated_at = NOW() 
       WHERE id = $4 
       RETURNING id, name, email, phone, role, created_at, updated_at`,
      [name, phone || null, hashedPassword, userId]
    );
  } else {
    result = await query(
      `UPDATE users 
       SET name = $1, phone = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING id, name, email, phone, role, created_at, updated_at`,
      [name, phone || null, userId]
    );
  }
  
  return result.rows[0];
};

/**
 * Get user notification preferences.
 * @param {string} userId 
 * @returns {Object}
 */
const getPreferences = async (userId) => {
  const result = await query(
    `SELECT email_enabled, push_enabled, in_app_enabled, quiet_hours_start, quiet_hours_end 
     FROM notification_preferences 
     WHERE user_id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    const inserted = await query(
      `INSERT INTO notification_preferences (user_id) 
       VALUES ($1) 
       RETURNING email_enabled, push_enabled, in_app_enabled, quiet_hours_start, quiet_hours_end`,
      [userId]
    );
    return inserted.rows[0];
  }
  
  return result.rows[0];
};

/**
 * Update user notification preferences.
 * @param {string} userId 
 * @param {Object} data 
 * @returns {Object} Updated preferences
 */
const updatePreferences = async (userId, data) => {
  const { email_enabled, push_enabled, in_app_enabled, quiet_hours_start, quiet_hours_end } = data;
  
  const result = await query(
    `INSERT INTO notification_preferences (user_id, email_enabled, push_enabled, in_app_enabled, quiet_hours_start, quiet_hours_end)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) 
     DO UPDATE SET 
       email_enabled = $2, 
       push_enabled = $3, 
       in_app_enabled = $4, 
       quiet_hours_start = $5, 
       quiet_hours_end = $6, 
       updated_at = NOW()
     RETURNING email_enabled, push_enabled, in_app_enabled, quiet_hours_start, quiet_hours_end`,
    [
      userId,
      email_enabled !== undefined ? email_enabled : true,
      push_enabled !== undefined ? push_enabled : true,
      in_app_enabled !== undefined ? in_app_enabled : true,
      quiet_hours_start || null,
      quiet_hours_end || null
    ]
  );
  
  return result.rows[0];
};

/**
 * Generate a JWT token for a user.
 * @param {Object} user - { id, email, name, role }
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
};

module.exports = {
  register,
  login,
  getUserById,
  updateProfile,
  getPreferences,
  updatePreferences,
  generateToken,
};
