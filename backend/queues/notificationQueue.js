const { Queue } = require('bullmq');
const { redisConfig } = require('../config/redis');

/**
 * BullMQ notification queue.
 * Uses the Redis connection from config/redis.js.
 */
const notificationQueue = new Queue('notifications', {
  connection: {
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    maxRetriesPerRequest: null,
  },
  defaultJobOptions: {
    removeOnComplete: { count: 1000 }, // Keep last 1000 completed jobs
    removeOnFail: { count: 5000 },     // Keep last 5000 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

notificationQueue.on('error', (err) => {
  console.error('[NotificationQueue] Queue error:', err.message);
});

/**
 * Add a notification job to the queue.
 *
 * @param {Object} data - { notificationId, userId, type, title, message, data }
 * @returns {Promise<import('bullmq').Job>}
 */
const addNotificationJob = async (data) => {
  const job = await notificationQueue.add('send-notification', data, {
    priority: data.type === 'EMAIL' ? 1 : 2,
  });

  return job;
};

module.exports = { notificationQueue, addNotificationJob };
