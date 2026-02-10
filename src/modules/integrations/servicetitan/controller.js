const service = require('./service');
const APIResponse = require('../../../utils/response');

/**
 * ServiceTitan integration controller
 * Handles ServiceTitan API requests and job management
 */
class ServiceTitanController {
  /**
   * Test ServiceTitan authentication
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async testAuth(req, res, next) {
    try {
      const authResult = await service.authenticate();
      return APIResponse.success(res, authResult, 'ServiceTitan authentication successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a job in ServiceTitan
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async createJob(req, res, next) {
    try {
      const bookingData = req.body;

      if (!bookingData) {
        return APIResponse.badRequest(res, 'Booking data is required');
      }

      // Authenticate first (in real implementation, this would use cached tokens)
      await service.authenticate();

      // Create the job
      const job = await service.createJob(bookingData);

      return APIResponse.created(res, job, 'ServiceTitan job created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get job by ID
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getJob(req, res, next) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return APIResponse.badRequest(res, 'Job ID is required');
      }

      const job = await service.getJob(jobId);
      return APIResponse.success(res, job, 'Job retrieved successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return APIResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Update job status
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async updateJobStatus(req, res, next) {
    try {
      const { jobId } = req.params;
      const { status } = req.body;

      if (!jobId) {
        return APIResponse.badRequest(res, 'Job ID is required');
      }

      if (!status) {
        return APIResponse.badRequest(res, 'Status is required');
      }

      const updatedJob = await service.updateJobStatus(jobId, status);
      return APIResponse.success(res, updatedJob, 'Job status updated successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return APIResponse.notFound(res, error.message);
      }
      if (error.message.includes('Invalid status')) {
        return APIResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Get jobs by date range
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getJobsByDateRange(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return APIResponse.badRequest(res, 'Start date and end date are required');
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return APIResponse.badRequest(res, 'Invalid date format');
      }

      if (start > end) {
        return APIResponse.badRequest(res, 'Start date cannot be after end date');
      }

      const jobs = await service.getJobsByDateRange(start, end);
      return APIResponse.success(res, jobs, `Found ${jobs.length} jobs in date range`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a job
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async cancelJob(req, res, next) {
    try {
      const { jobId } = req.params;
      const { reason } = req.body;

      if (!jobId) {
        return APIResponse.badRequest(res, 'Job ID is required');
      }

      const cancelledJob = await service.cancelJob(jobId, reason);
      return APIResponse.success(res, cancelledJob, 'Job cancelled successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return APIResponse.notFound(res, error.message);
      }
      if (error.message.includes('Cannot cancel')) {
        return APIResponse.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * Get ServiceTitan health status
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getHealth(req, res, next) {
    try {
      const health = await service.getHealthStatus();
      return APIResponse.success(res, health, 'ServiceTitan health status retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Webhook endpoint for ServiceTitan status updates
   * (For future real implementation)
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async webhook(req, res, next) {
    try {
      const webhookData = req.body;

      // Log webhook for now (in real implementation, process status updates)
      logger.info('ServiceTitan webhook received:', {
        type: webhookData.type,
        jobId: webhookData.jobId,
        status: webhookData.status,
        timestamp: webhookData.timestamp,
      });

      // Acknowledge webhook
      return APIResponse.success(res, { received: true }, 'Webhook processed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch job creation for multiple bookings
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async createBatchJobs(req, res, next) {
    try {
      const { bookings } = req.body;

      if (!Array.isArray(bookings) || bookings.length === 0) {
        return APIResponse.badRequest(res, 'Bookings array is required');
      }

      if (bookings.length > 100) {
        return APIResponse.badRequest(res, 'Maximum 100 bookings per batch');
      }

      // Authenticate once for batch
      await service.authenticate();

      const results = [];
      const errors = [];

      // Process each booking
      for (let i = 0; i < bookings.length; i++) {
        try {
          const job = await service.createJob(bookings[i]);
          results.push({
            index: i,
            success: true,
            job,
          });
        } catch (error) {
          errors.push({
            index: i,
            success: false,
            error: error.message,
            booking: bookings[i],
          });
        }
      }

      return APIResponse.success(
        res,
        {
          successful: results.length,
          failed: errors.length,
          results,
          errors,
        },
        `Batch job creation completed: ${results.length} successful, ${errors.length} failed`
      );
    } catch (error) {
      next(error);
    }
  }
}

const controller = new ServiceTitanController();
module.exports = {
  testAuth: controller.testAuth.bind(controller),
  createJob: controller.createJob.bind(controller),
  getJob: controller.getJob.bind(controller),
  updateJobStatus: controller.updateJobStatus.bind(controller),
  getJobsByDateRange: controller.getJobsByDateRange.bind(controller),
  cancelJob: controller.cancelJob.bind(controller),
  getHealth: controller.getHealth.bind(controller),
  webhook: controller.webhook.bind(controller),
  createBatchJobs: controller.createBatchJobs.bind(controller),
};
