require('dotenv').config();

/**
 * Application configuration
 */
const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

module.exports = config;
