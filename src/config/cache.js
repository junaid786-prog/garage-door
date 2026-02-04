const { getRedisClient } = require('./redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
  }

  getClient() {
    return getRedisClient();
  }

  // Basic cache operations
  async get(key) {
    try {
      const client = this.getClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache GET error', { key, error });
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      const client = this.getClient();
      const serialized = JSON.stringify(value);

      if (ttl > 0) {
        await client.setex(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }

      return true;
    } catch (error) {
      logger.error('Cache SET error', { key, error });
      return false;
    }
  }

  async del(key) {
    try {
      const client = this.getClient();
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache DEL error', { key, error });
      return false;
    }
  }

  async exists(key) {
    try {
      const client = this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache EXISTS error', { key, error });
      return false;
    }
  }

  // Time slot specific caching
  async cacheTimeSlots(zipCode, date, slots, ttl = 300) {
    // 5 minutes
    const key = `time_slots:${zipCode}:${date}`;
    return await this.set(key, slots, ttl);
  }

  async getTimeSlots(zipCode, date) {
    const key = `time_slots:${zipCode}:${date}`;
    return await this.get(key);
  }

  // Service area caching
  async cacheServiceArea(zipCode, areaData, ttl = 3600) {
    // 1 hour
    const key = `service_area:${zipCode}`;
    return await this.set(key, areaData, ttl);
  }

  async getServiceArea(zipCode) {
    const key = `service_area:${zipCode}`;
    return await this.get(key);
  }

  // Rate limiting
  async checkRateLimit(identifier, limit = 10, window = 60) {
    try {
      const client = this.getClient();
      const key = `rate_limit:${identifier}`;

      const current = await client.incr(key);

      if (current === 1) {
        await client.expire(key, window);
      }

      return {
        allowed: current <= limit,
        count: current,
        remaining: Math.max(0, limit - current),
        resetTime: await client.ttl(key),
      };
    } catch (error) {
      logger.error('Rate limit error', { identifier, error });
      return { allowed: true, count: 0, remaining: limit, resetTime: window };
    }
  }

  // Session caching
  async cacheSession(sessionId, sessionData, ttl = 1800) {
    // 30 minutes
    const key = `session:${sessionId}`;
    return await this.set(key, sessionData, ttl);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.del(key);
  }

  // Pattern-based deletion
  async deletePattern(pattern) {
    try {
      const client = this.getClient();
      const keys = await client.keys(pattern);

      if (keys.length > 0) {
        await client.del(...keys);
      }

      return keys.length;
    } catch (error) {
      logger.error('Cache pattern delete error', { pattern, error });
      return 0;
    }
  }

  // Cache statistics
  async getStats() {
    try {
      const client = this.getClient();
      const info = await client.info('memory');
      const keyspace = await client.info('keyspace');

      return {
        memory: info,
        keyspace,
        connected: true,
      };
    } catch (error) {
      logger.error('Cache stats error', { error });
      return { connected: false, error: error.message };
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
