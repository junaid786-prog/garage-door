const { Sequelize } = require('sequelize');
const databaseConfig = require('../config/database');
const env = require('../config/env');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
  databaseConfig.database,
  databaseConfig.username,
  databaseConfig.password,
  {
    host: databaseConfig.host,
    port: databaseConfig.port,
    dialect: databaseConfig.dialect,
    dialectOptions: databaseConfig.dialectOptions,
    pool: databaseConfig.pool,
    logging: databaseConfig.logging,
    define: databaseConfig.define,
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL database connected successfully');

    if (env.NODE_ENV === 'development') {
      logger.debug('Database connection details', {
        database: databaseConfig.database,
        host: databaseConfig.host,
        port: databaseConfig.port,
      });
    }

    return sequelize;
  } catch (error) {
    logger.error('Unable to connect to the database', { error });
    throw error;
  }
};

const syncDatabase = async (force = false) => {
  try {
    if (env.NODE_ENV === 'production' && force) {
      throw new Error('Cannot force sync in production. Use migrations instead.');
    }

    await sequelize.sync({ force });
    logger.info('Database synced', { forced: !!force });
  } catch (error) {
    logger.error('Database sync failed', { error });
    throw error;
  }
};

const closeDB = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', { error });
    throw error;
  }
};

/**
 * Get database connection pool statistics
 * @returns {Object} Pool statistics
 */
const getPoolStats = () => {
  try {
    const pool = sequelize.connectionManager.pool;

    if (!pool) {
      return {
        available: false,
        message: 'Connection pool not initialized',
      };
    }

    // Get pool statistics from Sequelize connection manager
    return {
      available: true,
      size: pool.size || 0, // Total connections in pool
      available: pool.available || 0, // Available connections
      using: pool.using || 0, // Currently in-use connections
      waiting: pool.waiting || 0, // Requests waiting for a connection
      max: databaseConfig.pool.max,
      min: databaseConfig.pool.min,
      idle: databaseConfig.pool.idle,
      acquire: databaseConfig.pool.acquire,
    };
  } catch (error) {
    logger.error('Failed to get pool stats', { error });
    return {
      available: false,
      error: error.message,
    };
  }
};

/**
 * Check database connection pool health
 * @returns {Object} Health status
 */
const checkPoolHealth = () => {
  const stats = getPoolStats();

  if (!stats.available) {
    return {
      healthy: false,
      reason: stats.message || stats.error,
    };
  }

  const utilizationPercent = (stats.using / stats.max) * 100;
  const waitingConnections = stats.waiting || 0;

  // Health thresholds
  const isHealthy = utilizationPercent < 80 && waitingConnections < 5;
  const isDegraded = utilizationPercent >= 80 || waitingConnections >= 5;
  const isCritical = utilizationPercent >= 95 || waitingConnections >= 10;

  let status = 'healthy';
  let reason = null;

  if (isCritical) {
    status = 'critical';
    reason = 'Connection pool near capacity or many waiting connections';
  } else if (isDegraded) {
    status = 'degraded';
    reason = 'Connection pool utilization high or connections waiting';
  }

  return {
    healthy: isHealthy,
    status,
    reason,
    stats: {
      utilizationPercent: utilizationPercent.toFixed(1),
      using: stats.using,
      max: stats.max,
      waiting: waitingConnections,
    },
  };
};

module.exports = sequelize;
module.exports.connectDB = connectDB;
module.exports.syncDatabase = syncDatabase;
module.exports.closeDB = closeDB;
module.exports.getPoolStats = getPoolStats;
module.exports.checkPoolHealth = checkPoolHealth;
