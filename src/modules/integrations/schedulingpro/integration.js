const schedulingProService = require('./service');
const { createCircuitBreaker } = require('../../../utils/circuitBreaker');
const { ServiceUnavailableError, ExternalServiceError } = require('../../../utils/errors');
const logger = require('../../../utils/logger');

/**
 * SchedulingPro integration wrapper for internal use
 * This is the interface that other modules should use for scheduling operations
 */
class SchedulingProIntegration {
  constructor() {
    this._setupCircuitBreakers();
  }

  /**
   * Setup circuit breakers for external API calls
   * @private
   */
  _setupCircuitBreakers() {
    // Circuit breaker for getting available slots
    this.getSlotsBreaker = createCircuitBreaker(
      this._getAvailableSlotsInternal.bind(this),
      {
        name: 'SchedulingPro.getAvailableSlots',
        timeout: 10000, // 10 seconds
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
      },
      async (zipCode, startDate, endDate) => {
        // Fallback: Return cached slots or empty result
        logger.warn('SchedulingPro circuit breaker open for getSlots', {
          zipCode,
          startDate: startDate?.toISOString()
        });
        return {
          success: false,
          error: 'Scheduling service temporarily unavailable. Please try again in a few moments.',
          shouldRetry: true,
        };
      }
    );

    // Circuit breaker for slot reservation
    this.reserveSlotBreaker = createCircuitBreaker(
      this._reserveSlotInternal.bind(this),
      {
        name: 'SchedulingPro.reserveSlot',
        timeout: 8000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
      }
    );

    // Circuit breaker for slot confirmation
    this.confirmSlotBreaker = createCircuitBreaker(
      this._confirmSlotInternal.bind(this),
      {
        name: 'SchedulingPro.confirmSlot',
        timeout: 8000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
      }
    );

    // Circuit breaker for slot cancellation
    this.cancelSlotBreaker = createCircuitBreaker(
      this._cancelSlotInternal.bind(this),
      {
        name: 'SchedulingPro.cancelSlot',
        timeout: 8000,
        errorThresholdPercentage: 50,
        resetTimeout: 5000,
      }
    );
  }
  /**
   * Get available time slots for a ZIP code (with circuit breaker protection)
   * @param {string} zipCode - Service area ZIP code
   * @param {Date} startDate - Start date for slot search
   * @param {Date} endDate - End date (optional)
   * @returns {Promise<Object>} Available slots result
   */
  async getAvailableSlots(zipCode, startDate, endDate = null) {
    try {
      return await this.getSlotsBreaker.fire(zipCode, startDate, endDate);
    } catch (error) {
      logger.error('SchedulingPro getAvailableSlots failed', {
        zipCode,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        shouldRetry: this._shouldRetryError(error),
      };
    }
  }

  /**
   * Internal method to get available slots (protected by circuit breaker)
   * @param {string} zipCode - Service area ZIP code
   * @param {Date} startDate - Start date for slot search
   * @param {Date} endDate - End date (optional)
   * @returns {Promise<Object>} Available slots result
   * @private
   */
  async _getAvailableSlotsInternal(zipCode, startDate, endDate = null) {
    // Authenticate with SchedulingPro (cached in real implementation)
    await schedulingProService.authenticate();

    // Get available slots
    const result = await schedulingProService.getAvailableSlots(zipCode, startDate, endDate);

    return {
      success: true,
      zipCode: result.zipCode,
      timezone: result.timezone,
      totalSlots: result.totalSlots,
      availableSlots: result.availableSlots,
      slots: result.slots.map((slot) => ({
        id: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        displayTime: slot.displayTime,
        available: slot.available,
        timezone: slot.timezone,
      })),
      dateRange: {
        startDate: result.startDate,
        endDate: result.endDate,
      },
    };
  }

  /**
   * Reserve a time slot (with circuit breaker protection)
   * @param {string} slotId - Slot ID to reserve
   * @param {string} bookingId - Booking ID for reservation
   * @param {number} reservationMinutes - Reservation duration (default 15 minutes)
   * @returns {Promise<Object>} Reservation result
   */
  async reserveSlot(slotId, bookingId, reservationMinutes = 15) {
    try {
      return await this.reserveSlotBreaker.fire(slotId, bookingId, reservationMinutes);
    } catch (error) {
      logger.error('SchedulingPro reserveSlot failed', {
        slotId,
        bookingId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        shouldRetry: this._shouldRetryError(error),
      };
    }
  }

  /**
   * Internal method to reserve a slot (protected by circuit breaker)
   * @param {string} slotId - Slot ID to reserve
   * @param {string} bookingId - Booking ID for reservation
   * @param {number} reservationMinutes - Reservation duration (default 15 minutes)
   * @returns {Promise<Object>} Reservation result
   * @private
   */
  async _reserveSlotInternal(slotId, bookingId, reservationMinutes = 15) {
    const result = await schedulingProService.reserveSlot(slotId, bookingId, reservationMinutes);

    logger.info('SchedulingPro slot reserved successfully', {
      slotId,
      bookingId,
      expiresAt: result.reservation.expiresAt,
    });

    return {
      success: true,
      reservation: {
        slotId: result.reservation.slotId,
        bookingId: result.reservation.bookingId,
        reservedAt: result.reservation.reservedAt,
        expiresAt: result.reservation.expiresAt,
        reservationMinutes: result.reservation.reservationMinutes,
      },
      slot: result.slot,
    };
  }

  /**
   * Confirm a reserved slot (with circuit breaker protection)
   * @param {string} slotId - Slot ID to confirm
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmSlot(slotId, bookingId) {
    try {
      return await this.confirmSlotBreaker.fire(slotId, bookingId);
    } catch (error) {
      logger.error('SchedulingPro confirmSlot failed', {
        slotId,
        bookingId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        shouldRetry: this._shouldRetryError(error),
      };
    }
  }

  /**
   * Internal method to confirm a slot (protected by circuit breaker)
   * @param {string} slotId - Slot ID to confirm
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Confirmation result
   * @private
   */
  async _confirmSlotInternal(slotId, bookingId) {
    const result = await schedulingProService.confirmSlot(slotId, bookingId);

    logger.info('SchedulingPro slot confirmed successfully', {
      slotId,
      bookingId,
      confirmedAt: result.confirmedAt,
    });

    return {
      success: true,
      slotId: result.slotId,
      bookingId: result.bookingId,
      status: result.status,
      confirmedAt: result.confirmedAt,
    };
  }

  /**
   * Cancel a reservation or confirmed slot (with circuit breaker protection)
   * @param {string} slotId - Slot ID to cancel
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelSlot(slotId, bookingId) {
    try {
      return await this.cancelSlotBreaker.fire(slotId, bookingId);
    } catch (error) {
      logger.error('SchedulingPro cancelSlot failed', {
        slotId,
        bookingId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        shouldRetry: this._shouldRetryError(error),
      };
    }
  }

  /**
   * Internal method to cancel a slot (protected by circuit breaker)
   * @param {string} slotId - Slot ID to cancel
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Cancellation result
   * @private
   */
  async _cancelSlotInternal(slotId, bookingId) {
    const result = await schedulingProService.cancelSlot(slotId, bookingId);

    logger.info('SchedulingPro slot cancelled successfully', {
      slotId,
      bookingId,
      cancelledType: result.cancelledType,
    });

    return {
      success: true,
      slotId: result.slotId,
      bookingId: result.bookingId,
      cancelledType: result.cancelledType,
      cancelledAt: result.cancelledAt,
    };
  }

  /**
   * Check if ZIP code is serviceable
   * @param {string} zipCode - ZIP code to check
   * @returns {Promise<Object>} Service availability result
   */
  async checkServiceAvailability(zipCode) {
    try {
      // Try to get slots for next 7 days
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const result = await this.getAvailableSlots(zipCode, new Date(), nextWeek);

      if (result.success) {
        return {
          success: true,
          serviceable: true,
          zipCode,
          availableSlots: result.availableSlots,
          message: `Service available in ${zipCode}`,
        };
      } else {
        // Check if it's a service area issue
        if (result.error.includes('Service not available')) {
          return {
            success: true,
            serviceable: false,
            zipCode,
            message: result.error,
          };
        }

        // Other errors (API issues, etc.)
        return {
          success: false,
          error: result.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get SchedulingPro health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    try {
      const health = await schedulingProService.getHealthStatus();

      return {
        success: true,
        status: health.status,
        version: health.version,
        timezone: health.timezone,
        serviceableZips: health.serviceableZips,
        activeReservations: health.activeReservations,
        confirmedBookings: health.confirmedBookings,
        workingHours: health.workingHours,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Group slots by time categories for frontend display
   * @param {Array} slots - Array of slot objects
   * @param {string} timezone - Timezone for grouping
   * @returns {Object} Grouped slots
   */
  groupSlotsByTimeframe(slots, timezone = 'America/Phoenix') {
    const now = new Date();
    const today = new Date(now.toDateString());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() + 7);

    const grouped = {
      today: [],
      tomorrow: [],
      thisWeek: [],
    };

    slots.forEach((slot) => {
      const slotDate = new Date(slot.date);

      if (slotDate.toDateString() === today.toDateString()) {
        grouped.today.push(slot);
      } else if (slotDate.toDateString() === tomorrow.toDateString()) {
        grouped.tomorrow.push(slot);
      } else if (slotDate <= thisWeek) {
        grouped.thisWeek.push(slot);
      }
    });

    return grouped;
  }

  /**
   * Check if error should trigger retry
   * @param {Error} error - Error to check
   * @returns {boolean} Whether to retry
   * @private
   */
  _shouldRetryError(error) {
    const retryableErrors = [
      'temporarily unavailable',
      'timeout',
      'network error',
      'connection refused',
      'Service Unavailable',
      '503',
      '502',
      '500',
    ];

    const nonRetryableErrors = [
      'Authentication failed',
      'Invalid API key',
      'Service not available in ZIP code',
      'Invalid ZIP code',
      'Slot not found',
      'Slot is not available',
      'already reserved',
      'Reservation expired',
      'No reservation found',
      'Booking ID mismatch',
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
   * Get circuit breaker health status
   * @returns {Object} Health status of all circuit breakers
   */
  getCircuitBreakerHealth() {
    return {
      getSlots: {
        state: this.getSlotsBreaker.opened ? 'open' : this.getSlotsBreaker.halfOpen ? 'half-open' : 'closed',
        stats: this.getSlotsBreaker.stats
      },
      reserveSlot: {
        state: this.reserveSlotBreaker.opened ? 'open' : this.reserveSlotBreaker.halfOpen ? 'half-open' : 'closed',
        stats: this.reserveSlotBreaker.stats
      },
      confirmSlot: {
        state: this.confirmSlotBreaker.opened ? 'open' : this.confirmSlotBreaker.halfOpen ? 'half-open' : 'closed',
        stats: this.confirmSlotBreaker.stats
      },
      cancelSlot: {
        state: this.cancelSlotBreaker.opened ? 'open' : this.cancelSlotBreaker.halfOpen ? 'half-open' : 'closed',
        stats: this.cancelSlotBreaker.stats
      }
    };
  }
}

module.exports = new SchedulingProIntegration();
