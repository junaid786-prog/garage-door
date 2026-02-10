const service = require('./service');
const APIResponse = require('../../utils/response');

/**
 * Scheduling controller - handles scheduling requests from frontend
 */
class SchedulingController {
  /**
   * Get available time slots for a ZIP code
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getAvailableSlots(req, res, next) {
    try {
      const { zip } = req.query;

      if (!zip) {
        return APIResponse.badRequest(res, 'ZIP code is required');
      }

      // Optional parameters
      const startDate = req.query.date ? new Date(req.query.date) : null;
      const days = req.query.days ? parseInt(req.query.days) : 7;

      // Validate date if provided
      if (startDate && isNaN(startDate.getTime())) {
        return APIResponse.badRequest(res, 'Invalid date format. Use YYYY-MM-DD');
      }

      // Validate days parameter
      if (days < 1 || days > 30) {
        return APIResponse.badRequest(res, 'Days parameter must be between 1 and 30');
      }

      // Service now throws errors instead of returning result objects
      const result = await service.getAvailableSlots(zip, startDate, days);

      return APIResponse.success(res, result, 'Available slots retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reserve a time slot
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async reserveSlot(req, res, next) {
    try {
      const { slotId, bookingId, customerInfo } = req.body;

      if (!slotId) {
        return APIResponse.badRequest(res, 'Slot ID is required');
      }

      if (!bookingId) {
        return APIResponse.badRequest(res, 'Booking ID is required');
      }

      // Service now throws errors instead of returning result objects
      const result = await service.reserveSlot(slotId, bookingId, customerInfo);

      return APIResponse.created(res, result, 'Slot reserved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check service availability for a ZIP code
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async checkServiceAvailability(req, res, next) {
    try {
      const { zip } = req.query;

      if (!zip) {
        return APIResponse.badRequest(res, 'ZIP code is required');
      }

      // Service now throws errors instead of returning result objects
      const result = await service.checkServiceAvailability(zip);

      return APIResponse.success(res, result, 'Service availability checked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel a slot reservation
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async cancelReservation(req, res, next) {
    try {
      const { slotId } = req.params;
      const { bookingId } = req.body;

      if (!slotId) {
        return APIResponse.badRequest(res, 'Slot ID is required');
      }

      if (!bookingId) {
        return APIResponse.badRequest(res, 'Booking ID is required');
      }

      // Service now throws errors instead of returning result objects
      const result = await service.cancelSlot(slotId, bookingId);

      return APIResponse.success(res, result, 'Slot reservation cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current reservations (admin endpoint)
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getCurrentReservations(req, res, next) {
    try {
      const reservations = await service.getCurrentReservations();

      return APIResponse.success(
        res,
        {
          reservations,
          total: reservations.length,
          expired: reservations.filter((r) => r.expired).length,
          active: reservations.filter((r) => !r.expired).length,
        },
        'Current reservations retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cleanup expired reservations (admin endpoint)
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async cleanupExpiredReservations(req, res, next) {
    try {
      const cleaned = await service.cleanupExpiredReservations();

      return APIResponse.success(
        res,
        {
          cleanedCount: cleaned,
          message: `${cleaned} expired reservations cleaned up`,
        },
        'Expired reservations cleaned up successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get scheduling system health
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getHealth(req, res, next) {
    try {
      const schedulingProIntegration = require('../integrations/schedulingpro/integration');
      const health = await schedulingProIntegration.getHealthStatus();

      // Add our service layer stats
      const reservations = await service.getCurrentReservations();

      const response = {
        ...health,
        serviceLayer: {
          cacheTimeout: service.cacheTimeout,
          reservationTimeout: service.reservationTimeout,
          autoConfirmSlots: service.autoConfirmSlots,
          cachedSlotsKeys: service.slotsCache.size,
          activeReservations: reservations.filter((r) => !r.expired).length,
          expiredReservations: reservations.filter((r) => r.expired).length,
        },
      };

      if (health.success) {
        return APIResponse.success(
          res,
          response,
          'Scheduling system health retrieved successfully'
        );
      } else {
        return APIResponse.error(res, health.error, 503);
      }
    } catch (error) {
      next(error);
    }
  }
}

const controller = new SchedulingController();
module.exports = {
  getAvailableSlots: controller.getAvailableSlots.bind(controller),
  reserveSlot: controller.reserveSlot.bind(controller),
  checkServiceAvailability: controller.checkServiceAvailability.bind(controller),
  cancelReservation: controller.cancelReservation.bind(controller),
  getCurrentReservations: controller.getCurrentReservations.bind(controller),
  cleanupExpiredReservations: controller.cleanupExpiredReservations.bind(controller),
  getHealth: controller.getHealth.bind(controller),
};
