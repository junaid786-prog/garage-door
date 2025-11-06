const { Sequelize } = require('sequelize');
const databaseConfig = require('../config/database');
const env = require('../config/env');

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
    console.log('✅ PostgreSQL database connected successfully');

    if (env.NODE_ENV === 'development') {
      console.log(`📊 Connected to database: ${databaseConfig.database}`);
      console.log(`🔗 Host: ${databaseConfig.host}:${databaseConfig.port}`);
    }

    return sequelize;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

const syncDatabase = async (force = false) => {
  try {
    if (env.NODE_ENV === 'production' && force) {
      throw new Error('Cannot force sync in production. Use migrations instead.');
    }

    await sequelize.sync({ force });
    console.log(`✅ Database synced${force ? ' (forced)' : ''}`);
  } catch (error) {
    console.error('❌ Database sync failed:', error);
    throw error;
  }
};

const closeDB = async () => {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
};

module.exports = sequelize;
module.exports.connectDB = connectDB;
module.exports.syncDatabase = syncDatabase;
module.exports.closeDB = closeDB;
