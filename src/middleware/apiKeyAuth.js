const { UnauthorizedError } = require('../utils/errors');
const env = require('../config/env');

/**
 * API Key Authentication Middleware
 * Validates X-API-Key header against configured API key
 *
 * Usage:
 * - Apply to routes that need API key protection
 * - Throws UnauthorizedError if key is missing or invalid
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @throws {UnauthorizedError} If API key is missing or invalid
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.get('X-API-Key');

  // Check if API key is provided
  if (!apiKey) {
    throw new UnauthorizedError('API key is required');
  }

  // Validate API key
  if (apiKey !== env.API_KEY) {
    throw new UnauthorizedError('Invalid API key');
  }

  // API key is valid, proceed
  next();
};

module.exports = validateApiKey;
