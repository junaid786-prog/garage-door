const logger = require('../utils/logger');

/**
 * Request Timing Middleware
 *
 * Measures request duration and adds X-Response-Time header.
 * Logs slow requests for performance monitoring.
 */

const SLOW_REQUEST_THRESHOLD_MS = 1000; // 1 second

/**
 * Create timing middleware
 * @param {Object} options - Configuration options
 * @param {number} options.slowThreshold - Threshold in ms to log slow requests (default: 1000)
 * @param {boolean} options.logAll - Whether to log all requests (default: false)
 * @returns {Function} Express middleware
 */
function createTimingMiddleware(options = {}) {
  const slowThreshold = options.slowThreshold || SLOW_REQUEST_THRESHOLD_MS;
  const logAll = options.logAll || false;

  return function timingMiddleware(req, res, next) {
    const startTime = process.hrtime.bigint();

    // Store original end function
    const originalEnd = res.end;

    // Override res.end to capture response time
    res.end = function (...args) {
      // Calculate duration in milliseconds
      const endTime = process.hrtime.bigint();
      const durationNs = endTime - startTime;
      const durationMs = Number(durationNs) / 1_000_000; // Convert to milliseconds

      // Add response time header
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);

      // Log request details
      const logData = {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration: durationMs,
        userAgent: req.get('user-agent'),
        ip: req.ip || req.connection.remoteAddress,
      };

      // Log all requests or only slow ones
      if (logAll) {
        logger.http('Request completed', logData);
      } else if (durationMs >= slowThreshold) {
        logger.warn('Slow request detected', {
          ...logData,
          threshold: slowThreshold,
        });
      }

      // Call original end function
      return originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Default timing middleware with standard configuration
 */
const timingMiddleware = createTimingMiddleware({
  slowThreshold: SLOW_REQUEST_THRESHOLD_MS,
  logAll: false,
});

module.exports = {
  timingMiddleware,
  createTimingMiddleware,
  SLOW_REQUEST_THRESHOLD_MS,
};
