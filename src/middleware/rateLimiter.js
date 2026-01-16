const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');
const env = require('../config/env');

/**
 * Redis Store for express-rate-limit v8
 * Custom implementation using ioredis client
 */
class RedisStore {
  constructor(options = {}) {
    this.client = options.client;
    this.prefix = options.prefix || 'rl:';
    this.windowMs = options.windowMs;
  }

  async increment(key) {
    const prefixedKey = `${this.prefix}${key}`;
    const current = await this.client.incr(prefixedKey);

    if (current === 1) {
      // First request, set expiry
      await this.client.pexpire(prefixedKey, this.windowMs);
    }

    // Get TTL to calculate resetTime
    const ttl = await this.client.pttl(prefixedKey);
    const resetTime = ttl > 0 ? new Date(Date.now() + ttl) : undefined;

    return {
      totalHits: current,
      resetTime,
    };
  }

  async decrement(key) {
    const prefixedKey = `${this.prefix}${key}`;
    await this.client.decr(prefixedKey);
  }

  async resetKey(key) {
    const prefixedKey = `${this.prefix}${key}`;
    await this.client.del(prefixedKey);
  }
}

/**
 * Rate limiter instance (initialized after Redis connects)
 */
let rateLimiterInstance = null;

/**
 * Initialize rate limiter with Redis store
 * Should be called after Redis connection is established
 */
const initializeRateLimiter = () => {
  try {
    const redisClient = getRedisClient();
    const windowMs = env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000;

    rateLimiterInstance = rateLimit({
      // Redis store for distributed rate limiting
      store: new RedisStore({
        client: redisClient,
        prefix: 'rl:',
        windowMs,
      }),

      // Rate limit window: 15 minutes
      windowMs,

      // Max requests per window
      max: env.RATE_LIMIT_MAX_REQUESTS || 100,

      // Return rate limit info in headers
      standardHeaders: true, // Return rate limit info in RateLimit-* headers
      legacyHeaders: false, // Disable X-RateLimit-* headers

      // Skip rate limiting for certain conditions (optional)
      skip: (req) => {
        // Skip rate limiting for health check endpoint
        return req.path === '/health';
      },

      // Handler when rate limit is exceeded
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          message: 'Too many requests from this IP, please try again later.',
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
          },
          timestamp: new Date().toISOString(),
        });
      },

      // Disable validation warnings in production
      validate: {
        validationsConfig: false,
      },
    });

    console.log('✅ Rate limiter initialized with Redis store');
    return rateLimiterInstance;
  } catch (error) {
    console.error('❌ Failed to initialize rate limiter:', error.message);
    console.warn('⚠️  Rate limiting disabled - Redis connection required');
    return null;
  }
};

/**
 * Create rate limiter middleware with Redis store
 *
 * Standard rate limiting configuration:
 * - 100 requests per 15 minutes per IP address
 * - Stores data in Redis for distributed rate limiting
 * - Returns 429 Too Many Requests when limit exceeded
 *
 * Note: Call initializeRateLimiter() after Redis connects in server.js
 *
 * This middleware dynamically checks if the rate limiter is initialized
 * on each request, so it works even if initialized after app startup.
 */
const createRateLimiter = () => {
  return (req, res, next) => {
    // Check if rate limiter is initialized
    if (rateLimiterInstance) {
      // Apply rate limiting
      return rateLimiterInstance(req, res, next);
    }
    // Rate limiter not initialized yet, skip rate limiting
    next();
  };
};

/**
 * Strict rate limiter for sensitive endpoints (login, signup, etc.)
 * - 5 requests per 15 minutes per IP
 */
const createStrictRateLimiter = () => {
  try {
    const redisClient = getRedisClient();
    const windowMs = 15 * 60 * 1000; // 15 minutes

    return rateLimit({
      store: new RedisStore({
        client: redisClient,
        prefix: 'rl:strict:',
        windowMs,
      }),
      windowMs,
      max: 5, // 5 requests per window
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          message: 'Too many attempts from this IP, please try again after 15 minutes.',
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
          },
          timestamp: new Date().toISOString(),
        });
      },
      keyGenerator: (req) => {
        return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
      },
    });
  } catch (error) {
    console.error('❌ Failed to create strict rate limiter:', error.message);
    return (req, res, next) => next();
  }
};

module.exports = {
  createRateLimiter,
  createStrictRateLimiter,
  initializeRateLimiter,
};
