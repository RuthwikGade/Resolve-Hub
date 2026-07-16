const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const { redisConfig } = require('../config/redis');
const env = require('../config/env');
const { query } = require('../config/db');

let emailTransporter = null;

/**
 * Initialize the email transporter.
 * Uses Ethereal for development or configured SMTP for production.
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
      console.log('[NotificationWorker] Ethereal test account created:', testAccount.user);
    } catch (err) {
      console.warn('[NotificationWorker] Failed to create Ethereal account:', err.message);
      emailTransporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  return emailTransporter;
};

/**
 * Process an EMAIL notification.
 */
const processEmail = async (job) => {
  const { userId, title, message, data } = job.data;

  // Get user's email
  const userResult = await query('SELECT email, name FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) {
    console.warn(`[NotificationWorker] User ${userId} not found, skipping email.`);
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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${title}</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">${message}</p>
        ${data.complaintId ? `<p style="color: #6b7280; font-size: 14px;">Complaint ID: ${data.complaintId}</p>` : ''}
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">This is an automated notification from ResolveHub.</p>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);

  // Log preview URL for Ethereal
  if (info.messageId && nodemailer.getTestMessageUrl(info)) {
    console.log(`[NotificationWorker] Email preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  }

  console.log(`[NotificationWorker] Email sent to ${user.email}: ${info.messageId}`);
};

/**
 * Process an IN_APP notification (already saved to DB by notificationService).
 */
const processInApp = async (job) => {
  const { userId, title } = job.data;
  console.log(`[NotificationWorker] In-app notification for user ${userId}: ${title}`);
  // The notification is already saved in the database by notificationService.notify()
  // This worker could emit a Socket.IO event to push real-time updates
  const { getIO } = require('../socket/socketHandler');
  const io = getIO();
  if (io) {
    io.to(`user:${userId}`).emit('notification', {
      type: 'new_notification',
      data: job.data,
    });
  }
};

/**
 * Process a WEB_PUSH notification.
 */
const processWebPush = async (job) => {
  const { userId, title, message } = job.data;

  if (!env.vapid.publicKey || !env.vapid.privateKey) {
    console.log(`[NotificationWorker] Web push not configured, skipping for user ${userId}`);
    return;
  }

  try {
    const webpush = require('web-push');
    webpush.setVapidDetails(
      env.vapid.email,
      env.vapid.publicKey,
      env.vapid.privateKey
    );

    // Get user's push subscription from DB
    const subResult = await query(
      'SELECT subscription FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );

    if (subResult.rows.length === 0) {
      console.log(`[NotificationWorker] No push subscription for user ${userId}`);
      return;
    }

    for (const row of subResult.rows) {
      const subscription = typeof row.subscription === 'string'
        ? JSON.parse(row.subscription)
        : row.subscription;

      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title, body: message, data: job.data.data })
      );
    }

    console.log(`[NotificationWorker] Web push sent to user ${userId}`);
  } catch (err) {
    console.error(`[NotificationWorker] Web push failed for user ${userId}:`, err.message);
  }
};

/**
 * Start the BullMQ notification worker.
 * Processes notification jobs from the queue.
 */
const startNotificationWorker = () => {
  const worker = new Worker(
    'notifications',
    async (job) => {
      console.log(`[NotificationWorker] Processing job ${job.id}: ${job.data.type} for user ${job.data.userId}`);

      try {
        switch (job.data.type) {
          case 'EMAIL':
            await processEmail(job);
            break;
          case 'IN_APP':
            await processInApp(job);
            break;
          case 'WEB_PUSH':
            await processWebPush(job);
            break;
          default:
            // Default: treat as IN_APP
            await processInApp(job);
            break;
        }
      } catch (err) {
        console.error(`[NotificationWorker] Job ${job.id} failed:`, err.message);
        throw err; // Rethrow so BullMQ retries
      }
    },
    {
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        maxRetriesPerRequest: null,
      },
      concurrency: 5,
      limiter: {
        max: 50,
        duration: 60000, // 50 jobs per minute
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[NotificationWorker] Job ${job.id} completed.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[NotificationWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[NotificationWorker] Worker error:', err.message);
  });

  console.log('[NotificationWorker] Worker started.');
  return worker;
};

module.exports = { startNotificationWorker };
