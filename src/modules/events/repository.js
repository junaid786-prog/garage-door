const Event = require('../../database/models/Event');
const { Op } = require('sequelize');

/**
 * Event repository - handles data access for events
 * Follows repository pattern for clean architecture
 */
class EventRepository {
  /**
   * Create a new event record
   * @param {Object} eventData - Event data to create
   * @returns {Promise<Event>}
   */
  async create(eventData) {
    return await Event.create(eventData);
  }

  /**
   * Find event by ID
   * @param {string} id - Event ID
   * @returns {Promise<Event|null>}
   */
  async findById(id) {
    return await Event.findByPk(id);
  }

  /**
   * Find events with filters and pagination
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<{events: Array, total: number}>}
   */
  async findWithFilters(filters = {}, pagination = {}) {
    const whereClause = {};
    const { limit = 50, offset = 0, orderBy = 'timestamp', orderDir = 'DESC' } = pagination;

    // Apply filters
    if (filters.name) {
      whereClause.name = filters.name;
    }

    if (filters.sessionId) {
      whereClause.session_id = filters.sessionId;
    }

    if (filters.startDate && filters.endDate) {
      whereClause.timestamp = {
        [Op.between]: [filters.startDate, filters.endDate],
      };
    } else if (filters.startDate) {
      whereClause.timestamp = {
        [Op.gte]: filters.startDate,
      };
    } else if (filters.endDate) {
      whereClause.timestamp = {
        [Op.lte]: filters.endDate,
      };
    }

    // Property-based filtering using JSONB operators
    if (filters.properties) {
      Object.keys(filters.properties).forEach((key) => {
        whereClause[`properties.${key}`] = filters.properties[key];
      });
    }

    const { count, rows } = await Event.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[orderBy, orderDir.toUpperCase()]],
    });

    return {
      events: rows,
      total: count,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Find events by session ID
   * @param {string} sessionId - Session ID
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async findBySessionId(sessionId, options = {}) {
    return await Event.getBySessionId(sessionId, options);
  }

  /**
   * Find events by name/type
   * @param {string} eventName - Event name
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async findByName(eventName, options = {}) {
    return await Event.getByName(eventName, options);
  }

  /**
   * Find events within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Additional options
   * @returns {Promise<Array>}
   */
  async findByDateRange(startDate, endDate, options = {}) {
    return await Event.getByDateRange(startDate, endDate, options);
  }

  /**
   * Get event statistics
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>}
   */
  async getStatistics(filters = {}) {
    return await Event.getStats(filters);
  }

  /**
   * Delete events older than specified date
   * @param {Date} beforeDate - Delete events before this date
   * @returns {Promise<number>} Number of deleted events
   */
  async deleteOlderThan(beforeDate) {
    const result = await Event.destroy({
      where: {
        timestamp: {
          [Op.lt]: beforeDate,
        },
      },
    });

    return result;
  }

  /**
   * Get unique session IDs within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>}
   */
  async getUniqueSessions(startDate, endDate) {
    const whereClause = {};

    if (startDate && endDate) {
      whereClause.timestamp = {
        [Op.between]: [startDate, endDate],
      };
    }

    const sessions = await Event.findAll({
      attributes: ['session_id'],
      where: {
        ...whereClause,
        session_id: { [Op.ne]: null },
      },
      group: ['session_id'],
      raw: true,
    });

    return sessions.map((session) => session.session_id);
  }

  /**
   * Get event funnel data
   * @param {Array} eventNames - Array of event names in funnel order
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>}
   */
  async getFunnelData(eventNames, filters = {}) {
    const whereClause = {};

    if (filters.startDate && filters.endDate) {
      whereClause.timestamp = {
        [Op.between]: [filters.startDate, filters.endDate],
      };
    }

    const funnelData = {};

    for (const eventName of eventNames) {
      const count = await Event.count({
        where: {
          ...whereClause,
          name: eventName,
        },
        distinct: true,
        col: 'session_id',
      });

      funnelData[eventName] = count;
    }

    return funnelData;
  }

  /**
   * Bulk insert events (for data migration or bulk operations)
   * @param {Array} eventsData - Array of event data objects
   * @param {Object} options - Bulk insert options
   * @returns {Promise<Array>}
   */
  async bulkCreate(eventsData, options = {}) {
    return await Event.bulkCreate(eventsData, {
      validate: true,
      ...options,
    });
  }
}

module.exports = new EventRepository();