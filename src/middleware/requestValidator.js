const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

/**
 * Request Validation Middleware
 *
 * Protects against abuse by rejecting:
 * - Requests with deeply nested objects (> 10 levels)
 * - Requests with too many fields (> 50 fields)
 * - Requests with excessively long keys or values
 */

const MAX_DEPTH = 10;
const MAX_FIELDS = 50;
const MAX_KEY_LENGTH = 100;
const MAX_STRING_LENGTH = 10000;

/**
 * Calculate depth of nested object
 * @param {*} obj - Object to analyze
 * @param {number} depth - Current depth
 * @returns {number} Maximum depth
 */
function getObjectDepth(obj, depth = 0) {
  if (obj === null || typeof obj !== 'object') {
    return depth;
  }

  if (depth > MAX_DEPTH) {
    return depth; // Early exit if already too deep
  }

  const depths = Object.values(obj).map((value) => getObjectDepth(value, depth + 1));
  return Math.max(depth, ...depths);
}

/**
 * Count total number of fields (including nested)
 * @param {*} obj - Object to count
 * @returns {number} Total field count
 */
function countFields(obj) {
  if (obj === null || typeof obj !== 'object') {
    return 0;
  }

  let count = Object.keys(obj).length;

  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      count += countFields(value);
    }
  }

  return count;
}

/**
 * Validate object keys and values
 * @param {*} obj - Object to validate
 * @param {string} path - Current path (for error messages)
 * @returns {Object|null} Error object or null if valid
 */
function validateKeysAndValues(obj, path = '') {
  if (obj === null || typeof obj !== 'object') {
    return null;
  }

  for (const [key, value] of Object.entries(obj)) {
    // Check key length
    if (key.length > MAX_KEY_LENGTH) {
      return {
        field: path ? `${path}.${key}` : key,
        message: `Key length exceeds ${MAX_KEY_LENGTH} characters`,
      };
    }

    // Check string value length
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      return {
        field: path ? `${path}.${key}` : key,
        message: `Value length exceeds ${MAX_STRING_LENGTH} characters`,
      };
    }

    // Recursively validate nested objects
    if (typeof value === 'object' && value !== null) {
      const error = validateKeysAndValues(value, path ? `${path}.${key}` : key);
      if (error) {
        return error;
      }
    }
  }

  return null;
}

/**
 * Request validation middleware
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function validateRequest(req, res, next) {
  // Only validate requests with JSON bodies
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  try {
    // Check nesting depth
    const depth = getObjectDepth(req.body);
    if (depth > MAX_DEPTH) {
      logger.warn('Request rejected - object too deeply nested', {
        depth,
        maxDepth: MAX_DEPTH,
        ip: req.ip,
        path: req.path,
      });

      throw new ValidationError(`Request object is too deeply nested (max depth: ${MAX_DEPTH})`);
    }

    // Check total field count
    const fieldCount = countFields(req.body);
    if (fieldCount > MAX_FIELDS) {
      logger.warn('Request rejected - too many fields', {
        fieldCount,
        maxFields: MAX_FIELDS,
        ip: req.ip,
        path: req.path,
      });

      throw new ValidationError(`Request has too many fields (max: ${MAX_FIELDS})`);
    }

    // Validate keys and values
    const validationError = validateKeysAndValues(req.body);
    if (validationError) {
      logger.warn('Request rejected - invalid key or value', {
        ...validationError,
        ip: req.ip,
        path: req.path,
      });

      throw new ValidationError(`${validationError.field}: ${validationError.message}`);
    }

    // Request is valid
    next();
  } catch (error) {
    // If it's already a ValidationError, pass it to global error handler
    if (error instanceof ValidationError) {
      return next(error);
    }

    // For unexpected errors during validation, log and allow request through
    // (fail open to avoid blocking legitimate requests)
    logger.error('Request validation error', {
      error: error.message,
      ip: req.ip,
      path: req.path,
    });

    next();
  }
}

module.exports = {
  validateRequest,
  getObjectDepth,
  countFields,
  validateKeysAndValues,
  MAX_DEPTH,
  MAX_FIELDS,
  MAX_KEY_LENGTH,
  MAX_STRING_LENGTH,
};
