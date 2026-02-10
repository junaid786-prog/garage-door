const serviceTitanService = require('./service');

/**
 * ServiceTitan job processor for queue system
 * Handles background processing of ServiceTitan operations with retry logic
 */
class ServiceTitanJobProcessor {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Process ServiceTitan job creation from queue
   * @param {Object} job - Queue job data
   * @returns {Promise<Object>} Job processing result
   */
  async processJobCreation(job) {
    const { bookingData, attempt = 1 } = job.data;

    try {
      logger.info(
        `[ServiceTitan] Processing job creation (attempt ${attempt}/${this.maxRetries})`,
        {
          bookingId: bookingData.bookingId,
          customer: `${bookingData.firstName} ${bookingData.lastName}`,
          problemType: bookingData.problemType,
        }
      );

      // Authenticate with ServiceTitan
      await serviceTitanService.authenticate();

      // Create the job
      const serviceTitanJob = await serviceTitanService.createJob(bookingData);

      // Log success
      logger.info('[ServiceTitan] Job created successfully:', {
        serviceTitanJobId: serviceTitanJob.id,
        jobNumber: serviceTitanJob.jobNumber,
        bookingId: bookingData.bookingId,
        status: serviceTitanJob.status,
      });

      // Return success result for queue
      return {
        success: true,
        serviceTitanJob,
        attempt,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`[ServiceTitan] Job creation failed (attempt ${attempt}):`, {
        error: error.message,
        bookingId: bookingData.bookingId,
        willRetry: attempt < this.maxRetries,
      });

      // Determine if we should retry
      const shouldRetry = attempt < this.maxRetries && this._isRetryableError(error);

      if (shouldRetry) {
        // Calculate exponential backoff delay
        const delay = this.retryDelay * Math.pow(2, attempt - 1);

        throw new Error(
          `ServiceTitan job creation failed (attempt ${attempt}/${this.maxRetries}): ${error.message}. Retrying in ${delay}ms`
        );
      } else {
        // Final failure - log and handle gracefully
        logger.error('[ServiceTitan] Job creation failed permanently:', {
          error: error.message,
          bookingId: bookingData.bookingId,
          attempts: attempt,
        });

        // In real implementation, you might want to:
        // 1. Save to dead letter queue
        // 2. Send alert to administrators
        // 3. Create manual follow-up task

        return {
          success: false,
          error: error.message,
          attempt,
          finalFailure: true,
          failedAt: new Date().toISOString(),
        };
      }
    }
  }

  /**
   * Process ServiceTitan job status update from queue
   * @param {Object} job - Queue job data
   * @returns {Promise<Object>} Job processing result
   */
  async processJobStatusUpdate(job) {
    const { jobId, status, attempt = 1 } = job.data;

    try {
      logger.info(
        `[ServiceTitan] Processing status update (attempt ${attempt}/${this.maxRetries})`,
        {
          jobId,
          status,
        }
      );

      const updatedJob = await serviceTitanService.updateJobStatus(jobId, status);

      logger.info('[ServiceTitan] Status updated successfully:', {
        jobId,
        oldStatus: updatedJob.status,
        newStatus: status,
      });

      return {
        success: true,
        updatedJob,
        attempt,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`[ServiceTitan] Status update failed (attempt ${attempt}):`, {
        error: error.message,
        jobId,
        status,
        willRetry: attempt < this.maxRetries,
      });

      const shouldRetry = attempt < this.maxRetries && this._isRetryableError(error);

      if (shouldRetry) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        throw new Error(
          `ServiceTitan status update failed (attempt ${attempt}/${this.maxRetries}): ${error.message}. Retrying in ${delay}ms`
        );
      } else {
        return {
          success: false,
          error: error.message,
          attempt,
          finalFailure: true,
          failedAt: new Date().toISOString(),
        };
      }
    }
  }

  /**
   * Process ServiceTitan job cancellation from queue
   * @param {Object} job - Queue job data
   * @returns {Promise<Object>} Job processing result
   */
  async processJobCancellation(job) {
    const { jobId, reason, attempt = 1 } = job.data;

    try {
      logger.info(
        `[ServiceTitan] Processing job cancellation (attempt ${attempt}/${this.maxRetries})`,
        {
          jobId,
          reason,
        }
      );

      const cancelledJob = await serviceTitanService.cancelJob(jobId, reason);

      logger.info('[ServiceTitan] Job cancelled successfully:', {
        jobId,
        reason: cancelledJob.cancellationReason,
        cancelledAt: cancelledJob.cancelledAt,
      });

      return {
        success: true,
        cancelledJob,
        attempt,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`[ServiceTitan] Job cancellation failed (attempt ${attempt}):`, {
        error: error.message,
        jobId,
        reason,
        willRetry: attempt < this.maxRetries,
      });

      const shouldRetry = attempt < this.maxRetries && this._isRetryableError(error);

      if (shouldRetry) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        throw new Error(
          `ServiceTitan job cancellation failed (attempt ${attempt}/${this.maxRetries}): ${error.message}. Retrying in ${delay}ms`
        );
      } else {
        return {
          success: false,
          error: error.message,
          attempt,
          finalFailure: true,
          failedAt: new Date().toISOString(),
        };
      }
    }
  }

  /**
   * Process ServiceTitan health check from queue
   * @param {Object} job - Queue job data
   * @returns {Promise<Object>} Job processing result
   */
  async processHealthCheck(job) {
    try {
      logger.info('[ServiceTitan] Processing health check');

      const health = await serviceTitanService.getHealthStatus();

      logger.info('[ServiceTitan] Health check completed:', {
        status: health.status,
        jobsCreated: health.jobsCreated,
      });

      return {
        success: true,
        health,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('[ServiceTitan] Health check failed:', {
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        failedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Determine if an error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Whether the error is retryable
   */
  _isRetryableError(error) {
    const retryableErrors = [
      'temporarily unavailable',
      'timeout',
      'network error',
      'connection refused',
      'ECONNRESET',
      'ETIMEDOUT',
      'Service Unavailable',
      '503',
      '502',
      '500',
    ];

    const nonRetryableErrors = [
      'Authentication failed',
      'Invalid API key',
      'Invalid tenant ID',
      'Missing required field',
      'Invalid phone number format',
      'Invalid email format',
      'Invalid ZIP code format',
      'Customer already exists',
      'Service area not supported',
      'Invalid status',
      'Cannot cancel completed job',
      'not found',
    ];

    // Check for non-retryable errors first
    if (
      nonRetryableErrors.some((errorText) =>
        error.message.toLowerCase().includes(errorText.toLowerCase())
      )
    ) {
      return false;
    }

    // Check for retryable errors
    if (
      retryableErrors.some((errorText) =>
        error.message.toLowerCase().includes(errorText.toLowerCase())
      )
    ) {
      return true;
    }

    // Default: retry unknown errors (could be temporary)
    return true;
  }

  /**
   * Get job processor statistics
   * @returns {Object} Processor statistics
   */
  getStats() {
    return {
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      processorVersion: '1.0.0',
      supportedJobs: [
        'servicetitan-job-creation',
        'servicetitan-status-update',
        'servicetitan-job-cancellation',
        'servicetitan-health-check',
      ],
    };
  }
}

module.exports = new ServiceTitanJobProcessor();
