const nodemailer = require('nodemailer');
const { query } = require('../config/db');
const { addNotificationJob } = require('../queues/notificationQueue');
const env = require('../config/env');

let emailTransporter = null;

/**
 * Initialize the email transporter.
 * Uses Ethereal for development or configured SMTP for production/staging.
 */
const getEmailTransporter = async () => {
  if (emailTransporter) {
    return emailTransporter;
  }

  // If SMTP credentials are configured, use them
  if (env.smtp.user && env.smtp.pass) {
    emailTransporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
  } else {
    // Create Ethereal test account for development
    try {
      const testAccount = await nodemailer.createTestAccount();
      emailTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('[NotificationService] Ethereal test account created:', testAccount.user);
    } catch (err) {
      console.warn('[NotificationService] Failed to create Ethereal account, using JSON transport:', err.message);
      emailTransporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  return emailTransporter;
};

/**
 * Send an email directly via SMTP/Nodemailer.
 *
 * @param {string} userId - Recipient user ID
 * @param {string} title - Email subject
 * @param {string} message - Email content body
 * @param {Object} data - Additional metadata payload
 */
const sendEmailDirectly = async (userId, title, message, data = {}) => {
  try {
    const userResult = await query('SELECT email, name FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      console.warn(`[NotificationService] User ${userId} not found, skipping direct email.`);
      return;
    }

    const user = userResult.rows[0];
    const transporter = await getEmailTransporter();

    const mailOptions = {
      from: env.smtp.from,
      to: user.email,
      subject: title,
      text: message,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #6366f1;">${title}</h2>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">${message}</p>
          ${data.complaintId ? `<p style="color: #6b7280; font-size: 14px;">Complaint ID: ${data.complaintId}</p>` : ''}
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">This is an automated notification from ResolveHub.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log(`[NotificationService] Direct Email preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    console.log(`[NotificationService] Direct Email sent to ${user.email}: ${info.messageId}`);
  } catch (err) {
    console.error('[NotificationService] Direct Email sending failed:', err.message);
  }
};

/**
 * Create a notification in the database and dispatch it.
 *
 * @param {string} userId - Recipient user ID
 * @param {string} type - Notification type (e.g. 'EMAIL', 'IN_APP', 'WEB_PUSH')
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data payload
 */
const notify = async (userId, type, title, message, data = {}) => {
  // Create in-app notification in the database
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, title, message, JSON.stringify(data)]
  );

  const notification = result.rows[0];

  // Dispatch the notification based on user preferences
  try {
    const prefResult = await query(
      'SELECT email_enabled, push_enabled, in_app_enabled FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    let prefs;
    if (prefResult.rows.length === 0) {
      // Insert default preferences if none exist (for seeded accounts)
      const insertResult = await query(
        `INSERT INTO notification_preferences (user_id) 
         VALUES ($1) 
         RETURNING email_enabled, push_enabled, in_app_enabled`,
        [userId]
      );
      prefs = insertResult.rows[0];
    } else {
      prefs = prefResult.rows[0];
    }

    // Queue in-app socket push job if enabled
    if (prefs.in_app_enabled) {
      await addNotificationJob({
        notificationId: notification.id,
        userId,
        type: 'IN_APP',
        title,
        message,
        data,
      });
    }

    // Send email notification directly via SMTP/Nodemailer if enabled
    if (prefs.email_enabled) {
      // Send directly without waiting to block response cycle
      sendEmailDirectly(userId, title, message, data);
    }

    // Queue web push notification job if enabled
    if (prefs.push_enabled) {
      await addNotificationJob({
        notificationId: notification.id,
        userId,
        type: 'WEB_PUSH',
        title,
        message,
        data,
      });
    }
  } catch (err) {
    console.error('Failed to process/queue notification:', err.message);
  }

  return notification;
};

/**
 * Notify multiple users at once.
 *
 * @param {string[]} userIds - Array of recipient user IDs
 * @param {string} type - Notification type
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data payload
 */
const notifyMultiple = async (userIds, type, title, message, data = {}) => {
  const notifications = [];

  for (const userId of userIds) {
    try {
      const notification = await notify(userId, type, title, message, data);
      notifications.push(notification);
    } catch (err) {
      console.error(`Failed to notify user ${userId}:`, err.message);
    }
  }

  return notifications;
};

/**
 * Get paginated notifications for a user.
 *
 * @param {string} userId
 * @param {number} limit
 * @param {number} offset
 * @returns {Object} { notifications, total }
 */
const getUserNotifications = async (userId, limit = 20, offset = 0) => {
  const countResult = await query(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
    [userId]
  );

  const result = await query(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return {
    notifications: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
};

/**
 * Mark a specific notification as read.
 *
 * @param {string} notificationId
 * @param {string} userId - Ensures the user owns the notification
 * @returns {Object|null}
 */
const markAsRead = async (notificationId, userId) => {
  const result = await query(
    `UPDATE notifications
     SET is_read = true, read_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Mark all of a user's notifications as read.
 *
 * @param {string} userId
 * @returns {number} Number of updated rows
 */
const markAllAsRead = async (userId) => {
  const result = await query(
    `UPDATE notifications
     SET is_read = true, read_at = NOW()
     WHERE user_id = $1 AND is_read = false`,
    [userId]
  );

  return result.rowCount;
};

/**
 * Get the count of unread notifications for a user.
 *
 * @param {string} userId
 * @returns {number}
 */
const getUnreadCount = async (userId) => {
  const result = await query(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );

  return parseInt(result.rows[0].count, 10);
};

module.exports = {
  notify,
  notifyMultiple,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
