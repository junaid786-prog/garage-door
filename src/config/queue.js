const Queue = require('bull');
const env = require('./env');
const logger = require('../utils/logger');

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
        logger.error('Queue error', { queueName, error });
      });

      this.queues[queueName].on('waiting', (jobId) => {
        logger.debug('Job waiting', { jobId, queueName });
      });

      this.queues[queueName].on('active', (job) => {
        logger.debug('Job started', { jobId: job.id, queueName });
      });

      this.queues[queueName].on('completed', (job, _result) => {
        logger.info('Job completed', { jobId: job.id, queueName });
      });

      this.queues[queueName].on('failed', async (job, err) => {
        logger.error('Job failed', {
          jobId: job.id,
          queueName,
          error: err,
          attemptsMade: job.attemptsMade,
        });

        // Move to DLQ if max retries exceeded
        if (job.attemptsMade >= job.opts.attempts) {
          await this.moveToDLQ(queueName, job, err);
        }
      });

      this.queues[queueName].on('stalled', (job) => {
        logger.warn('Job stalled', { jobId: job.id, queueName });
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
      logger.debug('Job added to queue', { jobId: job.id, queueName, jobType });
      return job;
    } catch (error) {
      logger.error('Failed to add job to queue', { queueName, error });
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
      logger.error('Error getting queue stats', { queueName, error });
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
      logger.info('Queue cleaned', { queueName });
    } catch (error) {
      logger.error('Error cleaning queue', { queueName, error });
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
    logger.info('Queue paused', { queueName });
  }

  async resumeQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.resume();
    logger.info('Queue resumed', { queueName });
  }

  // Graceful shutdown
  async closeAll() {
    logger.info('Closing all queues');

    for (const [queueName, queue] of Object.entries(this.queues)) {
      try {
        await queue.close();
        logger.info('Queue closed', { queueName });
      } catch (error) {
        logger.error('Error closing queue', { queueName, error });
      }
    }

    this.queues = {};
    logger.info('All queues closed');
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

  // Dead Letter Queue (DLQ) methods
  getDLQ() {
    return this.getQueue('dead-letter-queue');
  }

  async moveToDLQ(sourceQueue, job, error) {
    try {
      const dlq = this.getDLQ();

      // Store failed job data with metadata
      const dlqJobData = {
        originalQueue: sourceQueue,
        originalJobId: job.id,
        originalJobType: job.name,
        jobData: job.data,
        failureReason: error.message,
        stackTrace: error.stack,
        attemptsMade: job.attemptsMade,
        failedAt: new Date().toISOString(),
        retryHistory: job.returnvalue || [],
      };

      await dlq.add('failed-job', dlqJobData, {
        removeOnComplete: false, // Keep in DLQ permanently until manually removed
        removeOnFail: false,
      });

      logger.warn('Job moved to DLQ', {
        jobId: job.id,
        queue: sourceQueue,
        error: error.message,
        attemptsMade: job.attemptsMade,
      });

      // Check DLQ size and alert if threshold exceeded
      await this.checkDLQThreshold();
    } catch (err) {
      logger.error('Failed to move job to DLQ', {
        jobId: job.id,
        queue: sourceQueue,
        error: err.message,
      });
    }
  }

  async getDLQJobs(start = 0, end = -1) {
    try {
      const dlq = this.getDLQ();
      const jobs = await dlq.getJobs(
        ['completed', 'waiting', 'active', 'delayed', 'failed'],
        start,
        end
      );

      return Promise.all(
        jobs.map(async (job) => ({
          id: job.id,
          originalQueue: job.data.originalQueue,
          originalJobId: job.data.originalJobId,
          originalJobType: job.data.originalJobType,
          jobData: job.data.jobData,
          failureReason: job.data.failureReason,
          attemptsMade: job.data.attemptsMade,
          failedAt: job.data.failedAt,
          status: await job.getState(),
        }))
      );
    } catch (error) {
      logger.error('Error getting DLQ jobs', { error });
      throw error;
    }
  }

  async getFailedJobs(queueName, start = 0, end = -1) {
    try {
      const queue = this.getQueue(queueName);
      const failed = await queue.getFailed(start, end);

      return failed.map((job) => ({
        id: job.id,
        type: job.name,
        data: job.data,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        stackTrace: job.stacktrace,
      }));
    } catch (error) {
      logger.error('Error getting failed jobs', { queueName, error });
      throw error;
    }
  }

  async retryJobFromDLQ(dlqJobId) {
    try {
      const dlq = this.getDLQ();
      const dlqJob = await dlq.getJob(dlqJobId);

      if (!dlqJob) {
        throw new Error(`DLQ job ${dlqJobId} not found`);
      }

      const jobData = await dlqJob.toJSON();
      const { originalQueue, originalJobType, jobData: originalJobData } = jobData.data;

      // Re-queue the job to original queue with reduced retries
      await this.addJob(originalQueue, originalJobType, originalJobData, {
        attempts: 2, // Give it 2 more attempts
        backoff: {
          type: 'exponential',
          delay: 5000, // 5 second initial delay
        },
      });

      // Mark the DLQ job as completed (retried)
      await dlqJob.remove();

      logger.info('Job retried from DLQ', {
        dlqJobId,
        originalQueue,
        originalJobType,
      });

      return {
        success: true,
        message: 'Job requeued successfully',
        originalQueue,
        originalJobType,
      };
    } catch (error) {
      logger.error('Error retrying job from DLQ', { dlqJobId, error });
      throw error;
    }
  }

  async getDLQStats() {
    try {
      const dlq = this.getDLQ();
      const jobs = await this.getDLQJobs();

      // Group by original queue
      const byQueue = jobs.reduce((acc, job) => {
        acc[job.originalQueue] = (acc[job.originalQueue] || 0) + 1;
        return acc;
      }, {});

      // Group by job type
      const byType = jobs.reduce((acc, job) => {
        acc[job.originalJobType] = (acc[job.originalJobType] || 0) + 1;
        return acc;
      }, {});

      return {
        total: jobs.length,
        byQueue,
        byType,
        oldestJob: jobs.length > 0 ? jobs[jobs.length - 1].failedAt : null,
        newestJob: jobs.length > 0 ? jobs[0].failedAt : null,
      };
    } catch (error) {
      logger.error('Error getting DLQ stats', { error });
      throw error;
    }
  }

  async checkDLQThreshold() {
    try {
      const stats = await this.getDLQStats();
      const threshold = 50; // Alert if more than 50 jobs in DLQ

      if (stats.total > threshold) {
        logger.warn('DLQ threshold exceeded', {
          currentSize: stats.total,
          threshold,
          byQueue: stats.byQueue,
        });

        // In production, you would send alerts here (email, Slack, PagerDuty, etc.)
        // For now, we just log a warning
      }
    } catch (error) {
      logger.error('Error checking DLQ threshold', { error });
    }
  }

  async removeDLQJob(dlqJobId) {
    try {
      const dlq = this.getDLQ();
      const job = await dlq.getJob(dlqJobId);

      if (!job) {
        throw new Error(`DLQ job ${dlqJobId} not found`);
      }

      await job.remove();

      logger.info('Job removed from DLQ', { dlqJobId });

      return { success: true, message: 'Job removed from DLQ' };
    } catch (error) {
      logger.error('Error removing DLQ job', { dlqJobId, error });
      throw error;
    }
  }
}

// Singleton instance
const queueManager = new QueueManager();

module.exports = queueManager;
