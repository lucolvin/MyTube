const Redis = require('ioredis');
const logger = require('../utils/logger');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => {
  logger.error('Redis error:', err);
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

module.exports = redis;
