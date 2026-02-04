const { getRedisClient, redisHealthCheck } = require('../config/redis');

/**
 * Redis-based slot reservation service
 * Provides distributed slot locking for multi-instance deployments
 */
class ReservationService {
  constructor() {
    this.keyPrefix = 'slot:reservation:';
    this.defaultTTL = 300; // 5 minutes in seconds
  }

  /**
   * Reserve a slot with TTL
   * @param {string} slotId - Slot ID to reserve
   * @param {string} bookingId - Booking ID
   * @param {Object} additionalData - Additional reservation data (e.g., customerInfo)
   * @param {number} ttl - TTL in seconds (default: 300)
   * @returns {Promise<{success: boolean, error?: string, reservation?: Object}>}
   */
  async reserveSlot(slotId, bookingId, additionalData = {}, ttl = this.defaultTTL) {
    try {
      // Check if Redis is available
      const isHealthy = await redisHealthCheck();
      if (!isHealthy) {
        return {
          success: false,
          error: 'Redis unavailable - slot reservation degraded',
          degraded: true,
        };
      }

      const client = getRedisClient();
      const key = this._getKey(slotId);

      // Check if already reserved
      const existing = await client.get(key);
      if (existing) {
        const existingReservation = JSON.parse(existing);
        return {
          success: false,
          error: 'Slot is already reserved',
          reservedBy: existingReservation.bookingId,
          expiresAt: existingReservation.expiresAt,
        };
      }

      // Create reservation object
      const reservation = {
        slotId,
        bookingId,
        reservedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
        ...additionalData,
      };

      // Store in Redis with TTL (SET with EX option)
      await client.set(key, JSON.stringify(reservation), 'EX', ttl);

      return {
        success: true,
        reservation,
      };
    } catch (error) {
      // Redis error - graceful degradation
      return {
        success: false,
        error: `Redis error: ${error.message}`,
        degraded: true,
      };
    }
  }

  /**
   * Release a slot reservation
   * @param {string} slotId - Slot ID to release
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async releaseSlot(slotId) {
    try {
      const isHealthy = await redisHealthCheck();
      if (!isHealthy) {
        return {
          success: false,
          error: 'Redis unavailable',
          degraded: true,
        };
      }

      const client = getRedisClient();
      const key = this._getKey(slotId);

      await client.del(key);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Redis error: ${error.message}`,
        degraded: true,
      };
    }
  }

  /**
   * Check if a slot is currently reserved
   * @param {string} slotId - Slot ID to check
   * @returns {Promise<{isReserved: boolean, reservation?: Object, error?: string}>}
   */
  async isReserved(slotId) {
    try {
      const isHealthy = await redisHealthCheck();
      if (!isHealthy) {
        return {
          isReserved: false,
          error: 'Redis unavailable',
          degraded: true,
        };
      }

      const client = getRedisClient();
      const key = this._getKey(slotId);

      const data = await client.get(key);
      if (!data) {
        return { isReserved: false };
      }

      const reservation = JSON.parse(data);
      return {
        isReserved: true,
        reservation,
      };
    } catch (error) {
      return {
        isReserved: false,
        error: `Redis error: ${error.message}`,
        degraded: true,
      };
    }
  }

  /**
   * Get reservation details for a slot
   * @param {string} slotId - Slot ID
   * @returns {Promise<{success: boolean, reservation?: Object, error?: string}>}
   */
  async getReservation(slotId) {
    try {
      const isHealthy = await redisHealthCheck();
      if (!isHealthy) {
        return {
          success: false,
          error: 'Redis unavailable',
          degraded: true,
        };
      }

      const client = getRedisClient();
      const key = this._getKey(slotId);

      const data = await client.get(key);
      if (!data) {
        return {
          success: false,
          error: 'No reservation found',
        };
      }

      const reservation = JSON.parse(data);
      return {
        success: true,
        reservation,
      };
    } catch (error) {
      return {
        success: false,
        error: `Redis error: ${error.message}`,
        degraded: true,
      };
    }
  }

  /**
   * Verify a reservation belongs to a specific booking
   * @param {string} slotId - Slot ID
   * @param {string} bookingId - Booking ID to verify
   * @returns {Promise<{valid: boolean, reservation?: Object, error?: string}>}
   */
  async verifyReservation(slotId, bookingId) {
    try {
      const result = await this.getReservation(slotId);

      if (!result.success) {
        return {
          valid: false,
          error: result.error,
          degraded: result.degraded,
        };
      }

      const valid = result.reservation.bookingId === bookingId;
      return {
        valid,
        reservation: result.reservation,
        error: valid ? undefined : 'Booking ID mismatch',
      };
    } catch (error) {
      return {
        valid: false,
        error: `Verification error: ${error.message}`,
      };
    }
  }

  /**
   * Extend reservation TTL
   * @param {string} slotId - Slot ID
   * @param {number} additionalSeconds - Additional seconds to add
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async extendReservation(slotId, additionalSeconds) {
    try {
      const isHealthy = await redisHealthCheck();
      if (!isHealthy) {
        return {
          success: false,
          error: 'Redis unavailable',
          degraded: true,
        };
      }

      const client = getRedisClient();
      const key = this._getKey(slotId);

      // Get current reservation
      const data = await client.get(key);
      if (!data) {
        return {
          success: false,
          error: 'No reservation found to extend',
        };
      }

      const reservation = JSON.parse(data);

      // Update expiration time
      reservation.expiresAt = new Date(
        new Date(reservation.expiresAt).getTime() + additionalSeconds * 1000
      ).toISOString();

      // Get current TTL and add additional seconds
      const currentTTL = await client.ttl(key);
      const newTTL = currentTTL + additionalSeconds;

      // Update in Redis with new TTL
      await client.set(key, JSON.stringify(reservation), 'EX', newTTL);

      return {
        success: true,
        reservation,
      };
    } catch (error) {
      return {
        success: false,
        error: `Redis error: ${error.message}`,
        degraded: true,
      };
    }
  }

  /**
   * Get all current reservations (for debugging/monitoring)
   * @returns {Promise<{success: boolean, reservations?: Array, error?: string}>}
   */
  async getAllReservations() {
    try {
      const isHealthy = await redisHealthCheck();
      if (!isHealthy) {
        return {
          success: false,
          error: 'Redis unavailable',
          degraded: true,
        };
      }

      const client = getRedisClient();
      const pattern = `${this.keyPrefix}*`;

      // Get all reservation keys
      const keys = await client.keys(pattern);

      if (keys.length === 0) {
        return {
          success: true,
          reservations: [],
        };
      }

      // Get all reservation data
      const reservations = [];
      for (const key of keys) {
        const data = await client.get(key);
        if (data) {
          const reservation = JSON.parse(data);
          const ttl = await client.ttl(key);
          reservations.push({
            ...reservation,
            ttlSeconds: ttl,
          });
        }
      }

      return {
        success: true,
        reservations,
      };
    } catch (error) {
      return {
        success: false,
        error: `Redis error: ${error.message}`,
        degraded: true,
      };
    }
  }

  /**
   * Clean up expired reservations (manual cleanup - Redis TTL handles automatic cleanup)
   * This is mainly for monitoring purposes
   * @returns {Promise<{success: boolean, cleaned?: number, error?: string}>}
   */
  async cleanupExpired() {
    // Redis TTL automatically handles cleanup, but we can scan for consistency
    try {
      const result = await this.getAllReservations();
      if (!result.success) {
        return result;
      }

      // Count how many will expire soon (< 10 seconds)
      const expiringSoon = result.reservations.filter((r) => r.ttlSeconds < 10).length;

      return {
        success: true,
        cleaned: expiringSoon,
        message: 'Redis TTL handles automatic cleanup',
      };
    } catch (error) {
      return {
        success: false,
        error: `Cleanup check error: ${error.message}`,
      };
    }
  }

  /**
   * Generate Redis key for a slot
   * @param {string} slotId
   * @returns {string}
   * @private
   */
  _getKey(slotId) {
    return `${this.keyPrefix}${slotId}`;
  }
}

// Export singleton instance
module.exports = new ReservationService();
