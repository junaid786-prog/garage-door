require('dotenv').config();
const env = require('./env');

/**
 * Application configuration
 */
const config = {
  port: env.PORT,
  env: env.NODE_ENV,

  cors: {
    origin: env.CORS_ORIGIN,
  },
};

module.exports = config;
