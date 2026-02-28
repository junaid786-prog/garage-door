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
    // Domains allowed to embed the widget (frame-ancestors)
    allowedEmbedDomains: env.ALLOWED_EMBED_DOMAINS
      ? env.ALLOWED_EMBED_DOMAINS.split(',').map((domain) => domain.trim()).filter(Boolean)
      : [],
    // Parent origins allowed for postMessage
    allowedParentOrigins: env.ALLOWED_PARENT_ORIGINS
      ? env.ALLOWED_PARENT_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
      : [],
  },
};

module.exports = config;
