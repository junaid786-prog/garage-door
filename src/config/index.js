require('dotenv').config();
const env = require('./env');

/**
 * Application configuration
 */
const config = {
  port: env.PORT,
  env: env.NODE_ENV,

  cors: {
    origin: env.CORS_ORIGIN.includes(',')
      ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : env.CORS_ORIGIN,
    credentials: true,
  },
};

module.exports = config;
