const { sanitizeData } = require('./sanitize');

/**
 * Error Sanitizer Utility
 * Sanitizes error objects to prevent PII exposure in logs and responses
 */

/**
 * Sanitize error stack traces
 * - Removes absolute file paths
 * - Removes potentially sensitive variable values
 * - Keeps line numbers and function names for debugging
 *
 * @param {string} stack - Error stack trace
 * @returns {string} Sanitized stack trace
 */
const sanitizeStackTrace = (stack) => {
  if (!stack || typeof stack !== 'string') {
    return '';
  }

  return (
    stack
      // Replace absolute paths with relative paths
      .replace(/\/home\/[^/]+\/[^\s:)]+/g, (match) => {
        const parts = match.split('/');
        // Keep only the last 2-3 parts of the path
        return parts.slice(-3).join('/');
      })
      .replace(/\/usr\/[^\s:)]+/g, (match) => {
        const parts = match.split('/');
        return parts.slice(-3).join('/');
      })
      .replace(/\/var\/[^\s:)]+/g, (match) => {
        const parts = match.split('/');
        return parts.slice(-3).join('/');
      })
      // Replace C:\ style Windows paths
      .replace(/[A-Z]:\\[^\s:)]+/g, (match) => {
        const parts = match.split('\\');
        return parts.slice(-3).join('\\');
      })
      // Remove node_modules from paths
      .replace(/node_modules\/[^\s:)]+/g, 'node_modules/***')
      // Sanitize potential PII in error messages within stack
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***')
      .replace(/\+?1?\d{10,15}/g, '+***')
      // Remove environment variables that might appear in stack
      .replace(/process\.env\.[A-Z_]+/g, 'process.env.***')
  );
};

/**
 * Sanitize error message
 * Removes potential PII from error messages
 *
 * @param {string} message - Error message
 * @returns {string} Sanitized message
 */
const sanitizeErrorMessage = (message) => {
  if (!message || typeof message !== 'string') {
    return 'Unknown error';
  }

  return (
    message
      // Sanitize emails
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***')
      // Sanitize phone numbers
      .replace(/\+?1?\d{10,15}/g, '+***')
      // Sanitize potential API keys or tokens (common patterns)
      .replace(/\b[A-Za-z0-9]{32,}\b/g, '***')
      // Sanitize potential UUIDs in error messages
      .replace(
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
        '***-***-***-***-***'
      )
  );
};

/**
 * Sanitize entire error object for logging
 * Removes PII from message, stack, and any custom properties
 *
 * @param {Error} error - Error object
 * @returns {Object} Sanitized error object safe for logging
 */
const sanitizeError = (error) => {
  if (!error) {
    return {
      message: 'Unknown error',
      stack: '',
    };
  }

  // Create base sanitized error object
  const sanitized = {
    message: sanitizeErrorMessage(error.message || 'Unknown error'),
    name: error.name || 'Error',
    code: error.code,
    status: error.status || error.statusCode,
    isOperational: error.isOperational,
  };

  // Only include stack in development
  if (process.env.NODE_ENV !== 'production') {
    sanitized.stack = sanitizeStackTrace(error.stack);
  }

  // Sanitize any additional properties
  const additionalProps = { ...error };
  delete additionalProps.message;
  delete additionalProps.stack;
  delete additionalProps.name;
  delete additionalProps.code;
  delete additionalProps.status;
  delete additionalProps.statusCode;
  delete additionalProps.isOperational;

  // Add sanitized additional properties
  Object.keys(additionalProps).forEach((key) => {
    // Skip functions and circular references
    if (typeof additionalProps[key] === 'function') return;

    try {
      sanitized[key] = sanitizeData(additionalProps[key]);
    } catch (err) {
      // Skip properties that can't be sanitized
      sanitized[key] = '[Sanitization Error]';
    }
  });

  return sanitized;
};

/**
 * Sanitize error for client response
 * Even more restrictive than log sanitization
 *
 * @param {Error} error - Error object
 * @param {boolean} includeStack - Whether to include stack (only in development)
 * @returns {Object} Client-safe error object
 */
const sanitizeErrorForClient = (error, includeStack = false) => {
  const sanitized = {
    message: sanitizeErrorMessage(error.message || 'An error occurred'),
    code: error.code || 'INTERNAL_ERROR',
  };

  // Only include stack in development and if explicitly requested
  if (includeStack && process.env.NODE_ENV === 'development') {
    sanitized.stack = sanitizeStackTrace(error.stack);
  }

  return sanitized;
};

/**
 * Extract safe error context for logging
 * Builds a context object with request details, excluding sensitive data
 *
 * @param {Error} error - Error object
 * @param {Object} req - Express request object (optional)
 * @returns {Object} Safe context for logging
 */
const getErrorContext = (error, req = null) => {
  const context = {
    error: sanitizeError(error),
    timestamp: new Date().toISOString(),
  };

  if (req) {
    context.request = {
      method: req.method,
      path: req.path,
      // Sanitize query params (might contain PII)
      query: sanitizeData(req.query || {}),
      // Never include body (contains PII)
      // Never include headers (might contain API keys)
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    };
  }

  return context;
};

module.exports = {
  sanitizeStackTrace,
  sanitizeErrorMessage,
  sanitizeError,
  sanitizeErrorForClient,
  getErrorContext,
};
