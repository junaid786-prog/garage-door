const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

class RedisConnection {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected && this.client) {
      return this.client;
    }

    try {
      const isCloudRedis =
        env.REDIS_URL || (env.REDIS_HOST && !env.REDIS_HOST.includes('localhost'));

      const redisConfig = {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
        db: env.REDIS_DB,
        retryDelayOnFailover: 500,
        enableReadyCheck: true,
        maxRetriesPerRequest: 5,
        retryDelayOnClusterDown: 300,
        lazyConnect: true,
        connectTimeout: 60000,
        commandTimeout: 30000,
        family: 4,
        keepAlive: 30000,
        // Cloud Redis specific settings
        ...(isCloudRedis && {
          tls: {
            rejectUnauthorized: false,
          },
          connectTimeout: 60000,
          lazyConnect: true,
          maxRetriesPerRequest: null,
          retryDelayOnFailover: 1000,
          enableOfflineQueue: false,
        }),
      };

      // Use Redis URL if provided (common for cloud providers)
      if (env.REDIS_URL) {
        this.client = new Redis(env.REDIS_URL, {
          connectTimeout: 60000,
          lazyConnect: true,
          maxRetriesPerRequest: null,
          retryDelayOnFailover: 1000,
          enableOfflineQueue: false,
          tls: {
            rejectUnauthorized: false,
          },
        });
      } else {
        this.client = new Redis(redisConfig);
      }

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        logger.error('Redis connection error', { error: err });
        this.isConnected = false;
      });

      this.client.on('close', () => {
        logger.info('Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis reconnecting');
      });

      await this.client.connect();

      // Test connection
      await this.client.ping();

      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }

  getClient() {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client not connected. Call connect() first.');
    }
    return this.client;
  }

  async healthCheck() {
    try {
      if (!this.client) return false;
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  }
}

// Singleton instance
const redisConnection = new RedisConnection();

module.exports = {
  redisConnection,
  getRedisClient: () => redisConnection.getClient(),
  connectRedis: () => redisConnection.connect(),
  disconnectRedis: () => redisConnection.disconnect(),
  redisHealthCheck: () => redisConnection.healthCheck(),
};
