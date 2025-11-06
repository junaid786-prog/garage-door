const Queue = require('bull');
const env = require('./env');

class QueueManager {
  constructor() {
    this.queues = {};

    // Check if using cloud Redis (Upstash or similar)
    const isCloudRedis = env.REDIS_URL || (env.REDIS_HOST && !env.REDIS_HOST.includes('localhost'));

    this.redisConfig = {
      redis: {
        port: env.REDIS_PORT,
        host: env.REDIS_HOST,
        password: env.REDIS_PASSWORD,
        db: env.REDIS_QUEUE_DB,
        connectTimeout: 60000,
        lazyConnect: false,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 1000,
        enableOfflineQueue: true,
        // Add TLS for cloud Redis providers
        ...(isCloudRedis && {
          tls: {
            rejectUnauthorized: false,
          },
        }),
      },
    };

    // Use Redis URL if provided (for cloud providers like Upstash)
    if (env.REDIS_URL) {
      this.redisConfig = {
        redis: {
          port: env.REDIS_PORT,
          host: env.REDIS_HOST,
          password: env.REDIS_PASSWORD,
          db: env.REDIS_QUEUE_DB,
          connectTimeout: 60000,
          lazyConnect: false,
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 1000,
          enableOfflineQueue: true,
          tls: {
            rejectUnauthorized: false,
          },
        },
      };
    }
  }

  // Create or get existing queue
  getQueue(queueName) {
    if (!this.queues[queueName]) {
      // Add settings to reduce Redis polling
      const queueSettings = {
        ...this.redisConfig,
        settings: {
          stalledInterval: 60 * 1000, // Check for stalled jobs every 60s (vs 30s default)
          maxStalledCount: 1, // Max stalled count before failed
          retryProcessDelay: 5000, // Delay before retrying failed process
          backoffStrategies: {},
          delayedDebounce: 5000, // Debounce delayed jobs (5s vs 1s default)
        },
      };

      this.queues[queueName] = new Queue(queueName, queueSettings);

      // Queue event handlers
      this.queues[queueName].on('error', (error) => {
        console.log(error);

        console.error(`❌ Queue ${queueName} error:`, error.message);
      });

      this.queues[queueName].on('waiting', (jobId) => {
        console.log(`⏳ Job ${jobId} waiting in ${queueName}`);
      });

      this.queues[queueName].on('active', (job) => {
        console.log(`🚀 Job ${job.id} started in ${queueName}`);
      });

      this.queues[queueName].on('completed', (job, _result) => {
        console.log(`✅ Job ${job.id} completed in ${queueName}`);
      });

      this.queues[queueName].on('failed', (job, err) => {
        console.error(`❌ Job ${job.id} failed in ${queueName}:`, err.message);
      });

      this.queues[queueName].on('stalled', (job) => {
        console.warn(`⚠️ Job ${job.id} stalled in ${queueName}`);
      });
    }

    return this.queues[queueName];
  }

  // Booking processing queue (highest priority)
  getBookingQueue() {
    return this.getQueue('booking-processing');
  }

  // Notifications queue (high priority)
  getNotificationQueue() {
    return this.getQueue('notifications');
  }

  // Analytics queue (low priority)
  getAnalyticsQueue() {
    return this.getQueue('analytics');
  }

  // Integration queue (medium priority)
  getIntegrationQueue() {
    return this.getQueue('integrations');
  }

  // Add job to queue with priority and options
  async addJob(queueName, jobType, data, options = {}) {
    const queue = this.getQueue(queueName);

    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    };

    const jobOptions = { ...defaultOptions, ...options };

    try {
      const job = await queue.add(jobType, data, jobOptions);
      console.log(`📋 Job ${job.id} added to ${queueName}: ${jobType}`);
      return job;
    } catch (error) {
      console.error(`Failed to add job to ${queueName}:`, error.message);
      throw error;
    }
  }

  // Booking-specific job methods
  async addBookingJob(jobType, bookingData, priority = 'high') {
    const options = {
      priority: priority === 'critical' ? 1 : priority === 'high' ? 5 : 10,
      attempts: 5,
      delay: 0,
    };

    return await this.addJob('booking-processing', jobType, bookingData, options);
  }

  async addNotificationJob(jobType, notificationData, delay = 0) {
    const options = {
      priority: 5,
      attempts: 3,
      delay,
    };

    return await this.addJob('notifications', jobType, notificationData, options);
  }

  async addAnalyticsJob(jobType, analyticsData) {
    const options = {
      priority: 20,
      attempts: 2,
      delay: 5000, // 5 second delay for analytics
    };

    return await this.addJob('analytics', jobType, analyticsData, options);
  }

  async addIntegrationJob(jobType, integrationData, attempts = 3) {
    const options = {
      priority: 10,
      attempts,
      delay: 1000,
    };

    return await this.addJob('integrations', jobType, integrationData, options);
  }

  // Queue management methods
  async getQueueStats(queueName) {
    const queue = this.getQueue(queueName);

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed(),
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };
    } catch (error) {
      console.error(`Error getting stats for ${queueName}:`, error.message);
      return null;
    }
  }

  async getAllQueueStats() {
    const stats = {};

    for (const queueName of Object.keys(this.queues)) {
      stats[queueName] = await this.getQueueStats(queueName);
    }

    return stats;
  }

  // Clean completed/failed jobs
  async cleanQueue(queueName, grace = 24 * 60 * 60 * 1000) {
    // 24 hours
    const queue = this.getQueue(queueName);

    try {
      await queue.clean(grace, 'completed');
      await queue.clean(grace, 'failed');
      console.log(`🧹 Cleaned queue ${queueName}`);
    } catch (error) {
      console.error(`Error cleaning queue ${queueName}:`, error.message);
    }
  }

  async cleanAllQueues() {
    for (const queueName of Object.keys(this.queues)) {
      await this.cleanQueue(queueName);
    }
  }

  // Pause/Resume queues
  async pauseQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.pause();
    console.log(`⏸️ Queue ${queueName} paused`);
  }

  async resumeQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.resume();
    console.log(`▶️ Queue ${queueName} resumed`);
  }

  // Graceful shutdown
  async closeAll() {
    console.log('🔄 Closing all queues...');

    for (const [queueName, queue] of Object.entries(this.queues)) {
      try {
        await queue.close();
        console.log(`✅ Queue ${queueName} closed`);
      } catch (error) {
        console.error(`❌ Error closing queue ${queueName}:`, error.message);
      }
    }

    this.queues = {};
    console.log('🔌 All queues closed');
  }

  // Health check
  async healthCheck() {
    try {
      const stats = await this.getAllQueueStats();
      return {
        healthy: true,
        queues: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Singleton instance
const queueManager = new QueueManager();

module.exports = queueManager;
