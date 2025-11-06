const queueManager = require('../config/queue');
const bookingWorkers = require('./booking.workers');
const notificationWorkers = require('./notification.workers');
const analyticsWorkers = require('./analytics.workers');
const integrationWorkers = require('./integration.workers');
const env = require('../config/env');

class WorkerManager {
  constructor() {
    this.workers = [];
    this.isRunning = false;
  }

  async startWorkers() {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (this.isRunning) {
      console.log('⚠️ Workers already running');
      return;
    }

    // In development, only start workers if NODE_ENV is production or explicitly enabled
    if (!env.ENABLE_QUEUE_WORKERS) {
      console.log('🔇 Queue workers disabled in development. Set ENABLE_QUEUE_WORKERS=true to enable.');
      this.isRunning = false;
      return;
    }

    console.log('🚀 Starting queue workers...');

    try {
      // Start booking workers (1 concurrent for dev)
      this.startBookingWorkers(1);

      // Start notification workers (1 concurrent for dev)
      this.startNotificationWorkers(1);

      // Start analytics workers (1 concurrent)
      this.startAnalyticsWorkers(1);

      // Start integration workers (1 concurrent for dev)
      this.startIntegrationWorkers(1);

      this.isRunning = true;
      console.log('✅ All queue workers started successfully');

      // Setup graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      console.error('❌ Failed to start workers:', error.message);
      throw error;
    }
  }

  startBookingWorkers(concurrency = 3) {
    const bookingQueue = queueManager.getBookingQueue();

    // Process ServiceTitan job creation
    bookingQueue.process(
      'create-servicetitan-job',
      concurrency,
      bookingWorkers.createServiceTitanJob
    );

    // Process slot confirmation
    bookingQueue.process('confirm-time-slot', concurrency, bookingWorkers.confirmTimeSlot);

    // Process booking validation
    bookingQueue.process('validate-booking', concurrency, bookingWorkers.validateBooking);

    console.log(`📋 Started ${concurrency} booking workers`);
  }

  startNotificationWorkers(concurrency = 2) {
    const notificationQueue = queueManager.getNotificationQueue();

    // Process email notifications
    notificationQueue.process('send-email', concurrency, notificationWorkers.sendEmail);

    // Process SMS notifications
    notificationQueue.process('send-sms', concurrency, notificationWorkers.sendSMS);

    // Process confirmation notifications
    notificationQueue.process(
      'send-confirmation',
      concurrency,
      notificationWorkers.sendConfirmation
    );

    console.log(`📧 Started ${concurrency} notification workers`);
  }

  startAnalyticsWorkers(concurrency = 1) {
    const analyticsQueue = queueManager.getAnalyticsQueue();

    // Process analytics events
    analyticsQueue.process('track-event', concurrency, analyticsWorkers.trackEvent);

    // Process conversion tracking
    analyticsQueue.process('track-conversion', concurrency, analyticsWorkers.trackConversion);

    // Process attribution data
    analyticsQueue.process('process-attribution', concurrency, analyticsWorkers.processAttribution);

    console.log(`📊 Started ${concurrency} analytics workers`);
  }

  startIntegrationWorkers(concurrency = 2) {
    const integrationQueue = queueManager.getIntegrationQueue();

    // Process external API sync
    integrationQueue.process(
      'sync-external-data',
      concurrency,
      integrationWorkers.syncExternalData
    );

    // Process webhook handling
    integrationQueue.process('handle-webhook', concurrency, integrationWorkers.handleWebhook);

    // Process retry failed jobs
    integrationQueue.process('retry-failed-job', concurrency, integrationWorkers.retryFailedJob);

    console.log(`🔗 Started ${concurrency} integration workers`);
  }

  async stopWorkers() {
    if (!this.isRunning) {
      console.log('⚠️ Workers not running');
      return;
    }

    console.log('🛑 Stopping queue workers...');

    try {
      // Close all queues gracefully
      await queueManager.closeAll();

      this.isRunning = false;
      console.log('✅ All workers stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping workers:', error.message);
      throw error;
    }
  }

  async getWorkerStats() {
    if (!this.isRunning) {
      return { running: false };
    }

    try {
      const queueStats = await queueManager.getAllQueueStats();
      const healthCheck = await queueManager.healthCheck();

      return {
        running: true,
        queues: queueStats,
        health: healthCheck,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        running: true,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      try {
        await this.stopWorkers();
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during graceful shutdown:', error.message);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart
  }

  // Health check endpoint helper
  async healthCheck() {
    return await this.getWorkerStats();
  }
}

// Singleton instance
const workerManager = new WorkerManager();

module.exports = workerManager;
