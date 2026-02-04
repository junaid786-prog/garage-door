const APIResponse = require('../utils/response');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Global error handler middleware
 * Must be last middleware in the chain
 * @param {Error} err
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const errorHandler = (err, req, res, _next) => {
  logger.error('Request error', {
    error: err,
    path: req.path,
    method: req.method,
    statusCode: err.status || 500,
  });

  // Operational errors (known errors)
  if (err.isOperational) {
    return APIResponse.error(res, err.message, err.status, err.code);
  }

  // Unknown errors - don't leak details
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  return APIResponse.serverError(res, message);
};

module.exports = errorHandler;
