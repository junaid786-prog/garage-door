const mockApiService = require('../mock-api/service');
const eventService = require('../events/service');

/**
 * Booking service - contains business logic
 */
class BookingService {
  /**
   * Create new booking
   * @param {Object} bookingData - Booking information
   * @returns {Promise<Object>} Created booking with confirmation
   */
  async createBooking(bookingData) {
    try {
      // Generate booking ID
      const bookingId = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create booking object
      const booking = {
        id: bookingId,
        ...bookingData,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Track booking creation event
      await eventService.track('booking_created', {
        bookingId: booking.id,
        serviceType: booking.serviceType,
        customerEmail: booking.customerEmail,
      });

      // Call mock ServiceTitan API
      const apiResponse = await mockApiService.createServiceJob(booking);

      // Track API call event
      await eventService.track('servicetitan_api_called', {
        bookingId: booking.id,
        endpoint: 'createServiceJob',
        success: apiResponse.success,
      });

      // Return booking confirmation
      return {
        booking: {
          id: booking.id,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          serviceType: booking.serviceType,
          preferredDateTime: booking.preferredDateTime,
          status: booking.status,
          createdAt: booking.createdAt,
        },
        serviceTitanJobId: apiResponse.jobId,
        confirmationMessage: `Booking ${booking.id} created successfully`,
      };
    } catch (error) {
      // Track error event
      await eventService.track('booking_error', {
        error: error.message,
        bookingData: {
          serviceType: bookingData.serviceType,
          customerEmail: bookingData.customerEmail,
        },
      });

      throw error;
    }
  }

  /**
   * Get booking by ID (mock implementation)
   * @param {string} bookingId
   * @returns {Promise<Object|null>}
   */
  async getBookingById(bookingId) {
    // In pilot: return mock data
    // In production: query from database
    return {
      id: bookingId,
      status: 'pending',
      message: 'Mock booking data - database not implemented in pilot',
    };
  }
}

module.exports = new BookingService();
