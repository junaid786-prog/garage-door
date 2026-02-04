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

module.exports = sequelize;
module.exports.connectDB = connectDB;
module.exports.syncDatabase = syncDatabase;
module.exports.closeDB = closeDB;
