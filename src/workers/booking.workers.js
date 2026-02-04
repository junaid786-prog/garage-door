const logger = require('../utils/logger');

const createServiceTitanJob = async (job) => {
  const { bookingId, _bookingData } = job.data;

  try {
    logger.info('Processing ServiceTitan job creation', { bookingId, jobId: job.id });

    // TODO: Implement ServiceTitan API integration
    // const serviceTitanService = require('../services/servicetitan.service');
    // const result = await serviceTitanService.createJob(bookingData);

    // Simulate API call for now
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockResult = {
      jobId: `ST-${Date.now()}`,
      status: 'created',
      bookingId,
    };

    logger.info('ServiceTitan job created', { bookingId, serviceTitanJobId: mockResult.jobId });

    // Update booking with ServiceTitan job ID
    // const bookingService = require('../services/booking.service');
    // await bookingService.updateBooking(bookingId, { servicetitan_job_id: mockResult.jobId });

    return mockResult;
  } catch (error) {
    logger.error('ServiceTitan job creation failed', { bookingId, error, jobId: job.id });
    throw error;
  }
};

const confirmTimeSlot = async (job) => {
  const { bookingId, slotData } = job.data;

  try {
    logger.info('Confirming time slot', { bookingId, jobId: job.id });

    // TODO: Implement Scheduling Pro API integration
    // const schedulingService = require('../services/scheduling.service');
    // const result = await schedulingService.confirmSlot(slotData);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockResult = {
      slotId: slotData.slotId,
      confirmed: true,
      bookingId,
    };

    logger.info('Time slot confirmed', { bookingId, jobId: job.id });

    return mockResult;
  } catch (error) {
    logger.error('Time slot confirmation failed', { bookingId, error, jobId: job.id });
    throw error;
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
      logger.warn('Booking validation failed', { bookingId, errors: validationResult.errors, jobId: job.id });
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
