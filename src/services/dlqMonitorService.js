const queueManager = require('../config/queue');
const logger = require('../utils/logger');

class DLQMonitorService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    this.thresholds = {
      warning: 20, // Log warning if DLQ has 20+ jobs
      critical: 50, // Log critical alert if DLQ has 50+ jobs
    };
  }

  /**
   * Start monitoring the DLQ
   */
  start() {
    if (this.isRunning) {
      logger.warn('DLQ monitor is already running');
      return;
    }

    logger.info('Starting DLQ monitor', {
      checkInterval: this.checkInterval,
      thresholds: this.thresholds,
    });

    this.isRunning = true;

    // Run initial check
    this.checkDLQ();

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.checkDLQ();
    }, this.checkInterval);
  }

  /**
   * Stop monitoring the DLQ
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('DLQ monitor is not running');
      return;
    }

    logger.info('Stopping DLQ monitor');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  /**
   * Check DLQ status and log alerts
   */
  async checkDLQ() {
    try {
      const stats = await queueManager.getDLQStats();

      // Log status based on thresholds
      if (stats.total >= this.thresholds.critical) {
        logger.error('DLQ critical threshold exceeded', {
          totalJobs: stats.total,
          threshold: this.thresholds.critical,
          byQueue: stats.byQueue,
          byType: stats.byType,
          oldestJob: stats.oldestJob,
        });

        // In production, send critical alerts here:
        // - Send email to ops team
        // - Send Slack notification
        // - Create PagerDuty incident
        // - etc.
      } else if (stats.total >= this.thresholds.warning) {
        logger.warn('DLQ warning threshold exceeded', {
          totalJobs: stats.total,
          threshold: this.thresholds.warning,
          byQueue: stats.byQueue,
          byType: stats.byType,
        });

        // In production, send warning alerts here:
        // - Send email notification
        // - Send Slack message
        // - etc.
      } else if (stats.total > 0) {
        logger.info('DLQ status check', {
          totalJobs: stats.total,
          byQueue: stats.byQueue,
          byType: stats.byType,
        });
      } else {
        logger.debug('DLQ is empty');
      }

      // Check for old jobs in DLQ (jobs older than 24 hours)
      if (stats.oldestJob) {
        const oldestJobDate = new Date(stats.oldestJob);
        const ageInHours = (Date.now() - oldestJobDate.getTime()) / (1000 * 60 * 60);

        if (ageInHours > 24) {
          logger.warn('DLQ has old jobs', {
            oldestJobAge: `${Math.floor(ageInHours)} hours`,
            oldestJobDate: stats.oldestJob,
            totalJobs: stats.total,
          });

          // In production, alert about stale jobs that need attention
        }
      }

      // Check individual queue failed job counts
      const queueStats = await queueManager.getAllQueueStats();
      for (const [queueName, queueStat] of Object.entries(queueStats)) {
        if (queueStat && queueStat.failed > 10) {
          logger.warn('Queue has many failed jobs', {
            queue: queueName,
            failedJobs: queueStat.failed,
            stats: queueStat,
          });
        }
      }
    } catch (error) {
      logger.error('Error checking DLQ status', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Get current monitoring status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      thresholds: this.thresholds,
    };
  }

  /**
   * Update monitoring thresholds
   */
  setThresholds(warning, critical) {
    this.thresholds.warning = warning;
    this.thresholds.critical = critical;

    logger.info('DLQ monitor thresholds updated', {
      thresholds: this.thresholds,
    });
  }

  /**
   * Update check interval
   */
  setCheckInterval(intervalMs) {
    this.checkInterval = intervalMs;

    logger.info('DLQ monitor check interval updated', {
      checkInterval: this.checkInterval,
    });

    // Restart monitoring if it's running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

// Singleton instance
const dlqMonitorService = new DLQMonitorService();

module.exports = dlqMonitorService;
