/**
 * Base application error class
 */
class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
    this.isOperational = true;
  }
}

/**
 * Validation error (400)
 */
class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * Not found error (404)
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
};
