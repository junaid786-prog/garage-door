const schedulingProService = require('./service');

/**
 * SchedulingPro integration wrapper for internal use
 * This is the interface that other modules should use for scheduling operations
 */
class SchedulingProIntegration {
  /**
   * Get available time slots for a ZIP code
   * @param {string} zipCode - Service area ZIP code
   * @param {Date} startDate - Start date for slot search
   * @param {Date} endDate - End date (optional)
   * @returns {Promise<Object>} Available slots result
   */
  async getAvailableSlots(zipCode, startDate, endDate = null) {
    try {
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
        slots: result.slots.map(slot => ({
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

    } catch (error) {
      console.error('[SchedulingPro Integration] Get slots failed:', {
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
   * Reserve a time slot
   * @param {string} slotId - Slot ID to reserve
   * @param {string} bookingId - Booking ID for reservation
   * @param {number} reservationMinutes - Reservation duration (default 15 minutes)
   * @returns {Promise<Object>} Reservation result
   */
  async reserveSlot(slotId, bookingId, reservationMinutes = 15) {
    try {
      const result = await schedulingProService.reserveSlot(slotId, bookingId, reservationMinutes);

      console.log('[SchedulingPro Integration] Slot reserved successfully:', {
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

    } catch (error) {
      console.error('[SchedulingPro Integration] Slot reservation failed:', {
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
   * Confirm a reserved slot
   * @param {string} slotId - Slot ID to confirm
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmSlot(slotId, bookingId) {
    try {
      const result = await schedulingProService.confirmSlot(slotId, bookingId);

      console.log('[SchedulingPro Integration] Slot confirmed successfully:', {
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

    } catch (error) {
      console.error('[SchedulingPro Integration] Slot confirmation failed:', {
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
   * Cancel a reservation or confirmed slot
   * @param {string} slotId - Slot ID to cancel
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelSlot(slotId, bookingId) {
    try {
      const result = await schedulingProService.cancelSlot(slotId, bookingId);

      console.log('[SchedulingPro Integration] Slot cancelled successfully:', {
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

    } catch (error) {
      console.error('[SchedulingPro Integration] Slot cancellation failed:', {
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

    slots.forEach(slot => {
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
    if (nonRetryableErrors.some(errorText => 
      error.message.toLowerCase().includes(errorText.toLowerCase()))) {
      return false;
    }

    // Check for retryable errors
    if (retryableErrors.some(errorText => 
      error.message.toLowerCase().includes(errorText.toLowerCase()))) {
      return true;
    }

    // Default: retry unknown errors (could be temporary)
    return true;
  }
}

module.exports = new SchedulingProIntegration();