const service = require('./service');
const APIResponse = require('../../utils/response');
const queueManager = require('../../config/queue');
const logger = require('../../utils/logger');

/**
 * Booking controller - handles booking HTTP requests
 */
class BookingController {
  /**
   * Create a new booking
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async createBooking(req, res, next) {
    try {
      // Create booking synchronously (fast, <500ms)
      const booking = await service.createBooking(req.body);

      // Queue background jobs for external integrations (async, non-blocking)
      // These run after the user gets their response
      try {
        // Prepare booking data for background jobs
        const bookingJobData = {
          bookingId: booking.id,
          bookingData: {
            id: booking.id,
            ...req.body, // Original form data
            // Include database fields that workers might need
            contactName: booking.contact?.name,
            phoneE164: booking.contact?.phoneE164,
            street: booking.address?.street,
            unit: booking.address?.unit,
            city: booking.address?.city,
            state: booking.address?.state,
            zip: booking.address?.zip,
            serviceType: booking.service?.type,
            serviceSymptom: booking.service?.symptom,
            doorCount: booking.door?.count,
            doorAgeBucket: booking.door?.age_bucket,
            occupancyType: booking.occupancy?.type,
            notes: booking.notes,
            slotId: booking.scheduling?.slot_id,
          },
        };

        // Queue ServiceTitan job creation (critical priority)
        await queueManager.addBookingJob(
          'create-servicetitan-job',
          bookingJobData,
          'critical'
        );

        logger.info('ServiceTitan job queued', {
          bookingId: booking.id,
          jobType: 'create-servicetitan-job',
        });

        // Queue slot confirmation if slot was selected (critical priority)
        if (booking.scheduling?.slot_id) {
          await queueManager.addBookingJob(
            'confirm-time-slot',
            {
              bookingId: booking.id,
              slotData: {
                slotId: booking.scheduling.slot_id,
              },
            },
            'critical'
          );

          logger.info('Slot confirmation job queued', {
            bookingId: booking.id,
            slotId: booking.scheduling.slot_id,
            jobType: 'confirm-time-slot',
          });
        }
      } catch (queueError) {
        // Log queue errors but don't fail the request
        // The booking was created successfully, queue failures are non-critical
        logger.error('Failed to queue background jobs', {
          bookingId: booking.id,
          error: queueError.message,
        });
      }

      // Return immediate response to user (booking created, jobs queued)
      return APIResponse.created(res, booking, 'Booking created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get booking by ID
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getBookingById(req, res, next) {
    try {
      const { id } = req.params;
      const booking = await service.getBookingById(id);

      if (!booking) {
        return APIResponse.notFound(res, 'Booking not found');
      }

      return APIResponse.success(res, booking, 'Booking retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all bookings with filters
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getBookings(req, res, next) {
    try {
      const filters = req.query;
      const result = await service.getBookings(filters);

      return APIResponse.success(res, result, 'Bookings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update booking
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async updateBooking(req, res, next) {
    try {
      const { id } = req.params;
      const booking = await service.updateBooking(id, req.body);

      if (!booking) {
        return APIResponse.notFound(res, 'Booking not found');
      }

      return APIResponse.success(res, booking, 'Booking updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update booking status
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async updateBookingStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const booking = await service.updateBookingStatus(id, status);

      if (!booking) {
        return APIResponse.notFound(res, 'Booking not found');
      }

      return APIResponse.success(res, booking, 'Booking status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete booking (soft delete)
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async deleteBooking(req, res, next) {
    try {
      const { id } = req.params;
      const success = await service.deleteBooking(id);

      if (!success) {
        return APIResponse.notFound(res, 'Booking not found');
      }

      return APIResponse.noContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Link booking to ServiceTitan job
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async linkServiceTitanJob(req, res, next) {
    try {
      const { id } = req.params;
      const { serviceTitanJobId } = req.body;

      const booking = await service.linkServiceTitanJob(id, serviceTitanJobId);

      if (!booking) {
        return APIResponse.notFound(res, 'Booking not found');
      }

      return APIResponse.success(res, booking, 'ServiceTitan job linked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get bookings by phone number
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getBookingsByPhone(req, res, next) {
    try {
      const { phone } = req.params;
      const bookings = await service.getBookingsByPhone(phone);

      return APIResponse.success(res, { bookings }, 'Bookings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

const controller = new BookingController();

module.exports = {
  createBooking: controller.createBooking.bind(controller),
  getBookingById: controller.getBookingById.bind(controller),
  getBookings: controller.getBookings.bind(controller),
  updateBooking: controller.updateBooking.bind(controller),
  updateBookingStatus: controller.updateBookingStatus.bind(controller),
  deleteBooking: controller.deleteBooking.bind(controller),
  linkServiceTitanJob: controller.linkServiceTitanJob.bind(controller),
  getBookingsByPhone: controller.getBookingsByPhone.bind(controller),
};
