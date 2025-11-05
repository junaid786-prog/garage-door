const Redis = require('ioredis');

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
            const redisConfig = {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD || undefined,
                db: parseInt(process.env.REDIS_DB || '0'),
                retryDelayOnFailover: 100,
                enableReadyCheck: true,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                connectTimeout: 10000,
                commandTimeout: 5000,
                family: 4,
                keepAlive: 30000
            };

            this.client = new Redis(redisConfig);

            this.client.on('connect', () => {
                console.log('✅ Redis connected successfully');
                this.isConnected = true;
            });

            this.client.on('error', (err) => {
                console.error('❌ Redis connection error:', err.message);
                this.isConnected = false;
            });

            this.client.on('close', () => {
                console.log('🔌 Redis connection closed');
                this.isConnected = false;
            });

            this.client.on('reconnecting', () => {
                console.log('🔄 Redis reconnecting...');
            });

            await this.client.connect();
            
            // Test connection
            await this.client.ping();
            
            return this.client;
        } catch (error) {
            console.error('❌ Failed to connect to Redis:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            this.isConnected = false;
            console.log('🔌 Redis disconnected');
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
            console.error('Redis health check failed:', error.message);
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
    redisHealthCheck: () => redisConnection.healthCheck()
};