const { DataTypes, Model } = require('sequelize');
const sequelize = require('../connection');

class Event extends Model {
  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models) {
    // Define associations here if needed
    // For example, if we want to associate events with users:
    // Event.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  }

  /**
   * Get events by session ID
   * @param {string} sessionId
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  static async getBySessionId(sessionId, options = {}) {
    return this.findAll({
      where: { session_id: sessionId },
      order: [['timestamp', 'ASC']],
      ...options,
    });
  }

  /**
   * Get events by name/type
   * @param {string} eventName
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  static async getByName(eventName, options = {}) {
    return this.findAll({
      where: { name: eventName },
      order: [['timestamp', 'DESC']],
      ...options,
    });
  }

  /**
   * Get events within date range
   * @param {Date} startDate
   * @param {Date} endDate
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  static async getByDateRange(startDate, endDate, options = {}) {
    const { Op } = require('sequelize');
    return this.findAll({
      where: {
        timestamp: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['timestamp', 'DESC']],
      ...options,
    });
  }

  /**
   * Get event statistics
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>}
   */
  static async getStats(filters = {}) {
    const { Op } = require('sequelize');
    const whereClause = {};

    // Apply date filters if provided
    if (filters.startDate || filters.endDate) {
      whereClause.timestamp = {};
      if (filters.startDate) {
        whereClause.timestamp[Op.gte] = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.timestamp[Op.lte] = filters.endDate;
      }
    }

    // Get total count
    const totalEvents = await this.count({ where: whereClause });

    // Get events by name
    const eventsByName = await this.findAll({
      attributes: ['name', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: whereClause,
      group: ['name'],
      order: [[sequelize.literal('count'), 'DESC']],
      raw: true,
    });

    // Get recent events
    const recentEvents = await this.findAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: 10,
    });

    // Get unique sessions
    const uniqueSessions = await this.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('session_id'))), 'count'],
      ],
      where: {
        ...whereClause,
        session_id: { [Op.ne]: null },
      },
      raw: true,
    });

    return {
      totalEvents,
      eventsByName: eventsByName.reduce((acc, event) => {
        acc[event.name] = parseInt(event.count);
        return acc;
      }, {}),
      recentEvents,
      uniqueSessions: uniqueSessions[0]?.count || 0,
    };
  }

  /**
   * Validate event properties structure
   * @param {Object} properties
   * @returns {boolean}
   */
  static validateProperties(properties) {
    if (!properties || typeof properties !== 'object') {
      return false;
    }

    // Ensure properties don't contain functions or undefined values
    try {
      JSON.stringify(properties);
      return true;
    } catch (error) {
      return false;
    }
  }
}

Event.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
        isValidEventName(value) {
          // Event name should be lowercase, alphanumeric, and underscores only
          if (!/^[a-z0-9_]+$/.test(value)) {
            throw new Error('Event name must be lowercase alphanumeric with underscores only');
          }
        },
      },
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: true,
      validate: {
        isUUID: {
          args: 4,
          msg: 'Session ID must be a valid UUID',
        },
      },
    },
    properties: {
      type: DataTypes.JSONB,
      allowNull: true,
      validate: {
        isValidJSON(value) {
          if (value !== null && !Event.validateProperties(value)) {
            throw new Error('Properties must be a valid JSON object');
          }
        },
      },
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 2000], // Reasonable limit for user agent strings
      },
    },
    ip_address: {
      type: DataTypes.INET,
      allowNull: true,
      validate: {
        isIP: true,
      },
    },
    referrer: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isUrl: {
          args: true,
          msg: 'Referrer must be a valid URL',
        },
      },
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        isUrl: {
          args: true,
          msg: 'URL must be a valid URL',
        },
      },
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true,
        notFuture(value) {
          if (new Date(value) > new Date()) {
            throw new Error('Event timestamp cannot be in the future');
          }
        },
      },
    },
  },
  {
    sequelize,
    modelName: 'Event',
    tableName: 'events',
    timestamps: true,
    underscored: true,
    paranoid: false, // We want to keep all event data
    indexes: [
      {
        fields: ['name'],
      },
      {
        fields: ['session_id'],
      },
      {
        fields: ['timestamp'],
      },
      {
        fields: ['created_at'],
      },
      {
        fields: ['properties'],
        using: 'gin',
      },
    ],
    hooks: {
      beforeCreate(event, options) {
        // Ensure timestamp is set if not provided
        if (!event.timestamp) {
          event.timestamp = new Date();
        }
      },
      beforeValidate(event, options) {
        // Clean up properties object
        if (event.properties) {
          // Remove any undefined values
          event.properties = JSON.parse(JSON.stringify(event.properties));
        }
      },
    },
  }
);

module.exports = Event;
