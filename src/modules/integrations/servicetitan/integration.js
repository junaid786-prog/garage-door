const serviceTitanService = require('./service');
const logger = require('../../../utils/logger');

/**
 * ServiceTitan integration wrapper for internal use
 * This is the interface that other modules (like bookings) should use
 */
class ServiceTitanIntegration {
  /**
   * Create a ServiceTitan job from booking data
   * @param {Object} bookingData - Booking information
   * @returns {Promise<Object>} ServiceTitan job result
   */
  async createJobFromBooking(bookingData) {
    try {
      // Map booking data to ServiceTitan format
      const serviceTitanData = this._mapBookingToServiceTitan(bookingData);

      // Authenticate with ServiceTitan (cached in real implementation)
      await serviceTitanService.authenticate();

      // Create the job
      const job = await serviceTitanService.createJob(serviceTitanData);

      return {
        success: true,
        serviceTitanJobId: job.id,
        jobNumber: job.jobNumber,
        status: job.status,
        priority: job.priority,
        estimatedDuration: job.estimatedDuration,
        businessUnit: job.businessUnit,
        createdAt: job.createdAt,
      };
    } catch (error) {
      logger.error('ServiceTitan job creation failed', {
        bookingId: bookingData.id,
        error,
      });

      return {
        success: false,
        error: error.message,
        shouldRetry: this._shouldRetryError(error),
      };
    }
  }

  /**
   * Update ServiceTitan job status
   * @param {number} serviceTitanJobId - ServiceTitan job ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Update result
   */
  async updateJobStatus(serviceTitanJobId, status) {
    try {
      const updatedJob = await serviceTitanService.updateJobStatus(serviceTitanJobId, status);

      return {
        success: true,
        jobId: updatedJob.id,
        status: updatedJob.status,
        updatedAt: updatedJob.updatedAt,
      };
    } catch (error) {
      logger.error('ServiceTitan status update failed', {
        jobId: serviceTitanJobId,
        status,
        error,
      });

      return {
        success: false,
        error: error.message,
        shouldRetry: this._shouldRetryError(error),
      };
    }
  }

  /**
   * Cancel ServiceTitan job
   * @param {number} serviceTitanJobId - ServiceTitan job ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelJob(serviceTitanJobId, reason = 'Customer cancelled') {
    try {
      const cancelledJob = await serviceTitanService.cancelJob(serviceTitanJobId, reason);

      return {
        success: true,
        jobId: cancelledJob.id,
        status: cancelledJob.status,
        cancellationReason: cancelledJob.cancellationReason,
        cancelledAt: cancelledJob.cancelledAt,
      };
    } catch (error) {
      logger.error('ServiceTitan job cancellation failed', {
        jobId: serviceTitanJobId,
        reason,
        error,
      });

      return {
        success: false,
        error: error.message,
        shouldRetry: this._shouldRetryError(error),
      };
    }
  }

  /**
   * Get ServiceTitan job details
   * @param {number} serviceTitanJobId - ServiceTitan job ID
   * @returns {Promise<Object>} Job details
   */
  async getJob(serviceTitanJobId) {
    try {
      const job = await serviceTitanService.getJob(serviceTitanJobId);

      return {
        success: true,
        job: {
          id: job.id,
          jobNumber: job.jobNumber,
          status: job.status,
          priority: job.priority,
          description: job.description,
          customer: job.customer,
          location: job.location,
          scheduledDate: job.scheduledDate,
          estimatedDuration: job.estimatedDuration,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Test ServiceTitan connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      const authResult = await serviceTitanService.authenticate();
      const health = await serviceTitanService.getHealthStatus();

      return {
        success: true,
        authenticated: authResult.authenticated,
        health: health.status,
        jobsCreated: health.jobsCreated,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Map booking data to ServiceTitan format
   * @param {Object} bookingData - Booking data
   * @returns {Object} ServiceTitan formatted data
   * @private
   */
  _mapBookingToServiceTitan(bookingData) {
    // Extract first and last name from contactName if individual fields not provided
    let firstName = bookingData.firstName || bookingData.first_name;
    let lastName = bookingData.lastName || bookingData.last_name;

    // If no firstName/lastName but we have contactName, split it
    if (!firstName && !lastName && bookingData.contactName) {
      const nameParts = bookingData.contactName.split(' ');
      firstName = nameParts[0] || 'Customer';
      lastName = nameParts.slice(1).join(' ') || 'Unknown';
    }

    // Fallback if still no names
    if (!firstName) firstName = 'Customer';
    if (!lastName) lastName = 'Unknown';

    // Map phone number format (remove formatting)
    let phone = bookingData.phone || bookingData.phoneE164;
    if (phone && phone.startsWith('+1')) {
      phone = phone.substring(2); // Remove +1 for ServiceTitan
    }
    if (phone) {
      phone = phone.replace(/\D/g, ''); // Remove all non-digits
    }

    // Map problem type from service data
    let problemType = bookingData.problemType;
    if (!problemType && bookingData.serviceType) {
      problemType = bookingData.serviceType === 'replacement' ? 'new_door_installation' : 'other';
    }
    if (!problemType && bookingData.serviceSymptom) {
      const symptomMap = {
        spring_bang: 'broken_spring',
        wont_open: 'door_wont_open',
        wont_close: 'door_wont_close',
        tune_up: 'tune_up',
        other: 'other',
      };
      problemType = symptomMap[bookingData.serviceSymptom] || 'other';
    }

    return {
      // Booking reference
      bookingId: bookingData.id,

      // Customer information
      firstName,
      lastName,
      phone,
      email: bookingData.email || 'no-email@provided.com',
      customerType: bookingData.customerType || 'residential',

      // Service location
      address: bookingData.address || bookingData.street || bookingData.streetAddress,
      city: bookingData.city,
      state: bookingData.state,
      zip: bookingData.zip || bookingData.zipCode,
      coordinates: bookingData.coordinates,

      // Job details
      problemType: problemType || 'other',
      doorCount: parseInt(
        bookingData.doorCount || bookingData.numberOfDoors || bookingData.door?.count || 1
      ),
      doorAge: bookingData.doorAge || (bookingData.doorAgeBucket === 'gte_8' ? 10 : 5),
      isRenter: bookingData.isRenter || bookingData.occupancyType === 'renter',

      // Scheduling
      scheduledDate:
        bookingData.scheduledDate || bookingData.appointmentDate || new Date().toISOString(),
      timeSlot: bookingData.timeSlot || bookingData.preferredTime || 'TBD',

      // Additional information
      specialInstructions: bookingData.specialInstructions || bookingData.notes || '',
      campaignId: bookingData.campaignId,
      source: 'online_booking_widget',
    };
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

    return retryableErrors.some((errorText) =>
      error.message.toLowerCase().includes(errorText.toLowerCase())
    );
  }
}

module.exports = new ServiceTitanIntegration();
