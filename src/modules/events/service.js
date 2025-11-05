const fs = require('fs').promises;
const path = require('path');

/**
 * Event tracking service
 * Task #3: Track Event functionality
 */
class EventService {
  constructor() {
    this.eventsFile = path.join(__dirname, '../../../events.json');
    this.events = [];
    this._initialized = false;
  }

  /**
   * Initialize event storage
   * @private
   */
  async _initialize() {
    if (this._initialized) return;

    try {
      const data = await fs.readFile(this.eventsFile, 'utf-8');
      this.events = JSON.parse(data);
    } catch (_error) {
      console.log(_error);
      // File doesn't exist yet, start with empty array
      this.events = [];
    }

    this._initialized = true;
  }

  /**
   * Track an event
   * @param {string} eventName - Event name/type
   * @param {Object} eventData - Event metadata
   * @returns {Promise<Object>} Tracked event
   */
  async track(eventName, eventData = {}) {
    await this._initialize();

    const event = {
      id: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: eventName,
      data: eventData,
      timestamp: new Date().toISOString(),
      session: {
        userAgent: eventData.userAgent || 'unknown',
        ip: eventData.ip || 'unknown',
      },
    };

    this.events.push(event);

    // Persist to file (async, non-blocking)
    this._persistEvents().catch((err) => {
      console.error('Failed to persist events:', err);
    });

    return event;
  }

  /**
   * Get all tracked events
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of events
   */
  async getEvents(filters = {}) {
    await this._initialize();

    let filteredEvents = [...this.events];

    // Filter by event name
    if (filters.name) {
      filteredEvents = filteredEvents.filter((e) => e.name === filters.name);
    }

    // Filter by date range
    if (filters.startDate) {
      filteredEvents = filteredEvents.filter(
        (e) => new Date(e.timestamp) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filteredEvents = filteredEvents.filter(
        (e) => new Date(e.timestamp) <= new Date(filters.endDate)
      );
    }

    // Limit results
    if (filters.limit) {
      filteredEvents = filteredEvents.slice(0, filters.limit);
    }

    return filteredEvents;
  }

  /**
   * Get event statistics
   * @returns {Promise<Object>} Event statistics
   */
  async getStats() {
    await this._initialize();

    const stats = {
      totalEvents: this.events.length,
      eventsByType: {},
      recentEvents: this.events.slice(-10).reverse(),
    };

    // Count events by type
    this.events.forEach((event) => {
      stats.eventsByType[event.name] = (stats.eventsByType[event.name] || 0) + 1;
    });

    return stats;
  }

  /**
   * Persist events to file
   * @private
   */
  async _persistEvents() {
    try {
      await fs.writeFile(this.eventsFile, JSON.stringify(this.events, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error persisting events:', error);
    }
  }
}

module.exports = new EventService();
