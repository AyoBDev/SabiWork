// backend/src/utils/redis.js
const Redis = require('ioredis');
const config = require('../config');

const redisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// Railway Redis uses TLS (rediss://) — ioredis needs tls option
if (config.redisUrl && config.redisUrl.startsWith('rediss://')) {
  redisOptions.tls = { rejectUnauthorized: false };
}

const redis = new Redis(config.redisUrl, redisOptions);

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

module.exports = redis;
