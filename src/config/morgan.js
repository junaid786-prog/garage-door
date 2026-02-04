const morgan = require('morgan');
const logger = require('../utils/logger');

/**
 * Production-safe Morgan configuration
 * - Does not log request bodies (PII protection)
 * - Skips sensitive endpoints
 * - Sanitizes URLs containing potential PII
 * - Uses Winston for structured logging
 */

/**
 * Skip logging for health checks and other noisy endpoints
 */
const skipEndpoints = ['/health'];

const shouldSkip = (req) => {
  return skipEndpoints.some((endpoint) => req.url.startsWith(endpoint));
};

/**
 * Custom Morgan token to sanitize URLs
 * Replaces potential PII in URLs (emails, IDs, etc.)
 */
morgan.token('sanitized-url', (req) => {
  let url = req.url;

  // Sanitize common PII patterns in URLs
  // Remove query parameters that might contain PII
  url = url.split('?')[0];

  // Mask email addresses in URLs (if any)
  url = url.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***');

  // Mask phone numbers in URLs (if any)
  url = url.replace(/\+?\d{10,15}/g, '+***');

  return url;
});

/**
 * Stream to integrate Morgan with Winston
 */
const stream = {
  write: (message) => {
    // Remove trailing newline and log via Winston
    logger.http(message.trim());
  },
};

/**
 * Development format - detailed and colorful
 */
const developmentFormat = morgan('dev', {
  skip: shouldSkip,
});

/**
 * Production format - structured and safe
 * Format: :method :sanitized-url :status :response-time ms - :res[content-length]
 *
 * IMPORTANT: Does NOT include request body - prevents PII exposure
 */
const productionFormat = morgan(
  ':remote-addr :method :sanitized-url :status :res[content-length] - :response-time ms',
  {
    skip: shouldSkip,
    stream,
  }
);

/**
 * Test format - silent (no logging in tests)
 */
const testFormat = morgan('combined', {
  skip: () => true, // Skip all logging in test environment
});

/**
 * Get Morgan middleware based on environment
 * @param {string} env - Environment (development, production, test)
 * @returns {Function} Morgan middleware
 */
const getMorganMiddleware = (env) => {
  switch (env) {
    case 'development':
      return developmentFormat;
    case 'production':
      return productionFormat;
    case 'test':
      return testFormat;
    default:
      return productionFormat;
  }
};

module.exports = {
  getMorganMiddleware,
  stream,
};
