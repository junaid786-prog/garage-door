const service = require('./service');
const APIResponse = require('../../utils/response');
const serviceTitanIntegration = require('../integrations/servicetitan/integration');
const schedulingService = require('../scheduling/service');
const logger = require('../../utils/logger');
const { NotFoundError } = require('../../utils/errors');

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

      // Call ServiceTitan integration synchronously (simulated, ~700ms-2s)
      // NOTE: Workers removed to eliminate Redis polling (was 40-50K requests/day on Upstash)
      // Synchronous calls complete fast enough for acceptable UX
      // When Birlasoft values are ready, replace serviceTitanIntegration with birlasoftService
      try {
        logger.info('Creating ServiceTitan job (simulated)', { bookingId: booking.id });

        // Prepare booking data for ServiceTitan integration
        const bookingData = {
          id: booking.id,
          ...req.body, // Original form data
          // Include database fields for integration
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
        };

        const serviceTitanResult = await serviceTitanIntegration.createJobFromBooking(bookingData);

        if (serviceTitanResult.success) {
          // Update booking with ServiceTitan IDs
          await booking.update({
            serviceTitanJobId: serviceTitanResult.serviceTitanJobId,
            serviceTitanCustomerId: serviceTitanResult.serviceTitanCustomerId,
            serviceTitanAppointmentNumber: serviceTitanResult.serviceTitanAppointmentNumber,
            serviceTitanJobNumber: serviceTitanResult.jobNumber,
            serviceTitanStatus: serviceTitanResult.status,
            serviceTitanError: null,
          });

          logger.info('ServiceTitan job created successfully', {
            bookingId: booking.id,
            serviceTitanJobId: serviceTitanResult.serviceTitanJobId,
            jobNumber: serviceTitanResult.jobNumber,
          });
        } else {
          // Mark as failed - ops team will handle manually
          await booking.update({
            serviceTitanStatus: 'failed',
            serviceTitanError: serviceTitanResult.error,
          });

          logger.error('ServiceTitan job creation failed', {
            bookingId: booking.id,
            error: serviceTitanResult.error,
          });
        }
      } catch (stError) {
        // Log but don't fail the request - booking was created successfully
        logger.error('ServiceTitan integration error', {
          bookingId: booking.id,
          error: stError.message,
          stack: stError.stack,
        });

        await booking.update({
          serviceTitanStatus: 'failed',
          serviceTitanError: stError.message,
        });
      }

      // Confirm slot if selected (also synchronous now)
      if (booking.scheduling?.slot_id) {
        try {
          logger.info('Confirming time slot', {
            bookingId: booking.id,
            slotId: booking.scheduling.slot_id,
          });

          const slotResult = await schedulingService.confirmReservedSlot(
            booking.scheduling.slot_id,
            booking.id
          );

          logger.info('Time slot confirmed', {
            bookingId: booking.id,
            slotId: booking.scheduling.slot_id,
            success: slotResult.success,
          });
        } catch (slotError) {
          // Don't fail booking if slot confirmation fails (non-critical)
          logger.warn('Slot confirmation failed (non-critical)', {
            bookingId: booking.id,
            slotId: booking.scheduling.slot_id,
            error: slotError.message,
          });
        }
      }

      // Return response to user (booking created + ST job created/attempted)
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
        throw new NotFoundError('Booking not found');
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
        throw new NotFoundError('Booking not found');
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
        throw new NotFoundError('Booking not found');
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
        throw new NotFoundError('Booking not found');
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
        throw new NotFoundError('Booking not found');
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
