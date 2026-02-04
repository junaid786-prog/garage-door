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
 * Unauthorized error (401)
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
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

/**
 * Conflict error (409) - Resource already exists or conflicting state
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Service Unavailable error (503) - External service down or unavailable
 */
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', service = null) {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.service = service;
  }
}

/**
 * External Service Error - Errors from external API integrations
 * Includes service name, error code, and retry information
 */
class ExternalServiceError extends AppError {
  constructor(message, serviceName, errorCode = null, retryable = true) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
    this.serviceName = serviceName;
    this.errorCode = errorCode;
    this.retryable = retryable;
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  ServiceUnavailableError,
  ExternalServiceError,
};
