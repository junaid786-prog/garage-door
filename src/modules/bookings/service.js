const Booking = require('../../database/models/Booking');
const { Op, UniqueConstraintError } = require('sequelize');
const serviceTitanIntegration = require('../integrations/servicetitan/integration');
const schedulingService = require('../scheduling/service');
const env = require('../../config/env');
const { withTransaction } = require('../../utils/transaction');
const { ConflictError } = require('../../utils/errors');
const logger = require('../../utils/logger');
const errorLogService = require('../../services/errorLogService');

/**
 * Booking service - handles booking business logic
 */
class BookingService {
  /**
   * Create a new booking
   * @param {Object} bookingData - Booking form data
   * @returns {Promise<Object>} Created booking
   */
  async createBooking(bookingData) {
    try {
      // Wrap booking creation in a transaction for atomicity
      // This is now sync-only (no external API calls) for fast response (<500ms)
      return await withTransaction(
        async (transaction) => {
          // Transform nested form data to flat model structure
          const flatData = this._transformFormToModel(bookingData);

          // Create booking in database within transaction
          // This may throw UniqueConstraintError if slot is already booked
          const booking = await Booking.create(flatData, { transaction });

          logger.info('Booking created successfully', {
            bookingId: booking.id,
            slotId: booking.slotId,
            serviceType: booking.serviceType,
          });

          // NOTE: External integrations (ServiceTitan, slot confirmation) are handled
          // asynchronously via background jobs for fast response time.
          // The controller will queue these jobs after this method returns.

          // Transaction will auto-commit if we reach here
          return booking;
        },
        { timeout: 5000 }
      ); // 5 second timeout for sync-only booking creation (reduced from 30s)
    } catch (error) {
      // Handle unique constraint violation (double-booking)
      if (error instanceof UniqueConstraintError) {
        // Log the error fields for debugging
        logger.warn('Unique constraint violation - slot already booked', {
          fields: error.fields,
          message: error.message,
          parent: error.parent?.detail
        });

        // Check if it's the slot_id constraint
        if (error.fields && error.fields.slot_id) {
          throw new ConflictError(
            'This time slot is no longer available. Please select a different time slot.'
          );
        }

        // Check if it's the service_titan_job_id constraint
        if (error.fields && error.fields.service_titan_job_id) {
          throw new ConflictError(
            'ServiceTitan job ID conflict. Please try again.'
          );
        }

        // Generic unique constraint error
        throw new ConflictError('This booking conflicts with an existing booking.');
      }

      // Handle ConflictError (already processed, just re-throw)
      if (error instanceof ConflictError) {
        throw error;
      }

      // Log all other critical booking failures
      logger.error('Critical booking creation failure', {
        error: error.message,
        stack: error.stack,
        bookingData: { serviceType: bookingData.serviceType }, // Minimal data, no PII
      });

      // Log to error_logs table for investigation and recovery
      try {
        await errorLogService.logError({
          errorType: 'BOOKING_CREATION_FAILED',
          operation: 'createBooking',
          serviceName: null,
          context: {
            serviceType: bookingData.serviceType,
            hasSlotId: !!bookingData.slotId,
            // No PII
          },
          error,
          retryable: true,
        });
      } catch (logError) {
        // If error logging fails, just log to file (already done above)
        logger.error('Failed to log booking error to database', {
          logError: logError.message,
        });
      }

      throw new Error(`Failed to create booking: ${error.message}`);
    }
  }

  /**
   * Get booking by ID
   * @param {string} id - Booking ID (UUID)
   * @returns {Promise<Object|null>} Booking or null if not found
   */
  async getBookingById(id) {
    try {
      const booking = await Booking.findByPk(id);

      if (booking) {
        return this._transformModelToResponse(booking);
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to get booking: ${error.message}`);
    }
  }

  /**
   * Get bookings with filters and pagination
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Paginated bookings result
   */
  async getBookings(filters = {}) {
    try {
      const {
        status,
        phone,
        zip,
        serviceType,
        limit = 20,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC',
      } = filters;

      // Build where clause
      const whereClause = {};

      if (status) {
        whereClause.status = status;
      }

      if (phone) {
        whereClause.phoneE164 = phone;
      }

      if (zip) {
        whereClause.zip = zip;
      }

      if (serviceType) {
        whereClause.serviceType = serviceType;
      }

      // Execute query with pagination
      const { rows: bookings, count: total } = await Booking.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sortBy, sortOrder]],
      });

      // Transform bookings to response format
      const transformedBookings = bookings.map((booking) =>
        this._transformModelToResponse(booking)
      );

      return {
        bookings: transformedBookings,
        pagination: {
          total,
          page: Math.floor(offset / limit) + 1,
          pageSize: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to get bookings: ${error.message}`);
    }
  }

  /**
   * Update booking
   * @param {string} id - Booking ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} Updated booking or null if not found
   */
  async updateBooking(id, updateData) {
    try {
      // Wrap update in transaction for atomicity
      return await withTransaction(async (transaction) => {
        const booking = await Booking.findByPk(id, { transaction });

        if (!booking) {
          return null;
        }

        // Transform nested form data to flat model structure
        const flatData = this._transformFormToModel(updateData);

        // Update booking within transaction
        await booking.update(flatData, { transaction });

        return this._transformModelToResponse(booking);
      });
    } catch (error) {
      throw new Error(`Failed to update booking: ${error.message}`);
    }
  }

  /**
   * Update booking status
   * @param {string} id - Booking ID
   * @param {string} status - New status
   * @returns {Promise<Object|null>} Updated booking or null if not found
   */
  async updateBookingStatus(id, status) {
    try {
      const booking = await Booking.findByPk(id);

      if (!booking) {
        return null;
      }

      await booking.update({ status });

      return this._transformModelToResponse(booking);
    } catch (error) {
      throw new Error(`Failed to update booking status: ${error.message}`);
    }
  }

  /**
   * Delete booking (soft delete by marking as cancelled)
   * @param {string} id - Booking ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteBooking(id) {
    try {
      const booking = await Booking.findByPk(id);

      if (!booking) {
        return false;
      }

      await booking.update({ status: 'cancelled' });
      return true;
    } catch (error) {
      throw new Error(`Failed to delete booking: ${error.message}`);
    }
  }

  /**
   * Link booking to ServiceTitan job
   * @param {string} id - Booking ID
   * @param {string} serviceTitanJobId - ServiceTitan job ID
   * @returns {Promise<Object|null>} Updated booking or null if not found
   */
  async linkServiceTitanJob(id, serviceTitanJobId) {
    try {
      const booking = await Booking.findByPk(id);

      if (!booking) {
        return null;
      }

      await booking.update({ serviceTitanJobId });

      return this._transformModelToResponse(booking);
    } catch (error) {
      throw new Error(`Failed to link ServiceTitan job: ${error.message}`);
    }
  }

  /**
   * Get bookings by phone number
   * @param {string} phoneE164 - Phone number in E.164 format
   * @returns {Promise<Array>} Array of bookings
   */
  async getBookingsByPhone(phoneE164) {
    try {
      const bookings = await Booking.findAll({
        where: { phoneE164 },
        order: [['created_at', 'DESC']],
      });

      return bookings.map((booking) => this._transformModelToResponse(booking));
    } catch (error) {
      throw new Error(`Failed to get bookings by phone: ${error.message}`);
    }
  }

  /**
   * Update ServiceTitan job status for a booking
   * @param {string} bookingId - Booking ID
   * @param {string} status - New ServiceTitan status
   * @returns {Promise<Object>} Updated booking
   */
  async updateServiceTitanStatus(bookingId, status) {
    try {
      const booking = await Booking.findByPk(bookingId);

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (!booking.serviceTitanJobId) {
        throw new Error('No ServiceTitan job ID associated with this booking');
      }

      // Update status in ServiceTitan
      const result = await serviceTitanIntegration.updateJobStatus(
        booking.serviceTitanJobId,
        status
      );

      if (result.success) {
        // Update booking status
        await booking.update({
          serviceTitanStatus: result.status,
          updatedAt: new Date(),
        });

        logger.info('ServiceTitan status updated', {
          bookingId,
          serviceTitanJobId: booking.serviceTitanJobId,
          status: result.status,
        });
      } else {
        logger.error('ServiceTitan status update failed', {
          bookingId,
          serviceTitanJobId: booking.serviceTitanJobId,
          error: result.error,
        });

        throw new Error(`ServiceTitan status update failed: ${result.error}`);
      }

      return this._transformModelToResponse(booking);
    } catch (error) {
      throw new Error(`Failed to update ServiceTitan status: ${error.message}`);
    }
  }

  /**
   * Cancel ServiceTitan job for a booking
   * @param {string} bookingId - Booking ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Updated booking
   */
  async cancelServiceTitanJob(bookingId, reason = 'Customer cancelled') {
    try {
      const booking = await Booking.findByPk(bookingId);

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (!booking.serviceTitanJobId) {
        throw new Error('No ServiceTitan job ID associated with this booking');
      }

      // Cancel job in ServiceTitan
      const result = await serviceTitanIntegration.cancelJob(booking.serviceTitanJobId, reason);

      if (result.success) {
        // Update booking status
        await booking.update({
          status: 'cancelled',
          serviceTitanStatus: result.status,
          serviceTitanError: null, // Clear any previous errors
          updatedAt: new Date(),
        });

        logger.info('ServiceTitan job cancelled', {
          bookingId,
          serviceTitanJobId: booking.serviceTitanJobId,
          reason: result.cancellationReason,
        });
      } else {
        logger.error('ServiceTitan job cancellation failed', {
          bookingId,
          serviceTitanJobId: booking.serviceTitanJobId,
          error: result.error,
        });

        throw new Error(`ServiceTitan job cancellation failed: ${result.error}`);
      }

      return this._transformModelToResponse(booking);
    } catch (error) {
      throw new Error(`Failed to cancel ServiceTitan job: ${error.message}`);
    }
  }

  /**
   * Retry failed ServiceTitan job creation
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Updated booking
   */
  async retryServiceTitanJob(bookingId) {
    try {
      const booking = await Booking.findByPk(bookingId);

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.serviceTitanJobId) {
        throw new Error('ServiceTitan job already exists for this booking');
      }

      // Reconstruct booking data for ServiceTitan
      const bookingData = this._transformModelToResponse(booking);

      // Attempt to create ServiceTitan job
      const result = await serviceTitanIntegration.createJobFromBooking({
        id: booking.id,
        ...bookingData,
      });

      if (result.success) {
        // Update booking with ServiceTitan job info
        await booking.update({
          serviceTitanJobId: result.serviceTitanJobId,
          serviceTitanJobNumber: result.jobNumber,
          serviceTitanStatus: result.status,
          serviceTitanError: null, // Clear any previous errors
        });

        logger.info('ServiceTitan job retry successful', {
          bookingId,
          serviceTitanJobId: result.serviceTitanJobId,
          jobNumber: result.jobNumber,
        });
      } else {
        await booking.update({
          serviceTitanStatus: 'failed',
          serviceTitanError: result.error,
        });

        throw new Error(`ServiceTitan job retry failed: ${result.error}`);
      }

      return this._transformModelToResponse(booking);
    } catch (error) {
      throw new Error(`Failed to retry ServiceTitan job: ${error.message}`);
    }
  }

  /**
   * Get ServiceTitan job details for a booking
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} ServiceTitan job details
   */
  async getServiceTitanJobDetails(bookingId) {
    try {
      const booking = await Booking.findByPk(bookingId);

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (!booking.serviceTitanJobId) {
        throw new Error('No ServiceTitan job ID associated with this booking');
      }

      const result = await serviceTitanIntegration.getJob(booking.serviceTitanJobId);

      if (!result.success) {
        throw new Error(`Failed to get ServiceTitan job details: ${result.error}`);
      }

      return {
        bookingId,
        serviceTitan: result.job,
      };
    } catch (error) {
      throw new Error(`Failed to get ServiceTitan job details: ${error.message}`);
    }
  }

  /**
   * Transform form data structure to flat model structure
   * @private
   * @param {Object} formData - Nested form data
   * @returns {Object} Flat model data
   */
  _transformFormToModel(formData) {
    const modelData = {};

    // Service fields
    if (formData.service) {
      if (formData.service.type) modelData.serviceType = formData.service.type;
      if (formData.service.symptom) modelData.serviceSymptom = formData.service.symptom;
      if (formData.service.can_open_close) modelData.canOpenClose = formData.service.can_open_close;
    }

    // Door fields
    if (formData.door) {
      if (formData.door.age_bucket) modelData.doorAgeBucket = formData.door.age_bucket;
      if (formData.door.count) modelData.doorCount = formData.door.count;
    }

    // Replacement preference
    if (formData.replacement_pref !== undefined) {
      modelData.replacementPref = formData.replacement_pref;
    }

    // Address fields
    if (formData.address) {
      if (formData.address.street) modelData.street = formData.address.street;
      if (formData.address.unit !== undefined) modelData.unit = formData.address.unit;
      if (formData.address.city) modelData.city = formData.address.city;
      if (formData.address.state) modelData.state = formData.address.state;
      if (formData.address.zip) modelData.zip = formData.address.zip;
    }

    // Occupancy fields
    if (formData.occupancy) {
      if (formData.occupancy.type) modelData.occupancyType = formData.occupancy.type;
      if (formData.occupancy.renterPermission !== undefined) {
        modelData.renterPermission = formData.occupancy.renterPermission;
      }
    }

    // Contact fields
    if (formData.contact) {
      if (formData.contact.phoneE164) modelData.phoneE164 = formData.contact.phoneE164;
      if (formData.contact.name) modelData.contactName = formData.contact.name;
    }

    // Scheduling fields
    if (formData.scheduling) {
      if (formData.scheduling.slot_id) modelData.slotId = formData.scheduling.slot_id;
      if (formData.scheduling.asap_selected !== undefined) {
        modelData.asapSelected = formData.scheduling.asap_selected;
      }
      if (formData.scheduling.priority_score !== undefined) {
        modelData.priorityScore = formData.scheduling.priority_score;
      }
    }

    // Notes and issues
    if (formData.notes !== undefined) modelData.notes = formData.notes;
    if (formData.suspected_issue !== undefined) modelData.suspectedIssue = formData.suspected_issue;

    // Status (for updates)
    if (formData.status) modelData.status = formData.status;

    return modelData;
  }

  /**
   * Transform model to response format (nested structure)
   * @private
   * @param {Object} booking - Sequelize model instance
   * @returns {Object} Nested response format
   */
  _transformModelToResponse(booking) {
    const data = booking.toJSON();

    return {
      id: data.id,
      service: {
        type: data.serviceType,
        symptom: data.serviceSymptom,
        can_open_close: data.canOpenClose,
      },
      door: {
        age_bucket: data.doorAgeBucket,
        count: data.doorCount,
      },
      replacement_pref: data.replacementPref,
      address: {
        street: data.street,
        unit: data.unit,
        city: data.city,
        state: data.state,
        zip: data.zip,
      },
      occupancy: {
        type: data.occupancyType,
        renterPermission: data.renterPermission,
      },
      contact: {
        phoneE164: data.phoneE164,
        name: data.contactName,
      },
      scheduling: {
        slot_id: data.slotId,
        asap_selected: data.asapSelected,
        priority_score: data.priorityScore,
      },
      notes: data.notes,
      suspected_issue: data.suspectedIssue,
      status: data.status,
      serviceTitanJobId: data.serviceTitanJobId,
      schedulingProJobId: data.schedulingProJobId,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
    };
  }
}

module.exports = new BookingService();
