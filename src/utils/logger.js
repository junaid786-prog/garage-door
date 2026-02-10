/**
 * Safe Logger Wrapper
 *
 * CRITICAL SECURITY LAYER:
 * This wrapper automatically sanitizes ALL data before logging.
 * PII sanitization is ALWAYS enforced, regardless of environment.
 *
 * Usage:
 *   const logger = require('../utils/logger');
 *
 *   logger.info('User created booking', { booking });
 *   logger.error('Payment failed', { error, bookingId });
 *   logger.debug('Processing slot', { slotId, date });
 *
 * The logger will automatically:
 * 1. Sanitize phone numbers (show last 4 digits only)
 * 2. Sanitize emails (show first char + domain)
 * 3. Sanitize addresses (show city/state only)
 * 4. Sanitize names (show initials only)
 * 5. Redact credit cards, SSNs, passwords
 * 6. Recursively sanitize nested objects
 *
 * This protection CANNOT be disabled - it's structural, not conditional.
 */

const winstonLogger = require('../config/logger');
const { sanitizeData, sanitizeError, sanitizeRequest } = require('./sanitize');

/**
 * Safely logs a message with automatic PII sanitization
 * @param {string} level - Log level (info, warn, error, debug)
 * @param {string} message - Log message
 * @param {Object} meta - Additional metadata (will be sanitized)
 */
const safeLog = (level, message, meta = {}) => {
  // CRITICAL: Always sanitize, no exceptions
  if (!meta || Object.keys(meta).length === 0) {
    winstonLogger[level](message);
    return;
  }

  // Special handling for specific keys before general sanitization
  const preSanitized = { ...meta };

  // Handle error objects specially (preserve error details)
  if (preSanitized.error && preSanitized.error instanceof Error) {
    preSanitized.error = sanitizeError(preSanitized.error);
  }

  // Handle Express request objects specially
  if (preSanitized.req || preSanitized.request) {
    const reqKey = preSanitized.req ? 'req' : 'request';
    preSanitized[reqKey] = sanitizeRequest(preSanitized[reqKey]);
  }

  // Apply deep sanitization to the entire metadata object
  // This catches ALL PII regardless of where it appears
  const sanitizedMeta = sanitizeData(preSanitized);

  // Log to Winston with sanitized data
  winstonLogger[level](message, sanitizedMeta);
};

/**
 * Log an informational message
 * Use for: Normal operations, status updates, milestones
 */
const info = (message, meta) => {
  safeLog('info', message, meta);
};

/**
 * Log a warning message
 * Use for: Recoverable errors, deprecations, suspicious activity
 */
const warn = (message, meta) => {
  safeLog('warn', message, meta);
};

/**
 * Log an error message
 * Use for: Errors, exceptions, failures
 */
const error = (message, meta) => {
  safeLog('error', message, meta);
};

/**
 * Log a debug message
 * Use for: Detailed debugging information (only in development)
 */
const debug = (message, meta) => {
  safeLog('debug', message, meta);
};

/**
 * Log HTTP request/response
 * Automatically sanitizes request and response data
 */
const http = (message, { req, res, ...meta } = {}) => {
  const sanitizedData = {
    ...meta,
    method: req?.method,
    url: req?.url,
    statusCode: res?.statusCode,
    responseTime: meta?.responseTime,
    requestId: req?.id,
    // NEVER log req.body, req.params, req.query - they contain PII
  };

  safeLog('info', message, sanitizedData);
};

/**
 * Log external API call
 * Use for: ServiceTitan, SchedulingPro, etc.
 */
const externalApi = (service, operation, meta) => {
  safeLog('info', `External API: ${service}.${operation}`, {
    service,
    operation,
    ...sanitizeData(meta),
  });
};

/**
 * Log database operation
 * Use for: Queries, transactions, migrations
 */
const database = (operation, meta) => {
  safeLog('debug', `Database: ${operation}`, {
    operation,
    ...sanitizeData(meta),
  });
};

/**
 * Log queue/worker operation
 * Use for: Job processing, queue events
 */
const queue = (jobType, meta) => {
  safeLog('info', `Queue: ${jobType}`, {
    jobType,
    ...sanitizeData(meta),
  });
};

/**
 * Log security event
 * Use for: Rate limiting, authentication failures, suspicious activity
 */
const security = (event, meta) => {
  safeLog('warn', `Security: ${event}`, {
    event,
    ...sanitizeData(meta),
  });
};

/**
 * Creates a child logger with preset metadata
 * Useful for adding context to all logs in a module
 */
const child = (defaultMeta) => {
  const sanitizedDefaultMeta = sanitizeData(defaultMeta);

  return {
    info: (message, meta) => info(message, { ...sanitizedDefaultMeta, ...meta }),
    warn: (message, meta) => warn(message, { ...sanitizedDefaultMeta, ...meta }),
    error: (message, meta) => error(message, { ...sanitizedDefaultMeta, ...meta }),
    debug: (message, meta) => debug(message, { ...sanitizedDefaultMeta, ...meta }),
  };
};

// Export safe logging interface
module.exports = {
  // Core logging methods
  info,
  warn,
  error,
  debug,

  // Specialized logging methods
  http,
  externalApi,
  database,
  queue,
  security,

  // Child logger
  child,

  // Direct access to winston logger (for advanced use cases)
  // Note: Direct use bypasses sanitization - use with extreme caution
  _unsafeWinstonLogger: winstonLogger,
};
