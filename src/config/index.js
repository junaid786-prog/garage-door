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

  // Content Security Policy configuration
  csp: {
    // Allow widget URLs from CORS_ORIGIN for iframe embedding
    allowedOrigins: env.CORS_ORIGIN.includes(',')
      ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
      : [env.CORS_ORIGIN],
  },
};

module.exports = config;
