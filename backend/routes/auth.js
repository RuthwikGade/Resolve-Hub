const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../schemas/authSchemas');

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: User registration and authentication management
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@resolvehub.dev
 *               password:
 *                 type: string
 *                 example: password123
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               role:
 *                 type: string
 *                 example: member
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation failed
 *       409:
 *         description: User already exists
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login and receive a JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@resolvehub.dev
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get details of the currently authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticateToken, authController.getMe);

/**
 * @openapi
 * /api/auth/profile:
 *   put:
 *     summary: Update profile details for the active user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe Jr
 *               phone:
 *                 type: string
 *                 example: "+9876543210"
 *               password:
 *                 type: string
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/profile', authenticateToken, authController.updateProfile);

/**
 * @openapi
 * /api/auth/preferences:
 *   get:
 *     summary: Get notification preferences for the active user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Preferences retrieved successfully
 *   put:
 *     summary: Update notification preferences for the active user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email_enabled:
 *                 type: boolean
 *               push_enabled:
 *                 type: boolean
 *               in_app_enabled:
 *                 type: boolean
 *               quiet_hours_start:
 *                 type: string
 *                 example: "22:00"
 *               quiet_hours_end:
 *                 type: string
 *                 example: "07:00"
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 */
router.get('/preferences', authenticateToken, authController.getPreferences);
router.put('/preferences', authenticateToken, authController.updatePreferences);

module.exports = router;
