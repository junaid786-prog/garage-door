const schedulingProIntegration = require('../integrations/schedulingpro/integration');
const geoService = require('../geo/service'); // Will enhance this
const env = require('../../config/env');
// const reservationService = require('../../services/reservationService'); // V2: Uncomment for internal Redis reservations
const logger = require('../../utils/logger');
const { ServiceUnavailableError, ValidationError } = require('../../utils/errors');

/**
 * Scheduling service - handles scheduling business logic with caching and slot management
 *
 * V1 RESERVATION BEHAVIOR:
 * - INTERNAL Redis reservations: DISABLED (no 5-min holds in our system)
 * - EXTERNAL SchedulingPro API reservations: ACTIVE (15-min holds on their side)
 * - Protection: Database unique constraint on slot_id prevents double-bookings
 *
 * TWO TYPES OF RESERVATIONS:
 * 1. Internal (Redis) - reservationService - DISABLED in V1, kept for V2/V3
 * 2. External (SchedulingPro API) - schedulingProIntegration.reserveSlot() - ACTIVE in V1
 *
 * Client requirement: No internal slot holding in V1 (ops team doesn't hold slots currently)
 */
class SchedulingService {
  constructor() {
    // In-memory cache for available slots (NOT for reservations)
    this.slotsCache = new Map();

    // Configuration from environment
    this.cacheTimeout = env.SCHEDULING_CACHE_TTL_MINUTES * 60 * 1000; // Convert to milliseconds
    this.reservationTimeout = env.SCHEDULING_RESERVATION_TIMEOUT_MINUTES; // Used for external SchedulingPro API
    this.reservationTimeoutSeconds = env.SCHEDULING_RESERVATION_TIMEOUT_MINUTES * 60; // For SchedulingPro API
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
    // Check kill switch - instant disable without redeploy
    if (env.DISABLE_SCHEDULING) {
      logger.warn('Scheduling is currently disabled via kill switch', { zipCode });
      throw new ServiceUnavailableError(
        'Online scheduling is temporarily unavailable. Please call (800) 123-4567 to schedule your appointment.',
        'Scheduling'
      );
    }

    // Validate ZIP code using enhanced geo service
    const schedulingValidation = await geoService.validateSchedulingAvailability(zipCode);
    if (!schedulingValidation.isServiceable || !schedulingValidation.hasScheduling) {
      throw new ValidationError(`Scheduling service not available in ZIP code: ${zipCode}`);
    }

    // Set default start date to today
    let effectiveStartDate = startDate;
    if (!effectiveStartDate) {
      effectiveStartDate = new Date();
      effectiveStartDate.setHours(0, 0, 0, 0);
    }

    // Set end date
    const endDate = new Date(effectiveStartDate);
    endDate.setDate(effectiveStartDate.getDate() + days);

    // Check cache first
    const cacheKey = this._generateCacheKey(zipCode, effectiveStartDate, endDate);
    const cachedResult = this._getFromCache(cacheKey);

    if (cachedResult) {
      logger.debug('Slots cache hit', { zipCode, startDate: effectiveStartDate });
      return {
        ...cachedResult,
        cached: true,
        cacheAge: Date.now() - cachedResult.cachedAt,
      };
    }

    // Fetch from SchedulingPro
    logger.debug('Fetching slots from SchedulingPro', { zipCode, startDate: effectiveStartDate });
    const result = await schedulingProIntegration.getAvailableSlots(
      zipCode,
      effectiveStartDate,
      endDate
    );

    if (!result.success) {
      // SchedulingPro integration returns result objects, will be refactored in future
      throw new ServiceUnavailableError(result.error || 'Failed to fetch slots', 'SchedulingPro');
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
        startDate: effectiveStartDate.toISOString(),
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
  }

  /**
   * Reserve a time slot with timeout
   * @param {string} slotId - Slot ID to reserve
   * @param {string} bookingId - Booking ID (can be temporary)
   * @param {Object} customerInfo - Customer information
   * @returns {Promise<Object>} Reservation result
   */
  async reserveSlot(slotId, bookingId, _customerInfo = {}) {
    // Check kill switch
    if (env.DISABLE_SCHEDULING) {
      logger.warn('Slot reservation blocked - scheduling disabled via kill switch', {
        slotId,
        bookingId,
      });
      throw new ServiceUnavailableError(
        'Online scheduling is temporarily unavailable. Please call (800) 123-4567 to schedule your appointment.',
        'Scheduling'
      );
    }

    // V1: Redis reservations removed per client requirement (no 5-minute holds)
    // V2: Restore Redis reservation checks here for multi-user slot holding

    // Reserve slot with SchedulingPro
    const result = await schedulingProIntegration.reserveSlot(
      slotId,
      bookingId,
      this.reservationTimeout
    );

    if (!result.success) {
      // SchedulingPro integration returns result objects, will be refactored in future
      throw new ServiceUnavailableError(result.error || 'Failed to reserve slot', 'SchedulingPro');
    }

    // V1: Redis reservation storage removed
    // V2: Restore reservationService.reserveSlot() here

    logger.info('Slot reserved successfully', {
      slotId,
      timeoutMinutes: this.reservationTimeout,
      bookingId,
    });

    return {
      success: true,
      reservation: {
        slotId,
        bookingId,
        reservedAt: result.reservation.reservedAt,
        expiresAt: result.reservation.expiresAt,
        reservationMinutes: this.reservationTimeout,
      },
      slot: result.slot,
    };
  }

  /**
   * Confirm a reserved slot (called from booking service)
   * @param {string} slotId - Slot ID to confirm
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmReservedSlot(slotId, bookingId) {
    // V1: Redis verification removed - slots confirmed directly with SchedulingPro
    // V2: Restore reservationService.verifyReservation() here

    // Confirm with SchedulingPro
    const result = await schedulingProIntegration.confirmSlot(slotId, bookingId);

    if (result.success) {
      // V1: No Redis cleanup needed (no reservations)
      // V2: Restore reservationService.releaseSlot() here

      // Invalidate slots cache for this area
      this._invalidateSlotsCacheForSlot(slotId);

      logger.info('Slot confirmed', { slotId, bookingId });
    } else {
      // SchedulingPro integration returns result objects, will be refactored in future
      throw new ServiceUnavailableError(result.error || 'Failed to confirm slot', 'SchedulingPro');
    }

    return result;
  }

  /**
   * Cancel a reservation or confirmed slot
   * @param {string} slotId - Slot ID to cancel
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelSlot(slotId, bookingId) {
    // V1: Redis reservation removal - cancel directly with SchedulingPro
    // V2: Restore reservationService.verifyReservation() and releaseSlot() here

    // Cancel with SchedulingPro
    const result = await schedulingProIntegration.cancelSlot(slotId, bookingId);

    if (result.success) {
      // Invalidate slots cache for this area
      this._invalidateSlotsCacheForSlot(slotId);

      logger.info('Slot cancelled', { slotId, bookingId });
    } else {
      // SchedulingPro integration returns result objects, will be refactored in future
      throw new ServiceUnavailableError(result.error || 'Failed to cancel slot', 'SchedulingPro');
    }

    return result;
  }

  /**
   * Check service availability for a ZIP code
   * @param {string} zipCode - ZIP code to check
   * @returns {Promise<Object>} Service availability
   */
  async checkServiceAvailability(zipCode) {
    // Check kill switch
    if (env.DISABLE_SCHEDULING) {
      logger.warn('Service availability check - scheduling disabled via kill switch', { zipCode });
      throw new ServiceUnavailableError(
        'Online scheduling is temporarily unavailable. Please call (800) 123-4567 to schedule your appointment.',
        'Scheduling'
      );
    }

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
  }

  /**
   * Get current reservations (for admin/debugging)
   * V1: Disabled - no Redis reservations
   * V2: Restore reservationService.getAllReservations() call
   * @returns {Promise<Array>} Current reservations
   */
  getCurrentReservations() {
    // V1: No Redis reservations, return empty array
    logger.debug('getCurrentReservations called - Redis reservations disabled in V1');
    return Promise.resolve([]);

    /* V2: Uncomment this block to restore Redis reservations
    try {
      const result = await reservationService.getAllReservations();
      if (!result.success) {
        logger.error('Failed to get reservations', { error: result.error });
        return [];
      }

      // Format for compatibility with existing code
      return result.reservations.map((r) => ({
        slotId: r.slotId,
        bookingId: r.bookingId,
        reservedAt: r.reservedAt,
        expiresAt: r.expiresAt,
        expired: new Date(r.expiresAt) <= new Date(),
        ttlSeconds: r.ttlSeconds,
      }));
    } catch (error) {
      logger.error('Failed to get reservations', { error });
      return [];
    }
    */
  }

  /**
   * Clear expired reservations (cleanup job)
   * V1: Disabled - no Redis reservations to clean
   * V2: Restore reservationService.cleanupExpired() call
   * @returns {Promise<number>} Number of expired reservations being cleaned up
   */
  cleanupExpiredReservations() {
    // V1: No Redis reservations, return 0
    logger.debug('cleanupExpiredReservations called - Redis reservations disabled in V1');
    return Promise.resolve(0);

    /* V2: Uncomment this block to restore Redis reservation cleanup
    try {
      const result = await reservationService.cleanupExpired();
      if (!result.success) {
        logger.error('Cleanup check failed', { error: result.error });
        return 0;
      }

      if (result.cleaned > 0) {
        logger.debug('Reservations expiring soon (Redis TTL handles cleanup)', {
          count: result.cleaned,
        });
      }

      return result.cleaned || 0;
    } catch (error) {
      logger.error('Cleanup failed', { error });
      return 0;
    }
    */
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
    logger.debug('Invalidating slots cache due to slot change', { slotId });
    this.slotsCache.clear();
  }
}

module.exports = new SchedulingService();
