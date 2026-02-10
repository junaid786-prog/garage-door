const logger = require('../utils/logger');
const serviceTitanIntegration = require('../modules/integrations/servicetitan/integration');
const schedulingService = require('../modules/scheduling/service');
const Booking = require('../database/models/Booking');
const errorLogService = require('../services/errorLogService');

const createServiceTitanJob = async (job) => {
  const { bookingId, bookingData } = job.data;

  try {
    logger.info('Processing ServiceTitan job creation', { bookingId, jobId: job.id });

    // Call real ServiceTitan integration
    const result = await serviceTitanIntegration.createJobFromBooking(bookingData);

    if (result.success) {
      // Update booking with ServiceTitan job info
      await Booking.update(
        {
          serviceTitanJobId: result.serviceTitanJobId,
          serviceTitanJobNumber: result.jobNumber,
          serviceTitanStatus: result.status,
          serviceTitanError: null, // Clear any previous errors
        },
        {
          where: { id: bookingId },
        }
      );

      logger.info('ServiceTitan job created successfully', {
        bookingId,
        serviceTitanJobId: result.serviceTitanJobId,
        jobNumber: result.jobNumber,
        jobId: job.id,
      });

      return {
        success: true,
        serviceTitanJobId: result.serviceTitanJobId,
        jobNumber: result.jobNumber,
      };
    } else {
      // Update booking with error status
      await Booking.update(
        {
          serviceTitanStatus: 'failed',
          serviceTitanError: result.error,
        },
        {
          where: { id: bookingId },
        }
      );

      // Log critical failure to error_logs table
      await errorLogService.logError({
        errorType: 'SERVICETITAN_JOB_CREATION_FAILED',
        operation: 'worker.createServiceTitanJob',
        serviceName: 'ServiceTitan',
        context: {
          bookingId,
          jobId: job.id,
          attemptNumber: job.attemptsMade,
        },
        error: new Error(result.error),
        retryable: result.shouldRetry,
      });

      logger.error('ServiceTitan job creation failed', {
        bookingId,
        error: result.error,
        shouldRetry: result.shouldRetry,
        jobId: job.id,
      });

      // Throw error to trigger retry if retryable
      if (result.shouldRetry) {
        throw new Error(`ServiceTitan job creation failed: ${result.error}`);
      }

      // Don't retry for non-retryable errors
      return {
        success: false,
        error: result.error,
      };
    }
  } catch (error) {
    logger.error('ServiceTitan job worker error', {
      bookingId,
      error: error.message,
      jobId: job.id,
    });

    // Update booking with error status
    await Booking.update(
      {
        serviceTitanStatus: 'failed',
        serviceTitanError: error.message,
      },
      {
        where: { id: bookingId },
      }
    );

    // Re-throw to trigger retry
    throw error;
  }
};

const confirmTimeSlot = async (job) => {
  const { bookingId, slotData } = job.data;

  try {
    logger.info('Confirming time slot', {
      bookingId,
      slotId: slotData.slotId,
      jobId: job.id,
    });

    // Call real scheduling service to confirm the slot
    const result = await schedulingService.confirmReservedSlot(slotData.slotId, bookingId);

    if (result.success) {
      logger.info('Time slot confirmed successfully', {
        bookingId,
        slotId: slotData.slotId,
        jobId: job.id,
      });

      return {
        success: true,
        slotId: slotData.slotId,
        confirmed: true,
      };
    } else {
      logger.warn('Time slot confirmation failed', {
        bookingId,
        slotId: slotData.slotId,
        error: result.error,
        jobId: job.id,
      });

      // Note: We don't fail the booking if slot confirmation fails
      // The slot might have expired, but the booking is still valid
      // So we log the error but don't throw (no retry)
      return {
        success: false,
        error: result.error,
      };
    }
  } catch (error) {
    logger.error('Time slot confirmation worker error', {
      bookingId,
      slotId: slotData.slotId,
      error: error.message,
      jobId: job.id,
    });

    // Don't throw - slot confirmation failure should not fail the booking
    return {
      success: false,
      error: error.message,
    };
  }
};

const validateBooking = async (job) => {
  const { bookingId, bookingData } = job.data;

  await new Promise((resolve) => setTimeout(resolve, 2000));
  try {
    logger.info('Validating booking', { bookingId, jobId: job.id });

    // Validate booking data
    const validationResult = {
      valid: true,
      errors: [],
      bookingId,
    };

    // Basic validation checks
    if (!bookingData.customer_id) {
      validationResult.valid = false;
      validationResult.errors.push('Missing customer ID');
    }

    if (!bookingData.service_area_id) {
      validationResult.valid = false;
      validationResult.errors.push('Missing service area ID');
    }

    if (!bookingData.preferred_time) {
      validationResult.valid = false;
      validationResult.errors.push('Missing preferred time');
    }

    if (validationResult.valid) {
      logger.info('Booking validation passed', { bookingId, jobId: job.id });
    } else {
      logger.warn('Booking validation failed', {
        bookingId,
        errors: validationResult.errors,
        jobId: job.id,
      });
    }

    return validationResult;
  } catch (error) {
    logger.error('Booking validation failed', { bookingId, error, jobId: job.id });
    throw error;
  }
};

module.exports = {
  createServiceTitanJob,
  confirmTimeSlot,
  validateBooking,
};
