const APIResponse = require('../utils/response');
const env = require('../config/env');

/**
 * Global error handler middleware
 * Must be last middleware in the chain
 * @param {Error} err
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
const errorHandler = (err, _req, res, _next) => {
  console.error('Error:', err);

  // Operational errors (known errors)
  if (err.isOperational) {
    return APIResponse.error(res, err.message, err.status, err.code);
  }

  // Unknown errors - don't leak details
  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  return APIResponse.serverError(res, message);
};

module.exports = errorHandler;
