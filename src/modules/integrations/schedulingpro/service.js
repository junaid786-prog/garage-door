const env = require('../../../config/env');
const geoService = require('../../geo/service');
const logger = require('../../../utils/logger');
const {
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ValidationError,
  ExternalServiceError,
} = require('../../../utils/errors');

/**
 * SchedulingPro integration service
 * Simulates SchedulingPro API for appointment scheduling and slot management
 *
 * This is a simulation service that mimics the real SchedulingPro API.
 * When real API credentials are available, replace this with actual API calls.
 */
class SchedulingProService {
  constructor() {
    this.baseURL = env.SCHEDULINGPRO_API_URL || 'https://api.schedulingpro.com';
    this.apiKey = env.SCHEDULINGPRO_API_KEY || 'sim_schedulingpro_key_12345';
    this.tenantId = env.SCHEDULINGPRO_TENANT_ID || 'sim_tenant_67890';

    // Simulation state
    this.bookedSlots = new Map(); // slotId -> bookingInfo
    this.reservedSlots = new Map(); // slotId -> { reservedAt, expiresAt, bookingId }

    // Arizona timezone
    this.timezone = 'America/Phoenix';

    // Working hours (9 AM to 5 PM, 2-hour slots)
    this.workingHours = {
      start: 9, // 9 AM
      end: 17, // 5 PM
      slotDuration: 2, // 2 hours
    };

    // Service areas will be loaded from geo module
    this.serviceableZips = geoService.getServiceableZipCodes();
  }

  /**
   * Authenticate with SchedulingPro API
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate() {
    // Simulate authentication delay
    await this._simulateDelay(150);

    // Simulate authentication scenarios
    if (this.apiKey === 'invalid_key') {
      throw new UnauthorizedError('Authentication failed: Invalid API key');
    }

    return {
      success: true,
      token: `schedulingpro_token_${Date.now()}`,
      expiresIn: 3600,
      authenticated: true,
    };
  }

  /**
   * Get available time slots for a ZIP code and date range
   * @param {string} zipCode - Service area ZIP code
   * @param {Date} startDate - Start date for slot search
   * @param {Date} endDate - End date for slot search (optional, defaults to 7 days)
   * @returns {Promise<Object>} Available slots
   */
  async getAvailableSlots(zipCode, startDate, endDate = null) {
    // Validate ZIP code
    if (!this.serviceableZips.includes(zipCode)) {
      throw new ValidationError(`Service not available in ZIP code: ${zipCode}`);
    }

    // Set default end date (7 days from start)
    if (!endDate) {
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
    }

    // Simulate API delay
    await this._simulateDelay(600);

    // Simulate different scenarios based on ZIP code
    await this._simulateErrorScenarios(zipCode);

    const slots = this._generateSlotsForDateRange(zipCode, startDate, endDate);
    const timezone = geoService.getTimezoneForZip(zipCode);

    return {
      success: true,
      zipCode,
      timezone: timezone,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalSlots: slots.length,
      availableSlots: slots.filter((slot) => slot.available).length,
      slots,
    };
  }

  /**
   * Reserve a time slot temporarily
   * @param {string} slotId - Slot ID to reserve
   * @param {string} bookingId - Temporary booking ID
   * @param {number} reservationMinutes - Reservation duration in minutes (default 15)
   * @returns {Promise<Object>} Reservation result
   */
  async reserveSlot(slotId, bookingId, reservationMinutes = 15) {
    await this._simulateDelay(300);

    // Check if slot exists and is available
    const slot = this._findSlotById(slotId);
    if (!slot) {
      throw new NotFoundError(`Slot not found: ${slotId}`);
    }

    if (!slot.available) {
      throw new ConflictError(`Slot is not available: ${slotId}`);
    }

    // Check if already reserved
    if (this.reservedSlots.has(slotId)) {
      const existing = this.reservedSlots.get(slotId);
      if (existing.expiresAt > new Date()) {
        throw new ConflictError(
          `Slot is already reserved until ${existing.expiresAt.toISOString()}`
        );
      }
      // Expired reservation, can be overridden
      this.reservedSlots.delete(slotId);
    }

    // Create reservation
    const reservedAt = new Date();
    const expiresAt = new Date(reservedAt.getTime() + reservationMinutes * 60 * 1000);

    const reservation = {
      slotId,
      bookingId,
      reservedAt,
      expiresAt,
      reservationMinutes,
    };

    this.reservedSlots.set(slotId, reservation);

    logger.info(`[SchedulingPro] Slot reserved: ${slotId} for ${reservationMinutes} minutes`);

    return {
      success: true,
      reservation,
      slot: {
        id: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        displayTime: slot.displayTime,
      },
    };
  }

  /**
   * Confirm a reserved slot (convert reservation to booking)
   * @param {string} slotId - Slot ID to confirm
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmSlot(slotId, bookingId) {
    await this._simulateDelay(400);

    // Check reservation exists and is valid
    const reservation = this.reservedSlots.get(slotId);
    if (!reservation) {
      throw new NotFoundError(`No reservation found for slot: ${slotId}`);
    }

    if (reservation.expiresAt <= new Date()) {
      this.reservedSlots.delete(slotId);
      throw new ConflictError(`Reservation expired for slot: ${slotId}`);
    }

    if (reservation.bookingId !== bookingId) {
      throw new ConflictError(`Booking ID mismatch for slot: ${slotId}`);
    }

    // Convert reservation to booking
    this.bookedSlots.set(slotId, {
      bookingId,
      confirmedAt: new Date(),
      originalReservation: reservation,
    });

    // Remove from reservations
    this.reservedSlots.delete(slotId);

    logger.info(`[SchedulingPro] Slot confirmed: ${slotId} for booking: ${bookingId}`);

    return {
      success: true,
      slotId,
      bookingId,
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
    };
  }

  /**
   * Cancel a reservation or booking
   * @param {string} slotId - Slot ID to cancel
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelSlot(slotId, bookingId) {
    await this._simulateDelay(300);

    let cancelledType = null;
    let cancelledData = null;

    // Check if it's a reservation
    if (this.reservedSlots.has(slotId)) {
      const reservation = this.reservedSlots.get(slotId);
      if (reservation.bookingId === bookingId) {
        this.reservedSlots.delete(slotId);
        cancelledType = 'reservation';
        cancelledData = reservation;
      }
    }

    // Check if it's a confirmed booking
    if (this.bookedSlots.has(slotId)) {
      const booking = this.bookedSlots.get(slotId);
      if (booking.bookingId === bookingId) {
        this.bookedSlots.delete(slotId);
        cancelledType = 'booking';
        cancelledData = booking;
      }
    }

    if (!cancelledType) {
      throw new NotFoundError(
        `No reservation or booking found for slot: ${slotId} with booking ID: ${bookingId}`
      );
    }

    logger.info(`[SchedulingPro] ${cancelledType} cancelled: ${slotId} for booking: ${bookingId}`);

    return {
      success: true,
      slotId,
      bookingId,
      cancelledType,
      cancelledAt: new Date().toISOString(),
    };
  }

  /**
   * Get SchedulingPro health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    await this._simulateDelay(100);

    return {
      status: 'healthy',
      version: 'simulation-v1.0.0',
      timezone: this.timezone,
      serviceableZips: this.serviceableZips.length,
      activeReservations: this.reservedSlots.size,
      confirmedBookings: this.bookedSlots.size,
      workingHours: this.workingHours,
    };
  }

  // Private helper methods

  /**
   * Generate slots for date range
   * @param {string} zipCode
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Array} Generated slots
   * @private
   */
  _generateSlotsForDateRange(zipCode, startDate, endDate) {
    const slots = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const daySlots = this._generateSlotsForDate(zipCode, currentDate);
      slots.push(...daySlots);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  /**
   * Generate slots for a specific date
   * @param {string} zipCode
   * @param {Date} date
   * @returns {Array} Day slots
   * @private
   */
  _generateSlotsForDate(zipCode, date) {
    const slots = [];
    const { start, end, slotDuration } = this.workingHours;

    // Skip weekends for now (can be made configurable)
    if (date.getDay() === 0 || date.getDay() === 6) {
      return slots;
    }

    // Generate 2-hour slots
    for (let hour = start; hour < end; hour += slotDuration) {
      const slotId = this._generateSlotId(date, hour);
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + slotDuration).toString().padStart(2, '0')}:00`;

      // Check availability (not reserved or booked)
      const available =
        !this.reservedSlots.has(slotId) &&
        !this.bookedSlots.has(slotId) &&
        this._isSlotAvailable(zipCode, date, hour);

      slots.push({
        id: slotId,
        date: date.toISOString().split('T')[0],
        startTime,
        endTime,
        displayTime: this._formatDisplayTime(hour, hour + slotDuration),
        timezone: this.timezone,
        available,
        technicianId: this._assignTechnician(zipCode),
        zipCode,
      });
    }

    return slots;
  }

  /**
   * Check if slot is available based on business rules
   * @param {string} zipCode
   * @param {Date} date
   * @param {number} hour
   * @returns {boolean}
   * @private
   */
  _isSlotAvailable(zipCode, date, hour) {
    // Don't allow past slots
    const now = new Date();
    const slotDateTime = new Date(date);
    slotDateTime.setHours(hour, 0, 0, 0);

    if (slotDateTime <= now) {
      return false;
    }

    // Simulate different availability by ZIP code
    const zipSeed = parseInt(zipCode) % 100;
    const dateSeed = date.getDate();
    const hourSeed = hour;

    // Some randomness in availability (85% available overall)
    const availability = (zipSeed + dateSeed + hourSeed) % 100;
    return availability < 85;
  }

  /**
   * Format display time
   * @param {number} startHour
   * @param {number} endHour
   * @returns {string}
   * @private
   */
  _formatDisplayTime(startHour, endHour) {
    const formatHour = (hour) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:00 ${period}`;
    };

    return `${formatHour(startHour)} - ${formatHour(endHour)}`;
  }

  /**
   * Generate slot ID
   * @param {Date} date
   * @param {number} hour
   * @returns {string}
   * @private
   */
  _generateSlotId(date, hour) {
    const dateStr = date.toISOString().split('T')[0];
    return `slot_${dateStr}_${hour.toString().padStart(2, '0')}00`;
  }

  /**
   * Find slot by ID
   * @param {string} slotId
   * @returns {Object|null}
   * @private
   */
  _findSlotById(slotId) {
    // Parse slot ID to recreate slot
    const parts = slotId.match(/slot_(\d{4}-\d{2}-\d{2})_(\d{2})00/);
    if (!parts) return null;

    const date = new Date(parts[1]);
    const hour = parseInt(parts[2]);

    // Find ZIP code from existing reservations/bookings or use default
    let zipCode = '85001'; // Default

    // Try to find ZIP from other context if needed
    const slots = this._generateSlotsForDate(zipCode, date);
    return slots.find((slot) => slot.id === slotId);
  }

  /**
   * Assign technician based on ZIP code
   * @param {string} zipCode
   * @returns {string}
   * @private
   */
  _assignTechnician(zipCode) {
    const zipNum = parseInt(zipCode);
    if (zipNum >= 85001 && zipNum <= 85099) {
      return 'tech_phoenix_01';
    } else if (zipNum >= 85251 && zipNum <= 85260) {
      return 'tech_scottsdale_01';
    } else if (zipNum >= 85301 && zipNum <= 85310) {
      return 'tech_glendale_01';
    }
    return 'tech_metro_01';
  }

  /**
   * Simulate API delay
   * @param {number} ms
   * @private
   */
  async _simulateDelay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Simulate error scenarios
   * @param {string} zipCode
   * @private
   */
  async _simulateErrorScenarios(zipCode) {
    // Simulate random API failures (3% chance)
    if (Math.random() < 0.03) {
      throw new ExternalServiceError(
        'SchedulingPro API temporarily unavailable',
        'SchedulingPro',
        'SERVICE_UNAVAILABLE',
        true
      );
    }

    // Simulate specific error cases
    if (zipCode === '00000') {
      throw new ValidationError('Invalid ZIP code format');
    }

    if (zipCode === '99999') {
      throw new NotFoundError('No technicians available in this area');
    }
  }
}

module.exports = new SchedulingProService();
