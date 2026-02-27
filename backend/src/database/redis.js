import Redis from 'ioredis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const redis = new Redis(config.redis.url, {
  password: config.redis.password,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis error'));

export default redis;

/**
 * Cache helper: get or compute value.
 * @param {string} key - Cache key
 * @param {number} ttlSeconds - TTL in seconds
 * @param {() => Promise<any>} computeFn - Function to compute value if not cached
 */
export async function cacheGetOrCompute(key, ttlSeconds, computeFn) {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Redis unavailable — fall through to compute
  }
  const value = await computeFn();
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Redis unavailable — skip caching
  }
  return value;
}

/**
 * Simple sliding window rate limiter.
 * Falls open (allows request) if Redis is unavailable.
 * @param {string} key - Rate limit key
 * @param {number} maxCount - Maximum allowed events
 * @param {number} windowSeconds - Window size
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
export async function checkRateLimit(key, maxCount, windowSeconds) {
  try {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    pipeline.zcard(key);
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();
    const currentCount = results[2][1];

    if (currentCount > maxCount) {
      await redis.zremrangebyscore(key, now, now);
      return {
        allowed: false,
        remaining: 0,
        resetIn: windowSeconds,
      };
    }

    return {
      allowed: true,
      remaining: maxCount - currentCount,
      resetIn: windowSeconds,
    };
  } catch {
    // Redis unavailable — fail open (allow the request)
    return { allowed: true, remaining: maxCount, resetIn: windowSeconds };
  }
}
