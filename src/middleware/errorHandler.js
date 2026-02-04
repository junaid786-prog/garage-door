const APIResponse = require('../utils/response');
const env = require('../config/env');
const logger = require('../utils/logger');
const { getErrorContext, sanitizeErrorForClient } = require('../utils/errorSanitizer');

/**
 * Global error handler middleware
 * Must be last middleware in the chain
 *
 * SECURITY:
 * - Sanitizes all error messages to prevent PII exposure
 * - Never logs request bodies (could contain PII)
 * - Sanitizes stack traces to remove file paths and sensitive data
 * - Returns minimal error details to client
 *
 * @param {Error} err
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const errorHandler = (err, req, res, _next) => {
  // Get sanitized error context for logging (no PII)
  const context = getErrorContext(err, req);

  // Log error server-side with full sanitized context
  logger.error('Request error', context);

  // Operational errors (known errors - validation, business logic, etc.)
  if (err.isOperational) {
    // Return sanitized error message to client
    const sanitizedError = sanitizeErrorForClient(err, env.NODE_ENV === 'development');

    return APIResponse.error(
      res,
      sanitizedError.message,
      err.status,
      sanitizedError.code,
      env.NODE_ENV === 'development' ? sanitizedError.stack : undefined
    );
  }

  // Unknown/Unexpected errors - minimal details to client
  const isProduction = env.NODE_ENV === 'production';
  const message = isProduction ? 'Internal server error' : sanitizeErrorForClient(err, true).message;

  // In development, include sanitized stack trace
  const stack = isProduction ? undefined : sanitizeErrorForClient(err, true).stack;

  return APIResponse.serverError(res, message, stack);
};

module.exports = errorHandler;
