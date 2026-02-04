const repository = require('./repository');

/**
 * Event tracking service
 * Handles business logic for event tracking
 */
class EventService {
  /**
   * Track an event
   * @param {string} eventName - Event name/type
   * @param {Object} eventData - Event metadata from frontend
   * @returns {Promise<Object>} Tracked event
   */
  async track(eventName, eventData = {}) {
    // Validate input
    if (!eventName || typeof eventName !== 'string') {
      throw new Error('Event name is required and must be a string');
    }

    // Extract known fields and put rest in properties
    const {
      session_id,
      timestamp,
      referrer,
      url,
      userAgent,
      ip,
      properties = {},
      ...additionalProperties
    } = eventData;

    // Prepare event data for database
    const eventRecord = {
      name: eventName.toLowerCase().trim(),
      session_id: session_id || null,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      referrer: referrer || null,
      url: url || null,
      user_agent: userAgent || null,
      ip_address: ip || null,
      properties: {
        ...properties,
        ...additionalProperties, // Any additional fields go into properties
      },
    };

    // Remove null/undefined values from properties
    if (eventRecord.properties) {
      Object.keys(eventRecord.properties).forEach((key) => {
        if (eventRecord.properties[key] === null || eventRecord.properties[key] === undefined) {
          delete eventRecord.properties[key];
        }
      });
    }

    // Create event record
    const event = await repository.create(eventRecord);

    // Return event in a clean format
    return {
      id: event.id,
      name: event.name,
      session_id: event.session_id,
      timestamp: event.timestamp,
      properties: event.properties,
      created_at: event.created_at,
    };
  }

  /**
   * Get events with filters and pagination
   * @param {Object} filters - Filter options
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Paginated events list
   */
  async getEvents(filters = {}, pagination = {}) {
    // Validate and process filters
    const processedFilters = {};

    if (filters.name) {
      processedFilters.name = filters.name.toLowerCase().trim();
    }

    if (filters.sessionId) {
      processedFilters.sessionId = filters.sessionId;
    }

    if (filters.startDate) {
      processedFilters.startDate = new Date(filters.startDate);
      if (isNaN(processedFilters.startDate.getTime())) {
        throw new Error('Invalid startDate format');
      }
    }

    if (filters.endDate) {
      processedFilters.endDate = new Date(filters.endDate);
      if (isNaN(processedFilters.endDate.getTime())) {
        throw new Error('Invalid endDate format');
      }
    }

    // Handle property-based filters
    if (filters.properties && typeof filters.properties === 'object') {
      processedFilters.properties = filters.properties;
    }

    // Process pagination
    const processedPagination = {
      limit: Math.min(parseInt(pagination.limit) || 50, 1000), // Max 1000 results
      offset: Math.max(parseInt(pagination.offset) || 0, 0),
      orderBy: pagination.orderBy || 'timestamp',
      orderDir: ['ASC', 'DESC'].includes(pagination.orderDir?.toUpperCase())
        ? pagination.orderDir.toUpperCase()
        : 'DESC',
    };

    return await repository.findWithFilters(processedFilters, processedPagination);
  }

  /**
   * Get event statistics
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Event statistics
   */
  async getStats(filters = {}) {
    const processedFilters = {};

    if (filters.startDate) {
      processedFilters.startDate = new Date(filters.startDate);
    }

    if (filters.endDate) {
      processedFilters.endDate = new Date(filters.endDate);
    }

    return await repository.getStatistics(processedFilters);
  }

  /**
   * Get events for a specific session
   * @param {string} sessionId - Session ID
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Session events
   */
  async getSessionEvents(sessionId, options = {}) {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    return await repository.findBySessionId(sessionId, options);
  }

  /**
   * Get funnel analysis data
   * @param {Array} eventNames - Array of event names in funnel order
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Funnel data
   */
  async getFunnelAnalysis(eventNames, filters = {}) {
    if (!Array.isArray(eventNames) || eventNames.length === 0) {
      throw new Error('Event names array is required');
    }

    const processedFilters = {};

    if (filters.startDate) {
      processedFilters.startDate = new Date(filters.startDate);
    }

    if (filters.endDate) {
      processedFilters.endDate = new Date(filters.endDate);
    }

    const funnelData = await repository.getFunnelData(
      eventNames.map((name) => name.toLowerCase().trim()),
      processedFilters
    );

    // Calculate conversion rates
    const funnelWithRates = {};
    let previousCount = null;

    eventNames.forEach((eventName, index) => {
      const normalizedName = eventName.toLowerCase().trim();
      const count = funnelData[normalizedName] || 0;

      funnelWithRates[eventName] = {
        count,
        conversionRate: previousCount ? ((count / previousCount) * 100).toFixed(2) : 100,
        dropOffRate: previousCount
          ? (((previousCount - count) / previousCount) * 100).toFixed(2)
          : 0,
      };

      previousCount = count;
    });

    return funnelWithRates;
  }

  /**
   * Get unique sessions within date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Unique session IDs
   */
  async getUniqueSessions(startDate, endDate) {
    return await repository.getUniqueSessions(startDate, endDate);
  }

  /**
   * Clean up old events (for data retention)
   * @param {number} retentionDays - Number of days to retain
   * @returns {Promise<number>} Number of deleted events
   */
  async cleanupOldEvents(retentionDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return await repository.deleteOlderThan(cutoffDate);
  }
}

module.exports = new EventService();
