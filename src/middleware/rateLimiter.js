const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');
const env = require('../config/env');
const logger = require('../utils/logger');

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
    try {
      if (!this.client) {
        throw new Error('Redis client not available');
      }

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
    } catch (error) {
      // If Redis is down, allow the request through (fail open)
      logger.warn('Rate limiter Redis error - allowing request', { error: error.message });
      return {
        totalHits: 0,
        resetTime: undefined,
      };
    }
  }

  async decrement(key) {
    try {
      if (!this.client) return;
      const prefixedKey = `${this.prefix}${key}`;
      await this.client.decr(prefixedKey);
    } catch (error) {
      logger.warn('Rate limiter decrement error', { error: error.message });
    }
  }

  async resetKey(key) {
    try {
      if (!this.client) return;
      const prefixedKey = `${this.prefix}${key}`;
      await this.client.del(prefixedKey);
    } catch (error) {
      logger.warn('Rate limiter reset error', { error: error.message });
    }
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

    logger.info('Rate limiter initialized with Redis store');
    return rateLimiterInstance;
  } catch (error) {
    logger.error('Failed to initialize rate limiter', { error });
    logger.warn('Rate limiting disabled - Redis connection required');
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
    logger.error('Failed to create strict rate limiter', { error });
    return (req, res, next) => next();
  }
};

/**
 * Create endpoint-specific rate limiter
 * @param {number} max - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {string} prefix - Redis key prefix (default: 'rl:endpoint:')
 * @returns {Function} Rate limiter middleware
 */
const createEndpointRateLimiter = (max, windowMs = 15 * 60 * 1000, prefix = 'rl:endpoint:') => {
  try {
    const redisClient = getRedisClient();

    if (!redisClient) {
      logger.warn('Redis not available - endpoint rate limiting disabled');
      return (req, res, next) => next();
    }

    return rateLimit({
      store: new RedisStore({
        client: redisClient,
        prefix,
        windowMs,
      }),
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          success: false,
          message: `Too many requests to this endpoint from this IP, please try again later.`,
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
    logger.error('Failed to create endpoint rate limiter', { error });
    return (req, res, next) => next();
  }
};

/**
 * Booking endpoint rate limiter
 * - 10 requests per 15 minutes per IP (stricter than general limit)
 */
const bookingRateLimiter = () => createEndpointRateLimiter(10, 15 * 60 * 1000, 'rl:booking:');

/**
 * Read endpoint rate limiter
 * - 100 requests per 15 minutes per IP
 */
const readRateLimiter = () => createEndpointRateLimiter(100, 15 * 60 * 1000, 'rl:read:');

module.exports = {
  createRateLimiter,
  createStrictRateLimiter,
  createEndpointRateLimiter,
  bookingRateLimiter,
  readRateLimiter,
  initializeRateLimiter,
};
