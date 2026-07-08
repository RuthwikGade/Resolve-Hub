const Redis = require('ioredis');
const env = require('./env');

const redisConfig = {
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times) => {
    if (times > 10) {
      console.error('Redis: Max retry attempts reached');
      return null;
    }
    return Math.min(times * 200, 5000);
  },
};

// Main Redis client for general use
const redis = new Redis(redisConfig);

redis.on('connect', () => {
  if (env.isDev) {
    console.log('🔴 Redis client connected');
  }
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

/**
 * Create a new Redis connection (needed for BullMQ workers).
 * Each BullMQ worker needs its own connection.
 */
const createRedisConnection = () => new Redis(redisConfig);

module.exports = { redis, createRedisConnection, redisConfig };
