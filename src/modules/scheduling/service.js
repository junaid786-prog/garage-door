const schedulingProIntegration = require('../integrations/schedulingpro/integration');
const geoService = require('../geo/service'); // Will enhance this
const env = require('../../config/env');

/**
 * Scheduling service - handles scheduling business logic with caching and reservations
 */
class SchedulingService {
  constructor() {
    // In-memory cache for demo (replace with Redis in production)
    this.slotsCache = new Map();
    this.reservationsCache = new Map();

    // Configuration from environment
    this.cacheTimeout = env.SCHEDULING_CACHE_TTL_MINUTES * 60 * 1000; // Convert to milliseconds
    this.reservationTimeout = env.SCHEDULING_RESERVATION_TIMEOUT_MINUTES;
    this.autoConfirmSlots = env.SCHEDULING_AUTO_CONFIRM_SLOTS;
  }

  /**
   * Get available time slots for a ZIP code with caching
   * @param {string} zipCode - Service area ZIP code
   * @param {Date} startDate - Start date (optional, defaults to today)
   * @param {number} days - Number of days to fetch (optional, defaults to 7)
   * @returns {Promise<Object>} Available slots grouped by timeframe
   */
  async getAvailableSlots(zipCode, startDate = null, days = 7) {
    try {
      // Validate ZIP code using enhanced geo service
      const schedulingValidation = await geoService.validateSchedulingAvailability(zipCode);
      if (!schedulingValidation.isServiceable || !schedulingValidation.hasScheduling) {
        return {
          success: false,
          error: `Scheduling service not available in ZIP code: ${zipCode}`,
          zipCode,
          serviceHours: null,
        };
      }

      // Set default start date to today
      if (!startDate) {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      }

      // Set end date
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + days);

      // Check cache first
      const cacheKey = this._generateCacheKey(zipCode, startDate, endDate);
      const cachedResult = this._getFromCache(cacheKey);

      if (cachedResult) {
        console.log(`[Scheduling Service] Cache hit for ${zipCode}`);
        return {
          ...cachedResult,
          cached: true,
          cacheAge: Date.now() - cachedResult.cachedAt,
        };
      }

      // Fetch from SchedulingPro
      console.log(`[Scheduling Service] Fetching slots from SchedulingPro for ${zipCode}`);
      const result = await schedulingProIntegration.getAvailableSlots(zipCode, startDate, endDate);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          zipCode,
          shouldRetry: result.shouldRetry,
        };
      }

      // Filter out unavailable slots and past slots
      const availableSlots = result.slots.filter((slot) => {
        if (!slot.available) return false;

        // Check if slot is in the past
        const slotDateTime = new Date(`${slot.date}T${slot.startTime}:00`);
        return slotDateTime > new Date();
      });

      // Group slots by timeframe
      const groupedSlots = schedulingProIntegration.groupSlotsByTimeframe(
        availableSlots,
        result.timezone
      );

      // Format response
      const response = {
        success: true,
        zipCode: result.zipCode,
        timezone: result.timezone,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        totalSlots: result.totalSlots,
        availableSlots: availableSlots.length,
        groupedSlots,
        cached: false,
        cachedAt: Date.now(),
      };

      // Cache the result
      this._setCache(cacheKey, response);

      return response;
    } catch (error) {
      console.error('[Scheduling Service] Get slots error:', {
        zipCode,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        zipCode,
      };
    }
  }

  /**
   * Reserve a time slot with timeout
   * @param {string} slotId - Slot ID to reserve
   * @param {string} bookingId - Booking ID (can be temporary)
   * @param {Object} customerInfo - Customer information
   * @returns {Promise<Object>} Reservation result
   */
  async reserveSlot(slotId, bookingId, customerInfo = {}) {
    try {
      // Check if slot is already reserved in our cache
      const existingReservation = this.reservationsCache.get(slotId);
      if (existingReservation && existingReservation.expiresAt > new Date()) {
        return {
          success: false,
          error: `Slot is already reserved until ${existingReservation.expiresAt.toISOString()}`,
          slotId,
          reservedBy: existingReservation.bookingId,
        };
      }

      // Reserve slot with SchedulingPro
      const result = await schedulingProIntegration.reserveSlot(
        slotId,
        bookingId,
        this.reservationTimeout
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          slotId,
          shouldRetry: result.shouldRetry,
        };
      }

      // Store reservation in our cache
      const reservation = {
        slotId,
        bookingId,
        customerInfo,
        reservedAt: result.reservation.reservedAt,
        expiresAt: result.reservation.expiresAt,
        slot: result.slot,
      };

      this.reservationsCache.set(slotId, reservation);

      // Set timeout to clean up expired reservation
      setTimeout(
        () => {
          const current = this.reservationsCache.get(slotId);
          if (current && current.expiresAt <= new Date()) {
            this.reservationsCache.delete(slotId);
            console.log(`[Scheduling Service] Reservation expired and cleaned up: ${slotId}`);
          }
        },
        this.reservationTimeout * 60 * 1000
      );

      console.log(
        `[Scheduling Service] Slot reserved: ${slotId} for ${this.reservationTimeout} minutes`
      );

      return {
        success: true,
        reservation: {
          slotId: reservation.slotId,
          bookingId: reservation.bookingId,
          reservedAt: reservation.reservedAt,
          expiresAt: reservation.expiresAt,
          reservationMinutes: this.reservationTimeout,
        },
        slot: reservation.slot,
      };
    } catch (error) {
      console.error('[Scheduling Service] Reservation error:', {
        slotId,
        bookingId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        slotId,
      };
    }
  }

  /**
   * Confirm a reserved slot (called from booking service)
   * @param {string} slotId - Slot ID to confirm
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmReservedSlot(slotId, bookingId) {
    try {
      // Check our reservation cache
      const reservation = this.reservationsCache.get(slotId);
      if (!reservation) {
        return {
          success: false,
          error: `No reservation found for slot: ${slotId}`,
          slotId,
        };
      }

      if (reservation.bookingId !== bookingId) {
        return {
          success: false,
          error: `Booking ID mismatch for slot: ${slotId}`,
          slotId,
        };
      }

      if (reservation.expiresAt <= new Date()) {
        this.reservationsCache.delete(slotId);
        return {
          success: false,
          error: `Reservation expired for slot: ${slotId}`,
          slotId,
        };
      }

      // Confirm with SchedulingPro
      const result = await schedulingProIntegration.confirmSlot(slotId, bookingId);

      if (result.success) {
        // Remove from reservations cache (now it's confirmed)
        this.reservationsCache.delete(slotId);

        // Invalidate slots cache for this area
        this._invalidateSlotsCacheForSlot(slotId);

        console.log(`[Scheduling Service] Slot confirmed: ${slotId} for booking: ${bookingId}`);
      }

      return result;
    } catch (error) {
      console.error('[Scheduling Service] Confirmation error:', {
        slotId,
        bookingId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        slotId,
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
      // Remove from our reservations cache
      const reservation = this.reservationsCache.get(slotId);
      if (reservation && reservation.bookingId === bookingId) {
        this.reservationsCache.delete(slotId);
      }

      // Cancel with SchedulingPro
      const result = await schedulingProIntegration.cancelSlot(slotId, bookingId);

      if (result.success) {
        // Invalidate slots cache for this area
        this._invalidateSlotsCacheForSlot(slotId);

        console.log(`[Scheduling Service] Slot cancelled: ${slotId} for booking: ${bookingId}`);
      }

      return result;
    } catch (error) {
      console.error('[Scheduling Service] Cancellation error:', {
        slotId,
        bookingId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        slotId,
      };
    }
  }

  /**
   * Check service availability for a ZIP code
   * @param {string} zipCode - ZIP code to check
   * @returns {Promise<Object>} Service availability
   */
  async checkServiceAvailability(zipCode) {
    try {
      // Check with enhanced geo service for scheduling availability
      const schedulingValidation = await geoService.validateSchedulingAvailability(zipCode);
      if (!schedulingValidation.isServiceable || !schedulingValidation.hasScheduling) {
        return {
          success: true,
          serviceable: false,
          hasScheduling: false,
          zipCode,
          city: schedulingValidation.city,
          state: schedulingValidation.state,
          timezone: schedulingValidation.timezone,
          serviceHours: schedulingValidation.serviceHours,
          message: schedulingValidation.message,
        };
      }

      // Then check with SchedulingPro for detailed availability
      const schedulingProResult = await schedulingProIntegration.checkServiceAvailability(zipCode);

      // Merge geo and SchedulingPro data
      return {
        ...schedulingProResult,
        city: schedulingValidation.city,
        state: schedulingValidation.state,
        timezone: schedulingValidation.timezone,
        serviceHours: schedulingValidation.serviceHours,
      };
    } catch (error) {
      console.error('[Scheduling Service] Service availability check error:', {
        zipCode,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        zipCode,
      };
    }
  }

  /**
   * Get current reservations (for admin/debugging)
   * @returns {Array} Current reservations
   */
  getCurrentReservations() {
    const reservations = [];
    for (const [slotId, reservation] of this.reservationsCache.entries()) {
      reservations.push({
        slotId,
        bookingId: reservation.bookingId,
        reservedAt: reservation.reservedAt,
        expiresAt: reservation.expiresAt,
        expired: reservation.expiresAt <= new Date(),
      });
    }
    return reservations;
  }

  /**
   * Clear expired reservations (cleanup job)
   * @returns {number} Number of expired reservations cleaned up
   */
  cleanupExpiredReservations() {
    let cleaned = 0;
    const now = new Date();

    for (const [slotId, reservation] of this.reservationsCache.entries()) {
      if (reservation.expiresAt <= now) {
        this.reservationsCache.delete(slotId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Scheduling Service] Cleaned up ${cleaned} expired reservations`);
    }

    return cleaned;
  }

  // Private helper methods

  /**
   * Generate cache key
   * @param {string} zipCode
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {string}
   * @private
   */
  _generateCacheKey(zipCode, startDate, endDate) {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    return `slots:${zipCode}:${start}:${end}`;
  }

  /**
   * Get item from cache
   * @param {string} key
   * @returns {Object|null}
   * @private
   */
  _getFromCache(key) {
    const item = this.slotsCache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.cachedAt > this.cacheTimeout) {
      this.slotsCache.delete(key);
      return null;
    }

    return item;
  }

  /**
   * Set item in cache
   * @param {string} key
   * @param {Object} value
   * @private
   */
  _setCache(key, value) {
    this.slotsCache.set(key, value);

    // Set timeout to clean up expired cache
    setTimeout(() => {
      this.slotsCache.delete(key);
    }, this.cacheTimeout);
  }

  /**
   * Invalidate slots cache for a specific slot
   * @param {string} slotId
   * @private
   */
  _invalidateSlotsCacheForSlot(slotId) {
    // Extract date and ZIP code from slot ID if possible
    // For simplicity, clear all cache (in production, be more specific)
    console.log(`[Scheduling Service] Invalidating slots cache due to slot change: ${slotId}`);
    this.slotsCache.clear();
  }
}

module.exports = new SchedulingService();
