const schedulingProIntegration = require('../integrations/schedulingpro/integration');
const geoService = require('../geo/service'); // Will enhance this
const env = require('../../config/env');
const reservationService = require('../../services/reservationService');
const logger = require('../../utils/logger');

/**
 * Scheduling service - handles scheduling business logic with caching and reservations
 */
class SchedulingService {
  constructor() {
    // In-memory cache for slots (Redis used for reservations)
    this.slotsCache = new Map();

    // Configuration from environment
    this.cacheTimeout = env.SCHEDULING_CACHE_TTL_MINUTES * 60 * 1000; // Convert to milliseconds
    this.reservationTimeout = env.SCHEDULING_RESERVATION_TIMEOUT_MINUTES;
    this.reservationTimeoutSeconds = env.SCHEDULING_RESERVATION_TIMEOUT_MINUTES * 60; // Convert to seconds for Redis
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
        logger.debug('Slots cache hit', { zipCode, date });
        return {
          ...cachedResult,
          cached: true,
          cacheAge: Date.now() - cachedResult.cachedAt,
        };
      }

      // Fetch from SchedulingPro
      logger.debug('Fetching slots from SchedulingPro', { zipCode, date });
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
      logger.error('Failed to get time slots', {
        zipCode,
        date,
        error,
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
      // Check if slot is already reserved in Redis
      const reservationCheck = await reservationService.isReserved(slotId);

      // If Redis is degraded, continue with SchedulingPro check only
      if (reservationCheck.degraded) {
        logger.warn('Redis degraded, using SchedulingPro only for reservation');
      } else if (reservationCheck.isReserved) {
        return {
          success: false,
          error: `Slot is already reserved until ${reservationCheck.reservation.expiresAt}`,
          slotId,
          reservedBy: reservationCheck.reservation.bookingId,
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

      // Store reservation in Redis with TTL (automatic cleanup)
      const redisResult = await reservationService.reserveSlot(
        slotId,
        bookingId,
        {
          customerInfo,
          slot: result.slot,
        },
        this.reservationTimeoutSeconds
      );

      // If Redis reservation failed but SchedulingPro succeeded, log warning but continue
      if (!redisResult.success && !redisResult.degraded) {
        logger.warn('Redis reservation failed but SchedulingPro succeeded', { slotId });
      }

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
    } catch (error) {
      logger.error('Slot reservation failed', {
        slotId,
        bookingId,
        error,
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
      // Verify reservation in Redis
      const verifyResult = await reservationService.verifyReservation(slotId, bookingId);

      // If Redis is degraded, skip verification and proceed with SchedulingPro
      if (verifyResult.degraded) {
        logger.warn('Redis degraded, proceeding with SchedulingPro confirmation only');
      } else if (!verifyResult.valid) {
        return {
          success: false,
          error: verifyResult.error || `Invalid reservation for slot: ${slotId}`,
          slotId,
        };
      } else {
        // Check if reservation expired
        const expiresAt = new Date(verifyResult.reservation.expiresAt);
        if (expiresAt <= new Date()) {
          await reservationService.releaseSlot(slotId);
          return {
            success: false,
            error: `Reservation expired for slot: ${slotId}`,
            slotId,
          };
        }
      }

      // Confirm with SchedulingPro
      const result = await schedulingProIntegration.confirmSlot(slotId, bookingId);

      if (result.success) {
        // Remove from Redis reservations (now it's confirmed)
        await reservationService.releaseSlot(slotId);

        // Invalidate slots cache for this area
        this._invalidateSlotsCacheForSlot(slotId);

        logger.info('Slot confirmed', { slotId, bookingId });
      }

      return result;
    } catch (error) {
      logger.error('Slot confirmation failed', {
        slotId,
        bookingId,
        error,
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
      // Remove from Redis reservations
      const verifyResult = await reservationService.verifyReservation(slotId, bookingId);
      if (verifyResult.valid) {
        await reservationService.releaseSlot(slotId);
      }

      // Cancel with SchedulingPro
      const result = await schedulingProIntegration.cancelSlot(slotId, bookingId);

      if (result.success) {
        // Invalidate slots cache for this area
        this._invalidateSlotsCacheForSlot(slotId);

        logger.info('Slot cancelled', { slotId, bookingId });
      }

      return result;
    } catch (error) {
      logger.error('Slot cancellation failed', {
        slotId,
        bookingId,
        error,
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
      logger.error('Service availability check failed', {
        zipCode,
        error,
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
   * @returns {Promise<Array>} Current reservations
   */
  async getCurrentReservations() {
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
  }

  /**
   * Clear expired reservations (cleanup job)
   * Note: Redis TTL handles automatic cleanup, this is for monitoring
   * @returns {Promise<number>} Number of expired reservations being cleaned up
   */
  async cleanupExpiredReservations() {
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
