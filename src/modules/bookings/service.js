const Booking = require('../../database/models/Booking');
const { Op } = require('sequelize');

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
      // Transform nested form data to flat model structure
      const flatData = this._transformFormToModel(bookingData);
      
      // Create booking in database
      const booking = await Booking.create(flatData);
      
      return booking;
    } catch (error) {
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
        sortOrder = 'DESC'
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
        order: [[sortBy, sortOrder]]
      });

      // Transform bookings to response format
      const transformedBookings = bookings.map(booking => 
        this._transformModelToResponse(booking)
      );

      return {
        bookings: transformedBookings,
        pagination: {
          total,
          page: Math.floor(offset / limit) + 1,
          pageSize: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
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
      const booking = await Booking.findByPk(id);
      
      if (!booking) {
        return null;
      }

      // Transform nested form data to flat model structure
      const flatData = this._transformFormToModel(updateData);
      
      // Update booking
      await booking.update(flatData);
      
      return this._transformModelToResponse(booking);
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
        order: [['created_at', 'DESC']]
      });

      return bookings.map(booking => this._transformModelToResponse(booking));
    } catch (error) {
      throw new Error(`Failed to get bookings by phone: ${error.message}`);
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
        can_open_close: data.canOpenClose
      },
      door: {
        age_bucket: data.doorAgeBucket,
        count: data.doorCount
      },
      replacement_pref: data.replacementPref,
      address: {
        street: data.street,
        unit: data.unit,
        city: data.city,
        state: data.state,
        zip: data.zip
      },
      occupancy: {
        type: data.occupancyType,
        renterPermission: data.renterPermission
      },
      contact: {
        phoneE164: data.phoneE164,
        name: data.contactName
      },
      scheduling: {
        slot_id: data.slotId,
        asap_selected: data.asapSelected,
        priority_score: data.priorityScore
      },
      notes: data.notes,
      suspected_issue: data.suspectedIssue,
      status: data.status,
      serviceTitanJobId: data.serviceTitanJobId,
      schedulingProJobId: data.schedulingProJobId,
      created_at: data.createdAt,
      updated_at: data.updatedAt
    };
  }
}

module.exports = new BookingService();